export default function ReportSummary({ simulationAvailable, regressionStatus, classificationStatus, whatIfAvailable, optimizationAvailable }: {
  simulationAvailable: boolean;
  regressionStatus: string;
  classificationStatus: string;
  whatIfAvailable: boolean;
  optimizationAvailable: boolean;
}) {
  const mlState = (status: string) => status === "TRAINED" ? "READY / TRAINED" : status === "ERROR" ? "READY / ERROR" : status === "NOT_TRAINED" ? "READY / NOT TRAINED" : "STATUS UNAVAILABLE";
  const rows = [
    { label: "Simulation Engine", state: "READY" },
    { label: "Digital Twin", state: "READY" },
    { label: "Analytics", state: "READY" },
    { label: "Dataset Pipeline", state: "READY" },
    { label: "ML Prediction", state: `REGRESSION ${mlState(regressionStatus)} · CLASSIFIER ${mlState(classificationStatus)}` },
    { label: "Model Validation", state: "READY" },
    { label: "What-If Analysis", state: "READY" },
    { label: "Optimization", state: "READY" },
    { label: "Reports", state: "READY" },
  ];
  return <section className="report-summary" aria-label="BANKTWIN research prototype status">
    <div className="report-section-heading"><div><span className="section-heading__index">01</span><h2>BANKTWIN RESEARCH PROTOTYPE STATUS</h2></div><span className="mono-label">READY = IMPLEMENTED · NOT REAL-BANK VALIDATION</span></div>
    <div className="report-summary-grid">{rows.map(({ label, state }) => <div key={label}><span>{label}</span><b className={state.includes("UNAVAILABLE") ? "report-state-unavailable" : "report-state-ready"}>{state}</b></div>)}</div>
    <div className="report-summary-live"><span>OBSERVED SIMULATION</span><b>{simulationAvailable ? "AVAILABLE" : "NO DATA"}</b><span>WHAT-IF RUNS</span><b>{whatIfAvailable ? "AVAILABLE" : "NO DATA"}</b><span>OPTIMIZATION RUNS</span><b>{optimizationAvailable ? "AVAILABLE" : "NO DATA"}</b></div>
  </section>;
}
