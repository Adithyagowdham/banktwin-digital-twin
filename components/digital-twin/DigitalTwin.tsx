"use client";

import { useState } from "react";
import type { CounterResult, SimulationConfig, StaffResult } from "../../lib/simulationTypes";
import { useSimulation } from "../../lib/SimulationContext";
import { toCustomerRecord } from "../../lib/transformers";
import StatusIndicator from "../ui/StatusIndicator";
import BranchMap from "./BranchMap";
import { CounterInspector, CustomerInspector, StaffInspector } from "./Inspectors";
import SimulationConfigPanel from "./SimulationConfigPanel";
import TelemetryPanel from "./TelemetryPanel";
import TwinControls from "./TwinControls";
import CustomerResultsTable from "./CustomerResultsTable";
import type { CounterRecord, CustomerRecord, InspectorSelection, StaffRecord, ViewSettings } from "./types";

const initialConfig: SimulationConfig = {
  customers: 50,
  arrival_rate: 5,
  counters: 4,
  staff: 5,
  avg_service_time: 5,
  duration: 60,
  transaction_type: "Deposit",
  priority: "Normal",
  random_seed: 42,
};

const initialView: ViewSettings = { grid: true, flowPaths: true, customerLabels: true, staffLabels: true, autoLayout: false };

function mapCounters(counters: CounterResult[], staff: StaffRecord[], duration: number, statusOverrides: Record<string, CounterResult["status"]>, customerRows: CustomerRecord[]): CounterRecord[] {
  return counters.map((counter) => {
    const currentCustomer = counter.current_customer ? customerRows.find((customer) => customer.id === counter.current_customer) : undefined;
    const simulationCustomersServed = customerRows.filter((customer) => customer.assignedCounter === counter.counter_id && customer.status === "COMPLETED").length;
    return {
    id: counter.counter_id,
    status: statusOverrides[counter.counter_id] ?? counter.status,
    queueLength: null,
    staffId: staff.find((person) => person.assignedCounter === counter.counter_id)?.id ?? null,
    currentCustomerId: counter.current_customer,
    transactionType: currentCustomer?.transactionType ?? null,
    utilization: duration > 0 ? Math.min(100, counter.busy_time / duration * 100) : null,
    serviceTime: null,
    customersServed: simulationCustomersServed,
    simulationStatus: counter.status,
  };
  });
}

function mapStaff(staff: StaffResult[], duration: number, assignmentOverrides: Record<string, string | null>, statusOverrides: Record<string, "AVAILABLE" | "BUSY" | "BREAK" | "OFFLINE">): StaffRecord[] {
  return staff.map((person) => ({
    id: person.staff_id,
    role: person.role,
    assignedCounter: Object.hasOwn(assignmentOverrides, person.staff_id) ? assignmentOverrides[person.staff_id] : person.assigned_counter,
    status: statusOverrides[person.staff_id] ?? (person.status === "SERVING" ? "BUSY" : person.status),
    simulationStatus: person.status,
    customersServed: person.customers_served,
    utilization: duration > 0 ? Math.min(100, person.busy_time / duration * 100) : null,
  }));
}

