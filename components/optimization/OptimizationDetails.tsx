import type { OptimizationResponse } from "../../lib/optimizationTypes";

function percent(value: number | null): string {
  return value === null ? "N/A" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function delta(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
}

export default function OptimizationDetails({ response }: { response: OptimizationResponse }) {
  const baseline = response.baseline;
  const comparison = response.baseline_comparison;
  const topResult = response.results.find((result) => result.status === "SUCCESS");
  return <div className="optimization-details-grid">
    <section className="optimization-panel">
      <div className="optimization-section-heading"><div><span className="section-heading__index">05</span><h2>BASELINE COMPARISON</h2></div></div>
      {!baseline ? <p className="optimization-empty-inline">BASELINE NOT AVAILABLE</p> : baseline.status === "FAILED" ? <p className="optimization-error-inline">BASELINE SIMULATION FAILED · {baseline.error}</p> : comparison ? <>
        <div className="optimization-baseline-labels"><span>CURRENT CONFIGURATION</span><span>RECOMMENDED CONFIGURATION</span></div>
        <dl className="optimization-baseline-grid">
          <div><dt>WAITING IMPROVEMENT</dt><dd>{percent(comparison.waiting_improvement_percent)}</dd></div>
          <div><dt>QUEUE IMPROVEMENT</dt><dd>{percent(comparison.queue_improvement_percent)}</dd></div>
          <div><dt>THROUGHPUT DIFFERENCE</dt><dd>{delta(comparison.throughput_difference)}</dd></div>
          <div><dt>COUNTER UTILIZATION DIFFERENCE</dt><dd>{delta(comparison.counter_utilization_difference)} pp</dd></div>
          <div><dt>STAFF UTILIZATION DIFFERENCE</dt><dd>{delta(comparison.staff_utilization_difference)} pp</dd></div>
          <div><dt>RISK CHANGE</dt><dd>{comparison.risk_change.baseline} → {comparison.risk_change.recommended}</dd></div>
          <div><dt>RESOURCE DIFFERENCE</dt><dd>{delta(comparison.resource_difference)}</dd></div>
        </dl>
        <p className="optimization-chart-note">Percent improvement is N/A when the actual baseline value is zero or negative.</p>
      </> : <p className="optimization-empty-inline">BASELINE NOT AVAILABLE</p>}
    </section>

    <section className="optimization-panel">
      <div className="optimization-section-heading"><div><span className="section-heading__index">06</span><h2>PARETO-EFFICIENT CONFIGURATIONS</h2></div><span className="mono-label">WAITING TIME × TOTAL RESOURCES</span></div>
      {response.pareto_frontier.length === 0 ? <p className="optimization-empty-inline">NO SUCCESSFUL CONFIGURATIONS ON THE FRONTIER.</p> : <div className="optimization-pareto-list">{response.pareto_frontier.map((item) => <div key={`${item.counters}-${item.staff}`} className={item.rank === 1 ? "is-recommended" : undefined}><span>{item.rank === 1 ? "RECOMMENDED · " : ""}{item.counters}C / {item.staff}S</span><b>{item.resources} RESOURCES</b><span>WAIT {item.average_waiting_time.toFixed(3)}</span><span>SCORE {item.objective_score.toFixed(4)}</span></div>)}</div>}
      <p className="optimization-chart-note">A point is Pareto-dominated when another configuration uses no more resources and has no higher mean waiting time, with at least one strict improvement.</p>
    </section>

    <section className="optimization-panel optimization-methodology">
      <div className="optimization-section-heading"><div><span className="section-heading__index">07</span><h2>OPTIMIZATION METHODOLOGY</h2></div><span className="mono-label">ID / {response.optimization_id}</span></div>
      <p>BANKTWIN evaluates candidate counter/staff configurations using repeated discrete-event simulations. The configuration with the best prototype objective score is recommended. This is simulation-based decision support, not a guaranteed real-world staffing prescription. Prototype weights and thresholds should be calibrated using authorized institutional data before deployment.</p>
      <dl><div><dt>OBJECTIVE</dt><dd>{response.objective_methodology.formula}</dd></div><div><dt>NORMALIZATION</dt><dd>{response.objective_methodology.normalization}</dd></div><div><dt>RISK WEIGHTS</dt><dd>{Object.entries(response.objective_methodology.risk_weights).map(([risk, weight]) => `${risk} ${weight}`).join(" · ")}</dd></div><div><dt>UTILIZATION THRESHOLD</dt><dd>{response.objective_methodology.utilization_threshold}% · PROTOTYPE</dd></div><div><dt>RESOURCE COST</dt><dd>{response.objective_methodology.resource_penalty_formula}</dd></div></dl>
      <small>{response.objective_methodology.note}</small>
      {topResult?.objective_components && <div className="optimization-component-scores"><span>RECOMMENDED SCORE COMPONENTS</span>{Object.entries(topResult.objective_components).filter(([key]) => key !== "total").map(([key, value]) => <span key={key}>{key.replaceAll("_", " ").toUpperCase()} / {value.toFixed(4)}</span>)}</div>}
    </section>
  </div>;
}
