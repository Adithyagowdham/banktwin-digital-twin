"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getMlEvaluation, getMlStatus, type MlStatusResponse } from "../../lib/api";
import { useSimulation } from "../../lib/SimulationContext";
import { useResearchResults } from "../../lib/ResearchResultsContext";
import { useDataset } from "../../lib/DatasetContext";
import { calculateAnalytics } from "../analytics/AnalyticsDashboard";
import type { SimulationConfig } from "../../lib/simulationTypes";
import ReportExport, { type ReportExportRow } from "./ReportExport";
import ReportSummary from "./ReportSummary";
import SimulationReport from "./SimulationReport";
import MLReport from "./MLReport";
import WhatIfReport from "./WhatIfReport";
import OptimizationReport from "./OptimizationReport";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordValue : null;
}

function addRow(rows: ReportExportRow[], section: string, item: string, value: unknown, source: string) {
  if (value === null || value === undefined || typeof value === "object") return;
  if (typeof value === "number" && !Number.isFinite(value)) return;
  rows.push({ section, item, value: String(value), source });
}

function makeExportRows(result: ReturnType<typeof useSimulation>["result"], config: SimulationConfig | null, dataset: ReturnType<typeof useDataset>["dataset"], status: MlStatusResponse | null, evaluation: unknown, whatIfResult: ReturnType<typeof useResearchResults>["whatIfResult"], optimizationResult: ReturnType<typeof useResearchResults>["optimizationResult"]): ReportExportRow[] {
  const rows: ReportExportRow[] = [];
  if (result) {
    const simpySource = "LATEST SIMPY SIMULATION RESULT";
    for (const [label, value] of Object.entries({
      "Customers Arrived": result.customers_arrived,
      "Customers Served": result.customers_served,
      "Average Waiting Time": result.average_waiting_time,
      "Average Service Time": result.average_service_time,
      "Queue Length": result.queue_length,
      Throughput: result.throughput,
      "Counter Utilization": result.counter_utilization,
      "Staff Utilization": result.staff_utilization,
      "Operational Risk": result.operational_risk,
      "Simulation Duration": result.simulation_duration,
    })) addRow(rows, "Simulation", label, value, simpySource);
    const analytics = calculateAnalytics(result.customers, result.simulation_duration, result.counters, result.staff);
    for (const [label, value] of Object.entries({ "Observed L": analytics.observedSystemSize, "Observed Arrival Rate": analytics.observedArrivalRate, "Observed W": analytics.observedTimeInSystem, "Calculated Lambda W": analytics.calculatedLambdaW })) addRow(rows, "Analytics / Little's Law", label, value, "Latest simulation event records");
    if (config) for (const [label, value] of Object.entries({ Customers: config.customers, "Arrival Rate": config.arrival_rate, Counters: config.counters, Staff: config.staff, "Average Service Time": config.avg_service_time, Duration: config.duration, "Transaction Type": config.transaction_type, Priority: config.priority, "Random Seed": config.random_seed })) addRow(rows, "Simulation Configuration", label, value, simpySource);
    const counts = new Map<string, number>();
    for (const customer of result.customers) counts.set(customer.status, (counts.get(customer.status) ?? 0) + 1);
    for (const [statusLabel, count] of counts) addRow(rows, "Customer Operations", statusLabel, count, simpySource);
    const transactionCounts = new Map<string, number>();
    for (const customer of result.customers) transactionCounts.set(customer.transaction_type, (transactionCounts.get(customer.transaction_type) ?? 0) + 1);
    for (const [type, count] of transactionCounts) addRow(rows, "Transactions by Type", type, count, simpySource);
    result.counters.forEach((counter) => addRow(rows, "Counter", `${counter.counter_id} Status`, counter.status, simpySource));
    result.counters.forEach((counter) => addRow(rows, "Counter", `${counter.counter_id} Busy Time`, counter.busy_time, simpySource));
    result.staff.forEach((person) => addRow(rows, "Staff", `${person.staff_id} Served`, person.customers_served, simpySource));
    result.staff.forEach((person) => addRow(rows, "Staff", `${person.staff_id} Status`, person.status, simpySource));
  }

  if (dataset) {
    for (const [label, value] of Object.entries({ Name: dataset.name, Source: dataset.source, Rows: dataset.summary.rows, Columns: dataset.summary.columns, "Missing Values": dataset.summary.missingValues, Quality: dataset.quality.status })) addRow(rows, "Dataset", label, value, "Dataset Management local state");
  }

  const evaluationRecord = asRecord(evaluation);
  const regression = asRecord(evaluationRecord?.regression);
  const classification = asRecord(evaluationRecord?.classification);
  const regressionMetrics = asRecord(regression?.metrics);
  const classificationMetrics = asRecord(classification?.metrics);
  if (status?.regression_model_status === "TRAINED" && regressionMetrics) {
    for (const key of ["mae", "rmse", "r2"]) addRow(rows, "ML Regression", key.toUpperCase(), regressionMetrics[key], `Random Forest Regressor · Waiting_Time · ${String(regression?.test_count ?? "")} test rows`);
    for (const item of Array.isArray(regression?.feature_importance) ? regression.feature_importance : []) {
      const feature = asRecord(item);
      if (typeof feature?.feature === "string") addRow(rows, "Regression Feature Importance", feature.feature, feature.importance, "Fitted Random Forest feature_importances_");
    }
  }
  if (status?.risk_model_status === "TRAINED" && classificationMetrics) {
    for (const key of ["accuracy", "precision", "recall", "f1"]) addRow(rows, "ML Classification", key.toUpperCase(), classificationMetrics[key], `Random Forest Classifier · Risk_Level · ${String(classification?.test_count ?? "")} test rows`);
    const matrix = classification?.confusion_matrix;
    if (Array.isArray(matrix)) matrix.forEach((row, actual) => Array.isArray(row) && row.forEach((value, predicted) => addRow(rows, "Risk Confusion Matrix", `Actual ${["LOW", "MEDIUM", "HIGH", "CRITICAL"][actual]} / Predicted ${["LOW", "MEDIUM", "HIGH", "CRITICAL"][predicted]}`, value, "Held-out classifier evaluation")));
    const diagnostic = asRecord(classification?.["HIGH-RISK BINARY DIAGNOSTIC"]);
    if (diagnostic) for (const key of ["TP", "TN", "FP", "FN"]) addRow(rows, "High-Risk Binary Diagnostic", key, diagnostic[key], "HIGH + CRITICAL positive class");
    for (const item of Array.isArray(classification?.feature_importance) ? classification.feature_importance : []) {
      const feature = asRecord(item);
      if (typeof feature?.feature === "string") addRow(rows, "Risk Feature Importance", feature.feature, feature.importance, "Fitted Random Forest feature_importances_");
    }
  }

  if (whatIfResult) {
    addRow(rows, "What-If", "Scenarios", whatIfResult.scenarios.length, "Independent SimPy scenario results");
    addRow(rows, "What-If", "Runs per Scenario", whatIfResult.number_of_runs, "Independent SimPy scenario results");
    const best = whatIfResult.recommendation ? whatIfResult.scenarios.find((scenario) => scenario.name === whatIfResult.recommendation?.scenario && scenario.status === "SUCCESS") : undefined;
    if (best?.aggregate) {
      addRow(rows, "What-If Best Scenario", "Scenario", best.name, "Prototype scenario recommendation");
      addRow(rows, "What-If Best Scenario", "Average Waiting", best.aggregate.average_waiting_time.mean, "SimPy aggregate");
      addRow(rows, "What-If Best Scenario", "Queue", best.aggregate.queue_length.mean, "SimPy aggregate");
      addRow(rows, "What-If Best Scenario", "Throughput", best.aggregate.throughput.mean, "SimPy aggregate");
      addRow(rows, "What-If Best Scenario", "Risk", best.operational_risk, "SimPy risk output");
    }
  }

  if (optimizationResult) {
    addRow(rows, "Optimization", "Configurations Tested", optimizationResult.configurations_tested, "Exhaustive SimPy configuration search");
    addRow(rows, "Optimization", "Runs per Configuration", optimizationResult.number_of_runs, "Exhaustive SimPy configuration search");
    const best = optimizationResult.best_configuration;
    if (best) for (const [label, value] of Object.entries({ Counters: best.counters, Staff: best.staff, "Objective Score": best.objective_score, "Average Waiting": best.average_waiting_time, Queue: best.queue_length, Throughput: best.throughput, "Counter Utilization": best.counter_utilization, "Staff Utilization": best.staff_utilization, Risk: best.operational_risk })) addRow(rows, "Optimization Recommendation", label, value, "Lowest prototype objective score from SimPy results");
    if (optimizationResult.baseline_comparison) for (const [label, value] of Object.entries(optimizationResult.baseline_comparison)) addRow(rows, "Baseline Comparison", label, value, "Actual baseline and recommended simulations");
  }
  return rows;
}

