import type { OptimizationResponse, OptimizationResultRow } from "../../lib/optimizationTypes";

function mean(row: OptimizationResultRow, key: string): string {
  const value = row.aggregate?.[key]?.mean;
  return typeof value === "number" ? value.toFixed(3) : "—";
}

export default function OptimizationResults({ response }: { response: OptimizationResponse }) {
  return (
    <section className="optimization-panel" aria-label="Optimization results">
      <div className="optimization-section-heading"><div><span className="section-heading__index">03</span><h2>OPTIMIZATION RESULTS</h2></div><span className="mono-label">RANKED BY OBJECTIVE SCORE · ASCENDING</span></div>
      <div className="optimization-table-scroll">
        <table className="optimization-results-table">
          <caption>Each successful row aggregates actual SimPy runs. Failed configurations have no estimated metrics.</caption>
          <thead><tr><th>RANK</th><th>COUNTERS</th><th>STAFF</th><th>RESOURCES</th><th>AVG WAITING</th><th>AVG QUEUE</th><th>THROUGHPUT</th><th>COUNTER UTIL</th><th>STAFF UTIL</th><th>RISK</th><th>OBJECTIVE SCORE</th></tr></thead>
          <tbody>{response.results.map((row, index) => <tr className={`${row.status === "SUCCESS" ? "" : "is-failed"}${row.rank === 1 ? " is-recommended" : ""}`} key={`${row.configuration.counters}-${row.configuration.staff}-${index}`}>
            <td>{row.rank ?? "—"}</td><td>{row.configuration.counters}</td><td>{row.configuration.staff}</td><td>{row.configuration.counters + row.configuration.staff}</td>
            <td>{mean(row, "average_waiting_time")}</td><td>{mean(row, "queue_length")}</td><td>{mean(row, "throughput")}</td><td>{mean(row, "counter_utilization")}%</td><td>{mean(row, "staff_utilization")}%</td>
            <td>{row.status === "SUCCESS" ? row.operational_risk : "FAILED"}</td><td>{row.objective_score?.toFixed(4) ?? row.error ?? "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
