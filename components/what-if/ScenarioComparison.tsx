import type { WhatIfMetricRange, WhatIfScenarioResult } from "../../lib/whatIfTypes";

const COMPARISON_ROWS: Array<[string, string]> = [
  ["Average Waiting Time", "average_waiting_time"],
  ["Average Service Time", "average_service_time"],
  ["Queue Length", "queue_length"],
  ["Throughput", "throughput"],
  ["Counter Utilization", "counter_utilization"],
  ["Staff Utilization", "staff_utilization"],
];

function valueText(range: WhatIfMetricRange | undefined, multipleRuns: boolean): string {
  if (!range) return "—";
  if (!multipleRuns) return range.mean.toFixed(3);
  return `${range.mean.toFixed(3)} ± ${((range.max - range.min) / 2).toFixed(3)} (${range.min.toFixed(3)}–${range.max.toFixed(3)})`;
}

export default function ScenarioComparison({ scenarios, numberOfRuns }: { scenarios: WhatIfScenarioResult[]; numberOfRuns: number }) {
  if (scenarios.length === 0) return <p className="what-if-empty-inline">SCENARIO COMPARISON IS UNAVAILABLE UNTIL A RUN COMPLETES.</p>;

  return (
    <div className="what-if-table-scroll">
      <table className="what-if-comparison-table">
        <caption>{numberOfRuns > 1 ? "Mean ± half-range, followed by observed minimum and maximum." : "Values are returned by the SimPy engine."}</caption>
        <thead><tr><th scope="col">METRIC</th>{scenarios.map((scenario) => <th scope="col" key={scenario.name}>{scenario.name.toUpperCase()}<small>{scenario.status === "SUCCESS" ? "COMPLETE" : "FAILED"}</small></th>)}</tr></thead>
        <tbody>
          {COMPARISON_ROWS.map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{scenarios.map((scenario) => <td key={scenario.name}>{valueText(scenario.aggregate?.[key], numberOfRuns > 1)}</td>)}</tr>)}
          <tr><th scope="row">Operational Risk</th>{scenarios.map((scenario) => <td key={scenario.name}>{scenario.operational_risk ?? "—"}</td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}
