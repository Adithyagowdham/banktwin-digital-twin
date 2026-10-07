import type { CounterRecord, CustomerRecord, StaffRecord } from "./types";

export function EntryNode() {
  return <div className="map-node map-node--entry" role="group" aria-label="Entry portal"><span className="map-node__icon map-node__icon--entry" aria-hidden="true">↘</span><span className="map-node__name">ENTRY PORTAL</span><span className="map-node__meta">CUSTOMER INTAKE</span></div>;
}

export function TokenArea() {
  return <div className="map-node map-node--kiosk map-node--token-area" role="group" aria-label="Token kiosks K1 through K4"><span className="map-node__icon" aria-hidden="true">▤</span><span className="map-node__name">TOKEN / KIOSK</span><span className="map-node__meta">SELF CHECK-IN</span><span className="token-terminals">{["K1", "K2", "K3", "K4"].map((terminal) => <i key={terminal}>{terminal}</i>)}</span></div>;
}

interface CustomerNodeProps { customer: CustomerRecord; labelVisible: boolean; onClick: () => void; className?: string }
export function CustomerNode({ customer, labelVisible, onClick, className = "" }: CustomerNodeProps) {
  return <button type="button" className={`customer-node customer-node--${customer.status.toLowerCase()} ${className}`} onClick={onClick} aria-label={`Simulated customer ${customer.id}, ${customer.transactionType}, ${customer.status}`} title={`${customer.id} · ${customer.transactionType} · ${customer.status}`}><span className="customer-node__avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.1" /><path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" /></svg></span>{labelVisible && <span className="customer-node__label">{customer.id}<small>{customer.status}</small></span>}</button>;
}

interface WaitingAreaProps { customers: CustomerRecord[]; labelsVisible: boolean; onCustomerClick: (id: string) => void }
export function WaitingArea({ customers, labelsVisible, onCustomerClick }: WaitingAreaProps) {
  const waitingCustomers = customers.filter((customer) => customer.status === "WAITING" || customer.status === "DELAYED");
  return <section className="waiting-area" aria-label="Waiting lounge"><div className="waiting-area__heading"><span className="waiting-area__title">WAITING LOUNGE</span><span className="waiting-area__count">{customers.length ? `${waitingCustomers.length} IN QUEUE` : "NO DATA"}</span></div><div className="customer-indicators">{waitingCustomers.map((customer) => <CustomerNode key={customer.id} customer={customer} labelVisible={labelsVisible} onClick={() => onCustomerClick(customer.id)} />)}{customers.length === 0 && <span className="map-no-data">CUSTOMERS · NO DATA</span>}</div><span className="waiting-area__bench" aria-hidden="true" /></section>;
}

interface CounterNodeProps { counter: CounterRecord; selected: boolean; onClick: () => void }
export function CounterNode({ counter, selected, onClick }: CounterNodeProps) {
  const statusClass = counter.status?.toLowerCase() ?? "no-data";
  return <button type="button" className={`counter-node counter-node--${statusClass}${selected ? " is-selected" : ""}`} onClick={onClick} aria-label={`${counter.id}, ${counter.status ?? "NO DATA"}, queue ${counter.queueLength ?? "no data"}`} aria-pressed={selected}><span className="counter-node__top"><span className="counter-node__id">{counter.id}</span><span className={`counter-node__status counter-node__status--${statusClass}`}>{counter.status?.slice(0, 1) ?? "—"}</span></span><span className="counter-node__type">{counter.status ?? "NO DATA"}</span><span className="counter-node__details"><span>QUEUE <b>{counter.queueLength ?? "—"}</b></span><span>STAFF <b>{counter.staffId ?? "—"}</b></span></span></button>;
}

