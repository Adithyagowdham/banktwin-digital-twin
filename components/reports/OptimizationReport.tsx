import type { OptimizationResponse } from "../../lib/optimizationTypes";

function percent(value: number | null): string {
  return value === null ? "N/A" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export default function OptimizationReport({ response }: { response: OptimizationResponse | null }) {
  if (!response?.best_configuration) return <section className="report-panel report-no-data"><div className="report-section-heading"><div><span className="section-heading__index">11</span><h2>OPTIMIZATION RESULTS</h2></div></div><h3>NO OPTIMIZATION RESULTS</h3></section>;
  const best = response.best_configuration;
  const baseline = response.baseline_comparison;
  return <>
    <section className="report-panel" aria-label="Optimization report">
      <div className="report-section-heading"><div><span className="section-heading__index">11</span><h2>OPTIMIZATION SUMMARY</h2></div><span className="report-source-tag">{response.configurations_tested} CONFIGURATIONS · {response.number_of_runs} RUNS / CONFIGURATION</span></div>
      <div className="report-highlight"><span>RECOMMENDED CONFIGURATION</span><b>{best.counters} COUNTERS / {best.staff} STAFF</b><small>Objective score {best.objective_score.toFixed(4)} · {response.configurations_successful} successful · {response.configurations_failed} failed</small></div>
      <dl className="report-metric-list"><div><dt>Recommended Counters</dt><dd>{best.counters}</dd></div><div><dt>Recommended Staff</dt><dd>{best.staff}</dd></div><div><dt>Objective Score</dt><dd>{best.objective_score.toFixed(4)}</dd></div><div><dt>Average Waiting</dt><dd>{best.average_waiting_time.toFixed(3)}</dd></div><div><dt>Queue</dt><dd>{best.queue_length.toFixed(3)}</dd></div><div><dt>Throughput</dt><dd>{best.throughput.toFixed(3)}</dd></div><div><dt>Counter Utilization</dt><dd>{best.counter_utilization.toFixed(3)}%</dd></div><div><dt>Staff Utilization</dt><dd>{best.staff_utilization.toFixed(3)}%</dd></div><div><dt>Risk</dt><dd>{best.operational_risk}</dd></div></dl>
    </section>
    <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">12</span><h2>BASELINE vs OPTIMIZED</h2></div></div>{baseline ? <dl className="report-metric-list"><div><dt>Waiting Improvement</dt><dd>{percent(baseline.waiting_improvement_percent)}</dd></div><div><dt>Queue Improvement</dt><dd>{percent(baseline.queue_improvement_percent)}</dd></div><div><dt>Throughput Difference</dt><dd>{baseline.throughput_difference > 0 ? "+" : ""}{baseline.throughput_difference.toFixed(3)}</dd></div><div><dt>Counter Utilization Difference</dt><dd>{baseline.counter_utilization_difference > 0 ? "+" : ""}{baseline.counter_utilization_difference.toFixed(3)} pp</dd></div><div><dt>Staff Utilization Difference</dt><dd>{baseline.staff_utilization_difference > 0 ? "+" : ""}{baseline.staff_utilization_difference.toFixed(3)} pp</dd></div><div><dt>Risk Change</dt><dd>{baseline.risk_change.baseline} → {baseline.risk_change.recommended}</dd></div><div><dt>Resource Difference</dt><dd>{baseline.resource_difference > 0 ? "+" : ""}{baseline.resource_difference}</dd></div></dl> : <p className="report-no-data-copy">BASELINE COMPARISON NOT AVAILABLE</p>}</section>
  </>;
}
