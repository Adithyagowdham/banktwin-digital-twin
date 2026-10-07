import type { MlStatusResponse } from "../../lib/api";
import ConfusionMatrix from "../model-validation/ConfusionMatrix";
import FeatureImportance from "../model-validation/FeatureImportance";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordValue : null;
}

function metric(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(4) : "—";
}

function importance(value: unknown): Array<{ feature: string; importance: number }> | null {
  if (!Array.isArray(value) || !value.every((item) => {
    const row = asRecord(item);
    return row && typeof row.feature === "string" && typeof row.importance === "number";
  })) return null;
  return value as Array<{ feature: string; importance: number }>;
}

function matrix(value: unknown): number[][] | null {
  if (!Array.isArray(value) || !value.every((row) => Array.isArray(row) && row.every((cell) => Number.isInteger(cell)))) return null;
  return value as number[][];
}

function ModelHeader({ name, algorithm, target, status }: { name: string; algorithm: string; target: string; status: string }) {
  return <div className="report-model-header"><div><span className="mono-label">{name}</span><h3>{algorithm}</h3><p>TARGET / {target}</p></div><b className={`report-model-state ${status === "TRAINED" ? "is-trained" : status === "ERROR" ? "is-error" : ""}`}>{status}</b></div>;
}

export default function MLReport({ status, evaluation }: { status: MlStatusResponse | null; evaluation: unknown }) {
  const evaluationRecord = asRecord(evaluation);
  const regression = asRecord(evaluationRecord?.regression);
  const classification = asRecord(evaluationRecord?.classification);
  const regressionMetrics = asRecord(regression?.metrics);
  const classificationMetrics = asRecord(classification?.metrics);
  const regressionState = status?.regression_model_status ?? "UNAVAILABLE";
  const classifierState = status?.risk_model_status ?? "UNAVAILABLE";
  const regressionAvailable = regressionState === "TRAINED" && regression?.status === "TRAINED" && regressionMetrics;
  const classificationAvailable = classifierState === "TRAINED" && classification?.status === "TRAINED" && classificationMetrics;
  const diagnostic = asRecord(classification?.["HIGH-RISK BINARY DIAGNOSTIC"]);
  const classDistribution = asRecord(classification?.class_distribution);
  const dataset = asRecord(regression?.dataset) ?? asRecord(classification?.dataset);
  const source = typeof dataset?.source === "string" ? dataset.source : "DATASET SOURCE NOT RECORDED";

  return <section className="report-panel report-ml-panel" aria-label="Machine learning report">
    <div className="report-section-heading"><div><span className="section-heading__index">08</span><h2>ML SUMMARY</h2></div><span className="report-source-tag">STORED BACKEND EVALUATION · {source}</span></div>
    <div className="report-grid-two">
      <article className="report-model-card">
        <ModelHeader name="WAITING-TIME REGRESSOR" algorithm="Random Forest Regressor" target="Waiting Time" status={regressionState} />
        {regressionAvailable ? <><div className="report-model-metrics"><div><span>MAE</span><b>{metric(regressionMetrics.mae)}</b></div><div><span>RMSE</span><b>{metric(regressionMetrics.rmse)}</b></div><div><span>R²</span><b>{metric(regressionMetrics.r2)}</b></div></div><p className="report-source-note">TEST SAMPLES / {String(regression?.test_count ?? "NOT RECORDED")} · DATASET / {String(dataset?.name ?? "NOT RECORDED")}</p><div className="report-feature-block"><span>WAITING-TIME FEATURE IMPORTANCE</span><FeatureImportance items={importance(regression?.feature_importance)} /></div></> : <p className="report-no-data-copy">{regressionState === "ERROR" ? "MODEL TRAINING ERROR" : regressionState === "UNAVAILABLE" ? "MODEL STATUS UNAVAILABLE" : "MODEL NOT TRAINED"}</p>}
      </article>
      <article className="report-model-card">
        <ModelHeader name="OPERATIONAL RISK CLASSIFIER" algorithm="Random Forest Classifier" target="Risk Level" status={classifierState} />
        {classificationAvailable ? <><div className="report-model-metrics report-model-metrics--four">{[["ACCURACY", "accuracy"], ["PRECISION", "precision"], ["RECALL", "recall"], ["F1", "f1"]].map(([label, key]) => <div key={key}><span>{label}</span><b>{metric(classificationMetrics[key])}</b></div>)}</div><p className="report-source-note">TEST SAMPLES / {String(classification?.test_count ?? "NOT RECORDED")} · AVERAGING / {classification?.averaging === "weighted" ? "WEIGHTED" : String(classification?.averaging ?? "NOT RECORDED")} · DATASET / {String(asRecord(classification?.dataset)?.name ?? "NOT RECORDED")}</p>
          {classDistribution && <dl className="report-class-distribution">{["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((risk) => <div key={risk}><dt>{risk}</dt><dd>{typeof classDistribution[risk] === "number" ? classDistribution[risk] : "—"}</dd></div>)}</dl>}
          {classification?.class_imbalance_warning === true && <p className="validation-warning validation-warning--inline">CLASS IMBALANCE WARNING · Class distribution is from the training partition; no resampling was applied.</p>}
          <ConfusionMatrix values={matrix(classification?.confusion_matrix)} />
          {diagnostic && <div className="report-binary-diagnostic"><span>HIGH-RISK BINARY DIAGNOSTIC</span>{([["TP", "TRUE POSITIVE"], ["TN", "TRUE NEGATIVE"], ["FP", "FALSE POSITIVE"], ["FN", "FALSE NEGATIVE"]] as const).map(([key, label]) => <div key={key}><small>{label}</small><b>{typeof diagnostic[key] === "number" ? diagnostic[key] : "—"}</b></div>)}</div>}
          <div className="report-feature-block"><span>RISK CLASSIFIER FEATURE IMPORTANCE</span><FeatureImportance items={importance(classification?.feature_importance)} /></div>
        </> : <p className="report-no-data-copy">{classifierState === "ERROR" ? "MODEL TRAINING ERROR" : classifierState === "UNAVAILABLE" ? "MODEL STATUS UNAVAILABLE" : "MODEL NOT TRAINED"}</p>}
      </article>
    </div>
  </section>;
}
