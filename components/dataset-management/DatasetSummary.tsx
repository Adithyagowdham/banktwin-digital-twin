import { EXPECTED_DATASET_COLUMNS, type DatasetRecord } from "../../lib/datasetTypes";
import { formatFileSize, normalizeColumnName } from "../../lib/datasetProcessing";

export default function DatasetSummary({ dataset }: { dataset: DatasetRecord }) {
  const availableKeys = new Set(dataset.columns.map(normalizeColumnName));
  const available = EXPECTED_DATASET_COLUMNS.filter((column) => availableKeys.has(normalizeColumnName(column)));
  const missing = EXPECTED_DATASET_COLUMNS.filter((column) => !availableKeys.has(normalizeColumnName(column)));
  const statistics = [
    ["ROWS", dataset.summary.rows],
    ["COLUMNS", dataset.summary.columns],
    ["MISSING VALUES", dataset.summary.missingValues],
    ["DUPLICATE ROWS", dataset.summary.duplicateRows],
  ];
  return <section className="dataset-summary-panel"><div className="dataset-section-heading"><div><span className="section-heading__index">01</span><h2>DATASET LIBRARY</h2></div><span className="dataset-source-tag">{dataset.source}</span></div>
    <div className="dataset-file-meta"><div><span>DATASET NAME</span><b>{dataset.name}</b></div><div><span>FILE TYPE</span><b>{dataset.fileType || "GENERATED"}</b></div><div><span>FILE SIZE</span><b>{dataset.sizeBytes ? formatFileSize(dataset.sizeBytes) : "LOCAL GENERATED"}</b></div><div><span>LOAD STATUS</span><b className="dataset-state-valid">LOADED</b></div><div><span>LOADED AT</span><b>{new Date(dataset.loadedAt).toLocaleString()}</b></div></div>
    <div className="dataset-summary-kpis">{statistics.map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}</div>
    <div className="dataset-schema"><div className="dataset-schema__group"><b>AVAILABLE COLUMNS <i>{available.length}</i></b><div>{available.length ? available.map((column) => <span className="dataset-column-chip dataset-column-chip--available" key={column}>{column}</span>) : <small>NONE</small>}</div></div><div className="dataset-schema__group"><b>MISSING EXPECTED COLUMNS <i>{missing.length}</i></b><div>{missing.length ? missing.map((column) => <span className="dataset-column-chip dataset-column-chip--missing" key={column}>{column}</span>) : <small>NONE</small>}</div></div></div>
  </section>;
}