interface CounterGridProps { counters: CounterRecord[]; customers: CustomerRecord[]; selectedId: string | null; labelsVisible: boolean; onCounterClick: (id: string) => void; onCustomerClick: (id: string) => void }
export function CounterGrid({ counters, customers, selectedId, labelsVisible, onCounterClick, onCustomerClick }: CounterGridProps) {
  return <section className="map-counters" aria-label="Simulated service counters">{counters.map((counter) => {
    const customer = counter.currentCustomerId ? customers.find((person) => person.id === counter.currentCustomerId) : undefined;
    return <div className="counter-bay" key={counter.id}><CounterNode counter={counter} selected={counter.id === selectedId} onClick={() => onCounterClick(counter.id)} />{customer && <CustomerNode customer={customer} labelVisible={labelsVisible} onClick={() => onCustomerClick(customer.id)} className="customer-node--at-counter" />}</div>;
  })}</section>;
}

export function ATMZone() {
  return <section className="atm-zone" aria-label="ATM terminals"><span className="atm-zone__icon" aria-hidden="true">▣</span><span className="atm-zone__title">ATM ZONE</span><span className="atm-zone__terminals">{["ATM-01", "ATM-02", "ATM-03", "ATM-04"].map((atm) => <span key={atm}>{atm}<i /></span>)}</span></section>;
}

interface StaffNodeProps { staff: StaffRecord; labelVisible: boolean; onClick: () => void }
export function StaffNode({ staff, labelVisible, onClick }: StaffNodeProps) {
  return <button type="button" className={`staff-node staff-node--${staff.status.toLowerCase()}`} onClick={onClick} aria-label={`Staff ${staff.id}, ${staff.role}, ${staff.status}`} title={`${staff.id} · ${staff.role}`}><span className="staff-node__avatar" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.1" /><path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6" /></svg></span>{labelVisible && <span className="staff-node__label">{staff.id}<small>{staff.role}</small></span>}<i className="staff-node__state" aria-hidden="true" /></button>;
}

interface StaffAreaProps { staff: StaffRecord[]; labelsVisible: boolean; onStaffClick: (id: string) => void }
export function StaffArea({ staff, labelsVisible, onStaffClick }: StaffAreaProps) {
  return <section className="staff-area" aria-label="Staff area"><div className="staff-area__heading">STAFF AREA <span>{staff.length ? `TEAM ${staff.length.toString().padStart(2, "0")}` : "NO DATA"}</span></div><div className="staff-indicators">{staff.map((person) => <StaffNode key={person.id} staff={person} labelVisible={labelsVisible} onClick={() => onStaffClick(person.id)} />)}{staff.length === 0 && <span className="map-no-data">STAFF · NO DATA</span>}</div></section>;
}

export function CompletionArea({ customers, labelsVisible, onCustomerClick }: WaitingAreaProps) {
  const completedCustomers = customers.filter((customer) => customer.status === "COMPLETED");
  return <section className="completion-area" aria-label="Completed demo customers"><span className="completion-area__title">COMPLETED</span><div>{completedCustomers.map((customer) => <CustomerNode key={customer.id} customer={customer} labelVisible={labelsVisible} onClick={() => onCustomerClick(customer.id)} />)}</div></section>;
}

export function ExitNode() {
  return <div className="map-node map-node--exit" role="group" aria-label="Branch exit"><span className="map-node__icon map-node__icon--exit" aria-hidden="true">↗</span><span className="map-node__name">EXIT</span><span className="map-node__meta">CUSTOMER OUT</span></div>;
}

export function FlowPath({ visible }: { visible: boolean }) {
  return <svg className={`map-connectors${visible ? " is-visible" : ""}`} viewBox="0 0 1200 540" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs><path className="connector connector--primary" d="M105 230 H215" markerEnd="url(#flowArrow)"/><path className="connector connector--primary" d="M350 230 H445" markerEnd="url(#flowArrow)"/><path className="connector connector--primary" d="M520 230 V135 H630" markerEnd="url(#flowArrow)"/><path className="connector connector--primary" d="M900 135 H1010" markerEnd="url(#flowArrow)"/><path className="connector connector--secondary" d="M500 230 V390 H640" markerEnd="url(#flowArrow)"/><path className="connector connector--secondary" d="M770 390 H1010 V230" markerEnd="url(#flowArrow)"/><path className="connector connector--dashed" d="M280 270 V390 H415" markerEnd="url(#flowArrow)"/></svg>;
}