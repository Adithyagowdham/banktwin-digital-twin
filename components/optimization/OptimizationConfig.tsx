import type { OperationalRisk } from "../../lib/simulationTypes";
import type { OptimizationRequest } from "../../lib/optimizationTypes";

const TRANSACTIONS = ["Deposit", "Withdrawal", "Account Opening", "Loan Service", "Cash Transfer", "General Inquiry"] as const;
const RISKS: OperationalRisk[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function OptimizationConfig({ config, onChange, onRun, isRunning, canRun, searchSpaceSize, validationError }: {
  config: OptimizationRequest;
  onChange: (next: OptimizationRequest) => void;
  onRun: () => void;
  isRunning: boolean;
  canRun: boolean;
  searchSpaceSize: number;
  validationError: string | null;
}) {
  function numeric(key: keyof OptimizationRequest, value: string) {
    onChange({ ...config, [key]: value === "" ? 0 : Number(value) });
  }

  return (
    <section className="optimization-config" aria-label="Optimization configuration">
      <div className="optimization-section-heading"><div><span className="section-heading__index">01</span><h2>OPTIMIZATION CONFIGURATION</h2></div><span className="mono-label">EXHAUSTIVE COUNTER × STAFF SEARCH</span></div>
      <div className="optimization-fields">
        <label><span>CUSTOMERS</span><input type="number" min="1" step="1" value={config.customers || ""} onChange={(event) => numeric("customers", event.target.value)} /></label>
        <label><span>ARRIVAL RATE / TIME UNIT</span><input type="number" min="0.1" step="0.1" value={config.arrival_rate || ""} onChange={(event) => numeric("arrival_rate", event.target.value)} /></label>
        <label><span>AVERAGE SERVICE TIME</span><input type="number" min="0.1" step="0.1" value={config.avg_service_time || ""} onChange={(event) => numeric("avg_service_time", event.target.value)} /></label>
        <label><span>DURATION / TIME UNITS</span><input type="number" min="0.1" step="0.1" value={config.duration || ""} onChange={(event) => numeric("duration", event.target.value)} /></label>
        <label><span>TRANSACTION TYPE</span><select value={config.transaction_type} onChange={(event) => onChange({ ...config, transaction_type: event.target.value as OptimizationRequest["transaction_type"] })}>{TRANSACTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>PRIORITY</span><select value={config.priority} onChange={(event) => onChange({ ...config, priority: event.target.value as OptimizationRequest["priority"] })}><option value="Normal">Normal</option><option value="Priority">Priority</option></select></label>
        <label><span>BASE RANDOM SEED</span><input type="number" step="1" value={config.base_seed} onChange={(event) => numeric("base_seed", event.target.value)} /></label>
        <label><span>RUNS / CONFIGURATION</span><select value={config.runs} onChange={(event) => numeric("runs", event.target.value)}>{[1, 2, 3, 5, 10].map((runs) => <option value={runs} key={runs}>{runs} RUN{runs === 1 ? "" : "S"}</option>)}</select></label>
      </div>
      <div className="optimization-range-grid">
        <fieldset><legend>COUNTER SEARCH RANGE</legend><label><span>MIN</span><input type="number" min="1" step="1" value={config.min_counters} onChange={(event) => numeric("min_counters", event.target.value)} /></label><span className="optimization-range-arrow">TO</span><label><span>MAX</span><input type="number" min="1" step="1" value={config.max_counters} onChange={(event) => numeric("max_counters", event.target.value)} /></label></fieldset>
        <fieldset><legend>STAFF SEARCH RANGE</legend><label><span>MIN</span><input type="number" min="1" step="1" value={config.min_staff} onChange={(event) => numeric("min_staff", event.target.value)} /></label><span className="optimization-range-arrow">TO</span><label><span>MAX</span><input type="number" min="1" step="1" value={config.max_staff} onChange={(event) => numeric("max_staff", event.target.value)} /></label></fieldset>
      </div>
      <div className="optimization-objective-settings">
        <div className="optimization-subheading"><span>PROTOTYPE RISK WEIGHTS</span><small>Configurable research heuristics, not industry standards.</small></div>
        {RISKS.map((risk) => <label key={risk}><span>{risk}</span><input type="number" min="0" step="0.05" value={config.risk_weights[risk]} onChange={(event) => onChange({ ...config, risk_weights: { ...config.risk_weights, [risk]: Math.max(0, Number(event.target.value) || 0) } })} /></label>)}
        <label><span>PROTOTYPE UTILIZATION THRESHOLD / %</span><input type="number" min="1" max="99" step="1" value={config.utilization_threshold} onChange={(event) => numeric("utilization_threshold", event.target.value)} /></label>
        <label><span>RESOURCE WASTE WEIGHT</span><input type="number" min="0" step="0.05" value={config.resource_penalty_weight} onChange={(event) => numeric("resource_penalty_weight", event.target.value)} /></label>
      </div>
      <div className="optimization-config-footer"><span>{searchSpaceSize} CANDIDATE CONFIGURATION{searchSpaceSize === 1 ? "" : "S"} · {searchSpaceSize * config.runs} SIMULATION RUNS</span><button type="button" className="simulation-action simulation-action--start" onClick={onRun} disabled={isRunning || !canRun}>{isRunning ? <><i className="button-spinner" /> OPTIMIZATION RUNNING...</> : <><span aria-hidden="true">▶</span> RUN OPTIMIZATION</>}</button></div>
      {validationError && <p className="optimization-validation-error" role="alert">{validationError}</p>}
    </section>
  );
}
