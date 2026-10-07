type ImportanceItem = { feature: string; importance: number };

export default function FeatureImportance({ items }: { items: ImportanceItem[] | null }) {
  if (!items?.length) return <p className="validation-empty">FEATURE IMPORTANCE NOT AVAILABLE</p>;

  return (
    <ol className="validation-importance-list">
      {items.map((item, index) => (
        <li key={`${item.feature}-${index}`}>
          <span className="validation-importance-rank">{String(index + 1).padStart(2, "0")}</span>
          <span className="validation-importance-name" title={item.feature}>{item.feature}</span>
          <span className="validation-importance-track"><i style={{ width: `${Math.max(0, Math.min(100, item.importance * 100))}%` }} /></span>
          <span className="validation-importance-value">{item.importance.toFixed(4)}</span>
        </li>
      ))}
    </ol>
  );
}
