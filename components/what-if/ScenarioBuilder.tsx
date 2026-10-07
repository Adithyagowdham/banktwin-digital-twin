"use client";

import type { OperationalRisk, SimulationConfig, TransactionType } from "../../lib/simulationTypes";

const TRANSACTION_TYPES: TransactionType[] = ["Deposit", "Withdrawal", "Account Opening", "Loan Service", "Cash Transfer", "General Inquiry"];
const PRESETS = [
  { name: "Scenario A", counters: 4, staff: 5 },
  { name: "Scenario B", counters: 5, staff: 5 },
  { name: "Scenario C", counters: 6, staff: 6 },
] as const;

interface ScenarioBuilderProps {
  config: SimulationConfig;
  onConfigChange: (config: SimulationConfig) => void;
  baseSeed: number;
  onBaseSeedChange: (seed: number) => void;
  numberOfRuns: 1 | 5 | 10;
  onNumberOfRunsChange: (runs: 1 | 5 | 10) => void;
  utilizationThreshold: number;
  onUtilizationThresholdChange: (threshold: number) => void;
  riskPenalties: Record<OperationalRisk, number>;
  onRiskPenaltyChange: (risk: OperationalRisk, penalty: number) => void;
  customCounters: number;
  customStaff: number;
  onCustomCountersChange: (count: number) => void;
  onCustomStaffChange: (count: number) => void;
  selectedNames: string[];
  onTogglePreset: (name: string, counters: number, staff: number) => void;
  onAddCustom: () => void;
}

export default function ScenarioBuilder(props: ScenarioBuilderProps) {
  const { config, onConfigChange, baseSeed, onBaseSeedChange, numberOfRuns, onNumberOfRunsChange, utilizationThreshold, onUtilizationThresholdChange, riskPenalties, onRiskPenaltyChange, customCounters, customStaff, onCustomCountersChange, onCustomStaffChange, selectedNames, onTogglePreset, onAddCustom } = props;

  function updateNumber(key: "customers" | "arrival_rate" | "avg_service_time" | "duration", value: string) {
    onConfigChange({ ...config, [key]: value === "" ? 0 : Number(value), random_seed: null });
  }

  return (
    <section className="what-if-builder" aria-label="Scenario builder">
      <div className="what-if-builder__heading"><div><span className="section-heading__index">01</span><h2>SCENARIO BUILDER</h2></div><span className="mono-label">SIMPY · BRANCH CONFIGURATION</span></div>
      <div className="what-if-fields">
        <label><span>CUSTOMERS</span><input type="number" min="1" step="1" value={config.customers || ""} onChange={(event) => updateNumber("customers", event.target.value)} required /></label>
        <label><span>ARRIVAL RATE / TIME UNIT</span><input type="number" min="0.1" step="0.1" value={config.arrival_rate || ""} onChange={(event) => updateNumber("arrival_rate", event.target.value)} required /></label>
        <label><span>AVERAGE SERVICE TIME</span><input type="number" min="0.1" step="0.1" value={config.avg_service_time || ""} onChange={(event) => updateNumber("avg_service_time", event.target.value)} required /></label>
        <label><span>DURATION / TIME UNITS</span><input type="number" min="0.1" step="0.1" value={config.duration || ""} onChange={(event) => updateNumber("duration", event.target.value)} required /></label>
        <label><span>TRANSACTION TYPE</span><select value={config.transaction_type} onChange={(event) => onConfigChange({ ...config, transaction_type: event.target.value as TransactionType, random_seed: null })}>{TRANSACTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label><span>PRIORITY</span><select value={config.priority} onChange={(event) => onConfigChange({ ...config, priority: event.target.value as SimulationConfig["priority"], random_seed: null })}><option value="Normal">Normal</option><option value="Priority">Priority</option></select></label>
        <label><span>BASE RANDOM SEED</span><input type="number" step="1" value={baseSeed} onChange={(event) => onBaseSeedChange(Number(event.target.value) || 0)} required /></label>
        <label><span>NUMBER OF RUNS</span><select value={numberOfRuns} onChange={(event) => onNumberOfRunsChange(Number(event.target.value) as 1 | 5 | 10)}><option value={1}>1 RUN</option><option value={5}>5 RUNS</option><option value={10}>10 RUNS</option></select></label>
      </div>
      <div className="what-if-preset-row">
        <span className="what-if-subheading">PRESET RESOURCES</span>
        {PRESETS.map((preset) => {
          const selected = selectedNames.includes(preset.name);
          return <button type="button" className={`twin-control-button${selected ? " twin-control-button--primary" : ""}`} aria-pressed={selected} key={preset.name} onClick={() => onTogglePreset(preset.name, preset.counters, preset.staff)}>{selected ? "REMOVE " : "ADD "}{preset.name.toUpperCase()} · {preset.counters}C / {preset.staff}S</button>;
        })}
      </div>
      <div className="what-if-custom-row">
        <span className="what-if-subheading">CUSTOM RESOURCES</span>
        <label><span>COUNTERS</span><input type="number" min="1" step="1" value={customCounters} onChange={(event) => onCustomCountersChange(Math.max(1, Number(event.target.value) || 1))} /></label>
        <label><span>STAFF</span><input type="number" min="1" step="1" value={customStaff} onChange={(event) => onCustomStaffChange(Math.max(1, Number(event.target.value) || 1))} /></label>
        <button type="button" className="twin-control-button twin-control-button--primary" onClick={onAddCustom}>{selectedNames.includes("Custom") ? "UPDATE CUSTOM" : "ADD CUSTOM SCENARIO"}</button>
      </div>
      <div className="what-if-score-settings">
        <span className="what-if-subheading">PROTOTYPE SCORE SETTINGS</span>
        <label><span>UTILIZATION STRESS THRESHOLD / %</span><input type="number" min="1" max="99" step="1" value={utilizationThreshold} onChange={(event) => onUtilizationThresholdChange(Math.max(1, Math.min(99, Number(event.target.value) || 1)))} /></label>
        {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((risk) => <label key={risk}><span>{risk} PENALTY</span><input type="number" min="0" step="0.05" value={riskPenalties[risk]} onChange={(event) => onRiskPenaltyChange(risk, Math.max(0, Number(event.target.value) || 0))} /></label>)}
        <p>Configurable prototype heuristics only. Risk penalties and the utilization threshold are not scientifically validated standards.</p>
      </div>
    </section>
  );
}
