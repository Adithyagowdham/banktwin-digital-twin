import StatusIndicator from "../ui/StatusIndicator";

interface HeaderProps {
  onMenuClick: () => void;
  onCollapseClick: () => void;
  isCollapsed: boolean;
}

export default function Header({ onMenuClick, onCollapseClick, isCollapsed }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand-group">
        <button className="icon-button app-header__menu" type="button" onClick={onMenuClick} aria-label="Open navigation menu">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <button className="icon-button app-header__collapse" type="button" onClick={onCollapseClick} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM9 5v14" /><path d={isCollapsed ? "m13 9 3 3-3 3" : "m15 9-3 3 3 3"} /></svg>
        </button>
        <div className="brand-mark" aria-hidden="true"><span>B</span><i /></div>
        <div className="app-header__identity">
          <span className="app-header__name">BANKTWIN</span>
          <span className="app-header__tagline">DIGITAL TWIN <b>×</b> AI <b>×</b> BANKING OPERATIONS</span>
        </div>
      </div>
      <div className="app-header__system">
        <span className="app-header__system-label">PLATFORM STATUS</span>
        <StatusIndicator label="SYSTEM ONLINE" />
      </div>
    </header>
  );
}
