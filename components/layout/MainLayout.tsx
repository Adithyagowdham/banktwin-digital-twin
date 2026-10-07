"use client";

import { useEffect, useState } from "react";
import Dashboard from "../dashboard/Dashboard";
import DigitalTwin from "../digital-twin/DigitalTwin";
import Header from "./Header";
import Sidebar, { navigationItems } from "./Sidebar";
import { SimulationProvider } from "../../lib/SimulationContext";
import CustomerFlow from "../customer-flow/CustomerFlow";
import Transactions from "../transactions/Transactions";
import CountersStaff from "../counters-staff/CountersStaff";
import AnalyticsDashboard from "../analytics/AnalyticsDashboard";
import DatasetManager from "../dataset-management/DatasetManager";
import AIRiskPrediction from "../ai-risk-prediction/AIRiskPrediction";
import ModelValidation from "../model-validation/ModelValidation";
import WhatIfAnalysis from "../what-if/WhatIfAnalysis";
import OptimizationDashboard from "../optimization/OptimizationDashboard";
import ReportsDashboard from "../reports/ReportsDashboard";
import SettingsDashboard from "../settings/SettingsDashboard";
import { DatasetProvider } from "../../lib/DatasetContext";
import { ResearchResultsProvider } from "../../lib/ResearchResultsContext";

export default function MainLayout({ initialSection = "Dashboard" }: { initialSection?: string }) {
  const [activeItem, setActiveItem] = useState(initialSection);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reportsMounted, setReportsMounted] = useState(initialSection === "Reports");
  const showAnalysisWorkspaces = activeItem === "What-If Analysis" || activeItem === "Optimization" || activeItem === "Reports";

  function selectSection(label: string) {
    const destination = label === "Model Validation" ? "/model-validation" : label === "What-If Analysis" ? "/what-if" : label === "Optimization" ? "/optimization" : label === "Reports" ? "/reports" : "/";
    if (window.location.pathname !== destination) window.history.pushState(null, "", destination);
    if (label === "Reports") setReportsMounted(true);
    setActiveItem(label);
    setMobileOpen(false);
  }

  useEffect(() => {
    function syncRoute() {
      const pathSections: Record<string, string> = { "/model-validation": "Model Validation", "/what-if": "What-If Analysis", "/optimization": "Optimization", "/reports": "Reports" };
      const section = pathSections[window.location.pathname] ?? "Dashboard";
      if (section === "Reports") setReportsMounted(true);
      setActiveItem(section);
    }
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  return (
    <SimulationProvider>
    <DatasetProvider>
    <ResearchResultsProvider>
    <div className={`app-shell${collapsed ? " app-shell--collapsed" : ""}`}>
      <Header onMenuClick={() => setMobileOpen((open) => !open)} onCollapseClick={() => setCollapsed((value) => !value)} isCollapsed={collapsed} />
      <Sidebar activeItem={activeItem} collapsed={collapsed} mobileOpen={mobileOpen} onSelect={selectSection} onClose={() => setMobileOpen(false)} />
      <main className="main-content" id="main-content" tabIndex={-1}>
        {showAnalysisWorkspaces ? <><div hidden={activeItem !== "What-If Analysis"}><WhatIfAnalysis /></div><div hidden={activeItem !== "Optimization"}><OptimizationDashboard /></div>{reportsMounted && <div hidden={activeItem !== "Reports"}><ReportsDashboard isActive={activeItem === "Reports"} /></div>}</> : activeItem === "Dashboard" ? <Dashboard /> : activeItem === "Digital Twin" || activeItem === "Simulation" ? <DigitalTwin /> : activeItem === "Customer Flow" ? <CustomerFlow /> : activeItem === "Transactions" ? <Transactions /> : activeItem === "Counters & Staff" ? <CountersStaff /> : activeItem === "AI Risk Prediction" ? <AIRiskPrediction /> : activeItem === "Model Validation" ? <ModelValidation /> : activeItem === "Analytics" ? <AnalyticsDashboard /> : activeItem === "Dataset Management" ? <DatasetManager /> : activeItem === "Settings" ? <SettingsDashboard /> : <section className="coming-soon surface-card" aria-labelledby="section-title"><div className="eyebrow"><span className="eyebrow__line" /> BANKTWIN / WORKSPACE</div><h1 id="section-title">{activeItem}</h1><p>This workspace section is part of the BANKTWIN navigation foundation. It will be implemented in a later project phase.</p><span className="outline-tag">NO DATA · NOT CONFIGURED</span></section>}
        <footer className="app-footer"><span>BT / DIGITAL TWIN RESEARCH PLATFORM</span><span>SIMULATION OUTPUT <i /> SESSION-LOCAL RESULT</span></footer>
      </main>
      <span className="app-shell__version" aria-hidden="true">{navigationItems.length.toString().padStart(2, "0")} MODULES</span>
    </div>
    </ResearchResultsProvider>
    </DatasetProvider>
    </SimulationProvider>
  );
}
