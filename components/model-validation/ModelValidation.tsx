"use client";

import { useCallback, useEffect, useState } from "react";
import { getMlEvaluation, getMlStatus, resetMlModels, type MlStatusResponse } from "../../lib/api";
import ConfusionMatrix from "./ConfusionMatrix";
import FeatureImportance from "./FeatureImportance";

type DataRecord = Record<string, unknown>;
type EvaluationPayload = { status: unknown; training: unknown; regression: unknown; classification: unknown };
type FeatureImportanceItem = { feature: string; importance: number };

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const LIMITATIONS = [
  "Synthetic data may not represent real customer behavior.",
  "Historical relationships may not remain stable.",
  "Dataset imbalance can affect classification performance.",
  "Small datasets may produce unstable evaluation results.",
  "High model accuracy does not guarantee real-world operational reliability.",
  "Real deployment would require authorized institutional validation.",
];

function asRecord(value: unknown): DataRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as DataRecord : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function importanceItems(value: unknown): FeatureImportanceItem[] | null {
  if (!Array.isArray(value) || !value.every((item) => {
    const record = asRecord(item);
    return record && typeof record.feature === "string" && asNumber(record.importance) !== null;
  })) return null;
  return value as FeatureImportanceItem[];
}

function matrixValues(value: unknown): number[][] | null {
  if (!Array.isArray(value) || !value.every((row) => Array.isArray(row) && row.every((cell) => Number.isInteger(cell)))) return null;
  return value as number[][];
}

function displayMetric(value: unknown): string {
  const number = asNumber(value);
  return number === null ? "—" : number.toFixed(4);
}

function statusClass(status: string): string {
  if (status === "TRAINED") return "is-trained";
  if (status === "ERROR") return "is-error";
  return "is-pending";
}

function ModelCard({ title, target, status }: { title: string; target: string; status: string }) {
  return (
    <article className="validation-model-card">
      <div className="validation-model-card__top"><span className="mono-label">{title}</span><span className={`validation-status ${statusClass(status)}`}>{status}</span></div>
      <h2>{title === "WAITING-TIME REGRESSOR" ? "Random Forest Regressor" : "Random Forest Classifier"}</h2>
      <dl><div><dt>ALGORITHM</dt><dd>{title === "WAITING-TIME REGRESSOR" ? "Random Forest Regressor" : "Random Forest Classifier"}</dd></div><div><dt>TARGET</dt><dd>{target}</dd></div></dl>
    </article>
  );
}

function MetricGrid({ metrics, labels, evaluated }: { metrics: DataRecord | null; labels: Array<[string, string]>; evaluated: number | null }) {
  if (!metrics) return <p className="validation-empty">MODEL NOT TRAINED</p>;
  return <>
    <div className="validation-metric-grid">
      {labels.map(([key, label]) => <div className="validation-metric" key={key}><span>{label}</span><b>{displayMetric(metrics[key])}</b></div>)}
    </div>
    <p className="validation-note">Evaluation samples: {evaluated ?? "NOT AVAILABLE"} · values from held-out test predictions.</p>
  </>;
}

