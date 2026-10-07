import type { WhatIfResponse } from "../../lib/whatIfTypes";

function value(metric: { mean: number; min: number; max: number } | undefined): string {
  return metric ? metric.mean.toFixed(3) : "—";
}

export default function WhatIfReport({ response }: { response: WhatIfResponse | null }) {
  if (!response) return <section className="report-panel report-no-data"><div className="report-section-heading"><div><span className="section-heading__index">10</span><h2>SCENARIO RESULTS</h2></div></div><h3>NO WHAT-IF RESULTS</h3></section>;
  if (!response.recommendation) return <section className="report-panel report-no-data"><div className="report-section-heading"><div><span className="section-heading__index">10</span><h2>SCENARIO RESULTS</h2></div></div><h3>NO WHAT-IF RESULTS</h3><p>No successful scenario result is available to summarize.</p></section>;
  const recommendation = response.recommendation;
  const bestScenario = recommendation ? response.scenarios.find((scenario) => scenario.name === recommendation.scenario && scenario.status === "SUCCESS") : undefined;
  if (!bestScenario?.aggregate) return <section className="report-panel report-no-data"><div className="report-section-heading"><div><span className="section-heading__index">10</span><h2>SCENARIO RESULTS</h2></div></div><h3>NO WHAT-IF RESULTS</h3><p>No successful scenario result is available to summarize.</p></section>;

  return <section className="report-panel" aria-label="What-If analysis report">
    <div className="report-section-heading"><div><span className="section-heading__index">10</span><h2>WHAT-IF SUMMARY</h2></div><span className="report-source-tag">INDEPENDENT SIMPY SCENARIOS</span></div>
    <div className="report-highlight"><span>BEST SCENARIO</span><b>{recommendation.scenario}</b><small>{response.scenarios.length} scenarios · {response.number_of_runs} runs per scenario · prototype score {recommendation.score.toFixed(4)}</small></div>
    <dl className="report-metric-list"><div><dt>Average Waiting</dt><dd>{value(bestScenario.aggregate.average_waiting_time)}</dd></div><div><dt>Queue</dt><dd>{value(bestScenario.aggregate.queue_length)}</dd></div><div><dt>Throughput</dt><dd>{value(bestScenario.aggregate.throughput)}</dd></div><div><dt>Counter Utilization</dt><dd>{value(bestScenario.aggregate.counter_utilization)}%</dd></div><div><dt>Staff Utilization</dt><dd>{value(bestScenario.aggregate.staff_utilization)}%</dd></div><div><dt>Risk</dt><dd>{bestScenario.operational_risk ?? "—"}</dd></div></dl>
  </section>;
}
