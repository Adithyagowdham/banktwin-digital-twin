interface MetricCardProps {
  label: string;
  index: string;
  value: string | null;
}

export default function MetricCard({ label, index, value }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__topline">
        <span className="metric-card__index">{index}</span>
        <span className="metric-card__signal" aria-hidden="true" />
      </div>
      <p className="metric-card__label">{label}</p>
      <div className="metric-card__value" aria-label={`${label}: ${value ?? "no data"}`}>
        <span>{value ?? "—"}</span>
        <span className="metric-card__unit">{value === null ? "NO DATA" : "LATEST RUN"}</span>
      </div>
      <div className="metric-card__baseline" aria-hidden="true" />
    </article>
  );
}
