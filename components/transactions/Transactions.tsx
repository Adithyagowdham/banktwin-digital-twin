"use client";

import { useMemo, useState } from "react";
import { useSimulation } from "../../lib/SimulationContext";
import { toTransactionRecords, type TransactionRecord, type TransactionStatus } from "../../lib/transformers";
import type { CustomerResult } from "../../lib/simulationTypes";
import StatusIndicator from "../ui/StatusIndicator";

type SortKey = "arrival_time" | "waiting_time" | "service_time";
type SortDirection = "asc" | "desc";
const statuses: TransactionStatus[] = ["WAITING", "PROCESSING", "COMPLETED", "DELAYED"];

function timeText(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)} TU`;
}

function options(records: TransactionRecord[], key: "transaction_type" | "status" | "counter" | "staff" | "priority"): string[] {
  return [...new Set(records.map((record) => record[key]).filter((value): value is string => value !== null))].sort();
}

export default function Transactions() {
  const { result } = useSimulation();
  const transactions = useMemo(() => result ? toTransactionRecords(result.customers) : [], [result]);
  const customers = result?.customers ?? [];
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [counterFilter, setCounterFilter] = useState("ALL");
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("arrival_time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selected, setSelected] = useState<TransactionRecord | null>(null);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = transactions.filter((transaction) => {
      const matchesSearch = !query || [transaction.transaction_id, transaction.customer_id, transaction.transaction_type, transaction.counter ?? "", transaction.staff ?? "", transaction.status, transaction.priority].some((value) => value.toLowerCase().includes(query));
      return matchesSearch
        && (typeFilter === "ALL" || transaction.transaction_type === typeFilter)
        && (statusFilter === "ALL" || transaction.status === statusFilter)
        && (counterFilter === "ALL" || transaction.counter === counterFilter)
        && (staffFilter === "ALL" || transaction.staff === staffFilter)
        && (priorityFilter === "ALL" || transaction.priority === priorityFilter);
    });
    return filtered.sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      const compared = leftValue === null ? rightValue === null ? 0 : 1 : rightValue === null ? -1 : leftValue - rightValue;
      return sortDirection === "asc" ? compared : -compared;
    });
  }, [transactions, search, typeFilter, statusFilter, counterFilter, staffFilter, priorityFilter, sortKey, sortDirection]);

  const averageWaiting = useMemo(() => {
    const times = transactions.map((transaction) => transaction.waiting_time).filter((value): value is number => value !== null);
    return times.length ? `${(times.reduce((total, value) => total + value, 0) / times.length).toFixed(2)} TU` : "—";
  }, [transactions]);

  const summary = [
    { label: "TOTAL TRANSACTIONS", value: transactions.length },
    { label: "PROCESSING", value: transactions.filter((transaction) => transaction.status === "PROCESSING").length },
    { label: "COMPLETED", value: transactions.filter((transaction) => transaction.status === "COMPLETED").length },
    { label: "DELAYED", value: transactions.filter((transaction) => transaction.status === "DELAYED").length },
    { label: "AVG WAITING", value: averageWaiting },
  ];

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection("asc"); }
  }

  const sortButton = (label: string, key: SortKey) => <button className="data-sort-button" type="button" onClick={() => toggleSort(key)} aria-label={`Sort by ${label}${sortKey === key ? `, ${sortDirection}ending` : ""}`}>{label}<span aria-hidden="true">{sortKey === key ? sortDirection === "asc" ? " ↑" : " ↓" : " ↕"}</span></button>;

  return <div className="operations-view transactions-view">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> OPERATIONS / TRANSACTIONS</div><h1>TRANSACTIONS <span>{"//"}</span> LEDGER</h1><p className="page-heading__subtitle">Deterministic transaction view derived from returned simulation customer records</p></div><div className="page-heading__meta"><StatusIndicator label={result ? "BACKEND RESULT" : "NO SIMULATION DATA"} tone={result ? "online" : "neutral"} compact /><span className="mono-label">SOURCE / SIMULATION RESULT</span></div></div>

    {transactions.length === 0 ? <NoSimulationData /> : <>
      <section className="operation-kpis" aria-label="Transaction summary">{summary.map((metric, index) => <article className="operation-kpi" key={metric.label}><span>{String(index + 1).padStart(2, "0")} / {metric.label}</span><b>{metric.value}</b></article>)}</section>
      <section className="records-panel" aria-label="Transaction records">
        <div className="records-toolbar"><label className="records-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transaction, customer, type, counter, staff..." aria-label="Search transaction records" /><kbd>LOCAL FILTER</kbd></label><span className="records-count">{visibleTransactions.length} / {transactions.length} RECORDS</span></div>
        <div className="records-filters" aria-label="Transaction filters">
          <Filter label="TRANSACTION TYPE" value={typeFilter} onChange={setTypeFilter} options={options(transactions, "transaction_type")} />
          <Filter label="STATUS" value={statusFilter} onChange={setStatusFilter} options={statuses} />
          <Filter label="COUNTER" value={counterFilter} onChange={setCounterFilter} options={options(transactions, "counter")} />
          <Filter label="STAFF" value={staffFilter} onChange={setStaffFilter} options={options(transactions, "staff")} />
          <Filter label="PRIORITY" value={priorityFilter} onChange={setPriorityFilter} options={options(transactions, "priority")} />
        </div>
        <div className="records-table-scroll"><table className="operations-table transaction-table"><thead><tr><th>TRANSACTION ID</th><th>CUSTOMER ID</th><th>TRANSACTION TYPE</th><th>COUNTER</th><th>STAFF</th><th>{sortButton("ARRIVAL TIME", "arrival_time")}</th><th>SERVICE START</th><th>SERVICE END</th><th>{sortButton("WAITING TIME", "waiting_time")}</th><th>{sortButton("SERVICE TIME", "service_time")}</th><th>STATUS</th></tr></thead><tbody>{visibleTransactions.map((transaction) => <tr key={transaction.transaction_id} className={selected?.transaction_id === transaction.transaction_id ? "is-selected" : ""} onClick={() => setSelected(transaction)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(transaction); } }} tabIndex={0} aria-label={`Inspect ${transaction.transaction_id}`}><td className="record-id">{transaction.transaction_id}</td><td>{transaction.customer_id}</td><td>{transaction.transaction_type}</td><td>{transaction.counter ?? "—"}</td><td>{transaction.staff ?? "—"}</td><td>{timeText(transaction.arrival_time)}</td><td>{timeText(transaction.service_start_time)}</td><td>{timeText(transaction.service_end_time)}</td><td>{timeText(transaction.waiting_time)}</td><td>{timeText(transaction.service_time)}</td><td><TransactionStatusTag status={transaction.status} /></td></tr>)}</tbody></table>{visibleTransactions.length === 0 && <div className="records-no-match">NO MATCHING TRANSACTION RECORDS</div>}</div>
      </section>
      {selected && <TransactionInspector transaction={selected} customer={customers.find((item) => item.customer_id === selected.customer_id)} onClose={() => setSelected(null)} />}
      <p className="records-footnote">TRANSACTION IDS ARE DETERMINISTIC ROW IDENTIFIERS · ALL OTHER FIELDS ARE FROM THE SIMULATION RESULT</p>
    </>}
  </div>;
}

function Filter({ label, value, options: choices, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return <label className="record-filter"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="ALL">ALL</option>{choices.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function TransactionStatusTag({ status }: { status: TransactionStatus }) {
  return <span className={`record-status record-status--${status.toLowerCase()}`}>{status}</span>;
}

function TransactionInspector({ transaction, customer, onClose }: { transaction: TransactionRecord; customer: CustomerResult | undefined; onClose: () => void }) {
  const facts = [
    ["CUSTOMER ID", transaction.customer_id],
    ["TRANSACTION TYPE", transaction.transaction_type],
    ["COUNTER", transaction.counter ?? "—"],
    ["STAFF", transaction.staff ?? "—"],
    ["PRIORITY", transaction.priority],
    ["ARRIVAL TIME", timeText(transaction.arrival_time)],
    ["SERVICE START", timeText(transaction.service_start_time)],
    ["SERVICE END", timeText(transaction.service_end_time)],
    ["WAITING TIME", timeText(transaction.waiting_time)],
    ["SERVICE TIME", timeText(transaction.service_time)],
  ];
  return <aside className="inspector-panel transaction-inspector" aria-label={`Transaction inspector: ${transaction.transaction_id}`}><div className="inspector-panel__header"><div><span>TRANSACTION INSPECTOR</span><h2>{transaction.transaction_id}</h2></div><button type="button" className="inspector-close" onClick={onClose} aria-label="Close inspector">×</button></div><div className="inspector-status"><span>STATUS</span><b className={`record-status--${transaction.status.toLowerCase()}`}>{transaction.status}</b></div><dl className="inspector-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="inspector-readonly">{customer ? "DERIVED FROM CUSTOMER SIMULATION RECORD" : "CUSTOMER SOURCE RECORD NOT RETURNED"}</div></aside>;
}

function NoSimulationData() {
  return <section className="records-empty surface-card"><span className="records-empty__glyph" aria-hidden="true">∅</span><span className="records-empty__code">DATASET / TRANSACTIONS</span><h2>NO SIMULATION DATA</h2><p>Run a simulation from the Digital Twin to populate transaction records.</p><span className="outline-tag">SOURCE / SIMPY BACKEND</span></section>;
}