function DatasetDetails({ evaluation, title }: { evaluation: DataRecord | null; title: string }) {
  if (!evaluation) return null;
  const dataset = asRecord(evaluation.dataset);
  const sampleCount = asNumber(evaluation.sample_count);
  const trainCount = asNumber(evaluation.train_count);
  const testCount = asNumber(evaluation.test_count);
  const features = Array.isArray(evaluation.features) ? evaluation.features.length : null;
  const splitTotal = trainCount !== null && testCount !== null ? trainCount + testCount : null;
  const trainPercent = splitTotal ? (trainCount! / splitTotal) * 100 : null;
  const testPercent = splitTotal ? (testCount! / splitTotal) * 100 : null;
  return (
    <dl className="validation-metadata" aria-label={`${title} training metadata`}>
      <div><dt>DATASET</dt><dd>{typeof dataset?.name === "string" ? dataset.name : "NOT RECORDED"}</dd></div>
      <div><dt>SOURCE</dt><dd>{typeof dataset?.source === "string" ? dataset.source : "NOT RECORDED"}</dd></div>
      <div><dt>TOTAL ROWS</dt><dd>{asNumber(dataset?.total_rows) ?? "NOT RECORDED"}</dd></div>
      <div><dt>VALID SAMPLES</dt><dd>{sampleCount ?? "—"}</dd></div>
      <div><dt>TRAINING ROWS</dt><dd>{trainCount ?? "—"}</dd></div>
      <div><dt>TESTING ROWS</dt><dd>{testCount ?? "—"}</dd></div>
      <div><dt>FEATURES</dt><dd>{features ?? "—"}</dd></div>
      <div><dt>TRAIN / TEST SPLIT</dt><dd>{trainPercent === null || testPercent === null ? "—" : `${trainPercent.toFixed(1)}% / ${testPercent.toFixed(1)}%`}</dd></div>
      <div><dt>RANDOM STATE</dt><dd>{asNumber(evaluation.random_state) ?? "—"}</dd></div>
    </dl>
  );
}

function ConfusionSummary({ classification }: { classification: DataRecord | null }) {
  const diagnostic = asRecord(classification?.["HIGH-RISK BINARY DIAGNOSTIC"]);
  const labels = [["TP", "TRUE POSITIVE"], ["TN", "TRUE NEGATIVE"], ["FP", "FALSE POSITIVE"], ["FN", "FALSE NEGATIVE"]] as const;
  if (!diagnostic) return <p className="validation-empty">EVALUATION UNAVAILABLE</p>;
  return <>
    <div className="validation-risk-grid">{labels.map(([key, label]) => <div key={key}><span>{label}</span><b>{asNumber(diagnostic[key]) ?? "—"}</b></div>)}</div>
    <p className="validation-note">False negatives are actual HIGH or CRITICAL cases missed by the classifier; they can conceal elevated operational risk from monitoring.</p>
  </>;
}

