"use client";

import { useMemo, useState } from "react";
import { useSimulation, type StaffOperationalStatus } from "../../lib/SimulationContext";
import type { CounterStatus } from "../../lib/simulationTypes";
import type { CounterRecord, StaffRecord } from "../digital-twin/types";
import { CounterInspector, StaffInspector } from "../digital-twin/Inspectors";
import StatusIndicator from "../ui/StatusIndicator";
import CounterCard from "./CounterCard";
import StaffCard from "./StaffCard";

type Selection = { type: "counter" | "staff"; id: string } | null;
const counterStates: CounterStatus[] = ["AVAILABLE", "BUSY", "BREAK", "OFFLINE"];
const staffStates: StaffOperationalStatus[] = ["AVAILABLE", "BUSY", "BREAK", "OFFLINE"];

function blankCounter(index: number): CounterRecord {
  return { id: `C${String(index + 1).padStart(2, "0")}`, status: null, queueLength: null, staffId: null, currentCustomerId: null, transactionType: null, utilization: null, serviceTime: null };
}

function filterOptions(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))].sort();
}

export default function CountersStaff() {
  const { result, counterStatusOverrides, staffAssignmentOverrides, staffStatusOverrides, setCounterStatus, assignStaff, setStaffStatus } = useSimulation();
  const [search, setSearch] = useState("");
  const [counterStatusFilter, setCounterStatusFilter] = useState("ALL");
  const [staffStatusFilter, setStaffStatusFilter] = useState("ALL");
  const [assignedStaffFilter, setAssignedStaffFilter] = useState("ALL");
  const [assignedCounterFilter, setAssignedCounterFilter] = useState("ALL");
  const [selected, setSelected] = useState<Selection>(null);
  const [assignmentStaffId, setAssignmentStaffId] = useState("");
  const [assignmentCounterId, setAssignmentCounterId] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");

  const simulationStaff = useMemo(() => result?.staff ?? [], [result]);
  const staff: StaffRecord[] = useMemo(() => simulationStaff.map((person) => {
    const assignedCounter = Object.hasOwn(staffAssignmentOverrides, person.staff_id)
      ? staffAssignmentOverrides[person.staff_id]
      : person.assigned_counter;
    const simulationStaffStatus: StaffOperationalStatus = person.status === "SERVING" ? "BUSY" : person.status;
    return {
      id: person.staff_id,
      role: person.role,
      assignedCounter,
      status: staffStatusOverrides[person.staff_id] ?? simulationStaffStatus,
      customersServed: person.customers_served,
      utilization: result && result.simulation_duration > 0 ? Math.min(100, person.busy_time / result.simulation_duration * 100) : null,
    };
  }), [simulationStaff, staffAssignmentOverrides, staffStatusOverrides, result]);

  const counters: CounterRecord[] = useMemo(() => {
    const simulationCounters = result?.counters ?? [];
    const ids = new Set([...Array.from({ length: 8 }, (_, index) => blankCounter(index).id), ...simulationCounters.map((counter) => counter.counter_id)]);
    return [...ids].sort().map((id) => {
      const simulationCounter = simulationCounters.find((counter) => counter.counter_id === id);
      const currentCustomer = simulationCounter?.current_customer
        ? result?.customers.find((customer) => customer.customer_id === simulationCounter.current_customer)
        : undefined;
      const assignedStaff = staff.find((person) => person.assignedCounter === id);
      const completedForCounter = result?.customers.filter((customer) => customer.assigned_counter === id && customer.status === "COMPLETED").length;
      return {
        id,
        status: counterStatusOverrides[id] ?? simulationCounter?.status ?? null,
        queueLength: null,
        staffId: assignedStaff?.id ?? null,
        currentCustomerId: simulationCounter?.current_customer ?? null,
        transactionType: currentCustomer?.transaction_type ?? null,
        utilization: simulationCounter && result && result.simulation_duration > 0 ? Math.min(100, simulationCounter.busy_time / result.simulation_duration * 100) : null,
        serviceTime: currentCustomer?.service_time === null || currentCustomer?.service_time === undefined ? null : `${currentCustomer.service_time.toFixed(2)} TU`,
        customersServed: completedForCounter ?? null,
        simulationStatus: simulationCounter?.status ?? null,
      };
    });
  }, [result, counterStatusOverrides, staff]);

  const matchingCounters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return counters.filter((counter) => {
      const associatedCustomer = result?.customers.some((customer) => customer.assigned_counter === counter.id && customer.customer_id.toLowerCase().includes(query)) ?? false;
      const searchMatch = !query || associatedCustomer || [counter.id, counter.currentCustomerId ?? "", counter.staffId ?? ""].some((value) => value.toLowerCase().includes(query));
      return searchMatch
        && (counterStatusFilter === "ALL" || counter.status === counterStatusFilter)
        && (assignedStaffFilter === "ALL" || counter.staffId === assignedStaffFilter);
    });
  }, [counters, search, counterStatusFilter, assignedStaffFilter, result]);

  const matchingStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter((person) => {
      const currentCustomer = result?.customers.find((customer) => customer.status === "SERVING" && customer.assigned_staff === person.id)?.customer_id ?? "";
      const associatedCustomer = result?.customers.some((customer) => customer.assigned_staff === person.id && customer.customer_id.toLowerCase().includes(query)) ?? false;
      const searchMatch = !query || associatedCustomer || [person.id, currentCustomer].some((value) => value.toLowerCase().includes(query));
      return searchMatch
        && (staffStatusFilter === "ALL" || person.status === staffStatusFilter)
        && (assignedCounterFilter === "ALL" || person.assignedCounter === assignedCounterFilter);
    });
  }, [staff, search, staffStatusFilter, assignedCounterFilter, result]);

  const operationalCounters = counters.filter((counter) => counter.status !== null);
  const activeCounters = operationalCounters.filter((counter) => counter.status === "AVAILABLE" || counter.status === "BUSY").length;
  const busyCounters = operationalCounters.filter((counter) => counter.status === "BUSY").length;
  const offlineCounters = operationalCounters.filter((counter) => counter.status === "OFFLINE").length;
  const busyStaffCount = staff.filter((person) => person.status === "BUSY" || person.status === "SERVING").length;
  const availableStaff = staff.filter((person) => person.status === "AVAILABLE").length;
  const averageStaffUtilization = result?.staff_utilization;
  const selectedCounter = selected?.type === "counter" ? counters.find((counter) => counter.id === selected.id) : undefined;
  const selectedStaff = selected?.type === "staff" ? staff.find((person) => person.id === selected.id) : undefined;
  const selectedStaffSimulation = selectedStaff ? simulationStaff.find((person) => person.staff_id === selectedStaff.id) : undefined;
  const activeStaffAssignment = staffAssignmentOverrides[assignmentStaffId] ?? simulationStaff.find((person) => person.staff_id === assignmentStaffId)?.assigned_counter ?? "";
  const counterOptions = counters.map((counter) => counter.id);

  function applyAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignmentStaffId || !assignmentCounterId) return;
    assignStaff(assignmentStaffId, assignmentCounterId);
    setAssignmentMessage(`${assignmentStaffId} ASSIGNED TO ${assignmentCounterId} · LOCAL CONTROL ONLY`);
  }

  function setStatus(counterId: string, status: CounterStatus) {
    setCounterStatus(counterId, status);
  }

  const kpis = [
    { label: "TOTAL COUNTERS", value: result ? String(result.counters.length) : "—", tone: "cyan" },
    { label: "ACTIVE COUNTERS", value: result ? String(activeCounters) : "—", tone: "success" },
    { label: "BUSY COUNTERS", value: result ? String(busyCounters) : "—", tone: "warning" },
    { label: "OFFLINE COUNTERS", value: result ? String(offlineCounters) : "—", tone: "danger" },
    { label: "TOTAL STAFF", value: result ? String(staff.length) : "—", tone: "cyan" },
    { label: "AVAILABLE STAFF", value: result ? String(availableStaff) : "—", tone: "success" },
    { label: "BUSY STAFF", value: result ? String(busyStaffCount) : "—", tone: "warning" },
    { label: "STAFF UTILIZATION", value: averageStaffUtilization === undefined ? "—" : `${averageStaffUtilization.toFixed(1)}%`, tone: "blue" },
  ];

  return <div className="operations-view counters-staff-view">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> OPERATIONS / RESOURCE MANAGEMENT</div><h1>COUNTERS & STAFF <span>{"//"}</span> CONTROL</h1><p className="page-heading__subtitle">Simulation-backed branch resources with explicit local operational controls</p></div><div className="page-heading__meta"><StatusIndicator label={result ? "SIMULATION DATA" : "NO OPERATIONAL DATA"} tone={result ? "online" : "neutral"} compact /><span className="mono-label">LOCAL CONTROL / NOT AFFECTING SIMULATION</span></div></div>

    {!result && <div className="ops-no-data-banner"><span>NO OPERATIONAL DATA</span><p>Run a simulation from the Digital Twin to populate counter and staff information.</p></div>}
    <section className="operation-kpis counters-kpis" aria-label="Counters and staff summary">{kpis.map((metric, index) => <article className={`operation-kpi operation-kpi--${metric.tone}`} key={metric.label}><span>{String(index + 1).padStart(2, "0")} / {metric.label}</span><b>{metric.value}</b></article>)}</section>

    <section className="ops-assignment-panel"><div className="ops-section-heading"><div><span className="section-heading__index">LOCAL CONTROL</span><h2>Assign / reassign staff</h2></div><span className="outline-tag">DOES NOT CHANGE SIMPY RESULT</span></div><form className="ops-assignment-form" onSubmit={applyAssignment}><label><span>STAFF MEMBER</span><select value={assignmentStaffId} onChange={(event) => setAssignmentStaffId(event.target.value)} disabled={staff.length === 0} required><option value="">{staff.length ? "SELECT STAFF" : "STAFF DATA NOT AVAILABLE"}</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.id} · {person.role}</option>)}</select></label><span className="ops-assignment-arrow" aria-hidden="true">→</span><label><span>COUNTER</span><select value={assignmentCounterId} onChange={(event) => setAssignmentCounterId(event.target.value)} disabled={staff.length === 0} required><option value="">SELECT COUNTER</option>{counterOptions.map((counterId) => <option key={counterId}>{counterId}</option>)}</select></label><button type="submit" className="twin-control-button twin-control-button--primary" disabled={staff.length === 0 || !assignmentStaffId || !assignmentCounterId}>{activeStaffAssignment ? "REASSIGN STAFF" : "ASSIGN STAFF"}</button></form>{assignmentMessage && <p className="ops-assignment-message" role="status">{assignmentMessage}</p>}</section>

    <section className="ops-resource-section"><div className="ops-section-heading"><div><span className="section-heading__index">01</span><h2>Branch counters</h2><span className="ops-section-count">{matchingCounters.length} / {counters.length}</span></div><span className="ops-section-note">LOCAL STATUS OVERRIDES ARE VISUAL ONLY</span></div>
      <div className="ops-filters"><label className="records-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search counter, staff, customer ID..." aria-label="Search counters and staff" /><kbd>LOCAL FILTER</kbd></label><Filter label="COUNTER STATUS" value={counterStatusFilter} options={counterStates} onChange={setCounterStatusFilter} /><Filter label="ASSIGNED STAFF" value={assignedStaffFilter} options={filterOptions(counters.map((counter) => counter.staffId))} onChange={setAssignedStaffFilter} /></div>
      <div className="ops-counter-grid">{matchingCounters.map((counter) => <CounterCard key={counter.id} counter={counter} simulationStatus={counter.simulationStatus} customersServed={counter.customersServed} localStatus={Object.hasOwn(counterStatusOverrides, counter.id)} localAssignment={staff.some((person) => Object.hasOwn(staffAssignmentOverrides, person.id) && person.assignedCounter === counter.id || staffAssignmentOverrides[person.id] === counter.id)} selected={selected?.type === "counter" && selected.id === counter.id} onSelect={() => setSelected({ type: "counter", id: counter.id })} onSetStatus={(status) => setStatus(counter.id, status)} />)}</div>{matchingCounters.length === 0 && <div className="records-no-match">NO COUNTERS MATCH THE CURRENT FILTERS</div>}
    </section>

    <section className="ops-resource-section"><div className="ops-section-heading"><div><span className="section-heading__index">02</span><h2>Branch staff</h2><span className="ops-section-count">{matchingStaff.length} / {staff.length}</span></div><span className="ops-section-note">PERFORMANCE VALUES FROM SIMULATION RESULT</span></div>
      <div className="ops-filters ops-filters--staff"><label className="records-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff or current customer ID..." aria-label="Search staff and current customer" /><kbd>LOCAL FILTER</kbd></label><Filter label="STAFF STATUS" value={staffStatusFilter} options={staffStates} onChange={setStaffStatusFilter} /><Filter label="ASSIGNED COUNTER" value={assignedCounterFilter} options={counterOptions} onChange={setAssignedCounterFilter} /></div>
      {staff.length === 0 ? <div className="ops-staff-empty"><span>STAFF DATA NOT AVAILABLE</span><p>Staff cards are populated from staff records returned by a simulation.</p></div> : <div className="ops-staff-grid">{matchingStaff.map((person) => { const simulationPerson = simulationStaff.find((item) => item.staff_id === person.id); const currentCustomerId = result?.customers.find((customer) => customer.status === "SERVING" && customer.assigned_staff === person.id)?.customer_id ?? null; return simulationPerson && <StaffCard key={person.id} staff={person} simulationStatus={simulationPerson.status} currentCustomerId={currentCustomerId} localStatus={Object.hasOwn(staffStatusOverrides, person.id)} localAssignment={Object.hasOwn(staffAssignmentOverrides, person.id)} selected={selected?.type === "staff" && selected.id === person.id} onSelect={() => setSelected({ type: "staff", id: person.id })} onSetStatus={(status) => setStaffStatus(person.id, status)} />; })}</div>}{staff.length > 0 && matchingStaff.length === 0 && <div className="records-no-match">NO STAFF MATCH THE CURRENT FILTERS</div>}
    </section>

    {selectedCounter && <CounterInspector counter={selectedCounter} simulationStatus={selectedCounter.simulationStatus} customersServed={selectedCounter.customersServed} onStatusChange={(status) => setStatus(selectedCounter.id, status)} onClose={() => setSelected(null)} />}
    {selectedStaff && selectedStaffSimulation && <StaffInspector staff={selectedStaff} currentCustomerId={result?.customers.find((customer) => customer.status === "SERVING" && customer.assigned_staff === selectedStaff.id)?.customer_id ?? null} simulationStatus={selectedStaffSimulation.status} onStatusChange={(status) => setStaffStatus(selectedStaff.id, status)} onClose={() => setSelected(null)} />}
    <p className="records-footnote">SIMULATION STATE IS READ-ONLY · LOCAL CONTROL CHANGES DO NOT MODIFY THE BACKEND RUN</p>
  </div>;
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return <label className="record-filter"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">ALL</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}
