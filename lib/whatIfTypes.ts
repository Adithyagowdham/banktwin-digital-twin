import type { SimulationConfig, OperationalRisk } from "./simulationTypes";

export interface WhatIfScenarioInput {
  name: string;
  config: SimulationConfig;
}

export interface WhatIfRunResult {
  run: number;
  seed: number | null;
  customers_arrived: number;
  customers_served: number;
  average_waiting_time: number;
  average_service_time: number;
  queue_length: number;
  throughput: number;
  counter_utilization: number;
  staff_utilization: number;
  operational_risk: OperationalRisk;
}

export interface WhatIfMetricRange {
  mean: number;
  min: number;
  max: number;
}

export interface WhatIfScenarioResult {
  name: string;
  status: "SUCCESS" | "FAILED";
  error?: string;
  configuration?: SimulationConfig;
  run_count: number;
  runs: WhatIfRunResult[];
  aggregate?: Record<string, WhatIfMetricRange>;
  operational_risk?: OperationalRisk;
  risk_counts?: Record<OperationalRisk, number>;
}

export interface WhatIfRecommendation {
  scenario: string;
  score: number;
  components: Record<string, number>;
  compared_with: string | null;
  explanation: string[];
}

export interface WhatIfResponse {
  number_of_runs: number;
  base_seed: number | null;
  scenarios: WhatIfScenarioResult[];
  recommendation: WhatIfRecommendation | null;
  scoring: {
    label: string;
    formula: string;
    risk_penalties: Record<OperationalRisk, number>;
    utilization_threshold: number;
    note: string;
  };
}

export interface WhatIfScoringSettings {
  risk_penalties: Record<OperationalRisk, number>;
  utilization_threshold: number;
}
