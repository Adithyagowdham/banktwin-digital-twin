"use client";

export const navigationItems = [
  { label: "Dashboard", group: "WORKSPACE", icon: "grid" },
  { label: "Digital Twin", group: "WORKSPACE", icon: "cube" },
  { label: "Customer Flow", group: "OPERATIONS", icon: "flow" },
  { label: "Transactions", group: "OPERATIONS", icon: "swap" },
  { label: "Counters & Staff", group: "OPERATIONS", icon: "people" },
  { label: "AI Risk Prediction", group: "INTELLIGENCE", icon: "pulse" },
  { label: "Simulation", group: "INTELLIGENCE", icon: "play" },
  { label: "What-If Analysis", group: "INTELLIGENCE", icon: "sliders" },
  { label: "Optimization", group: "INTELLIGENCE", icon: "target" },
  { label: "Analytics", group: "INSIGHTS", icon: "chart" },
  { label: "Dataset Management", group: "INSIGHTS", icon: "database" },
  { label: "Model Validation", group: "INSIGHTS", icon: "check" },
  { label: "Reports", group: "INSIGHTS", icon: "report" },
  { label: "Settings", group: "SYSTEM", icon: "settings" },
];

interface SidebarProps {
  activeItem: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onSelect: (label: string) => void;
  onClose: () => void;
}

const paths: Record<string, string> = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  cube: "m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3zM4.5 7.8 12 12l7.5-4.2M12 12v8.5",
  flow: "M5 5h5v5H5zM14 14h5v5h-5zM10 7.5h4a2 2 0 0 1 2 2v4.5M12 12l2 2 2-2",
  swap: "M7 7h12l-3-3M17 17H5l3 3M19 7l-3 3M5 17l3-3",
  people: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16 4.3a3.5 3.5 0 0 1 0 6.7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  play: "M5 4.5v15l13-7.5-13-7.5z",
  sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M13 4v6M7 14v6",
  target: "M12 3v3M12 18v3M3 12h3M18 12h3M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  chart: "M4 19V5M4 19h16M8 16v-5M12 16V7M16 16V9",
  database: "M12 4c4.4 0 8 1.1 8 2.5S16.4 9 12 9 4 7.9 4 6.5 7.6 4 12 4zM4 6.5v11C4 18.9 7.6 20 12 20s8-1.1 8-2.5v-11M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5",
  check: "M12 3 19 6v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3zM8.5 12l2.3 2.3 4.7-4.7",
  report: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
  settings: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.8.2l-.1.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-2.9-1.7.1-.2a1.7 1.7 0 0 0-.2-1.8l-.1-.1v-3.4l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.7-2.9.2.1a1.7 1.7 0 0 0 1.8-.2l.1-.1h3.4l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 2.9 1.7-.1.2a1.7 1.7 0 0 0 .2 1.8l.1.1v3.4z",
};

export default function Sidebar({ activeItem, collapsed, mobileOpen, onSelect, onClose }: SidebarProps) {
  return (
    <>
      <button className={`sidebar-scrim${mobileOpen ? " is-visible" : ""}`} type="button" aria-label="Close navigation menu" onClick={onClose} tabIndex={mobileOpen ? 0 : -1} />
      <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}${mobileOpen ? " sidebar--mobile-open" : ""}`} aria-label="Primary navigation">
        <div className="sidebar__section-label">NAVIGATION</div>
        <nav className="sidebar__nav">
          {navigationItems.map((item, index) => {
            const showGroup = index === 0 || navigationItems[index - 1].group !== item.group;
            return (
              <div className="sidebar__nav-entry" key={item.label}>
                {showGroup && <span className="sidebar__group-label">{item.group}</span>}
                <button type="button" className={`nav-item${activeItem === item.label ? " nav-item--active" : ""}`} onClick={() => onSelect(item.label)} aria-current={activeItem === item.label ? "page" : undefined} title={collapsed ? item.label : undefined}>
                  <svg className="nav-item__icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[item.icon]} /></svg>
                  <span className="nav-item__label">{item.label}</span>
                  {activeItem === item.label && <span className="nav-item__active-mark" aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar__footer">
          <div className="sidebar__env-dot" aria-hidden="true" />
          <div><span className="sidebar__env-title">RESEARCH ENVIRONMENT</span><span className="sidebar__env-subtitle">Frontend foundation · v0.1</span></div>
        </div>
      </aside>
    </>
  );
}
