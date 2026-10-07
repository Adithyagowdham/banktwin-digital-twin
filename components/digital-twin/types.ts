export type CounterStatus = "AVAILABLE" | "BUSY" | "BREAK" | "OFFLINE";
export type CustomerStatus = "WAITING" | "SERVING" | "COMPLETED" | "DELAYED";
export type StaffStatus = "AVAILABLE" | "SERVING" | "BUSY" | "BREAK" | "OFFLINE";

export interface CounterRecord {
  id: string;
  status: CounterStatus | null;
  queueLength: number | null;
  staffId: string | null;
  currentCustomerId: string | null;
  transactionType: string | null;
  utilization: number | null;
  serviceTime: string | null;
  customersServed?: number | null;
  simulationStatus?: CounterStatus | null;
}

export interface CustomerRecord {
  id: string;
  arrivalTime: string;
  transactionType: string;
  priority: string;
  status: CustomerStatus;
  assignedCounter: string | null;
  assignedStaff: string | null;
  waitingTime: string | null;
  serviceTime: string | null;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
}

export interface StaffRecord {
  id: string;
  role: string;
  assignedCounter: string | null;
  status: StaffStatus;
  simulationStatus?: "AVAILABLE" | "SERVING" | "BREAK" | "OFFLINE";
  customersServed: number | null;
  utilization: number | null;
}

export interface ViewSettings {
  grid: boolean;
  flowPaths: boolean;
  customerLabels: boolean;
  staffLabels: boolean;
  autoLayout: boolean;
}

export type InspectorSelection =
  | { type: "counter"; id: string }
  | { type: "customer"; id: string }
  | { type: "staff"; id: string }
  | null;
