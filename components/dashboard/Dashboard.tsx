import MetricCard from "../ui/MetricCard";
import StatusIndicator from "../ui/StatusIndicator";
import { useSimulation } from "../../lib/SimulationContext";

export default function Dashboard() {
  const { result } = useSimulation();
  const activeCustomers = result?.customers.filter((customer) => customer.status === "WAITING" || customer.status === "SERVING" || customer.status === "DELAYED").length;
  const metrics: Array<[string, string | null]> = [
    ["Customers Arrived", result ? String(result.customers_arrived) : null],
    ["Active Customers", activeCustomers === undefined ? null : String(activeCustomers)],
    ["Average Waiting Time", result ? `${result.average_waiting_time.toFixed(2)} TU` : null],
    ["Average Service Time", result ? `${result.average_service_time.toFixed(2)} TU` : null],
    ["Queue Length", result ? String(result.queue_length) : null],
    ["Completed Transactions", result ? String(result.customers_served) : null],
    ["Throughput", result ? result.throughput.toFixed(3) : null],
    ["Counter Utilization", result ? `${result.counter_utilization.toFixed(1)}%` : null],
    ["Staff Utilization", result ? `${result.staff_utilization.toFixed(1)}%` : null],
    ["Operational Risk", result?.operational_risk ?? null],
  ];
  return (
    <div className="dashboard-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow__line" /> OPERATIONS / OVERVIEW</div>
          <h1>BANKTWIN <span>{"//"}</span> CONTROL CENTER</h1>
          <p className="page-heading__subtitle">Digital Twin of Banking Operations</p>
        </div>
        <div className="page-heading__meta"><StatusIndicator label={result ? "LATEST SIMULATION" : "NO DATA"} tone={result ? "online" : "neutral"} compact /><span className="mono-label">SESSION / LOCAL</span></div>
      </div>

      <section className="overview-banner" aria-label="Platform introduction">
        <div className="overview-banner__copy">
          <span className="overview-banner__kicker">BANKING OPERATIONS · DIGITAL TWIN PLATFORM</span>
          <h2>Operational intelligence,<br /><em>engineered for clarity.</em></h2>
          <p>A research workspace for observing branch operations, exploring customer flow, and preparing for predictive decision-making.</p>
        </div>
        <div className="overview-banner__graphic" aria-hidden="true">
          <div className="radar radar--outer" /><div className="radar radar--middle" /><div className="radar radar--inner" />
          <span className="radar__cross radar__cross--horizontal" /><span className="radar__cross radar__cross--vertical" />
          <span className="radar__core" /><span className="radar__point radar__point--one" /><span className="radar__point radar__point--two" />
          <span className="radar__label">TWIN CORE<br />{result ? "SIMULATED" : "NO DATA"}</span>
        </div>
        <div className="overview-banner__coordinates" aria-hidden="true">BT / 001<br />CONTROL LAYER</div>
      </section>

      <div className="section-heading">
        <div><span className="section-heading__index">01</span><h2>Operational indicators</h2></div>
        <span className="mono-label">{result ? "LATEST SIMPY RUN" : "NO DATA AVAILABLE"} <i className="tiny-dot" /></span>
      </div>
      <section className="metric-grid" aria-label="Operational indicators">
        {metrics.map(([label, value], index) => <MetricCard key={label} label={label} value={value} index={`KPI-${String(index + 1).padStart(2, "0")}`} />)}
      </section>

      <section className="dashboard-lower-grid" aria-label="Workspace status">
        <article className="surface-card data-state-card">
          <div className="surface-card__heading"><div><span className="section-heading__index">02</span><h2>Latest simulation</h2></div><span className="outline-tag">{result ? "OBSERVED RESULT" : "NO DATA"}</span></div>
          <div className="data-state-card__body"><div className="data-state-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9h8M8 13h5M8 17h3" /></svg></div><div><h3>{result ? `${result.customers_served} of ${result.customers_arrived} customers served` : "No simulation result available"}</h3><p>{result ? `Observed wait ${result.average_waiting_time.toFixed(2)} TU · queue ${result.queue_length} · throughput ${result.throughput.toFixed(3)} per TU.` : "Run a simulation from the Digital Twin to populate operational indicators."}</p></div></div>
          <div className="data-state-card__foot"><span>SIMULATION DATA</span><span>{result ? `${result.simulation_duration} TU · ${result.operational_risk} RISK` : "NO DATA"}</span></div>
        </article>
        <article className="surface-card readiness-card">
          <div className="surface-card__heading"><div><span className="section-heading__index">03</span><h2>Workspace readiness</h2></div></div>
          <ul className="readiness-list">
            <li><span className="readiness-list__number">01</span><span>Interface foundation</span><span className="readiness-list__state">READY</span></li>
            <li><span className="readiness-list__number">02</span><span>Simulation module</span><span className="readiness-list__state">READY</span></li>
            <li><span className="readiness-list__number">03</span><span>Latest simulation data</span><span className={`readiness-list__state${result ? "" : " readiness-list__state--pending"}`}>{result ? "AVAILABLE" : "NO DATA"}</span></li>
          </ul>
        </article>
      </section>
    </div>
  );
}
