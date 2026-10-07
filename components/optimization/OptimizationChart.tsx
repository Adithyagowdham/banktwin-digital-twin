import type { OptimizationResponse, OptimizationResultRow } from "../../lib/optimizationTypes";

const CHART_WIDTH = 760;
const CHART_HEIGHT = 310;
const PLOT_LEFT = 60;
const PLOT_RIGHT = 730;
const PLOT_TOP = 22;
const PLOT_BOTTOM = 250;

function mean(row: OptimizationResultRow, key: string): number {
  return row.aggregate?.[key]?.mean ?? 0;
}

export default function OptimizationChart({ response }: { response: OptimizationResponse }) {
  const results = response.results.filter((row) => row.status === "SUCCESS");
  if (results.length === 0) return <p className="optimization-empty-inline">NO SUCCESSFUL CONFIGURATIONS TO CHART.</p>;
  const resources = results.map((row) => row.configuration.counters + row.configuration.staff);
  const waits = results.map((row) => mean(row, "average_waiting_time"));
  const minResources = Math.min(...resources);
  const maxResources = Math.max(...resources);
  const minWait = Math.min(...waits);
  const maxWait = Math.max(...waits);
  const x = (resource: number) => minResources === maxResources ? (PLOT_LEFT + PLOT_RIGHT) / 2 : PLOT_LEFT + ((resource - minResources) / (maxResources - minResources)) * (PLOT_RIGHT - PLOT_LEFT);
  const y = (waiting: number) => minWait === maxWait ? (PLOT_TOP + PLOT_BOTTOM) / 2 : PLOT_BOTTOM - ((waiting - minWait) / (maxWait - minWait)) * (PLOT_BOTTOM - PLOT_TOP);
  const topResults = results.slice(0, 5);

  return <div className="optimization-chart-grid">
    <article className="optimization-chart-panel">
      <h3>WAITING TIME vs RESOURCES</h3>
      <div className="optimization-scatter-wrap">
        <svg className="optimization-scatter" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Average waiting time versus total resources for all successful configurations">
          <line x1={PLOT_LEFT} y1={PLOT_TOP} x2={PLOT_LEFT} y2={PLOT_BOTTOM} className="optimization-axis" />
          <line x1={PLOT_LEFT} y1={PLOT_BOTTOM} x2={PLOT_RIGHT} y2={PLOT_BOTTOM} className="optimization-axis" />
          <line x1={PLOT_LEFT} y1={(PLOT_TOP + PLOT_BOTTOM) / 2} x2={PLOT_RIGHT} y2={(PLOT_TOP + PLOT_BOTTOM) / 2} className="optimization-gridline" />
          <line x1={(PLOT_LEFT + PLOT_RIGHT) / 2} y1={PLOT_TOP} x2={(PLOT_LEFT + PLOT_RIGHT) / 2} y2={PLOT_BOTTOM} className="optimization-gridline" />
          <text x={PLOT_LEFT} y={PLOT_BOTTOM + 20} className="optimization-axis-tick">{minResources}</text>
          <text x={PLOT_RIGHT} y={PLOT_BOTTOM + 20} textAnchor="end" className="optimization-axis-tick">{maxResources}</text>
          <text x={PLOT_LEFT - 8} y={PLOT_TOP + 4} textAnchor="end" className="optimization-axis-tick">{maxWait.toFixed(2)}</text>
          <text x={PLOT_LEFT - 8} y={PLOT_BOTTOM + 2} textAnchor="end" className="optimization-axis-tick">{minWait.toFixed(2)}</text>
          {results.map((row) => {
            const isRecommended = row.rank === 1;
            const cx = x(row.configuration.counters + row.configuration.staff);
            const cy = y(mean(row, "average_waiting_time"));
            return <g key={`${row.configuration.counters}-${row.configuration.staff}`}>
              <circle cx={cx} cy={cy} r={isRecommended ? 7 : 4.5} className={isRecommended ? "optimization-point is-recommended" : "optimization-point"}>
                <title>{`${row.configuration.counters} counters, ${row.configuration.staff} staff; ${row.configuration.counters + row.configuration.staff} resources; mean waiting ${mean(row, "average_waiting_time").toFixed(3)}; objective ${row.objective_score?.toFixed(4)}`}</title>
              </circle>
              {isRecommended && <text x={cx + 10} y={cy - 8} className="optimization-point-label">RECOMMENDED</text>}
            </g>;
          })}
          <text x={(PLOT_LEFT + PLOT_RIGHT) / 2} y={CHART_HEIGHT - 4} textAnchor="middle" className="optimization-axis-label">TOTAL COUNTERS + STAFF</text>
          <text x="14" y={(PLOT_TOP + PLOT_BOTTOM) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`} className="optimization-axis-label">MEAN WAITING TIME</text>
        </svg>
      </div>
      <p className="optimization-chart-note">Each point is an evaluated configuration. Recommended configuration is highlighted; hover for observed values.</p>
    </article>
    <article className="optimization-chart-panel">
      <h3>RESOURCE UTILIZATION · TOP CONFIGURATIONS</h3>
      <div className="optimization-util-list">
        {topResults.map((row) => <div className="optimization-util-item" key={`${row.configuration.counters}-${row.configuration.staff}`}>
          <div className="optimization-util-title"><span>{row.rank}. {row.configuration.counters}C / {row.configuration.staff}S</span><b>{row.operational_risk}</b></div>
          <div className="optimization-util-track"><span>COUNTER</span><i><em style={{ width: `${mean(row, "counter_utilization")}%` }} /></i><b>{mean(row, "counter_utilization").toFixed(1)}%</b></div>
          <div className="optimization-util-track optimization-util-track--staff"><span>STAFF</span><i><em style={{ width: `${mean(row, "staff_utilization")}%` }} /></i><b>{mean(row, "staff_utilization").toFixed(1)}%</b></div>
        </div>)}
      </div>
      <p className="optimization-chart-note">The configured {response.objective_methodology.utilization_threshold}% threshold is a prototype heuristic, not a universal operating standard.</p>
    </article>
  </div>;
}
