import type { CustomerResult } from "../../lib/simulationTypes";

interface CustomerResultsTableProps { customers: CustomerResult[] | null }

function formatTime(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(2)} TU`;
}

export default function CustomerResultsTable({ customers }: CustomerResultsTableProps) {
  return <section className="customer-results" aria-label="Simulation customer records"><div className="customer-results__heading"><div><span className="section-heading__index">RESULT SET</span><h2>Customer records</h2></div><span className="customer-results__count">{customers ? `${customers.length} BACKEND RECORDS` : "NO DATA"}</span></div>
    {!customers ? <p className="customer-results__empty">Run the backend simulation to load customer records.</p> : customers.length === 0 ? <p className="customer-results__empty">The backend returned no customer records for this run.</p> : <div className="customer-results__scroll"><table><thead><tr><th>CUSTOMER ID</th><th>ARRIVAL (TU)</th><th>TRANSACTION</th><th>PRIORITY</th><th>COUNTER</th><th>STAFF</th><th>WAIT (TU)</th><th>SERVICE (TU)</th><th>STATUS</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.customer_id}><td>{customer.customer_id}</td><td>{formatTime(customer.arrival_time)}</td><td>{customer.transaction_type}</td><td>{customer.priority}</td><td>{customer.assigned_counter ?? "—"}</td><td>{customer.assigned_staff ?? "—"}</td><td>{formatTime(customer.waiting_time)}</td><td>{formatTime(customer.service_time)}</td><td><span className={`result-status result-status--${customer.status.toLowerCase()}`}>{customer.status}</span></td></tr>)}</tbody></table></div>}
  </section>;
}
