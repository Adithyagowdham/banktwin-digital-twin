interface ChartPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  title: string;
  description: string;
  points: ChartPoint[];
  color?: "cyan" | "blue" | "warning";
  unit?: string;
  emptyLabel?: string;
}

const chartColors = {
  cyan: "var(--cyan)",
  blue: "var(--blue)",
  warning: "var(--warning)",
};

export function BarChart({ title, description, points, color = "cyan", unit = "", emptyLabel = "NO DATA" }: BarChartProps) {
  const maximum = Math.max(1, ...points.map((point) => point.value));
  const chartWidth = 600;
  const chartHeight = 190;
  const left = 35;
  const top = 15;
  const plotWidth = chartWidth - left - 10;
  const plotHeight = chartHeight - top - 36;
  const gap = points.length > 16 ? 2 : 5;
  const barWidth = points.length ? Math.max(3, (plotWidth - gap * (points.length - 1)) / points.length) : 0;
  const colorValue = chartColors[color];

  return <section className="analytics-chart" aria-label={`${title}: ${description}`}>
    <div className="analytics-chart__heading"><div><h2>{title}</h2><p>{description}</p></div><span>{points.length ? `${points.length} BINS` : "NO DATA"}</span></div>
    {points.length === 0 ? <div className="analytics-chart__empty">{emptyLabel}</div> : <div className="analytics-chart__plot"><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${title} bar chart. ${points.map((point) => `${point.label}: ${point.value}${unit}`).join("; ")}`}>
      {[0, 0.5, 1].map((fraction) => {
        const y = top + plotHeight * fraction;
        const tick = Math.round(maximum * (1 - fraction));
        return <g key={fraction}><line className="analytics-chart__gridline" x1={left} x2={chartWidth - 10} y1={y} y2={y} /><text className="analytics-chart__tick" x={left - 7} y={y + 3} textAnchor="end">{tick}</text></g>;
      })}
      {points.map((point, index) => {
        const x = left + index * (barWidth + gap);
        const height = point.value / maximum * plotHeight;
        const y = top + plotHeight - height;
        return <g key={`${point.label}-${index}`}><rect x={x} y={y} width={barWidth} height={Math.max(1, height)} rx="1" fill={colorValue} opacity={point.value === 0 ? 0.18 : 0.78}><title>{`${point.label}: ${point.value}${unit}`}</title></rect>{(points.length <= 12 || index % Math.ceil(points.length / 8) === 0) && <text className="analytics-chart__label" x={x + barWidth / 2} y={chartHeight - 8} textAnchor="middle">{point.label}</text>}</g>;
      })}
    </svg></div>}
  </section>;
}

export function UtilizationChart({ title, description, points }: { title: string; description: string; points: ChartPoint[] }) {
  const hasData = points.length > 0;
  return <section className="analytics-chart utilization-chart" aria-label={`${title}: ${description}`}>
    <div className="analytics-chart__heading"><div><h2>{title}</h2><p>{description}</p></div><span>{hasData ? "OBSERVED" : "NO DATA"}</span></div>
    {hasData ? <div className="utilization-chart__list">{points.map((point) => <div className="utilization-row" key={point.label}><span>{point.label}</span><div><i><b style={{ width: `${Math.max(0, Math.min(100, point.value))}%` }} /></i></div><strong>{point.value.toFixed(1)}%</strong></div>)}</div> : <div className="analytics-chart__empty">{description}</div>}
  </section>;
}

export function MetricDefinitions() {
  return <details className="metric-definitions"><summary>METRIC DEFINITIONS <span>FORMULAS / OBSERVED SIMULATION</span></summary><div className="metric-definitions__grid">
    <Formula title="Waiting Time" formula="Service Start − Arrival" />
    <Formula title="Service Time" formula="Service End − Service Start" />
    <Formula title="Average Waiting" formula="Total Waiting / Served Customers" />
    <Formula title="Throughput" formula="Completed Transactions / Simulation Time" />
    <Formula title="Counter Utilization" formula="Busy Counter Time / Available Counter Time × 100" />
    <Formula title="Staff Utilization" formula="Busy Staff Time / Available Staff Time × 100" />
    <Formula title="Queue Length" formula="Arrived customers not yet in service at the observation time" />
    <Formula title="Little’s Law" formula="Observed L ≈ Arrival Rate (λ) × Average Time in System (W)" />
  </div></details>;
}

function Formula({ title, formula }: { title: string; formula: string }) {
  return <div className="metric-definition"><b>{title}</b><span>{formula}</span></div>;
}
