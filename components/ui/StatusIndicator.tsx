interface StatusIndicatorProps {
  label: string;
  tone?: "online" | "neutral";
  compact?: boolean;
}

export default function StatusIndicator({
  label,
  tone = "online",
  compact = false,
}: StatusIndicatorProps) {
  return (
    <span className={`status-indicator status-indicator--${tone}${compact ? " status-indicator--compact" : ""}`}>
      <span className="status-indicator__dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
