import type { SimulationConfig, TransactionType } from "../../lib/simulationTypes";

interface SimulationConfigPanelProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  onStart: () => void;
  disabled: boolean;
}

const transactionTypes: TransactionType[] = [
  "Deposit",
  "Withdrawal",
  "Account Opening",
  "Loan Service",
  "Cash Transfer",
  "General Inquiry",
];

export default function SimulationConfigPanel({ config, onChange, onStart, disabled }: SimulationConfigPanelProps) {
  function updateNumber(key: "customers" | "arrival_rate" | "counters" | "staff" | "avg_service_time" | "duration", value: string) {
    onChange({ ...config, [key]: value === "" ? 0 : Number(value) });
  }

  return <form className="simulation-config" onSubmit={(event) => { event.preventDefault(); onStart(); }}>
    <div className="simulation-config__heading"><div><span className="section-heading__index">SIM / CONFIG</span><h2>Branch run parameters</h2></div><span className="simulation-config__hint">LOCAL API · SIMPY</span></div>
    <div className="simulation-config__fields">
      <label><span>CUSTOMERS</span><input type="number" min="1" step="1" value={config.customers || ""} onChange={(event) => updateNumber("customers", event.target.value)} required /></label>
      <label><span>ARRIVAL RATE / TIME UNIT</span><input type="number" min="0.1" step="0.1" value={config.arrival_rate || ""} onChange={(event) => updateNumber("arrival_rate", event.target.value)} required /></label>
      <label><span>COUNTERS</span><input type="number" min="1" step="1" value={config.counters || ""} onChange={(event) => updateNumber("counters", event.target.value)} required /></label>
      <label><span>STAFF</span><input type="number" min="1" step="1" value={config.staff || ""} onChange={(event) => updateNumber("staff", event.target.value)} required /></label>
      <label><span>AVG SERVICE TIME</span><input type="number" min="0.1" step="0.1" value={config.avg_service_time || ""} onChange={(event) => updateNumber("avg_service_time", event.target.value)} required /></label>
      <label><span>DURATION / TIME UNITS</span><input type="number" min="1" step="1" value={config.duration || ""} onChange={(event) => updateNumber("duration", event.target.value)} required /></label>
      <label><span>TRANSACTION TYPE</span><select value={config.transaction_type} onChange={(event) => onChange({ ...config, transaction_type: event.target.value as TransactionType })}>{transactionTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label><span>PRIORITY</span><select value={config.priority} onChange={(event) => onChange({ ...config, priority: event.target.value as SimulationConfig["priority"] })}><option value="Normal">Normal</option><option value="Priority">Priority</option></select></label>
      <label><span>RANDOM SEED</span><input type="number" step="1" value={config.random_seed ?? ""} onChange={(event) => onChange({ ...config, random_seed: event.target.value === "" ? null : Number(event.target.value) })} placeholder="Optional" /></label>
    </div>
    <div className="simulation-config__footer"><span>Configured values only · returned results come from the backend</span><button type="submit" className="simulation-action simulation-action--start" disabled={disabled}>{disabled ? <><i className="button-spinner" /> RUNNING SIMULATION...</> : <><span aria-hidden="true">▶</span> START SIMULATION</>}</button></div>
  </form>;
}
