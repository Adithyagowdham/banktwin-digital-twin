import type { OperationalRisk, PriorityLevel, TransactionType } from "./simulationTypes";

export interface OptimizationRequest {
  customers: number;
  arrival_rate: number;
  avg_service_time: number;
  duration: number;
  transaction_type: TransactionType;
  priority: PriorityLevel;
  min_counters: number;
  max_counters: number;
  min_staff: number;
  max_staff: number;
  runs: number;
  base_seed: number;
  risk_weights: Record<OperationalRisk, number>;
  utilization_threshold: number;
  resource_penalty_weight: number;
  baseline?: {
    customers: number;
    arrival_rate: number;
    counters: number;
    staff: number;
    avg_service_time: number;
    duration: number;
    transaction_type: TransactionType;
    priority: PriorityLevel;
    random_seed: number | null;
  } | null;
}

export interface OptimizationMetricRange {
  mean: number;
  min: number;
  max: number;
}

export interface OptimizationResultRow {
  status: "SUCCESS" | "FAILED";
  rank: number | null;
  error?: string;
  configuration: Omit<OptimizationRequest, "min_counters" | "max_counters" | "min_staff" | "max_staff" | "runs" | "base_seed" | "risk_weights" | "utilization_threshold" | "resource_penalty_weight" | "baseline"> & { counters: number; staff: number };
  run_count: number;
  runs: Array<Record<string, number | string>>;
  aggregate?: Record<string, OptimizationMetricRange>;
  operational_risk?: OperationalRisk;
  risk_counts?: Record<OperationalRisk, number>;
  objective_components?: Record<string, number>;
  objective_score: number | null;
}

export interface OptimizationResponse {
  optimization_id: string;
  configurations_tested: number;
  configurations_successful: number;
  configurations_failed: number;
  search_space_size: number;
  number_of_runs: number;
  base_seed: number;
  best_configuration: null | {
    counters: number;
    staff: number;
    resources: number;
    objective_score: number;
    average_waiting_time: number;
    queue_length: number;
    throughput: number;
    counter_utilization: number;
    staff_utilization: number;
    operational_risk: OperationalRisk;
  };
  objective_score: number | null;
  recommendation: null | { title: string; objective_score: number; explanation: string[] };
  results: OptimizationResultRow[];
  pareto_frontier: Array<{
    counters: number;
    staff: number;
    resources: number;
    average_waiting_time: number;
    objective_score: number;
    rank: number;
  }>;
  baseline: null | {
    status: "SUCCESS" | "FAILED";
    error?: string;
    configuration?: Record<string, unknown>;
    aggregate?: Record<string, OptimizationMetricRange>;
    operational_risk?: OperationalRisk;
  };
  baseline_comparison: null | {
    waiting_improvement_percent: number | null;
    queue_improvement_percent: number | null;
    throughput_difference: number;
    counter_utilization_difference: number;
    staff_utilization_difference: number;
    risk_change: { baseline: OperationalRisk; recommended: OperationalRisk };
    resource_difference: number;
  };
  objective_methodology: {
    formula: string;
    normalization: string;
    risk_weights: Record<OperationalRisk, number>;
    utilization_threshold: number;
    resource_penalty_weight: number;
    resource_penalty_formula: string;
    note: string;
  };
}
