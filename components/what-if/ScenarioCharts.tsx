import type { WhatIfMetricRange, WhatIfScenarioResult } from "../../lib/whatIfTypes";

function SummaryBars({ title, metric, scenarios, lowerIsBetter, suffix = "" }: {
  title: string;
  metric: string;
  scenarios: WhatIfScenarioResult[];
  lowerIsBetter: boolean;
  suffix?: string;
}) {
  const values = scenarios.filter((scenario) => scenario.status === "SUCCESS").flatMap((scenario) => {
    const range = scenario.aggregate?.[metric] as WhatIfMetricRange | undefined;
    return range ? [{ scenario, range }] : [];
  });
  if (values.length === 0) return <article className="what-if-chart-panel"><h3>{title}</h3><p className="what-if-empty-inline">NO COMPLETED RESULTS</p></article>;
  const limit = Math.max(...values.map(({ range }) => range.mean), 0);
  const best = Math.min(...values.map(({ range }) => range.mean));
  const worst = Math.max(...values.map(({ range }) => range.mean));

  return (
    <article className="what-if-chart-panel">
      <h3>{title}</h3>
      <div className="what-if-bars" role="img" aria-label={`${title} comparison from actual scenario results`}>
        {values.map(({ scenario, range }) => {
          const isBest = lowerIsBetter ? range.mean === best : range.mean === worst;
          const width = limit > 0 ? range.mean / limit * 100 : 0;
          return <div className={`what-if-bar-row${isBest ? " is-best" : ""}`} key={scenario.name}>
            <span className="what-if-bar-name">{scenario.name}</span>
            <span className="what-if-bar-track"><i style={{ width: `${width}%` }} /></span>
            <b>{range.mean.toFixed(3)}{suffix}</b>
            {scenario.run_count > 1 && <small>{range.min.toFixed(3)}–{range.max.toFixed(3)}</small>}
          </div>;
        })}
      </div>
      {lowerIsBetter && worst > best && <p className="what-if-chart-footnote">LOWER IS BETTER · LOWEST OBSERVED MEAN HIGHLIGHTED</p>}
      {!lowerIsBetter && <p className="what-if-chart-footnote">THROUGHPUT IS REPORTED BY THE SIMPY ENGINE</p>}
    </article>
  );
}

export default function ScenarioCharts({ scenarios }: { scenarios: WhatIfScenarioResult[] }) {
  const successful = scenarios.filter((scenario) => scenario.status === "SUCCESS");
  return <div className="what-if-chart-grid">
    <SummaryBars title="AVERAGE WAITING TIME" metric="average_waiting_time" scenarios={successful} lowerIsBetter />
    <SummaryBars title="QUEUE LENGTH COMPARISON" metric="queue_length" scenarios={successful} lowerIsBetter />
    <SummaryBars title="THROUGHPUT COMPARISON" metric="throughput" scenarios={successful} lowerIsBetter={false} />
    <article className="what-if-chart-panel">
      <h3>RESOURCE UTILIZATION</h3>
      {successful.length === 0 ? <p className="what-if-empty-inline">NO COMPLETED RESULTS</p> : <div className="what-if-bars">
        {successful.map((scenario) => <div className="what-if-util-row" key={scenario.name}>
          <span className="what-if-bar-name">{scenario.name}</span>
          <span className="what-if-util-pair"><i style={{ width: `${scenario.aggregate?.counter_utilization?.mean ?? 0}%` }} /><b>COUNTER {scenario.aggregate?.counter_utilization?.mean.toFixed(1) ?? "—"}%</b></span>
          <span className="what-if-util-pair what-if-util-pair--staff"><i style={{ width: `${scenario.aggregate?.staff_utilization?.mean ?? 0}%` }} /><b>STAFF {scenario.aggregate?.staff_utilization?.mean.toFixed(1) ?? "—"}%</b></span>
        </div>)}
      </div>}
      <p className="what-if-chart-footnote">HIGHER UTILIZATION IS NOT ALWAYS BETTER · PROTOTYPE STRESS THRESHOLD: 90%</p>
    </article>
    <article className="what-if-chart-panel what-if-risk-panel">
      <h3>OPERATIONAL RISK COMPARISON</h3>
      {successful.length === 0 ? <p className="what-if-empty-inline">NO COMPLETED RESULTS</p> : successful.map((scenario) => <div className="what-if-risk-row" key={scenario.name}>
        <span>{scenario.name}</span><b className={`what-if-risk what-if-risk--${scenario.operational_risk?.toLowerCase()}`}>{scenario.operational_risk}</b>
        <small>{Object.entries(scenario.risk_counts ?? {}).filter(([, count]) => count > 0).map(([risk, count]) => `${risk} ${count}`).join(" · ")}</small>
      </div>)}
      <p className="what-if-chart-footnote">RISK LEVELS AND COUNTS COME FROM EACH ACTUAL SIMULATION RUN.</p>
    </article>
  </div>;
}
