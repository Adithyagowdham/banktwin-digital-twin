"use client";

import { useEffect, useMemo, useState } from "react";
import { getMlStatus, predictRisk, predictWaitingTime, trainMlModels } from "../../lib/api";
import { useDataset } from "../../lib/DatasetContext";

const WAITING_INPUT_TEMPLATE = {
  Arrival_Rate: 8,
  Queue_Length: 6,
  Active_Counters: 3,
  Counter_Utilization: 72,
  Staff_Available: 4,
  Staff_Utilization: 67,
  Avg_Service_Time: 6,
  Transaction_Type: "Deposit",
  Priority: "Normal",
  Current_Workload: 24,
};

const RISK_INPUT_TEMPLATE = {
  Queue_Length: 8,
  Waiting_Time: 9,
  Arrival_Rate: 10,
  Staff_Available: 4,
  Counter_Utilization: 78,
  Staff_Utilization: 70,
  Service_Time: 7,
  Current_Workload: 33,
};

export default function AIRiskPrediction() {
  const { dataset } = useDataset();
  const [status, setStatus] = useState<{ regression_model_status: string; risk_model_status: string; training_status: string; last_training: Record<string, unknown> | null } | null>(null);
  const [trainingState, setTrainingState] = useState<"idle" | "training" | "ready" | "error">("idle");
  const [trainingResult, setTrainingResult] = useState<Record<string, unknown> | null>(null);
  const [waitingPrediction, setWaitingPrediction] = useState<{ predicted_waiting_time: number } | null>(null);
  const [riskPrediction, setRiskPrediction] = useState<{ predicted_risk: string; "MODEL ESTIMATED PROBABILITY": Record<string, number> } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function refreshStatus() {
    try {
      const nextStatus = await getMlStatus();
      setStatus(nextStatus);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "ML status could not be loaded.");
    }
  }

  const sourceRows = useMemo(() => dataset?.rows ?? [], [dataset]);

  async function handleTrain() {
    if (!dataset) {
      setError("Load a dataset before training the models.");
      return;
    }

    setTrainingState("training");
    setError(null);

    try {
      const result = await trainMlModels(sourceRows as Record<string, unknown>[], {
        name: dataset.name,
        source: dataset.source,
        total_rows: dataset.rows.length,
      });
      setTrainingResult(result);
      await refreshStatus();
      setTrainingState("ready");
    } catch (trainError) {
      setTrainingState("error");
      setError(trainError instanceof Error ? trainError.message : "Model training failed.");
    }
  }

  async function handlePredict() {
    if (isPredicting) return;
    setIsPredicting(true);
    setError(null);
    try {
      const waiting = await predictWaitingTime(WAITING_INPUT_TEMPLATE);
      const risk = await predictRisk(RISK_INPUT_TEMPLATE);
      setWaitingPrediction(waiting);
      setRiskPrediction(risk);
      setError(null);
    } catch (predictError) {
      setError(predictError instanceof Error ? predictError.message : "Prediction failed.");
    } finally {
      setIsPredicting(false);
    }
  }

  const mostLikelyRisk = riskPrediction
    ? Object.entries(riskPrediction["MODEL ESTIMATED PROBABILITY"]).sort((left, right) => right[1] - left[1])[0]
    : null;
  const modelStatus = status?.training_status ?? (error ? "UNAVAILABLE" : "LOADING");

  if (!dataset) {
    return <div className="operations-view ai-risk-view"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> INTELLIGENCE / PREDICTIVE MODELS</div><h1>AI RISK PREDICTION <span>{"//"}</span> STANDBY</h1><p className="page-heading__subtitle">Train local ML models from the active dataset to forecast waiting time and operational risk.</p></div></div><section className="records-empty surface-card"><span className="records-empty__glyph" aria-hidden="true">∅</span><span className="records-empty__code">DATASET / MODEL TRAINING</span><h2>NO DATASET LOADED</h2><p>Load a file in Dataset Management to enable model training and prediction.</p><span className="outline-tag">LOCAL DATASET REQUIRED</span></section></div>;
  }

  return (
    <div className="operations-view ai-risk-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow__line" /> INTELLIGENCE / PREDICTIVE MODELS</div>
          <h1>AI RISK PREDICTION <span>{"//"}</span> BRANCH FORECAST</h1>
          <p className="page-heading__subtitle">Model status follows the active local dataset and is kept in memory for this session.</p>
        </div>
        <div className="page-heading__meta">
          <span className={`dataset-quality-badge ${modelStatus === "TRAINED" ? "dataset-quality-badge--valid" : "dataset-quality-badge--neutral"}`}>{modelStatus}</span>
          <span className="mono-label">MODEL STATE / IN MEMORY</span>
        </div>
      </div>

      {error && <div className="simulation-error dataset-error" role="alert"><span>!</span><div><b>MODEL ACTION FAILED</b><p>{error}</p></div><button type="button" onClick={() => setError(null)} aria-label="Dismiss model error">×</button></div>}

      <section className="dataset-action-grid">
        <div className="dataset-action-card">
          <div className="dataset-section-heading">
            <div><span className="section-heading__index">01</span><h2>TRAIN MODELS</h2></div>
            <span>{dataset.rows.length} ROWS</span>
          </div>
          <p>Fit the Random Forest regression and classification models against the currently loaded dataset.</p>
          <button type="button" className="dataset-primary-button" onClick={() => void handleTrain()} disabled={trainingState === "training"}>
            {trainingState === "training" ? "TRAINING MODELS…" : "TRAIN MODELS"}
          </button>
          <div className="dataset-selected-file">
            <span>MODEL STATUS</span>
            <b>{modelStatus}</b>
            <span>REGRESSION / {status?.regression_model_status ?? modelStatus} · CLASSIFICATION / {status?.risk_model_status ?? modelStatus}</span>
          </div>
        </div>

        <div className="dataset-action-card dataset-synthetic-card">
          <div className="dataset-section-heading">
            <div><span className="section-heading__index">02</span><h2>RUN PREDICTIONS</h2></div>
            <span className="dataset-source-tag">FORECAST / LOCAL</span>
          </div>
          <p>Generate one waiting-time forecast and one operational-risk estimate using the trained in-memory models.</p>
          <button type="button" className="dataset-primary-button dataset-primary-button--synthetic" onClick={() => void handlePredict()} disabled={isPredicting}>
            {isPredicting ? "RUNNING PREDICTIONS…" : "RUN PREDICTIONS"}
          </button>
          <div className="dataset-selected-file">
            <span>LAST PREDICTION</span>
            <b>{waitingPrediction ? `${waitingPrediction.predicted_waiting_time.toFixed(2)} min` : "NOT AVAILABLE"}</b>
            <span>RISK / {riskPrediction?.predicted_risk ?? "NOT AVAILABLE"}</span>
          </div>
        </div>
      </section>

      <section className="dataset-data-grid">
        <article className="surface-card">
          <div className="surface-card__heading"><div><span className="section-heading__index">03</span><h2>Waiting time forecast</h2></div></div>
          <div className="data-state-card__body">
            <div className="data-state-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 17h16M13 4v6l4 3M8 7h3" /></svg></div>
            <div>
              <h3>{waitingPrediction ? `${waitingPrediction.predicted_waiting_time.toFixed(2)} minutes` : "No forecast generated yet"}</h3>
              <p>Predicted wait time is reported in minutes using the active Random Forest regressor.</p>
            </div>
          </div>
        </article>

        <article className="surface-card">
          <div className="surface-card__heading"><div><span className="section-heading__index">04</span><h2>Operational risk score</h2></div></div>
          <div className="data-state-card__body">
            <div className="data-state-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 4 7v6c0 4.4 3 8.4 8 10 5-1.6 8-5.6 8-10V7l-8-4zm-1 6h2v6h-2zm0 8h2v2h-2z" /></svg></div>
            <div>
              <h3>{riskPrediction ? riskPrediction.predicted_risk : "No risk prediction yet"}</h3>
              <p>{mostLikelyRisk ? `Model-estimated probability: ${mostLikelyRisk[0]} ${(mostLikelyRisk[1] * 100).toFixed(1)}%` : "Model-estimated probability is unavailable until a prediction is run."}</p>
            </div>
          </div>
        </article>
      </section>

      {trainingResult && (
        <section className="surface-card" style={{ marginTop: "1.5rem" }}>
          <div className="surface-card__heading"><div><span className="section-heading__index">05</span><h2>Model evaluation</h2></div></div>
          <div className="dataset-selected-file"><span>TRAINING RESULT</span><b>{String(trainingResult.training_status ?? "READY")}</b><span>{JSON.stringify(trainingResult)}</span></div>
        </section>
      )}
    </div>
  );
}
