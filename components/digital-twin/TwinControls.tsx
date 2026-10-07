import type { ViewSettings } from "./types";

export type SimulationUiStatus = "idle" | "loading" | "complete" | "error";

interface TwinControlsProps {
  settings: ViewSettings;
  simulationStatus: SimulationUiStatus;
  backendOnline: boolean | null;
  onToggle: (key: keyof Pick<ViewSettings, "grid" | "flowPaths" | "customerLabels" | "staffLabels">) => void;
  onResetView: () => void;
  onAutoLayout: () => void;
  onResetSimulation: () => void;
}

const toggles: { key: keyof Pick<ViewSettings, "grid" | "flowPaths" | "customerLabels" | "staffLabels">; label: string }[] = [
  { key: "grid", label: "GRID" },
  { key: "flowPaths", label: "FLOW PATHS" },
  { key: "customerLabels", label: "CUSTOMER LABELS" },
  { key: "staffLabels", label: "STAFF LABELS" },
];

export default function TwinControls({ settings, simulationStatus, backendOnline, onToggle, onResetView, onAutoLayout, onResetSimulation }: TwinControlsProps) {
  const stateLabel = simulationStatus === "loading" ? "RUNNING SIMULATION..." : simulationStatus === "complete" ? "SIMULATION COMPLETE" : simulationStatus === "error" ? "REQUEST FAILED" : "NO SIMULATION";
  return (
    <section className="twin-controls" aria-label="Digital Twin controls">
      <div className="twin-controls__mode"><span className="demo-pill"><i /> BACKEND / SIMPY</span><span className="twin-controls__clock"><span>SIM-STATE</span><b>{stateLabel}</b></span><span className={`backend-indicator${backendOnline === false ? " backend-indicator--offline" : ""}`}><i />{backendOnline === null ? "CHECKING API" : backendOnline ? "API ONLINE" : "BACKEND OFFLINE"}</span></div>
      <div className="twin-controls__actions"><button type="button" className="simulation-action simulation-action--pause" disabled title="Pause is not supported by the current backend">Ⅱ PAUSE <small>NOT CONNECTED</small></button><button type="button" className="simulation-action simulation-action--pause" disabled title="Resume is not supported by the current backend">▶ RESUME <small>NOT CONNECTED</small></button><button type="button" className="twin-control-button" onClick={onResetView}>RESET VIEW</button><button type="button" className="twin-control-button" onClick={onAutoLayout}>{settings.autoLayout ? "AUTO LAYOUT ON" : "AUTO LAYOUT"}</button><button type="button" className="simulation-action simulation-action--reset" onClick={onResetSimulation} disabled={simulationStatus === "loading"}>RESET SIM</button></div>
      <div className="twin-controls__toggles" role="group" aria-label="Schematic display options">{toggles.map(({ key, label }) => <button type="button" key={key} className={`view-toggle${settings[key] ? " is-active" : ""}`} aria-pressed={settings[key]} onClick={() => onToggle(key)}><span className="view-toggle__box" aria-hidden="true">{settings[key] ? "✓" : ""}</span>{label}</button>)}</div>
    </section>
  );
}