import type { CounterRecord, CustomerRecord, StaffRecord, ViewSettings } from "./types";
import { ATMZone, CompletionArea, CounterGrid, EntryNode, ExitNode, FlowPath, StaffArea, TokenArea, WaitingArea } from "./TwinComponents";

const counterPlaceholders: CounterRecord[] = Array.from({ length: 8 }, (_, index) => ({
  id: `C${String(index + 1).padStart(2, "0")}`,
  status: null,
  queueLength: null,
  staffId: null,
  currentCustomerId: null,
  transactionType: null,
  utilization: null,
  serviceTime: null,
}));

interface BranchMapProps {
  counters: CounterRecord[];
  customers: CustomerRecord[];
  staff: StaffRecord[];
  settings: ViewSettings;
  selectedCounter: string | null;
  onCounterClick: (id: string) => void;
  onCustomerClick: (id: string) => void;
  onStaffClick: (id: string) => void;
}

export default function BranchMap({ counters, customers, staff, settings, selectedCounter, onCounterClick, onCustomerClick, onStaffClick }: BranchMapProps) {
  const displayCounters = counterPlaceholders.map((placeholder) => counters.find((counter) => counter.id === placeholder.id) ?? placeholder);
  for (const counter of counters) {
    if (!displayCounters.some((item) => item.id === counter.id)) displayCounters.push(counter);
  }
  return <section className="schematic-card branch-schematic" aria-label="Interactive simulated bank branch floorplan"><div className="schematic-card__toolbar"><div><span className="schematic-card__live-mark" /><span>BRANCH FLOORPLAN</span><span className="schematic-card__divider">/</span><span className="schematic-card__muted">INTERACTIVE TOPOLOGY</span></div><div className="schematic-card__toolbar-right"><span>MODEL&nbsp; <b>DEMO-01</b></span><span className="schematic-card__zoom">100%</span></div></div>
    <div className="branch-map-wrap"><div className={`branch-map${settings.grid ? " branch-map--grid" : " branch-map--no-grid"}${settings.autoLayout ? " branch-map--auto-layout" : ""}`}>
      <div className="map-zone map-zone--service"><span className="map-zone__label">CUSTOMER SERVICE FLOOR <i>01</i></span></div><div className="map-zone map-zone--atm"><span className="map-zone__label">SELF SERVICE <i>02</i></span></div>
      <EntryNode /><TokenArea />
      <WaitingArea customers={customers} labelsVisible={settings.customerLabels} onCustomerClick={onCustomerClick} />
      <CounterGrid counters={displayCounters} customers={customers} selectedId={selectedCounter} labelsVisible={settings.customerLabels} onCounterClick={onCounterClick} onCustomerClick={onCustomerClick} />
      <ATMZone />
      <StaffArea staff={staff} labelsVisible={settings.staffLabels} onStaffClick={onStaffClick} />
      <CompletionArea customers={customers} labelsVisible={settings.customerLabels} onCustomerClick={onCustomerClick} />
      <ExitNode />
      <FlowPath visible={settings.flowPaths} />
      <div className="map-compass" aria-hidden="true"><span>N</span><b>↑</b></div><div className="map-scale" aria-hidden="true"><span /><small>10 m</small></div>
    </div></div>
    <div className="schematic-card__legend"><span className="legend-title">LEGEND</span><span><i className="legend-dot legend-dot--flow" />FLOW PATH</span><span><i className="legend-dot legend-dot--service" />CUSTOMER</span><span><i className="legend-dot legend-dot--self" />STAFF</span><span className="schematic-card__legend-note">DEMO FIXTURE · NOT LIVE DATA</span></div>
  </section>;
}
