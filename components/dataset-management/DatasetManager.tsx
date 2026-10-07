"use client";

import { useRef, useState } from "react";
import { buildDataset, datasetToCsv, formatFileSize, generateSyntheticDataset, parseLocalSpreadsheet } from "../../lib/datasetProcessing";
import { useDataset } from "../../lib/DatasetContext";
import { DatasetColumns, DatasetQuality } from "./DatasetColumns";
import DatasetPreview from "./DatasetPreview";
import DatasetSummary from "./DatasetSummary";

type UploadStatus = "IDLE" | "PROCESSING" | "LOADED" | "ERROR";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export default function DatasetManager() {
  const { dataset, loadDataset, clearDataset } = useDataset();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("IDLE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerCount, setCustomerCount] = useState(100);
  const [seed, setSeed] = useState(42);

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["csv", "xlsx", "xls"].includes(extension)) {
      setUploadStatus("ERROR");
      setError("UNSUPPORTED FILE TYPE · SELECT CSV, XLSX, OR XLS.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadStatus("ERROR");
      setError("FILE TOO LARGE · LOCAL PROCESSING LIMIT IS 25 MB.");
      return;
    }
    setUploadStatus("PROCESSING");
    try {
      const input = await parseLocalSpreadsheet(file);
      if (input.columns.length === 0) throw new Error("The selected file does not contain column headers.");
      loadDataset(buildDataset(input));
      setUploadStatus("LOADED");
    } catch (parseError) {
      setUploadStatus("ERROR");
      setError(parseError instanceof Error ? parseError.message : "FILE COULD NOT BE READ.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function generateDataset() {
    setError(null);
    setSelectedFile(null);
    setUploadStatus("PROCESSING");
    try {
      const input = generateSyntheticDataset(customerCount, seed);
      loadDataset(buildDataset(input));
      setUploadStatus("LOADED");
    } catch (generationError) {
      setUploadStatus("ERROR");
      setError(generationError instanceof Error ? generationError.message : "SYNTHETIC DATASET GENERATION FAILED.");
    }
  }

  function downloadCsv() {
    if (!dataset) return;
    const blob = new Blob([datasetToCsv(dataset)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = dataset.name.replace(/\.[^.]+$/, "") + ".csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clearCurrentDataset() {
    clearDataset();
    setSelectedFile(null);
    setUploadStatus("IDLE");
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  return <div className="operations-view dataset-management-view">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> INSIGHTS / DATA OPERATIONS</div><h1>DATASET MANAGEMENT <span>{"//"}</span> WORKSPACE</h1><p className="page-heading__subtitle">Inspect, validate, and prepare local structured datasets</p></div><div className="page-heading__meta"><span className={`dataset-quality-badge dataset-quality-badge--${dataset?.quality.status.toLowerCase() ?? "neutral"}`}>{dataset ? dataset.quality.status : "NO DATASET"}</span><span className="mono-label">PROCESSING / BROWSER-LOCAL</span></div></div>

    <section className="dataset-action-grid" aria-label="Load local dataset">
      <div className="dataset-action-card"><div className="dataset-section-heading"><div><span className="section-heading__index">01</span><h2>LOCAL FILE IMPORT</h2></div><span>CSV · XLSX · XLS</span></div><p>Choose a dataset file for in-browser inspection. File contents are not sent to the BANKTWIN backend.</p><input ref={fileInput} className="dataset-file-input" type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => void loadFile(event.target.files?.[0])} aria-label="Select local CSV or Excel file" /><button type="button" className="dataset-primary-button" onClick={() => fileInput.current?.click()} disabled={uploadStatus === "PROCESSING"}>{uploadStatus === "PROCESSING" ? "PROCESSING LOCALLY…" : "SELECT LOCAL FILE"}</button><div className="dataset-selected-file"><span>SELECTED FILE</span><b>{selectedFile?.name ?? "NO FILE SELECTED"}</b><span>TYPE / {selectedFile?.name.split(".").pop()?.toUpperCase() ?? "—"} · SIZE / {selectedFile ? formatFileSize(selectedFile.size) : "—"} · STATUS / {uploadStatus}</span></div></div>
      <div className="dataset-action-card dataset-synthetic-card"><div className="dataset-section-heading"><div><span className="section-heading__index">02</span><h2>GENERATE SYNTHETIC DATA</h2></div><span className="dataset-source-tag">SYNTHETIC / SIMULATED</span></div><p>Create a deterministic local dataset for interface exploration. Generated values are explicitly synthetic.</p><div className="dataset-generator-fields"><label><span>NUMBER OF CUSTOMERS</span><input type="number" min="1" max="5000" step="1" value={customerCount} onChange={(event) => setCustomerCount(Math.max(1, Math.min(5000, Number(event.target.value) || 1)))} /></label><label><span>RANDOM SEED</span><input type="number" step="1" value={seed} onChange={(event) => setSeed(Number(event.target.value) || 0)} /></label></div><button type="button" className="dataset-primary-button dataset-primary-button--synthetic" onClick={generateDataset} disabled={uploadStatus === "PROCESSING"}>GENERATE SYNTHETIC DATA</button><div className="dataset-selected-file"><span>GENERATION STATUS</span><b>{dataset?.source === "SYNTHETIC / SIMULATED DATA" ? "SYNTHETIC DATASET LOADED" : "NO GENERATED DATA"}</b><span>DETERMINISTIC GENERATOR · SEED {seed}</span></div></div>
    </section>
    {error && <div className="simulation-error dataset-error" role="alert"><span>!</span><div><b>DATASET LOAD FAILED</b><p>{error}</p></div><button type="button" onClick={() => setError(null)} aria-label="Dismiss dataset error">×</button></div>}

    {dataset ? <>
      <DatasetSummary dataset={dataset} />
      <div className="dataset-data-grid"><DatasetQuality dataset={dataset} /><DatasetColumns dataset={dataset} /></div>
      <DatasetPreview dataset={dataset} />
      <div className="dataset-actions-footer"><div><span className="dataset-footer-note">SOURCE: {dataset.source} · LOCAL BROWSER PROCESSING · ORIGINAL DATA UNCHANGED</span><span className="dataset-footer-note">DATASET STATUS / {dataset.quality.status} · QUALITY FLAGS DO NOT MODIFY VALUES</span></div><div><button type="button" className="dataset-download-button" onClick={downloadCsv}>DOWNLOAD CSV</button><button type="button" className="dataset-clear-button" onClick={clearCurrentDataset}>CLEAR DATASET</button></div></div>
    </> : <section className="records-empty surface-card dataset-empty"><span className="records-empty__glyph" aria-hidden="true">∅</span><span className="records-empty__code">DATASET / LOCAL_INSPECTION</span><h2>NO DATASET LOADED</h2><p>Upload a CSV/XLSX file or generate synthetic data to begin.</p><span className="outline-tag">BROWSER-LOCAL · NO REMOTE UPLOAD</span></section>}

    <section className="dataset-governance" aria-label="Data governance notes"><div><span className="dataset-governance__marker">i</span><div><h2>DATA GOVERNANCE</h2><p>BANKTWIN is a research prototype. Real banking data may contain sensitive information; do not upload confidential customer information. Public datasets should use aggregate or non-identifying records.</p></div></div><div><span className="dataset-governance__marker">i</span><div><h2>PUBLIC / RBI DATA SCOPE</h2><p>Public/RBI datasets generally provide aggregate indicators, not individual waiting times, queue lengths, or staff/counter utilization. Operational fields may require synthetic simulation, controlled experiments, or authorized institutional datasets. BANKTWIN does not access private banking data.</p></div></div></section>
  </div>;
}