export default function ReportsDashboard({ isActive }: { isActive: boolean }) {
  const { result, lastConfig } = useSimulation();
  const { whatIfResult, optimizationResult } = useResearchResults();
  const { dataset } = useDataset();
  const [mlStatus, setMlStatus] = useState<MlStatusResponse | null>(null);
  const [evaluation, setEvaluation] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMlReport = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const [statusResult, evaluationResult] = await Promise.allSettled([getMlStatus(), getMlEvaluation()]);
    if (statusResult.status === "fulfilled") setMlStatus(statusResult.value);
    if (evaluationResult.status === "fulfilled") setEvaluation(evaluationResult.value);
    const failures = [statusResult, evaluationResult].filter((item) => item.status === "rejected");
    if (failures.length) setError(failures.map((item) => item.status === "rejected" && item.reason instanceof Error ? item.reason.message : "BACKEND OFFLINE").join(" · "));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    Promise.allSettled([getMlStatus(), getMlEvaluation()]).then(([statusResult, evaluationResult]) => {
      if (cancelled) return;
      if (statusResult.status === "fulfilled") setMlStatus(statusResult.value);
      if (evaluationResult.status === "fulfilled") setEvaluation(evaluationResult.value);
      const failures = [statusResult, evaluationResult].filter((item) => item.status === "rejected");
      if (failures.length) setError(failures.map((item) => item.status === "rejected" && item.reason instanceof Error ? item.reason.message : "BACKEND OFFLINE").join(" · "));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isActive]);

  const regressionState = mlStatus?.regression_model_status ?? "UNAVAILABLE";
  const classificationState = mlStatus?.risk_model_status ?? "UNAVAILABLE";
  const evaluationRecord = asRecord(evaluation);
  const regressionEvaluation = asRecord(evaluationRecord?.regression);
  const classificationEvaluation = asRecord(evaluationRecord?.classification);
  const regressionMetrics = asRecord(regressionEvaluation?.metrics);
  const classificationMetrics = asRecord(classificationEvaluation?.metrics);
  const regressionMae = regressionMetrics?.mae;
  const classificationF1 = classificationMetrics?.f1;
  const mlFindings = [
    regressionState === "TRAINED" && typeof regressionMae === "number" && Number.isFinite(regressionMae)
      ? `Waiting-time regressor MAE was ${regressionMae.toFixed(4)} on ${String(regressionEvaluation?.test_count ?? "recorded")} held-out samples.`
      : null,
    classificationState === "TRAINED" && typeof classificationF1 === "number" && Number.isFinite(classificationF1)
      ? `Risk classifier weighted F1 was ${classificationF1.toFixed(4)} on ${String(classificationEvaluation?.test_count ?? "recorded")} held-out samples${classificationEvaluation?.class_imbalance_warning === true ? "; the training data had a class-imbalance warning" : ""}.`
      : null,
  ].filter((finding): finding is string => finding !== null);
  const exportRows = useMemo(() => makeExportRows(result, lastConfig, dataset, mlStatus, evaluation, whatIfResult, optimizationResult), [result, lastConfig, dataset, mlStatus, evaluation, whatIfResult, optimizationResult]);
  const findings = [
    result ? `Operational observation: ${result.customers_served} of ${result.customers_arrived} returned customer records were served in the latest run.` : null,
    result ? `Within the simulated branch conditions, mean wait was ${result.average_waiting_time.toFixed(3)} time units, queue length was ${result.queue_length}, throughput was ${result.throughput.toFixed(3)} per time unit, and returned risk was ${result.operational_risk}.` : null,
    mlFindings.length ? `Based on the evaluated dataset: ${mlFindings.join(" ")}` : null,
    whatIfResult?.recommendation ? `Across ${whatIfResult.scenarios.length} What-If scenarios with ${whatIfResult.number_of_runs} run(s) each, ${whatIfResult.recommendation.scenario} had the lowest prototype scenario score.` : null,
    optimizationResult?.best_configuration ? `Within ${optimizationResult.configurations_tested} tested configurations, ${optimizationResult.best_configuration.counters} counters / ${optimizationResult.best_configuration.staff} staff had the lowest prototype optimization score (${optimizationResult.objective_score?.toFixed(4)}).` : null,
  ].filter((finding): finding is string => finding !== null);

  return <div className="operations-view reports-view">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> INSIGHTS / CONSOLIDATED RESEARCH OUTPUT</div><h1>BANKTWIN RESEARCH REPORT</h1><p className="page-heading__subtitle">Observed simulation, evaluated models, scenario comparisons, and prescriptive search results.</p></div><div className="page-heading__meta"><span className="dataset-quality-badge dataset-quality-badge--valid">RESEARCH PROTOTYPE</span><span className="mono-label">NO REAL-BANK CLAIMS</span></div></div>
    <div className="reports-toolbar"><span className="mono-label">REPORT VALUES ARE SOURCE-LABELED AND SESSION-LOCAL</span><div><button type="button" className="twin-control-button" onClick={() => void refreshMlReport()} disabled={refreshing}>{refreshing ? "REFRESHING…" : "REFRESH MODEL REPORT"}</button><ReportExport rows={exportRows} /></div></div>
    {loading && <p className="report-loading" role="status">LOADING STORED MODEL EVALUATION…</p>}
    {error && <div className="simulation-error dataset-error" role="alert"><span>!</span><div><b>BACKEND REPORT DATA UNAVAILABLE</b><p>{error}</p></div><button type="button" onClick={() => setError(null)} aria-label="Dismiss report error">×</button></div>}

    <ReportSummary simulationAvailable={Boolean(result)} regressionStatus={regressionState} classificationStatus={classificationState} whatIfAvailable={Boolean(whatIfResult)} optimizationAvailable={Boolean(optimizationResult)} />
    <SimulationReport result={result} config={lastConfig} />
    {dataset && <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">DATA</span><h2>LOADED DATASET</h2></div><span className="report-source-tag">{dataset.source}</span></div><dl className="report-metric-list"><div><dt>Name</dt><dd>{dataset.name}</dd></div><div><dt>Total Rows</dt><dd>{dataset.summary.rows}</dd></div><div><dt>Columns</dt><dd>{dataset.summary.columns}</dd></div><div><dt>Missing Values</dt><dd>{dataset.summary.missingValues}</dd></div><div><dt>Quality</dt><dd>{dataset.quality.status}</dd></div></dl></section>}
    <MLReport status={mlStatus} evaluation={evaluation} />
    <WhatIfReport response={whatIfResult} />
    <OptimizationReport response={optimizationResult} />

    <section className="report-panel report-findings"><div className="report-section-heading"><div><span className="section-heading__index">13</span><h2>RESEARCH FINDINGS</h2></div><span className="mono-label">DYNAMIC · AVAILABLE EVIDENCE ONLY</span></div>{findings.length ? <ol>{findings.map((finding) => <li key={finding}>{finding}</li>)}</ol> : <p className="report-no-data-copy">NO RESEARCH FINDINGS AVAILABLE · RUN A SIMULATION OR ANALYSIS TO GENERATE OBSERVATIONS.</p>}<p className="report-caveat">Findings describe simulation-based, synthetic-data-based, or prototype evaluation results only. BANKTWIN has not demonstrated improvement in a real bank.</p></section>

    <div className="report-grid-two">
      <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">14</span><h2>LIMITATIONS</h2></div></div><ul className="report-bullet-list"><li>Synthetic/simulated data may not represent real banking operations.</li><li>Real banking datasets may contain privacy-sensitive information.</li><li>Simulation assumptions influence outcomes.</li><li>ML performance depends on dataset quality and representativeness.</li><li>Prototype optimization weights are not banking-industry standards.</li><li>Real deployment requires institutional validation.</li><li>Results are not guaranteed real-world performance.</li></ul></section>
      <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">15</span><h2>DATA GOVERNANCE</h2></div></div><p className="report-governance">BANKTWIN is a research prototype. Do not upload confidential customer information. Use authorized institutional data where applicable. Public aggregate banking datasets generally do not contain individual customer waiting time, queue length, staff utilization, or counter utilization. Synthetic data remains explicitly identified as synthetic.</p></section>
    </div>
  </div>;
}
