"use client";

import { useState } from "react";
import { runWhatIfAnalysis } from "../../lib/api";
import type { OperationalRisk, SimulationConfig } from "../../lib/simulationTypes";
import type { WhatIfResponse, WhatIfScenarioInput } from "../../lib/whatIfTypes";
import { useSimulation } from "../../lib/SimulationContext";
import { useResearchResults } from "../../lib/ResearchResultsContext";
import RecommendationPanel from "./RecommendationPanel";
import ScenarioBuilder from "./ScenarioBuilder";
import ScenarioCard from "./ScenarioCard";
import ScenarioCharts from "./ScenarioCharts";
import ScenarioComparison from "./ScenarioComparison";

const INITIAL_CONFIG: SimulationConfig = {
  customers: 50,
  arrival_rate: 5,
  counters: 4,
  staff: 5,
  avg_service_time: 5,
  duration: 60,
  transaction_type: "Deposit",
  priority: "Normal",
  random_seed: null,
};

const INITIAL_RISK_PENALTIES: Record<OperationalRisk, number> = { LOW: 0, MEDIUM: 0.25, HIGH: 0.6, CRITICAL: 1 };

function validConfig(config: SimulationConfig): boolean {
  return Number.isInteger(config.customers) && config.customers > 0
    && Number.isFinite(config.arrival_rate) && config.arrival_rate > 0
    && Number.isInteger(config.counters) && config.counters > 0
    && Number.isInteger(config.staff) && config.staff > 0
    && Number.isFinite(config.avg_service_time) && config.avg_service_time > 0
    && Number.isFinite(config.duration) && config.duration > 0;
}

function toCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export default function WhatIfAnalysis() {
  const { result: simulationResult, lastConfig } = useSimulation();
  const { setWhatIfResult } = useResearchResults();
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [baseSeed, setBaseSeed] = useState(42);
  const [customCounters, setCustomCounters] = useState(3);
  const [customStaff, setCustomStaff] = useState(4);
  const [numberOfRuns, setNumberOfRuns] = useState<1 | 5 | 10>(1);
  const [utilizationThreshold, setUtilizationThreshold] = useState(90);
  const [riskPenalties, setRiskPenalties] = useState(INITIAL_RISK_PENALTIES);
  const [scenarios, setScenarios] = useState<WhatIfScenarioInput[]>([]);
  const [executedScenarios, setExecutedScenarios] = useState<WhatIfScenarioInput[]>([]);
  const [response, setResponse] = useState<WhatIfResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scenarioNames = scenarios.map((scenario) => scenario.name);
  const baselineConfig = simulationResult && lastConfig ? { ...lastConfig, random_seed: null } : null;
  const validScoring = Number.isInteger(utilizationThreshold) && utilizationThreshold > 0 && utilizationThreshold < 100
    && Object.values(riskPenalties).every((penalty) => Number.isFinite(penalty) && penalty >= 0);
  const canRun = scenarios.length > 0 && scenarios.every((scenario) => validConfig(scenario.config)) && Number.isInteger(baseSeed) && validScoring && !isRunning;

  function clearPriorResults() {
    setResponse(null);
    setWhatIfResult(null);
    setExecutedScenarios([]);
    setError(null);
  }

  function togglePreset(name: string, counters: number, staff: number) {
    clearPriorResults();
    setScenarios((current) => current.some((scenario) => scenario.name === name)
      ? current.filter((scenario) => scenario.name !== name)
      : [...current, { name, config: { ...config, counters, staff, random_seed: null } }]);
  }

  function addCustomScenario() {
    clearPriorResults();
    const customScenario = { name: "Custom", config: { ...config, counters: customCounters, staff: customStaff, random_seed: null } };
    setScenarios((current) => [...current.filter((scenario) => scenario.name !== "Custom"), customScenario]);
  }

  function removeScenario(name: string) {
    clearPriorResults();
    setScenarios((current) => current.filter((scenario) => scenario.name !== name));
  }

  async function executeScenarios() {
    if (!canRun) return;
    const requestScenarios = [...scenarios];
    if (baselineConfig) requestScenarios.push({ name: "CURRENT CONFIGURATION", config: baselineConfig });
    setExecutedScenarios(requestScenarios);
    setResponse(null);
    setWhatIfResult(null);
    setIsRunning(true);
    setError(null);
    try {
      const result = await runWhatIfAnalysis(requestScenarios, numberOfRuns, baseSeed, { risk_penalties: riskPenalties, utilization_threshold: utilizationThreshold });
      setResponse(result);
      setWhatIfResult(result);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "WHAT-IF SIMULATION FAILED.");
    } finally {
      setIsRunning(false);
    }
  }

  function resetAnalysis() {
    setScenarios([]);
    setExecutedScenarios([]);
    setResponse(null);
    setWhatIfResult(null);
    setError(null);
  }

  function exportResults() {
    if (!response) return;
    const headers = ["Scenario", "Run", "Customers", "Counters", "Staff", "Average Waiting", "Average Service", "Queue Length", "Throughput", "Counter Utilization", "Staff Utilization", "Risk"];
    const rows = response.scenarios.flatMap((scenario) => {
      const scenarioConfig = executedScenarios.find((item) => item.name === scenario.name)?.config;
      return scenario.runs.map((run) => [
        scenario.name,
        run.run,
        scenarioConfig?.customers,
        scenarioConfig?.counters,
        scenarioConfig?.staff,
        run.average_waiting_time,
        run.average_service_time,
        run.queue_length,
        run.throughput,
        run.counter_utilization,
        run.staff_utilization,
        run.operational_risk,
      ]);
    });
    const csv = [headers, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "BANKTWIN_WHAT_IF_RESULTS.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="operations-view what-if-view">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow__line" /> INTELLIGENCE / STOCHASTIC ANALYSIS</div><h1>WHAT-IF ANALYSIS <span>{"//"}</span> BRANCH CONFIGURATIONS</h1><p className="page-heading__subtitle">Compare resource scenarios with independent runs of the SimPy banking branch engine.</p></div>
        <div className="page-heading__meta"><span className="dataset-quality-badge dataset-quality-badge--valid">{response ? "RESULTS AVAILABLE" : "ANALYSIS READY"}</span><span className="mono-label">SIMULATION STATE / ISOLATED</span></div>
      </div>

      <ScenarioBuilder
        config={config}
        onConfigChange={(nextConfig) => { clearPriorResults(); setConfig(nextConfig); }}
        baseSeed={baseSeed}
        onBaseSeedChange={(seed) => { clearPriorResults(); setBaseSeed(seed); }}
        numberOfRuns={numberOfRuns}
        onNumberOfRunsChange={(runs) => { clearPriorResults(); setNumberOfRuns(runs); }}
        utilizationThreshold={utilizationThreshold}
        onUtilizationThresholdChange={(threshold) => { clearPriorResults(); setUtilizationThreshold(threshold); }}
        riskPenalties={riskPenalties}
        onRiskPenaltyChange={(risk, penalty) => { clearPriorResults(); setRiskPenalties((current) => ({ ...current, [risk]: penalty })); }}
        customCounters={customCounters}
        customStaff={customStaff}
        onCustomCountersChange={setCustomCounters}
        onCustomStaffChange={setCustomStaff}
        selectedNames={scenarioNames}
        onTogglePreset={togglePreset}
        onAddCustom={addCustomScenario}
      />

      <div className="what-if-baseline-strip"><span className="section-heading__index">BASELINE</span><span>{baselineConfig ? "CURRENT CONFIGURATION AVAILABLE · WILL BE INCLUDED IN THE NEXT RUN" : "BASELINE NOT AVAILABLE · NO SUCCESSFUL DIGITAL TWIN CONFIGURATION IN THIS SESSION"}</span></div>

      <section className="what-if-actions" aria-label="Scenario analysis actions">
        <div className="what-if-actions__buttons"><button type="button" className="simulation-action simulation-action--start" onClick={() => void executeScenarios()} disabled={!canRun}>{isRunning ? <><i className="button-spinner" /> RUNNING WHAT-IF SIMULATION...</> : <><span aria-hidden="true">▶</span> RUN SELECTED SCENARIOS</>}</button><button type="button" className="twin-control-button" onClick={exportResults} disabled={!response?.scenarios.some((scenario) => scenario.runs.length > 0)}>EXPORT RESULTS</button><button type="button" className="twin-control-button what-if-reset-button" onClick={resetAnalysis} disabled={isRunning}>RESET ANALYSIS</button></div>
      </section>

      {isRunning && <div className="what-if-progress" role="status">RUNNING WHAT-IF SIMULATION... · {executedScenarios.length} SCENARIOS · {numberOfRuns} RUNS PER SCENARIO</div>}
      {error && <div className="simulation-error dataset-error" role="alert"><span>!</span><div><b>WHAT-IF REQUEST FAILED</b><p>{error}</p></div><button type="button" onClick={() => setError(null)} aria-label="Dismiss what-if error">×</button></div>}

      {scenarios.length > 0 && <section className="what-if-selected-grid" aria-label="Selected scenarios">
        {scenarios.map((scenario) => <ScenarioCard key={scenario.name} scenario={scenario} result={response?.scenarios.find((result) => result.name === scenario.name)} numberOfRuns={response?.number_of_runs ?? numberOfRuns} onRemove={removeScenario} />)}
      </section>}

      {response ? <>
        <section className="what-if-section" aria-label="Scenario comparison">
          <div className="what-if-section__heading"><div><span className="section-heading__index">02</span><h2>SCENARIO COMPARISON</h2></div><span className="mono-label">{response.scenarios.filter((scenario) => scenario.status === "SUCCESS").length} SUCCESSFUL · {response.scenarios.filter((scenario) => scenario.status === "FAILED").length} FAILED</span></div>
          <ScenarioComparison scenarios={response.scenarios} numberOfRuns={response.number_of_runs} />
        </section>
        <section className="what-if-section" aria-label="Scenario charts">
          <div className="what-if-section__heading"><div><span className="section-heading__index">03</span><h2>SIMULATION METRICS</h2></div><span className="mono-label">MEAN OF {response.number_of_runs} RUN{response.number_of_runs === 1 ? "" : "S"}</span></div>
          <ScenarioCharts scenarios={response.scenarios} />
        </section>
        <section className="what-if-section" aria-label="Recommendation">
          <div className="what-if-section__heading"><div><span className="section-heading__index">04</span><h2>RECOMMENDED CONFIGURATION</h2></div></div>
          <RecommendationPanel response={response} />
        </section>
      </> : <section className="records-empty surface-card what-if-empty"><span className="records-empty__glyph" aria-hidden="true">∅</span><span className="records-empty__code">ANALYSIS / SCENARIO_RESULTS</span><h2>NO SCENARIOS EXECUTED</h2><p>Select a preset or create a custom scenario to begin.</p><span className="outline-tag">SIMPY BACKEND · NO FRONTEND ESTIMATES</span></section>}

      <section className="what-if-research-note"><div className="what-if-section__heading"><div><span className="section-heading__index">05</span><h2>STOCHASTIC SIMULATION NOTE</h2></div></div><p>Results may vary across random seeds. Multiple runs provide a more stable estimate than a single simulation. Scenario comparisons represent simulation-based operational analysis and should not be interpreted as guaranteed real-bank outcomes.</p></section>
    </div>
  );
}
