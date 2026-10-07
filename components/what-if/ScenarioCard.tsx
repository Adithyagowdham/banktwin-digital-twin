import type { WhatIfMetricRange, WhatIfScenarioInput, WhatIfScenarioResult } from "../../lib/whatIfTypes";

function metricText(range: WhatIfMetricRange | undefined, multipleRuns: boolean, decimals = 3): string {
  if (!range) return "—";
  if (!multipleRuns) return range.mean.toFixed(decimals);
  const halfRange = (range.max - range.min) / 2;
  return `${range.mean.toFixed(decimals)} ± ${halfRange.toFixed(decimals)}`;
}

export default function ScenarioCard({ scenario, result, numberOfRuns, onRemove }: {
  scenario: WhatIfScenarioInput;
  result?: WhatIfScenarioResult;
  numberOfRuns: number;
  onRemove: (name: string) => void;
}) {
  const values = result?.aggregate;
  const multipleRuns = numberOfRuns > 1;
  const metrics: Array<[string, keyof NonNullable<typeof values>]> = [
    ["CUSTOMERS ARRIVED", "customers_arrived"],
    ["CUSTOMERS SERVED", "customers_served"],
    ["MEAN WAIT", "average_waiting_time"],
    ["MEAN SERVICE", "average_service_time"],
    ["MEAN QUEUE", "queue_length"],
    ["MEAN THROUGHPUT", "throughput"],
    ["COUNTER UTIL", "counter_utilization"],
    ["STAFF UTIL", "staff_utilization"],
  ];

  return (
    <article className="what-if-scenario-card">
      <div className="what-if-scenario-card__heading">
        <div><span className="mono-label">SCENARIO</span><h3>{scenario.name.toUpperCase()}</h3></div>
        <div className="what-if-scenario-card__actions">
          {result && <span className={`what-if-status what-if-status--${result.status.toLowerCase()}`}>{result.status === "SUCCESS" ? "COMPLETE" : "SCENARIO FAILED"}</span>}
          <button type="button" className="icon-button" onClick={() => onRemove(scenario.name)} title={`Remove ${scenario.name}`} aria-label={`Remove ${scenario.name}`}>×</button>
        </div>
      </div>
      <p className="what-if-scenario-card__config">{scenario.config.customers} customers · {scenario.config.counters} counters · {scenario.config.staff} staff · rate {scenario.config.arrival_rate}/unit · service {scenario.config.avg_service_time}/unit</p>
      {result?.status === "FAILED" ? <div className="what-if-failed" role="alert"><b>SCENARIO FAILED</b><p>{result.error}</p></div> : result?.status === "SUCCESS" ? <>
        <div className="what-if-scenario-card__topline"><span>RUNS / {result.run_count}</span><span className={`what-if-risk what-if-risk--${result.operational_risk?.toLowerCase()}`}>RISK / {result.operational_risk}</span></div>
        <div className="what-if-scenario-card__metrics">
          {metrics.map(([label, key]) => {
            const range = values?.[key];
            const decimals = key === "customers_arrived" || key === "customers_served" ? 1 : 3;
            return <div key={key}><span>{label}</span><b>{metricText(range, multipleRuns, decimals)}</b>{multipleRuns && range && <small>MIN {range.min.toFixed(decimals)} · MAX {range.max.toFixed(decimals)}</small>}</div>;
          })}
        </div>
        {result.risk_counts && <p className="what-if-risk-counts">RISK OBSERVATIONS · {Object.entries(result.risk_counts).filter(([, count]) => count > 0).map(([risk, count]) => `${risk} ${count}`).join(" · ")}</p>}
      </> : <p className="what-if-scenario-card__waiting">AWAITING SIMULATION RESULT</p>}
    </article>
  );
}
