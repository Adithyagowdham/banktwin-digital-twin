import type { StaffRecord } from "../digital-twin/types";
import type { StaffOperationalStatus } from "../../lib/SimulationContext";
import type { StaffStatus as SimulationStaffStatus } from "../../lib/simulationTypes";

interface StaffCardProps {
  staff: StaffRecord;
  simulationStatus: SimulationStaffStatus;
  currentCustomerId: string | null;
  localStatus: boolean;
  localAssignment: boolean;
  selected: boolean;
  onSelect: () => void;
  onSetStatus: (status: StaffOperationalStatus) => void;
}

function utilizationWidth(value: number | null): string {
  return `${value === null ? 0 : Math.max(0, Math.min(100, value))}%`;
}

export default function StaffCard({ staff, simulationStatus, currentCustomerId, localStatus, localAssignment, selected, onSelect, onSetStatus }: StaffCardProps) {
  const statusClass = staff.status.toLowerCase();
  return <article className={`ops-card ops-staff ops-staff--${statusClass}${selected ? " is-selected" : ""}`}>
    <button className="ops-card__select" type="button" onClick={onSelect} aria-label={`Inspect staff ${staff.id}, ${staff.status}`} aria-pressed={selected}>
      <span className="ops-card__top"><b>{staff.id}</b><span className={`ops-status ops-status--${statusClass}${localStatus ? " ops-status--local" : ""}`}>{localStatus ? `LOCAL · ${staff.status}` : staff.status}</span></span>
      <span className="ops-card__role">{staff.role}</span>
      <span className="ops-card__facts"><span>ASSIGNED COUNTER <b>{staff.assignedCounter ?? "NO DATA"}{localAssignment && <small className="ops-local-flag">LOCAL</small>}</b></span><span>CURRENT CUSTOMER <b>{currentCustomerId ?? "NO DATA"}</b></span></span>
      <span className="ops-utilization"><span><small>UTILIZATION</small><b>{staff.utilization === null ? "—" : `${staff.utilization.toFixed(1)}%`}</b></span><i><em style={{ width: utilizationWidth(staff.utilization) }} /></i></span>
      <span className="ops-card__served">CUSTOMERS SERVED <b>{staff.customersServed ?? "—"}</b></span>
      <span className="ops-card__source">SIMULATION {simulationStatus}</span>
    </button>
    <label className="ops-card__status-control"><span>LOCAL CONTROL</span><select aria-label={`Set local status for ${staff.id}`} value={staff.status} onChange={(event) => onSetStatus(event.target.value as StaffOperationalStatus)}><option value="AVAILABLE">AVAILABLE</option><option value="BUSY">BUSY</option><option value="BREAK">BREAK</option><option value="OFFLINE">OFFLINE</option></select></label>
  </article>;
}