export default function DigitalTwin() {
  const [config, setConfig] = useState<SimulationConfig>(initialConfig);
  const { result, status: simulationStatus, backendOnline, errorMessage, counterStatusOverrides, staffAssignmentOverrides, staffStatusOverrides, run, reset, dismissError } = useSimulation();
  const [selected, setSelected] = useState<InspectorSelection>(null);
  const [settings, setSettings] = useState<ViewSettings>(initialView);

  const customers = result ? result.customers.map(toCustomerRecord) : [];
  const staff = result ? mapStaff(result.staff, result.simulation_duration, staffAssignmentOverrides, staffStatusOverrides) : [];
  const counters = result ? mapCounters(result.counters, staff, result.simulation_duration, counterStatusOverrides, customers) : [];
  const selectedCounter = selected?.type === "counter" ? counters.find((item) => item.id === selected.id) : undefined;
  const selectedCustomer = selected?.type === "customer" ? customers.find((item) => item.id === selected.id) : undefined;
  const selectedStaff = selected?.type === "staff" ? staff.find((item) => item.id === selected.id) : undefined;

  async function startSimulation() {
    setSelected(null);
    try {
      await run(config);
    } catch {
      // The shared simulation context exposes the request error for the twin UI.
    }
  }

  async function resetSimulationState() {
    try {
      await reset();
      setConfig(initialConfig);
      setSettings(initialView);
      setSelected(null);
    } catch {
      // The shared simulation context exposes the reset error for the twin UI.
    }
  }

  function toggleSetting(key: keyof Pick<ViewSettings, "grid" | "flowPaths" | "customerLabels" | "staffLabels">) {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  }

  function resetView() {
    setSettings(initialView);
    setSelected(null);
  }

  function autoLayout() {
    setSettings((current) => ({ ...current, autoLayout: !current.autoLayout, grid: true, flowPaths: true }));
  }

  return <div className="twin-view twin-view--interactive">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> MODEL SPACE / BRANCH LAYOUT</div><h1>TWIN-CORE <span>{"//"}</span> SCHEMATIC VIEWPORT</h1><p className="page-heading__subtitle">Bank branch simulation · results sourced from FastAPI / SimPy</p></div><div className="page-heading__meta"><StatusIndicator label={result ? "SIMULATION RESULT" : "NO SIMULATION"} tone={result ? "online" : "neutral"} compact /><span className="mono-label">SCHEMATIC&nbsp; /&nbsp; 2D</span></div></div>

    <SimulationConfigPanel config={config} onChange={setConfig} onStart={startSimulation} disabled={simulationStatus === "loading"} />
    {errorMessage && <div className="simulation-error" role="alert"><span>!</span><div><b>{errorMessage.startsWith("BACKEND OFFLINE") ? "BACKEND OFFLINE" : "SIMULATION REQUEST FAILED"}</b><p>{errorMessage}</p></div><button type="button" onClick={dismissError} aria-label="Dismiss error">×</button></div>}
    <TwinControls settings={settings} simulationStatus={simulationStatus} backendOnline={backendOnline} onToggle={toggleSetting} onResetView={resetView} onAutoLayout={autoLayout} onResetSimulation={resetSimulationState} />
    <section className="flow-strip" aria-label="Customer flow sequence"><div className="flow-strip__heading"><span className="section-heading__index">FLOW</span><span>BACKEND CUSTOMER SERVICE PATH</span></div><ol className="flow-sequence">{["ENTRY", "TOKEN", "QUEUE", "COUNTER", "SERVICE", "COMPLETE", "EXIT"].map((step, index) => <li key={step}><span className="flow-sequence__node">{String(index + 1).padStart(2, "0")}</span><span className="flow-sequence__label">{step}</span>{index < 6 && <span className="flow-sequence__arrow" aria-hidden="true">→</span>}</li>)}</ol></section>

    <div className={`twin-workspace${selected ? " twin-workspace--inspecting" : ""}`}>
      <div className="twin-workspace__canvas"><BranchMap counters={counters} customers={customers} staff={staff} settings={settings} selectedCounter={selectedCounter?.id ?? null} onCounterClick={(id) => setSelected({ type: "counter", id })} onCustomerClick={(id) => setSelected({ type: "customer", id })} onStaffClick={(id) => setSelected({ type: "staff", id })} />
        <div className="branch-map-footnote"><span>CLICK A RETURNED NODE TO INSPECT</span><span>{result ? "API RESULT · TU = TIME UNIT" : "NO API RESULT · BRANCH NODES EMPTY"}</span></div>
      </div>
      {selectedCounter && <CounterInspector counter={selectedCounter} simulationStatus={selectedCounter.simulationStatus} localControl={Object.hasOwn(counterStatusOverrides, selectedCounter.id) || (result?.staff.some((person) => Object.hasOwn(staffAssignmentOverrides, person.staff_id) && (person.assigned_counter === selectedCounter.id || staffAssignmentOverrides[person.staff_id] === selectedCounter.id)) ?? false)} onClose={() => setSelected(null)} />}
      {selectedCustomer && <CustomerInspector customer={selectedCustomer} onClose={() => setSelected(null)} />}
      {selectedStaff && <StaffInspector staff={selectedStaff} simulationStatus={selectedStaff.simulationStatus} localControl={Object.hasOwn(staffStatusOverrides, selectedStaff.id) || Object.hasOwn(staffAssignmentOverrides, selectedStaff.id)} onClose={() => setSelected(null)} />}
    </div>

    <TelemetryPanel result={result} status={simulationStatus} />
    <CustomerResultsTable customers={result?.customers ?? null} />
    <div className="twin-disclaimer"><span className="twin-disclaimer__icon">i</span><p><strong>BACKEND SIMULATION</strong> — Displayed entities and metrics come from the FastAPI / SimPy response. Counter queue length and transaction type are not returned per counter and show as unavailable. Pause and resume are not supported by the backend.</p></div>
  </div>;
}