export default function ModelValidation() {
  const [status, setStatus] = useState<MlStatusResponse | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEvaluation = useCallback(async () => {
    setWorking(true);
    setError(null);
    try {
      const [nextStatus, nextEvaluation] = await Promise.all([getMlStatus(), getMlEvaluation()]);
      setStatus(nextStatus);
      setEvaluation(nextEvaluation);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Evaluation could not be loaded.");
    } finally {
      setLoading(false);
      setWorking(false);
    }
  }, []);

  async function handleReset() {
    setWorking(true);
    setError(null);
    try {
      await resetMlModels();
      await refreshEvaluation();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Model reset failed.");
      setWorking(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMlStatus(), getMlEvaluation()])
      .then(([nextStatus, nextEvaluation]) => {
        if (cancelled) return;
        setStatus(nextStatus);
        setEvaluation(nextEvaluation);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Evaluation could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const regression = asRecord(evaluation?.regression);
  const classification = asRecord(evaluation?.classification);
  const regressionMetrics = asRecord(regression?.metrics);
  const classificationMetrics = asRecord(classification?.metrics);
  const unavailableStatus = loading ? "LOADING" : "UNAVAILABLE";
  const regStatus = status?.regression_model_status ?? unavailableStatus;
  const clsStatus = status?.risk_model_status ?? unavailableStatus;
  const errors = [regression?.error, classification?.error].filter((value): value is string => typeof value === "string");
  const warnings = new Set<string>();
  if (regStatus === "NOT_TRAINED" || clsStatus === "NOT_TRAINED") warnings.add("MODEL NOT TRAINED");
  if (!regressionMetrics || !classificationMetrics) warnings.add("EVALUATION UNAVAILABLE");
  if (errors.some((message) => /not enough|insufficient|no valid/i.test(message))) warnings.add("INSUFFICIENT DATA");
  if (errors.some((message) => /missing|required feature/i.test(message))) warnings.add("MISSING FEATURES");
  if (classification?.class_imbalance_warning === true) warnings.add("CLASS IMBALANCE WARNING");
  const confusion = matrixValues(classification?.confusion_matrix);
  const trainingDataset = asRecord(regression?.dataset) ?? asRecord(classification?.dataset);
  const classDistribution = asRecord(classification?.class_distribution);

  return (
    <div className="operations-view model-validation-view">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow__line" /> INSIGHTS / RESEARCH EVALUATION</div><h1>MODEL VALIDATION</h1><p className="page-heading__subtitle">Transparent held-out evaluation of trained BANKTWIN models.</p></div>
        <div className="validation-toolbar">
          <button type="button" className="twin-control-button" onClick={() => void refreshEvaluation()} disabled={working}>{working ? "REFRESHING…" : "REFRESH EVALUATION"}</button>
          <button type="button" className="twin-control-button validation-reset-button" onClick={() => void handleReset()} disabled={working || (!status && !evaluation)}>RESET MODEL</button>
        </div>
      </div>

      {error && <div className="simulation-error dataset-error" role="alert"><span>!</span><div><b>VALIDATION REQUEST FAILED</b><p>{error}</p></div><button type="button" onClick={() => setError(null)} aria-label="Dismiss validation error">×</button></div>}
      {loading && <p className="validation-loading" role="status">LOADING STORED MODEL EVALUATION…</p>}
      {warnings.size > 0 && <div className="validation-warnings" role="status">{[...warnings].map((warning) => <span className="validation-warning" key={warning}>{warning}</span>)}</div>}

      <section className="validation-model-grid" aria-label="Model status overview">
        <ModelCard title="WAITING-TIME REGRESSOR" target="Waiting Time" status={regStatus} />
        <ModelCard title="OPERATIONAL RISK CLASSIFIER" target="Risk Level" status={clsStatus} />
      </section>

      <section className="validation-panel-grid" aria-label="Regression evaluation">
        <article className="validation-panel">
          <div className="validation-panel-heading"><div><span className="section-heading__index">01</span><h2>REGRESSION EVALUATION</h2></div><span className="mono-label">RANDOM FOREST / WAITING_TIME</span></div>
          <MetricGrid metrics={regressionMetrics} labels={[["mae", "MAE"], ["rmse", "RMSE"], ["r2", "R²"]]} evaluated={asNumber(regression?.test_count)} />
          <div className="validation-definition-grid"><div><b>MAE</b><p>Average absolute prediction error in the same unit as waiting time.</p></div><div><b>RMSE</b><p>Penalizes larger prediction errors more strongly.</p></div><div><b>R²</b><p>Measures how much variation in waiting time is explained by the model.</p></div></div>
          <DatasetDetails evaluation={regression} title="Regression" />
        </article>

        <article className="validation-panel">
          <div className="validation-panel-heading"><div><span className="section-heading__index">02</span><h2>CLASSIFICATION EVALUATION</h2></div><span className="mono-label">RANDOM FOREST / RISK_LEVEL</span></div>
          <MetricGrid metrics={classificationMetrics} labels={[["accuracy", "ACCURACY"], ["precision", "PRECISION"], ["recall", "RECALL"], ["f1", "F1 SCORE"]]} evaluated={asNumber(classification?.test_count)} />
          {classificationMetrics && <p className="validation-note">Multiclass averaging: {classification?.averaging === "weighted" ? "Weighted Average" : String(classification?.averaging ?? "NOT RECORDED")}.</p>}
          <ConfusionMatrix values={confusion} />
          <DatasetDetails evaluation={classification} title="Classification" />
        </article>
      </section>

      <section className="validation-panel-grid validation-panel-grid--secondary" aria-label="Feature importance and risk diagnostic">
        <article className="validation-panel">
          <div className="validation-panel-heading"><div><span className="section-heading__index">03</span><h2>REGRESSION FEATURE IMPORTANCE</h2></div></div>
          <FeatureImportance items={importanceItems(regression?.feature_importance)} />
          <div className="validation-panel-heading validation-panel-heading--sub"><div><span className="section-heading__index">04</span><h2>CLASSIFIER FEATURE IMPORTANCE</h2></div></div>
          <FeatureImportance items={importanceItems(classification?.feature_importance)} />
        </article>

        <article className="validation-panel">
          <div className="validation-panel-heading"><div><span className="section-heading__index">05</span><h2>HIGH-RISK BINARY DIAGNOSTIC</h2></div></div>
          <ConfusionSummary classification={classification} />
          <div className="validation-panel-heading validation-panel-heading--sub"><div><span className="section-heading__index">06</span><h2>TRAINING CLASS DISTRIBUTION</h2></div></div>
          {classDistribution ? <dl className="validation-class-counts">{RISK_LEVELS.map((level) => <div key={level}><dt>{level}</dt><dd>{asNumber(classDistribution[level]) ?? "—"}</dd></div>)}</dl> : <p className="validation-empty">EVALUATION UNAVAILABLE</p>}
          {classification?.class_imbalance_warning === true && <p className="validation-warning validation-warning--inline">CLASS IMBALANCE WARNING · At least one class is below 10% of training samples. No resampling was applied.</p>}
        </article>
      </section>

      <section className="validation-summary" aria-label="Validation summary">
        <div className="validation-panel-heading"><div><span className="section-heading__index">07</span><h2>VALIDATION SUMMARY</h2></div><span className="mono-label">NO COMBINED MODEL SCORE</span></div>
        <div className="validation-summary-grid">
          <div><h3>REGRESSION · WAITING TIME</h3><p>MAE <b>{displayMetric(regressionMetrics?.mae)}</b></p><p>RMSE <b>{displayMetric(regressionMetrics?.rmse)}</b></p><p>R² <b>{displayMetric(regressionMetrics?.r2)}</b></p></div>
          <div><h3>CLASSIFICATION · RISK LEVEL</h3><p>Accuracy <b>{displayMetric(classificationMetrics?.accuracy)}</b></p><p>Precision <b>{displayMetric(classificationMetrics?.precision)}</b></p><p>Recall <b>{displayMetric(classificationMetrics?.recall)}</b></p><p>F1 <b>{displayMetric(classificationMetrics?.f1)}</b></p></div>
          <div><h3>HIGH-RISK DIAGNOSTIC</h3><p>TP <b>{asNumber(asRecord(classification?.["HIGH-RISK BINARY DIAGNOSTIC"])?.TP) ?? "—"}</b></p><p>TN <b>{asNumber(asRecord(classification?.["HIGH-RISK BINARY DIAGNOSTIC"])?.TN) ?? "—"}</b></p><p>FP <b>{asNumber(asRecord(classification?.["HIGH-RISK BINARY DIAGNOSTIC"])?.FP) ?? "—"}</b></p><p>FN <b>{asNumber(asRecord(classification?.["HIGH-RISK BINARY DIAGNOSTIC"])?.FN) ?? "—"}</b></p></div>
        </div>
      </section>

      <section className="validation-research-grid">
        <article className="validation-panel"><div className="validation-panel-heading"><div><span className="section-heading__index">08</span><h2>RESEARCH INTERPRETATION</h2></div></div><p>The waiting-time model estimates operational waiting time from branch conditions. The risk classifier categorizes operational risk from queue, waiting, staffing, utilization, and workload conditions. Metrics depend on dataset quality and representativeness. Synthetic-data performance is not proof of real-bank deployment performance.</p>{trainingDataset && <p className="validation-note">Evaluated dataset: {String(trainingDataset.name ?? "NOT RECORDED")} · {String(trainingDataset.source ?? "SOURCE NOT RECORDED")}.</p>}</article>
        <article className="validation-panel"><div className="validation-panel-heading"><div><span className="section-heading__index">09</span><h2>MODEL LIMITATIONS</h2></div></div><ul className="validation-limitations">{LIMITATIONS.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></article>
      </section>
    </div>
  );
}
