import type { DatasetCell, DatasetRecord } from "../../lib/datasetTypes";

function displayCell(value: DatasetCell | undefined): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export default function DatasetPreview({ dataset }: { dataset: DatasetRecord }) {
  const previewRows = dataset.rows.slice(0, 25);
  return <section className="dataset-panel"><div className="dataset-section-heading"><div><span className="section-heading__index">02</span><h2>DATA PREVIEW</h2></div><span>{previewRows.length} SHOWN / {dataset.rows.length} ROWS</span></div>
    {dataset.columns.length === 0 ? <p className="dataset-panel__empty">NO COLUMNS FOUND IN THE SELECTED SHEET</p> : <div className="dataset-table-scroll"><table className="dataset-table"><thead><tr><th>#</th>{dataset.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{previewRows.map((row, index) => <tr key={`preview-${index}`}><td>{index + 1}</td>{dataset.columns.map((column) => <td key={column}>{displayCell(row[column])}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}
