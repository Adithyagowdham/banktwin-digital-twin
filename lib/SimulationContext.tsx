"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, getSimulationStatus, resetSimulation as resetSimulationApi, runSimulation as runSimulationApi } from "./api";
import type { CounterStatus, SimulationConfig, SimulationResult } from "./simulationTypes";
import type { SimulationUiStatus } from "../components/digital-twin/TwinControls";

interface SimulationContextValue {
  result: SimulationResult | null;
  lastConfig: SimulationConfig | null;
  status: SimulationUiStatus;
  backendOnline: boolean | null;
  errorMessage: string | null;
  counterStatusOverrides: Record<string, CounterStatus>;
  staffAssignmentOverrides: Record<string, string | null>;
  staffStatusOverrides: Record<string, StaffOperationalStatus>;
  run: (config: SimulationConfig) => Promise<void>;
  reset: () => Promise<void>;
  setCounterStatus: (counterId: string, status: CounterStatus) => void;
  assignStaff: (staffId: string, counterId: string) => void;
  setStaffStatus: (staffId: string, status: StaffOperationalStatus) => void;
  dismissError: () => void;
}

export type StaffOperationalStatus = "AVAILABLE" | "BUSY" | "BREAK" | "OFFLINE";

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [lastConfig, setLastConfig] = useState<SimulationConfig | null>(null);
  const [status, setStatus] = useState<SimulationUiStatus>("idle");
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [counterStatusOverrides, setCounterStatusOverrides] = useState<Record<string, CounterStatus>>({});
  const [staffAssignmentOverrides, setStaffAssignmentOverrides] = useState<Record<string, string | null>>({});
  const [staffStatusOverrides, setStaffStatusOverrides] = useState<Record<string, StaffOperationalStatus>>({});

  useEffect(() => {
    let active = true;
    getSimulationStatus().then(() => {
      if (active) setBackendOnline(true);
    }).catch(() => {
      if (active) setBackendOnline(false);
    });
    return () => { active = false; };
  }, []);

  const run = useCallback(async (config: SimulationConfig) => {
    setErrorMessage(null);
    setStatus("loading");
    setResult(null);
    setCounterStatusOverrides({});
    setStaffAssignmentOverrides({});
    setStaffStatusOverrides({});
    try {
      const simulationResult = await runSimulationApi(config);
      setResult(simulationResult);
      setLastConfig(config);
      setStatus("complete");
      setBackendOnline(true);
    } catch (error) {
      setStatus("error");
      setBackendOnline(error instanceof ApiError && error.message.startsWith("BACKEND OFFLINE") ? false : backendOnline);
      setErrorMessage(error instanceof Error ? error.message : "SIMULATION REQUEST FAILED — unknown error.");
      throw error;
    }
  }, [backendOnline]);

  const reset = useCallback(async () => {
    setErrorMessage(null);
    try {
      await resetSimulationApi();
      setResult(null);
      setLastConfig(null);
      setStatus("idle");
      setCounterStatusOverrides({});
      setStaffAssignmentOverrides({});
      setStaffStatusOverrides({});
      setBackendOnline(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "SIMULATION RESET FAILED.");
      throw error;
    }
  }, []);

  const setCounterStatus = useCallback((counterId: string, nextStatus: CounterStatus) => {
    setCounterStatusOverrides((current) => ({ ...current, [counterId]: nextStatus }));
  }, []);

  const assignStaff = useCallback((staffId: string, counterId: string) => {
    setStaffAssignmentOverrides((current) => {
      const next = { ...current };
      for (const person of result?.staff ?? []) {
        const assignedCounter = Object.hasOwn(next, person.staff_id)
          ? next[person.staff_id]
          : person.assigned_counter;
        if (assignedCounter === counterId && person.staff_id !== staffId) {
          next[person.staff_id] = null;
        }
      }
      for (const [assignedStaffId, assignedCounterId] of Object.entries(next)) {
        if (assignedCounterId === counterId || assignedStaffId === staffId) next[assignedStaffId] = null;
      }
      next[staffId] = counterId;
      return next;
    });
  }, [result?.staff]);

  const setStaffStatus = useCallback((staffId: string, nextStatus: StaffOperationalStatus) => {
    setStaffStatusOverrides((current) => ({ ...current, [staffId]: nextStatus }));
  }, []);

  const value = useMemo<SimulationContextValue>(() => ({
    result,
    lastConfig,
    status,
    backendOnline,
    errorMessage,
    counterStatusOverrides,
    staffAssignmentOverrides,
    staffStatusOverrides,
    run,
    reset,
    setCounterStatus,
    assignStaff,
    setStaffStatus,
    dismissError: () => setErrorMessage(null),
  }), [result, lastConfig, status, backendOnline, errorMessage, counterStatusOverrides, staffAssignmentOverrides, staffStatusOverrides, run, reset, setCounterStatus, assignStaff, setStaffStatus]);

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationContext);
  if (!context) throw new Error("useSimulation must be used inside SimulationProvider");
  return context;
}
