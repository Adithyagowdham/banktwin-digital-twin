import type { OperationalRisk, SimulationResult } from "../../lib/simulationTypes";
import type { SimulationUiStatus } from "./TwinControls";

interface TelemetryPanelProps { result: SimulationResult | null; status: SimulationUiStatus }

function displayNumber(value: number | undefined, suffix = ""): string {
  return value === undefined ? "—" : `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix}`;
}

function riskTone(risk: OperationalRisk | undefined): string {
  if (risk === "LOW") return "success";
  if (risk === "MEDIUM") return "warning";
  if (risk === "HIGH" || risk === "CRITICAL") return "danger";
  return "neutral";
}

export default function TelemetryPanel({ result, status }: TelemetryPanelProps) {
  const simulationLabel = status === "loading" ? "RUNNING" : status === "complete" ? "COMPLETE" : status === "error" ? "FAILED" : "NO DATA";
  const items: { label: string; value: string; tone: string }[] = [
    { label: "SIMULATION STATUS", value: simulationLabel, tone: status === "complete" ? "success" : status === "loading" ? "cyan" : "neutral" },
    { label: "CUSTOMERS ARRIVED", value: result ? String(result.customers_arrived) : "—", tone: "cyan" },
    { label: "CUSTOMERS SERVED", value: result ? String(result.customers_served) : "—", tone: "success" },
    { label: "QUEUE LENGTH", value: result ? String(result.queue_length) : "—", tone: "warning" },
    { label: "AVERAGE WAIT", value: result ? displayNumber(result.average_waiting_time, "") : "—", tone: "blue" },
    { label: "AVERAGE SERVICE", value: result ? displayNumber(result.average_service_time, "") : "—", tone: "blue" },
    { label: "THROUGHPUT", value: result ? displayNumber(result.throughput) : "—", tone: "cyan" },
    { label: "COUNTER UTILIZATION", value: result ? displayNumber(result.counter_utilization, "%") : "—", tone: "blue" },
    { label: "STAFF UTILIZATION", value: result ? displayNumber(result.staff_utilization, "%") : "—", tone: "blue" },
    { label: "OPERATIONAL RISK", value: result?.operational_risk ?? "—", tone: riskTone(result?.operational_risk) },
  ];
  return <section className="telemetry-panel" aria-label="Simulation result telemetry"><div className="telemetry-panel__heading"><span className="telemetry-panel__marker" /><span>SIMULATION TELEMETRY</span><span className="telemetry-panel__mode">{result ? "BACKEND RESULT" : "NO DATA"}</span></div><div className="telemetry-grid">{items.map(({ label, value, tone }) => <article className="telemetry-item" key={label}><span className="telemetry-item__label">{label}</span><b className={`telemetry-item__value telemetry-item__value--${tone}`}>{value}</b></article>)}</div><p className="telemetry-panel__disclaimer">{result ? `Calculated by the backend · simulation horizon ${result.simulation_duration} time units.` : "Run a simulation to populate telemetry from the backend. No demo metrics are shown."}</p></section>;
}