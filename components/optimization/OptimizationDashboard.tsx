"use client";

import { useState } from "react";
import { runOptimization } from "../../lib/api";
import { useSimulation } from "../../lib/SimulationContext";
import { useResearchResults } from "../../lib/ResearchResultsContext";
import type { OptimizationRequest, OptimizationResponse } from "../../lib/optimizationTypes";
import OptimizationChart from "./OptimizationChart";
import OptimizationConfig from "./OptimizationConfig";
import OptimizationDetails from "./OptimizationDetails";
import OptimizationProgress from "./OptimizationProgress";
import OptimizationResults from "./OptimizationResults";
import RecommendationCard from "./RecommendationCard";

const INITIAL_CONFIG: OptimizationRequest = {
  customers: 50,
  arrival_rate: 5,
  avg_service_time: 5,
  duration: 60,
  transaction_type: "Deposit",
  priority: "Normal",
  min_counters: 2,
  max_counters: 8,
  min_staff: 2,
  max_staff: 8,
  runs: 3,
  base_seed: 42,
  risk_weights: { LOW: 0, MEDIUM: 0.25, HIGH: 0.75, CRITICAL: 1.5 },
  utilization_threshold: 90,
  resource_penalty_weight: 0.15,
  baseline: null,
};

export default function OptimizationDashboard() {
  const { result: simulationResult, lastConfig } = useSimulation();
  const { setOptimizationResult } = useResearchResults();
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [response, setResponse] = useState<OptimizationResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangesValid = Number.isInteger(config.min_counters) && config.min_counters > 0
    && Number.isInteger(config.max_counters) && config.max_counters >= config.min_counters
    && Number.isInteger(config.min_staff) && config.min_staff > 0
    && Number.isInteger(config.max_staff) && config.max_staff >= config.min_staff;
  const commonInputsValid = Number.isInteger(config.customers) && config.customers > 0
    && Number.isFinite(config.arrival_rate) && config.arrival_rate > 0
    && Number.isFinite(config.avg_service_time) && config.avg_service_time > 0
    && Number.isFinite(config.duration) && config.duration > 0
    && Number.isInteger(config.runs) && config.runs >= 1 && config.runs <= 10
    && Number.isInteger(config.base_seed)
    && Number.isFinite(config.utilization_threshold) && config.utilization_threshold > 0 && config.utilization_threshold < 100
    && Number.isFinite(config.resource_penalty_weight) && config.resource_penalty_weight >= 0
    && Object.values(config.risk_weights).every((weight) => Number.isFinite(weight) && weight >= 0);
  const canRun = rangesValid && commonInputsValid && !isRunning;
  const searchSpaceSize = rangesValid
    ? (config.max_counters - config.min_counters + 1) * (config.max_staff - config.min_staff + 1)
    : 0;
  const baseline = simulationResult && lastConfig ? lastConfig : null;
  const validationError = config.min_counters > config.max_counters
    ? "Minimum counters must be less than or equal to maximum counters."
    : config.min_staff > config.max_staff
      ? "Minimum staff must be less than or equal to maximum staff."
      : !Number.isInteger(config.min_counters) || config.min_counters < 1 || !Number.isInteger(config.max_counters) || config.max_counters < 1
        ? "Counter search bounds must be positive whole numbers."
        : !Number.isInteger(config.min_staff) || config.min_staff < 1 || !Number.isInteger(config.max_staff) || config.max_staff < 1
          ? "Staff search bounds must be positive whole numbers."
          : !commonInputsValid
            ? "Enter positive customers, arrival rate, service time, duration, valid runs, seed, and non-negative objective weights."
            : null;

  function updateConfig(next: OptimizationRequest) {
    setConfig(next);
    setResponse(null);
    setOptimizationResult(null);
    setError(null);
  }

  async function startOptimization() {
    if (!canRun) return;
    setIsRunning(true);
    setResponse(null);
    setOptimizationResult(null);
    setError(null);
    try {
      const request: OptimizationRequest = {
        ...config,
        baseline: baseline ? { ...baseline, random_seed: null } : null,
      };
      const result = await runOptimization(request);
      setResponse(result);
      setOptimizationResult(result);
    } catch (optimizationError) {
      setError(optimizationError instanceof Error ? optimizationError.message : "OPTIMIZATION FAILED.");
    } finally {
      setIsRunning(false);
    }
  }

  function resetOptimization() {
    setResponse(null);
    setOptimizationResult(null);
    setError(null);
  }

  return (
    <div className="operations-view optimization-view">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow__line" /> INTELLIGENCE / PRESCRIPTIVE ANALYSIS</div><h1>RESOURCE OPTIMIZATION <span>{"//"}</span> EXHAUSTIVE SEARCH</h1><p className="page-heading__subtitle">Rank counter/staff configurations using repeated discrete-event simulation.</p></div>
        <div className="page-heading__meta"><span className={`dataset-quality-badge ${response?.best_configuration ? "dataset-quality-badge--valid" : "dataset-quality-badge--neutral"}`}>{response ? "SEARCH COMPLETE" : "READY"}</span><span className="mono-label">RESULT STATE / ISOLATED</span></div>
      </div>

      <OptimizationConfig config={config} onChange={updateConfig} onRun={() => void startOptimization()} isRunning={isRunning} canRun={canRun} searchSpaceSize={searchSpaceSize} validationError={validationError} />
      <div className="optimization-baseline-strip"><span className="section-heading__index">BASELINE</span><span>{baseline ? `CURRENT CONFIGURATION AVAILABLE · ${baseline.counters} COUNTERS / ${baseline.staff} STAFF · WILL BE SIMULATED WITH THE SEARCH SEED` : "BASELINE NOT AVAILABLE · NO CURRENT DIGITAL TWIN RESULT IN THIS SESSION"}</span></div>
      <div className="optimization-toolbar"><button type="button" className="twin-control-button optimization-reset" onClick={resetOptimization} disabled={isRunning || !response && !error}>RESET OPTIMIZATION</button></div>

      <OptimizationProgress isRunning={isRunning} response={response} />
      {error && <div className="simulation-error dataset-error" role="alert"><span>!</span><div><b>OPTIMIZATION REQUEST FAILED</b><p>{error}</p></div><button type="button" onClick={() => setError(null)} aria-label="Dismiss optimization error">×</button></div>}

      {!response && !isRunning ? <section className="records-empty surface-card optimization-empty"><span className="records-empty__glyph" aria-hidden="true">∅</span><span className="records-empty__code">OPTIMIZATION / CANDIDATE_SEARCH</span><h2>NO OPTIMIZATION RESULTS</h2><p>Configure the search range and run optimization.</p><span className="outline-tag">REAL SIMPY EVALUATIONS · NO ESTIMATED RESULTS</span></section> : null}

      {response && <>
        <RecommendationCard response={response} />
        <OptimizationChart response={response} />
        <OptimizationResults response={response} />
        <OptimizationDetails response={response} />
      </>}
    </div>
  );
}
