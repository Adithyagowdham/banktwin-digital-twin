import type { CounterRecord, CustomerRecord, StaffRecord } from "./types";
import type { CounterStatus, StaffStatus as SimulationStaffStatus } from "../../lib/simulationTypes";
import type { StaffOperationalStatus } from "../../lib/SimulationContext";

interface CounterInspectorProps { counter: CounterRecord; onClose: () => void; simulationStatus?: CounterStatus | null; customersServed?: number | null; localControl?: boolean; onStatusChange?: (status: CounterStatus) => void }
export function CounterInspector({ counter, onClose, simulationStatus, customersServed, localControl = false, onStatusChange }: CounterInspectorProps) {
  const facts = [["CURRENT CUSTOMER", counter.currentCustomerId ?? "NO DATA"], ["QUEUE LENGTH", counter.queueLength === null ? "—" : String(counter.queueLength)], ["ASSIGNED STAFF", counter.staffId ?? "NO DATA"], ["UTILIZATION", counter.utilization === null ? "—" : `${counter.utilization.toFixed(1)}%`], ["CUSTOMERS SERVED", customersServed === null || customersServed === undefined ? "—" : String(customersServed)], ["CURRENT TRANSACTION TYPE", counter.transactionType ?? "NO DATA"]];
  const statusClass = counter.status?.toLowerCase() ?? "neutral";
  return <InspectorFrame type="COUNTER INSPECTOR" id={counter.id} onClose={onClose}><div className="inspector-status"><span>{localControl || onStatusChange ? "LOCAL CONTROL STATUS" : "SIMULATION STATUS"}</span><b className={`state-text state-text--${statusClass}`}>{counter.status ?? "NO DATA"}</b></div>{(localControl || onStatusChange) && simulationStatus && <div className="inspector-status inspector-status--secondary"><span>SIMULATION STATE</span><b className={`state-text state-text--${simulationStatus.toLowerCase()}`}>{simulationStatus}</b></div>}<InspectorFacts facts={facts} />{onStatusChange ? <div className="inspector-actions"><span className="inspector-label">SET LOCAL COUNTER STATUS</span><div className="status-actions">{(["AVAILABLE", "BUSY", "BREAK", "OFFLINE"] as const).map((status) => <button key={status} type="button" className={`status-action status-action--${status.toLowerCase()}${counter.status === status ? " is-current" : ""}`} onClick={() => onStatusChange(status)} aria-pressed={counter.status === status}>{status}</button>)}</div><div className="inspector-open-close"><button type="button" onClick={() => onStatusChange("AVAILABLE")}>OPEN COUNTER</button><button type="button" onClick={() => onStatusChange("OFFLINE")}>CLOSE COUNTER</button></div></div> : <div className="inspector-readonly">{counter.status ? "COUNTER STATE IS READ-ONLY · RETURNED BY SIMULATION" : "RUN A SIMULATION TO POPULATE COUNTER DATA"}</div>}<DemoNote /></InspectorFrame>;
}

interface CustomerInspectorProps { customer: CustomerRecord; onClose: () => void }
export function CustomerInspector({ customer, onClose }: CustomerInspectorProps) {
  const facts = [["ARRIVAL TIME", customer.arrivalTime], ["TRANSACTION TYPE", customer.transactionType], ["PRIORITY", customer.priority], ["ASSIGNED COUNTER", customer.assignedCounter ?? "—"], ["ASSIGNED STAFF", customer.assignedStaff ?? "—"], ["WAITING TIME", customer.waitingTime ?? "—"], ["SERVICE START", customer.serviceStartTime ?? "—"], ["SERVICE END", customer.serviceEndTime ?? "—"], ["SERVICE TIME", customer.serviceTime ?? "—"]];
  return <InspectorFrame type="CUSTOMER INSPECTOR" id={customer.id} onClose={onClose}><div className="inspector-status"><span>STATUS</span><b className={`state-text state-text--${customer.status.toLowerCase()}`}>{customer.status}</b></div><InspectorFacts facts={facts} /><DemoNote /></InspectorFrame>;
}

interface StaffInspectorProps { staff: StaffRecord; onClose: () => void; currentCustomerId?: string | null; simulationStatus?: SimulationStaffStatus; localControl?: boolean; onStatusChange?: (status: StaffOperationalStatus) => void }
export function StaffInspector({ staff, onClose, currentCustomerId, simulationStatus, localControl = false, onStatusChange }: StaffInspectorProps) {
  const facts = [["ROLE", staff.role], ["ASSIGNED COUNTER", staff.assignedCounter ?? "NO DATA"], ["CURRENT CUSTOMER", currentCustomerId ?? "NO DATA"], ["CUSTOMERS SERVED", staff.customersServed === null ? "—" : String(staff.customersServed)], ["UTILIZATION", staff.utilization === null ? "—" : `${staff.utilization.toFixed(1)}%`]];
  const statusClass = staff.status.toLowerCase();
  return <InspectorFrame type="STAFF INSPECTOR" id={staff.id} onClose={onClose}><div className="inspector-status"><span>{localControl || onStatusChange ? "LOCAL CONTROL STATUS" : "SIMULATION STATUS"}</span><b className={`state-text state-text--${statusClass}`}>{staff.status}</b></div>{(localControl || onStatusChange) && <div className="inspector-status inspector-status--secondary"><span>SIMULATION STATE</span><b className={`state-text state-text--${simulationStatus?.toLowerCase() ?? "neutral"}`}>{simulationStatus ?? "NO DATA"}</b></div>}<InspectorFacts facts={facts} />{onStatusChange && <div className="inspector-actions"><span className="inspector-label">SET LOCAL STAFF STATUS</span><div className="status-actions">{(["AVAILABLE", "BUSY", "BREAK", "OFFLINE"] as const).map((status) => <button key={status} type="button" className={`status-action status-action--${status.toLowerCase()}${staff.status === status ? " is-current" : ""}`} onClick={() => onStatusChange(status)} aria-pressed={staff.status === status}>{status}</button>)}</div></div>}<DemoNote /></InspectorFrame>;
}

function InspectorFrame({ type, id, onClose, children }: { type: string; id: string; onClose: () => void; children: React.ReactNode }) {
  return <aside className="inspector-panel" aria-label={`${type}: ${id}`}><div className="inspector-panel__header"><div><span>{type}</span><h2>{id}</h2></div><button type="button" className="inspector-close" onClick={onClose} aria-label="Close inspector">×</button></div>{children}</aside>;
}

function InspectorFacts({ facts }: { facts: string[][] }) {
  return <dl className="inspector-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function DemoNote() {
  return <div className="simulated-note"><span>SIMULATED</span><p>Local demonstration state only. Not connected to real banking operations.</p></div>;
}
