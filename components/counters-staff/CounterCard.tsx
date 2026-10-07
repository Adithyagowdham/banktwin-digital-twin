import type { CounterRecord } from "../digital-twin/types";
import type { CounterStatus } from "../../lib/simulationTypes";

interface CounterCardProps {
  counter: CounterRecord;
  simulationStatus: CounterStatus | null | undefined;
  customersServed: number | null | undefined;
  localStatus: boolean;
  localAssignment: boolean;
  selected: boolean;
  onSelect: () => void;
  onSetStatus: (status: CounterStatus) => void;
}

function utilizationWidth(value: number | null): string {
  return `${value === null ? 0 : Math.max(0, Math.min(100, value))}%`;
}

export default function CounterCard({ counter, simulationStatus, customersServed, localStatus, localAssignment, selected, onSelect, onSetStatus }: CounterCardProps) {
  const statusClass = counter.status?.toLowerCase() ?? "no-data";
  return <article className={`ops-card ops-counter ops-counter--${statusClass}${selected ? " is-selected" : ""}`}>
    <button className="ops-card__select" type="button" onClick={onSelect} aria-label={`Inspect counter ${counter.id}, ${counter.status ?? "NO DATA"}`} aria-pressed={selected}>
      <span className="ops-card__top"><b>{counter.id}</b><span className={`ops-status ops-status--${statusClass}${localStatus ? " ops-status--local" : ""}`}>{localStatus ? `LOCAL · ${counter.status ?? "NO DATA"}` : counter.status ?? "NO DATA"}</span></span>
      <span className="ops-card__customer"><small>CURRENT CUSTOMER</small><b>{counter.currentCustomerId ?? "NO DATA"}</b></span>
      <span className="ops-card__facts"><span>QUEUE <b>{counter.queueLength ?? "—"}</b></span><span>ASSIGNED STAFF <b>{counter.staffId ?? "NO DATA"}{localAssignment && <small className="ops-local-flag">LOCAL</small>}</b></span></span>
      <span className="ops-utilization"><span><small>UTILIZATION</small><b>{counter.utilization === null ? "—" : `${counter.utilization.toFixed(1)}%`}</b></span><i><em style={{ width: utilizationWidth(counter.utilization) }} /></i></span>
      {customersServed !== null && <span className="ops-card__served">COMPLETED SERVICES <b>{customersServed}</b></span>}
      <span className="ops-card__source">{simulationStatus ? `SIMULATION ${simulationStatus}` : "NO SIMULATION DATA"}</span>
    </button>
    <div className="ops-card__actions"><button type="button" onClick={() => onSetStatus("AVAILABLE")} aria-label={`Open counter ${counter.id}`}>OPEN COUNTER</button><button type="button" onClick={() => onSetStatus("OFFLINE")} aria-label={`Close counter ${counter.id}`}>CLOSE COUNTER</button></div>
    <label className="ops-card__status-control"><span>LOCAL CONTROL</span><select aria-label={`Set local status for ${counter.id}`} value={counter.status ?? ""} onChange={(event) => { if (event.target.value) onSetStatus(event.target.value as CounterStatus); }}><option value="" disabled>NO DATA</option><option value="AVAILABLE">AVAILABLE</option><option value="BUSY">BUSY</option><option value="BREAK">BREAK</option><option value="OFFLINE">OFFLINE</option></select></label>
  </article>;
}
