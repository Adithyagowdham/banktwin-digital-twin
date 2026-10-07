"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, getBackendHealth, getMlStatus, getSimulationStatus, type BackendHealth, type MlStatusResponse } from "../../lib/api";
import type { SimulationStatus } from "../../lib/simulationTypes";

export default function SettingsDashboard() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [mlStatus, setMlStatus] = useState<MlStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getBackendHealth(), getSimulationStatus(), getMlStatus()]).then((results) => {
      if (cancelled) return;
      const [healthResult, simulationResult, mlResult] = results;
      if (healthResult.status === "fulfilled") setHealth(healthResult.value);
      if (simulationResult.status === "fulfilled") setSimulationStatus(simulationResult.value);
      if (mlResult.status === "fulfilled") setMlStatus(mlResult.value);
      const failures = results.filter((result) => result.status === "rejected");
      if (failures.length) setError(failures.map((result) => result.status === "rejected" && result.reason instanceof Error ? result.reason.message : "API REQUEST FAILED").join(" · "));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const services = [
    ["FRONTEND", "Next.js / TypeScript", "AVAILABLE"],
    ["BACKEND", "FastAPI", health?.status === "ok" ? "ONLINE" : loading ? "CHECKING" : "BACKEND OFFLINE"],
    ["SIMULATION ENGINE", "SimPy", simulationStatus ? "AVAILABLE" : loading ? "CHECKING" : "STATUS UNAVAILABLE"],
    ["MACHINE LEARNING", "scikit-learn", mlStatus ? `REGRESSION ${mlStatus.regression_model_status} · CLASSIFIER ${mlStatus.risk_model_status}` : loading ? "CHECKING" : "STATUS UNAVAILABLE"],
  ];

  return <div className="operations-view settings-view">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow__line" /> SYSTEM / CONFIGURATION</div><h1>SETTINGS <span>{"//"}</span> RESEARCH ENVIRONMENT</h1><p className="page-heading__subtitle">Runtime endpoints and service health. No credentials or secrets are stored here.</p></div><div className="page-heading__meta"><span className={`dataset-quality-badge ${health?.status === "ok" ? "dataset-quality-badge--valid" : "dataset-quality-badge--neutral"}`}>{health?.status === "ok" ? "BACKEND ONLINE" : loading ? "CHECKING" : "BACKEND OFFLINE"}</span></div></div>
    {error && <div className="simulation-error dataset-error" role="alert"><span>!</span><div><b>API REQUEST FAILED</b><p>{error}</p></div></div>}
    <section className="settings-panel" aria-label="Connected service configuration">
      <div className="settings-panel-heading"><div><span className="section-heading__index">01</span><h2>SERVICE STATUS</h2></div><span className="mono-label">LOCAL RESEARCH ENVIRONMENT</span></div>
      <dl className="settings-service-list">{services.map(([label, implementation, state]) => <div key={label}><dt>{label}</dt><dd>{implementation}</dd><span className={state.includes("OFFLINE") || state.includes("UNAVAILABLE") ? "settings-state settings-state--error" : "settings-state"}>{state}</span></div>)}</dl>
      <dl className="settings-endpoint"><div><dt>FRONTEND API ENDPOINT</dt><dd>{API_BASE_URL}</dd></div><div><dt>LAST SIMULATION</dt><dd>{simulationStatus?.last_simulation_available ? "AVAILABLE IN CURRENT BACKEND SESSION" : loading ? "CHECKING" : "NO SIMULATION RESULT"}</dd></div></dl>
    </section>
    <section className="settings-research-note"><span className="section-heading__index">02</span><div><h2>BANKTWIN RESEARCH PROTOTYPE</h2><p>Service availability indicates that modules are implemented and reachable. It does not mean models have been trained, or that the system has been validated for real banking operations.</p></div></section>
  </div>;
}
