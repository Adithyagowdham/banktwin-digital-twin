const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export default function ConfusionMatrix({ values }: { values: number[][] | null }) {
  if (!values || values.length !== RISK_LEVELS.length || values.some((row) => row.length !== RISK_LEVELS.length)) {
    return <p className="validation-empty">EVALUATION UNAVAILABLE</p>;
  }

  return (
    <div className="validation-table-wrap">
      <table className="validation-confusion-table">
        <caption>Rows: actual class. Columns: predicted class.</caption>
        <thead>
          <tr><th scope="col">ACTUAL / PREDICTED</th>{RISK_LEVELS.map((label) => <th scope="col" key={label}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {values.map((row, rowIndex) => (
            <tr key={RISK_LEVELS[rowIndex]}>
              <th scope="row">{RISK_LEVELS[rowIndex]}</th>
              {row.map((value, columnIndex) => <td className={rowIndex === columnIndex ? "is-diagonal" : undefined} key={RISK_LEVELS[columnIndex]}>{value}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="validation-note">Correct predictions appear on the diagonal. Positive class: HIGH + CRITICAL; negative class: LOW + MEDIUM.</p>
    </div>
  );
}
