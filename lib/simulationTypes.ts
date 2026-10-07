export type TransactionType =
  | "Deposit"
  | "Withdrawal"
  | "Account Opening"
  | "Loan Service"
  | "Cash Transfer"
  | "General Inquiry";

export type PriorityLevel = "Normal" | "Priority";
export type CustomerStatus = "WAITING" | "SERVING" | "COMPLETED" | "DELAYED";
export type CounterStatus = "AVAILABLE" | "BUSY" | "BREAK" | "OFFLINE";
export type StaffStatus = "AVAILABLE" | "SERVING" | "BREAK" | "OFFLINE";
export type OperationalRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SimulationConfig {
  customers: number;
  arrival_rate: number;
  counters: number;
  staff: number;
  avg_service_time: number;
  duration: number;
  transaction_type: TransactionType;
  priority: PriorityLevel;
  random_seed: number | null;
}

export interface CustomerResult {
  customer_id: string;
  arrival_time: number;
  transaction_type: string;
  priority: PriorityLevel;
  assigned_counter: string | null;
  assigned_staff: string | null;
  service_start_time: number | null;
  service_end_time: number | null;
  waiting_time: number | null;
  service_time: number | null;
  status: CustomerStatus;
}

export interface CounterResult {
  counter_id: string;
  status: CounterStatus;
  busy_time: number;
  current_customer: string | null;
}

export interface StaffResult {
  staff_id: string;
  role: string;
  assigned_counter: string | null;
  status: StaffStatus;
  busy_time: number;
  customers_served: number;
}

export interface SimulationResult {
  customers_arrived: number;
  customers_served: number;
  queue_length: number;
  peak_queue_length: number;
  average_waiting_time: number;
  average_service_time: number;
  throughput: number;
  counter_utilization: number;
  staff_utilization: number;
  operational_risk: OperationalRisk;
  simulation_duration: number;
  customers: CustomerResult[];
  counters: CounterResult[];
  staff: StaffResult[];
}

export interface SimulationStatus {
  running: boolean;
  last_simulation_available: boolean;
}
