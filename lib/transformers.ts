import type { CustomerRecord } from "../components/digital-twin/types";
import type { CustomerResult } from "./simulationTypes";

export type TransactionStatus = "WAITING" | "PROCESSING" | "COMPLETED" | "DELAYED";

export interface TransactionRecord {
  transaction_id: string;
  customer_id: string;
  transaction_type: string;
  counter: string | null;
  staff: string | null;
  arrival_time: number;
  service_start_time: number | null;
  service_end_time: number | null;
  waiting_time: number | null;
  service_time: number | null;
  status: TransactionStatus;
  priority: string;
}

export function formatSimulationTime(value: number | null): string | null {
  return value === null ? null : `${value.toFixed(2)} TU`;
}

export function toCustomerRecord(customer: CustomerResult): CustomerRecord {
  return {
    id: customer.customer_id,
    arrivalTime: formatSimulationTime(customer.arrival_time) ?? "—",
    transactionType: customer.transaction_type,
    priority: customer.priority,
    status: customer.status,
    assignedCounter: customer.assigned_counter,
    assignedStaff: customer.assigned_staff,
    waitingTime: formatSimulationTime(customer.waiting_time),
    serviceTime: formatSimulationTime(customer.service_time),
    serviceStartTime: formatSimulationTime(customer.service_start_time),
    serviceEndTime: formatSimulationTime(customer.service_end_time),
  };
}

export function toTransactionRecords(customers: CustomerResult[]): TransactionRecord[] {
  return customers.map((customer, index) => ({
    transaction_id: `TXN-${String(index + 1).padStart(5, "0")}`,
    customer_id: customer.customer_id,
    transaction_type: customer.transaction_type,
    counter: customer.assigned_counter,
    staff: customer.assigned_staff,
    arrival_time: customer.arrival_time,
    service_start_time: customer.service_start_time,
    service_end_time: customer.service_end_time,
    waiting_time: customer.waiting_time,
    service_time: customer.service_time,
    status: customer.status === "SERVING" ? "PROCESSING" : customer.status,
    priority: customer.priority,
  }));
}
