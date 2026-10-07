"use client";

import { useMemo, useState } from "react";
import type { CustomerResult } from "../../lib/simulationTypes";
import { toCustomerRecord } from "../../lib/transformers";
import { useSimulation } from "../../lib/SimulationContext";
import { CustomerInspector } from "../digital-twin/Inspectors";
import StatusIndicator from "../ui/StatusIndicator";

type SortKey = "arrival_time" | "waiting_time" | "service_time" | "customer_id";
type SortDirection = "asc" | "desc";

const statuses = ["WAITING", "SERVING", "COMPLETED", "DELAYED"] as const;

function timeText(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)} TU`;
}

function optionValues(customers: CustomerResult[], key: "transaction_type" | "priority" | "assigned_counter" | "assigned_staff"): string[] {
  return [...new Set(customers.map((customer) => customer[key]).filter((value): value is string => value !== null))].sort();
}

export default function CustomerFlow() {
  const { result } = useSimulation();
  const customers = useMemo(() => result?.customers ?? [], [result]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [transactionFilter, setTransactionFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [counterFilter, setCounterFilter] = useState("ALL");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("arrival_time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      const matchesSearch = !query || [customer.customer_id, customer.transaction_type, customer.assigned_counter ?? "", customer.assigned_staff ?? "", customer.status].some((value) => value.toLowerCase().includes(query));
      return matchesSearch
        && (statusFilter === "ALL" || customer.status === statusFilter)
        && (transactionFilter === "ALL" || customer.transaction_type === transactionFilter)
        && (priorityFilter === "ALL" || customer.priority === priorityFilter)
        && (counterFilter === "ALL" || customer.assigned_counter === counterFilter)
        && (staffFilter === "ALL" || customer.assigned_staff === staffFilter);
    });
    return filtered.sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const compared = typeof leftValue === "number" && typeof rightValue === "number"
        ? leftValue - rightValue
        : String(leftValue ?? "").localeCompare(String(rightValue ?? ""));
      return sortDirection === "asc" ? compared : -compared;
    });
  }, [customers, search, statusFilter, transactionFilter, priorityFilter, counterFilter, staffFilter, sortKey, sortDirection]);

  const selectedCustomer = selectedCustomerId ? customers.find((customer) => customer.customer_id === selectedCustomerId) : undefined;
  const summary = [
    { label: "TOTAL CUSTOMERS", value: customers.length },
    { label: "WAITING", value: customers.filter((customer) => customer.status === "WAITING").length },
    { label: "SERVING", value: customers.filter((customer) => customer.status === "SERVING").length },
    { label: "COMPLETED", value: customers.filter((customer) => customer.status === "COMPLETED").length },
    { label: "DELAYED", value: customers.filter((customer) => customer.status === "DELAYED").length },
  ];

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  }

  const sortButton = (label: string, key: SortKey) => <button className="data-sort-button" type="button" onClick={() => toggleSort(key)} aria-label={`Sort by ${label}${sortKey === key ? `, ${sortDirection}ending` : ""}`}>{label}<span aria-hidden="true">{sortKey === key ? sortDirection === "asc" ? " ↑" : " ↓" : " ↕"}</span></button>;

  return <div className="operations-view customer-flow-view">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> OPERATIONS / CUSTOMER FLOW</div><h1>CUSTOMER FLOW <span>{"//"}</span> RECORDS</h1><p className="page-heading__subtitle">Search, filter, and inspect the latest SimPy simulation customer records</p></div><div className="page-heading__meta"><StatusIndicator label={result ? "BACKEND RESULT" : "NO SIMULATION DATA"} tone={result ? "online" : "neutral"} compact /><span className="mono-label">SOURCE / SIMULATION RESULT</span></div></div>

    {customers.length === 0 ? <NoSimulationData /> : <>
      <section className="operation-kpis" aria-label="Customer flow summary">{summary.map((metric, index) => <article className="operation-kpi" key={metric.label}><span>{String(index + 1).padStart(2, "0")} / {metric.label}</span><b>{metric.value}</b></article>)}</section>
      <section className="records-panel" aria-label="Customer flow records">
        <div className="records-toolbar"><label className="records-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID, transaction, counter, staff, status..." aria-label="Search customer records" /><kbd>LOCAL FILTER</kbd></label><span className="records-count">{visibleCustomers.length} / {customers.length} RECORDS</span></div>
        <div className="records-filters" aria-label="Customer filters">
          <Filter label="STATUS" value={statusFilter} onChange={setStatusFilter} options={statuses} />
          <Filter label="TRANSACTION" value={transactionFilter} onChange={setTransactionFilter} options={optionValues(customers, "transaction_type")} />
          <Filter label="PRIORITY" value={priorityFilter} onChange={setPriorityFilter} options={optionValues(customers, "priority")} />
          <Filter label="COUNTER" value={counterFilter} onChange={setCounterFilter} options={optionValues(customers, "assigned_counter")} />
          <Filter label="STAFF" value={staffFilter} onChange={setStaffFilter} options={optionValues(customers, "assigned_staff")} />
        </div>
        <div className="records-table-scroll"><table className="operations-table customer-flow-table"><thead><tr><th>{sortButton("CUSTOMER ID", "customer_id")}</th><th>{sortButton("ARRIVAL TIME", "arrival_time")}</th><th>TRANSACTION TYPE</th><th>PRIORITY</th><th>COUNTER</th><th>STAFF</th><th>{sortButton("WAITING TIME", "waiting_time")}</th><th>{sortButton("SERVICE TIME", "service_time")}</th><th>STATUS</th></tr></thead><tbody>{visibleCustomers.map((customer) => <tr key={customer.customer_id} className={selectedCustomerId === customer.customer_id ? "is-selected" : ""} onClick={() => setSelectedCustomerId(customer.customer_id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCustomerId(customer.customer_id); } }} tabIndex={0} aria-label={`Inspect ${customer.customer_id}`}><td className="record-id">{customer.customer_id}</td><td>{timeText(customer.arrival_time)}</td><td>{customer.transaction_type}</td><td>{customer.priority}</td><td>{customer.assigned_counter ?? "—"}</td><td>{customer.assigned_staff ?? "—"}</td><td>{timeText(customer.waiting_time)}</td><td>{timeText(customer.service_time)}</td><td><StatusTag status={customer.status} /></td></tr>)}</tbody></table>{visibleCustomers.length === 0 && <div className="records-no-match">NO MATCHING CUSTOMER RECORDS</div>}</div>
      </section>
      {selectedCustomer && <div className="records-inspector-wrap"><CustomerInspector customer={toCustomerRecord(selectedCustomer)} onClose={() => setSelectedCustomerId(null)} /></div>}
      <p className="records-footnote">CUSTOMER RECORDS ARE READ-ONLY · DISPLAYED DIRECTLY FROM THE LATEST BACKEND SIMULATION RESULT</p>
    </>}
  </div>;
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return <label className="record-filter"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">ALL</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function StatusTag({ status }: { status: CustomerResult["status"] }) {
  return <span className={`record-status record-status--${status.toLowerCase()}`}>{status}</span>;
}

function NoSimulationData() {
  return <section className="records-empty surface-card"><span className="records-empty__glyph" aria-hidden="true">∅</span><span className="records-empty__code">DATASET / CUSTOMER_FLOW</span><h2>NO SIMULATION DATA</h2><p>Run a simulation from the Digital Twin to populate customer flow records.</p><span className="outline-tag">SOURCE / SIMPY BACKEND</span></section>;
}
