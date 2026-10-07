import { calculateAnalytics } from "../analytics/AnalyticsDashboard";
import { toTransactionRecords } from "../../lib/transformers";
import type { SimulationConfig, SimulationResult } from "../../lib/simulationTypes";

function number(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function MetricList({ rows }: { rows: Array<[string, string]> }) {
  return <dl className="report-metric-list">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export default function SimulationReport({ result, config }: { result: SimulationResult | null; config: SimulationConfig | null }) {
  if (!result) return <section className="report-panel report-no-data"><div className="report-section-heading"><div><span className="section-heading__index">02</span><h2>OBSERVED SIMULATION RESULTS</h2></div></div><h3>NO SIMULATION REPORT AVAILABLE</h3><p>Run a branch simulation to generate reportable operational results.</p></section>;

  const customers = result.customers;
  const customerStatuses = ["WAITING", "SERVING", "COMPLETED", "DELAYED"] as const;
  const customerCounts = customerStatuses.map((status) => [status, String(customers.filter((customer) => customer.status === status).length)] as [string, string]);
  const transactions = toTransactionRecords(customers);
  const transactionTypes = [...new Set(transactions.map((transaction) => transaction.transaction_type))].sort();
  const transactionCounts = transactionTypes.map((type) => [type, String(transactions.filter((transaction) => transaction.transaction_type === type).length)] as [string, string]);
  const counterStatuses = result.counters.map((counter) => counter.status);
  const activeCounters = counterStatuses.filter((status) => status === "AVAILABLE" || status === "BUSY").length;
  const busyCounters = counterStatuses.filter((status) => status === "BUSY").length;
  const offlineCounters = counterStatuses.filter((status) => status === "OFFLINE").length;
  const staffStatuses = result.staff.map((person) => person.status);
  const availableStaff = staffStatuses.filter((status) => status === "AVAILABLE").length;
  const busyStaff = staffStatuses.filter((status) => status === "SERVING").length;
  const analytics = calculateAnalytics(customers, result.simulation_duration, result.counters, result.staff);
  const staffServed = result.staff.reduce((total, person) => total + person.customers_served, 0);

  return <>
    <section className="report-panel" aria-label="Observed simulation result">
      <div className="report-section-heading"><div><span className="section-heading__index">02</span><h2>OBSERVED SIMULATION RESULTS</h2></div><span className="report-source-tag">SIMPY BACKEND · OBSERVED RUN</span></div>
      <MetricList rows={[
        ["Customers Arrived", String(result.customers_arrived)], ["Customers Served", String(result.customers_served)],
        ["Average Waiting Time", `${number(result.average_waiting_time)} TU`], ["Average Service Time", `${number(result.average_service_time)} TU`],
        ["Queue Length", String(result.queue_length)], ["Throughput", number(result.throughput)],
        ["Counter Utilization", `${number(result.counter_utilization)}%`], ["Staff Utilization", `${number(result.staff_utilization)}%`],
        ["Operational Risk", result.operational_risk], ["Simulation Duration", `${number(result.simulation_duration)} TU`],
      ]} />
      <div className="report-config-strip"><span>CONFIGURATION</span><b>CUSTOMERS {config?.customers ?? "NOT RECORDED"}</b><b>ARRIVAL RATE {config ? number(config.arrival_rate) : "NOT RECORDED"}</b><b>COUNTERS {config?.counters ?? "NOT RECORDED"}</b><b>STAFF {config?.staff ?? "NOT RECORDED"}</b><b>TRANSACTION {config?.transaction_type ?? "NOT RECORDED"}</b><b>PRIORITY {config?.priority ?? "NOT RECORDED"}</b><b>RANDOM SEED {config?.random_seed ?? "NOT RECORDED"}</b></div>
    </section>

    <div className="report-grid-two">
      <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">03</span><h2>CUSTOMER OPERATIONS SUMMARY</h2></div><span className="mono-label">CUSTOMER FLOW RECORDS</span></div><MetricList rows={[["Total Customers", String(customers.length)], ...customerCounts, ["Average Waiting Time", `${number(result.average_waiting_time)} TU`], ["Average Service Time", `${number(result.average_service_time)} TU`]]} /></section>
      <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">04</span><h2>TRANSACTION SUMMARY</h2></div><span className="mono-label">SIMULATION CUSTOMER RECORDS</span></div><MetricList rows={[["Total Transactions", String(transactions.length)], ...transactionCounts, ["Completed", String(transactions.filter((transaction) => transaction.status === "COMPLETED").length)], ["Processing", String(transactions.filter((transaction) => transaction.status === "PROCESSING").length)], ["Delayed", String(transactions.filter((transaction) => transaction.status === "DELAYED").length)]]} /></section>
    </div>

    <div className="report-grid-two">
      <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">05</span><h2>COUNTER SUMMARY</h2></div><span className="mono-label">INDIVIDUAL BUSY TIME FROM SIMPY</span></div><MetricList rows={[["Total Counters", String(result.counters.length)], ["Active Counters", String(activeCounters)], ["Busy Counters", String(busyCounters)], ["Offline Counters", String(offlineCounters)], ["Average Counter Utilization", `${number(result.counter_utilization)}%`]]} /><div className="report-table-scroll"><table className="report-data-table"><thead><tr><th>COUNTER</th><th>STATUS</th><th>BUSY TIME</th><th>UTILIZATION</th></tr></thead><tbody>{result.counters.map((counter) => <tr key={counter.counter_id}><td>{counter.counter_id}</td><td>{counter.status}</td><td>{number(counter.busy_time)} TU</td><td>{result.simulation_duration > 0 ? `${number(Math.min(100, counter.busy_time / result.simulation_duration * 100))}%` : "—"}</td></tr>)}</tbody></table></div></section>
      <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">06</span><h2>STAFF SUMMARY</h2></div><span className="mono-label">STAFF RECORDS RETURNED</span></div>{result.staff.length ? <><MetricList rows={[["Total Staff", String(result.staff.length)], ["Available Staff", String(availableStaff)], ["Busy Staff", String(busyStaff)], ["Average Staff Utilization", `${number(result.staff_utilization)}%`], ["Customers Served", String(staffServed)]]} /><div className="report-table-scroll"><table className="report-data-table"><thead><tr><th>STAFF</th><th>ROLE</th><th>STATUS</th><th>SERVED</th><th>BUSY TIME</th></tr></thead><tbody>{result.staff.map((person) => <tr key={person.staff_id}><td>{person.staff_id}</td><td>{person.role}</td><td>{person.status}</td><td>{person.customers_served}</td><td>{number(person.busy_time)} TU</td></tr>)}</tbody></table></div></> : <p className="report-no-data-copy">STAFF-LEVEL DATA NOT AVAILABLE</p>}</section>
    </div>

    <section className="report-panel"><div className="report-section-heading"><div><span className="section-heading__index">07</span><h2>ANALYTICS SUMMARY</h2></div><span className="mono-label">CALCULATED FROM THE SAME SIMPY RESULT</span></div><MetricList rows={[["Average Waiting Time", `${number(result.average_waiting_time)} TU`], ["Average Service Time", `${number(result.average_service_time)} TU`], ["Queue Length", String(result.queue_length)], ["Throughput", number(result.throughput)], ["Counter Utilization", `${number(result.counter_utilization)}%`], ["Staff Utilization", `${number(result.staff_utilization)}%`], ["Operational Risk", result.operational_risk]]} /><div className="report-littles-law"><h3>LITTLE&apos;S LAW · L = λW</h3><div><span>L</span><i>=</i><span>λ</span><i>W</i></div><p>Observed Little&apos;s Law values from the Analytics calculation. Finite-run measurements need not be exactly equal.</p><MetricList rows={[["Observed L · Average System Size", number(analytics.observedSystemSize)], ["Observed λ · Arrivals per Time Unit", number(analytics.observedArrivalRate)], ["Observed W · Time in System", `${number(analytics.observedTimeInSystem)} TU`], ["Calculated λW", number(analytics.calculatedLambdaW)]]} /></div></section>
  </>;
}
