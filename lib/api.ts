import type { SimulationConfig, SimulationResult, SimulationStatus } from "./simulationTypes";
import type { WhatIfResponse, WhatIfScenarioInput } from "./whatIfTypes";
import type { WhatIfScoringSettings } from "./whatIfTypes";
import type { OptimizationRequest, OptimizationResponse } from "./optimizationTypes";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

export class ApiError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export interface BackendHealth {
  status: string;
  service: string;
}

export function getBackendHealth(): Promise<BackendHealth> {
  return request<unknown>("/api/health").then((payload) => {
    if (!isRecord(payload) || typeof payload.status !== "string" || typeof payload.service !== "string") {
      throw new ApiError("API REQUEST FAILED — malformed health response.");
    }
    return { status: payload.status, service: payload.service };
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      const requestType = path.startsWith("/api/optimization/") ? "OPTIMIZATION" : "WHAT-IF";
      throw new ApiError(`${requestType} REQUEST TIMED OUT — reduce the search range, customers, or runs and try again.`);
    }
    throw new ApiError("BACKEND OFFLINE — could not reach the simulation service.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload === "object" && payload !== null && "detail" in payload
      ? String(payload.detail)
      : `HTTP ${response.status}`;
    const requestType = path.startsWith("/api/ml/") ? "ML REQUEST FAILED" : path.startsWith("/api/what-if/") ? "WHAT-IF REQUEST FAILED" : path.startsWith("/api/optimization/") ? "OPTIMIZATION REQUEST FAILED" : "SIMULATION REQUEST FAILED";
    throw new ApiError(`${requestType} — ${detail}`, response.status);
  }
  if (payload === null || typeof payload !== "object") {
    throw new ApiError("SIMULATION REQUEST FAILED — malformed backend response.", response.status);
  }
  return payload as T;
}

export function runSimulation(config: SimulationConfig): Promise<SimulationResult> {
  return request<unknown>("/api/simulation/run", {
    method: "POST",
    body: JSON.stringify(config),
  }).then(parseSimulationResult);
}

export function getSimulationStatus(): Promise<SimulationStatus> {
  return request<unknown>("/api/simulation/status").then((payload) => {
    if (!isRecord(payload) || typeof payload.running !== "boolean" || typeof payload.last_simulation_available !== "boolean") {
      throw new ApiError("BACKEND OFFLINE — malformed simulation status response.");
    }
    return payload as unknown as SimulationStatus;
  });
}

export function resetSimulation(): Promise<{ reset: boolean }> {
  return request<unknown>("/api/simulation/reset", { method: "POST" }).then((payload) => {
    if (!isRecord(payload) || payload.reset !== true) {
      throw new ApiError("SIMULATION RESET FAILED — malformed backend response.");
    }
    return { reset: true };
  });
}

export function runWhatIfAnalysis(
  scenarios: WhatIfScenarioInput[],
  numberOfRuns: 1 | 5 | 10,
  baseSeed: number | null,
  scoring: WhatIfScoringSettings,
): Promise<WhatIfResponse> {
  return request<unknown>("/api/what-if/run", {
    method: "POST",
    body: JSON.stringify({
      scenarios,
      number_of_runs: numberOfRuns,
      base_seed: baseSeed,
      risk_penalties: scoring.risk_penalties,
      utilization_threshold: scoring.utilization_threshold,
    }),
    signal: AbortSignal.timeout(180_000),
  }).then((payload) => {
    if (!isRecord(payload) || !Array.isArray(payload.scenarios)) {
      throw new ApiError("WHAT-IF REQUEST FAILED — malformed backend response.");
    }
    return payload as unknown as WhatIfResponse;
  });
}

export function runOptimization(payload: OptimizationRequest): Promise<OptimizationResponse> {
  return request<unknown>("/api/optimization/run", {
    method: "POST",
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(300_000),
  }).then((response) => {
    if (!isRecord(response) || !Array.isArray(response.results) || typeof response.optimization_id !== "string") {
      throw new ApiError("OPTIMIZATION REQUEST FAILED — malformed backend response.");
    }
    return response as unknown as OptimizationResponse;
  });
}

export type MlStatusResponse = {
  regression_model_status: string;
  risk_model_status: string;
  training_status: string;
  last_training: Record<string, unknown> | null;
};

export function getMlStatus(): Promise<MlStatusResponse> {
  return request<unknown>("/api/ml/status").then((payload) => {
    if (!isRecord(payload) || typeof payload.regression_model_status !== "string" || typeof payload.risk_model_status !== "string" || typeof payload.training_status !== "string") {
      throw new ApiError("ML STATUS FAILED — malformed backend response.");
    }
    return payload as unknown as MlStatusResponse;
  });
}

export function getMlEvaluation(): Promise<{ status: unknown; training: unknown; regression: unknown; classification: unknown }> {
  return request<unknown>("/api/ml/evaluation").then((payload) => {
    if (!isRecord(payload)) {
      throw new ApiError("ML EVALUATION FAILED — malformed backend response.");
    }
    return {
      status: payload.status ?? null,
      training: payload.training ?? null,
      regression: payload.regression ?? null,
      classification: payload.classification ?? null,
    };
  });
}

export function trainRegressionModel(rows: Record<string, unknown>[]): Promise<Record<string, unknown>> {
  return request<unknown>("/api/ml/train/regression", {
    method: "POST",
    body: JSON.stringify({ rows }),
  }).then((payload) => {
    if (!isRecord(payload)) {
      throw new ApiError("ML TRAINING FAILED — malformed backend response.");
    }
    return payload as Record<string, unknown>;
  });
}

export function trainClassificationModel(rows: Record<string, unknown>[]): Promise<Record<string, unknown>> {
  return request<unknown>("/api/ml/train/classification", {
    method: "POST",
    body: JSON.stringify({ rows }),
  }).then((payload) => {
    if (!isRecord(payload)) {
      throw new ApiError("ML TRAINING FAILED — malformed backend response.");
    }
    return payload as Record<string, unknown>;
  });
}

export function trainMlModels(
  rows: Record<string, unknown>[],
  dataset?: { name: string; source: string; total_rows: number },
): Promise<Record<string, unknown>> {
  return request<unknown>("/api/ml/train", {
    method: "POST",
    body: JSON.stringify({
      rows,
      dataset_name: dataset?.name,
      dataset_source: dataset?.source,
      total_rows: dataset?.total_rows ?? rows.length,
    }),
  }).then((payload) => {
    if (!isRecord(payload)) {
      throw new ApiError("ML TRAINING FAILED — malformed backend response.");
    }
    return payload as Record<string, unknown>;
  });
}

export function resetMlModels(): Promise<{ reset: boolean }> {
  return request<unknown>("/api/ml/reset", { method: "POST" }).then((payload) => {
    if (!isRecord(payload) || payload.reset !== true) {
      throw new ApiError("ML RESET FAILED — malformed backend response.");
    }
    return { reset: true };
  });
}

export function predictWaitingTime(payload: Record<string, unknown>): Promise<{ predicted_waiting_time: number }> {
  return request<unknown>("/api/ml/predict/waiting-time", {
    method: "POST",
    body: JSON.stringify({ payload }),
  }).then((response) => {
    if (!isRecord(response) || typeof response.predicted_waiting_time !== "number") {
      throw new ApiError("WAITING TIME PREDICTION FAILED — malformed backend response.");
    }
    return { predicted_waiting_time: response.predicted_waiting_time as number };
  });
}

export function predictRisk(payload: Record<string, unknown>): Promise<{ predicted_risk: string; "MODEL ESTIMATED PROBABILITY": Record<string, number> }> {
  return request<unknown>("/api/ml/predict/risk", {
    method: "POST",
    body: JSON.stringify({ payload }),
  }).then((response) => {
    if (!isRecord(response) || typeof response.predicted_risk !== "string" || !isRecord(response["MODEL ESTIMATED PROBABILITY"])) {
      throw new ApiError("RISK PREDICTION FAILED — malformed backend response.");
    }
    return {
      predicted_risk: response.predicted_risk as string,
      "MODEL ESTIMATED PROBABILITY": response["MODEL ESTIMATED PROBABILITY"] as Record<string, number>,
    };
  });
}

function parseSimulationResult(payload: unknown): SimulationResult {
  if (!isRecord(payload)
    || !isFiniteNumber(payload.customers_arrived)
    || !isFiniteNumber(payload.customers_served)
    || !isFiniteNumber(payload.queue_length)
    || !isFiniteNumber(payload.peak_queue_length)
    || !isFiniteNumber(payload.average_waiting_time)
    || !isFiniteNumber(payload.average_service_time)
    || !isFiniteNumber(payload.throughput)
    || !isFiniteNumber(payload.counter_utilization)
    || !isFiniteNumber(payload.staff_utilization)
    || !isFiniteNumber(payload.simulation_duration)
    || !Array.isArray(payload.customers)
    || !Array.isArray(payload.counters)
    || !Array.isArray(payload.staff)
    || !payload.customers.every(isCustomerResult)
    || !payload.counters.every(isCounterResult)
    || !payload.staff.every(isStaffResult)) {
    throw new ApiError("SIMULATION REQUEST FAILED — malformed backend result.");
  }
  const risks = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
  if (typeof payload.operational_risk !== "string" || !risks.includes(payload.operational_risk)) {
    throw new ApiError("SIMULATION REQUEST FAILED — invalid risk value in backend result.");
  }
  return payload as unknown as SimulationResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): boolean {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isCustomerResult(value: unknown): boolean {
  return isRecord(value)
    && typeof value.customer_id === "string"
    && isFiniteNumber(value.arrival_time)
    && typeof value.transaction_type === "string"
    && (value.priority === "Normal" || value.priority === "Priority")
    && isNullableString(value.assigned_counter)
    && isNullableString(value.assigned_staff)
    && isNullableNumber(value.service_start_time)
    && isNullableNumber(value.service_end_time)
    && isNullableNumber(value.waiting_time)
    && isNullableNumber(value.service_time)
    && ["WAITING", "SERVING", "COMPLETED", "DELAYED"].includes(String(value.status));
}

function isCounterResult(value: unknown): boolean {
  return isRecord(value)
    && typeof value.counter_id === "string"
    && ["AVAILABLE", "BUSY", "BREAK", "OFFLINE"].includes(String(value.status))
    && isFiniteNumber(value.busy_time)
    && isNullableString(value.current_customer);
}

function isStaffResult(value: unknown): boolean {
  return isRecord(value)
    && typeof value.staff_id === "string"
    && typeof value.role === "string"
    && isNullableString(value.assigned_counter)
    && ["AVAILABLE", "SERVING", "BREAK", "OFFLINE"].includes(String(value.status))
    && isFiniteNumber(value.busy_time)
    && Number.isInteger(value.customers_served);
}
