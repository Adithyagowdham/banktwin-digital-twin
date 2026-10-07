import type { OptimizationResponse } from "../../lib/optimizationTypes";

export default function OptimizationProgress({ isRunning, response }: { isRunning: boolean; response: OptimizationResponse | null }) {
  if (isRunning) return <div className="optimization-progress" role="status"><i className="button-spinner" /> OPTIMIZATION RUNNING... · SIMPY CONFIGURATIONS EXECUTING</div>;
  if (!response) return null;
  return <div className="optimization-progress optimization-progress--complete" role="status">CONFIGURATIONS TESTED / {response.configurations_tested} OF {response.search_space_size} · SUCCESSFUL / {response.configurations_successful} · FAILED / {response.configurations_failed}</div>;
}
