import type { OptimizationResponse } from "../../lib/optimizationTypes";

export default function RecommendationCard({ response }: { response: OptimizationResponse }) {
  const best = response.best_configuration;
  const recommendation = response.recommendation;
  if (!best || !recommendation) return <section className="optimization-recommendation"><span className="mono-label">PRESCRIPTIVE RESULT</span><h2>NO RECOMMENDATION AVAILABLE</h2><p>No candidate configuration completed successfully.</p></section>;

  const values: Array<[string, string]> = [
    ["COUNTERS", String(best.counters)],
    ["STAFF", String(best.staff)],
    ["AVG WAITING", best.average_waiting_time.toFixed(3)],
    ["QUEUE", best.queue_length.toFixed(3)],
    ["THROUGHPUT", best.throughput.toFixed(3)],
    ["COUNTER UTILIZATION", `${best.counter_utilization.toFixed(1)}%`],
    ["STAFF UTILIZATION", `${best.staff_utilization.toFixed(1)}%`],
    ["RISK", best.operational_risk],
    ["OBJECTIVE SCORE", best.objective_score.toFixed(4)],
  ];

  return (
    <section className="optimization-recommendation" aria-label="Recommended configuration">
      <div className="optimization-recommendation-heading"><div><span className="mono-label">LOWEST SUCCESSFUL PROTOTYPE OBJECTIVE SCORE</span><h2>RECOMMENDED CONFIGURATION</h2></div><strong>{recommendation.title}</strong></div>
      <div className="optimization-best-metrics">{values.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>
      <div className="optimization-why"><h3>WHY THIS CONFIGURATION?</h3><ul>{recommendation.explanation.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
    </section>
  );
}
