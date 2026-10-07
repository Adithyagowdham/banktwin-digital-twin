export type DatasetCell = string | number | boolean | null;
export type DatasetRow = Record<string, DatasetCell>;
export type DatasetSource = "USER UPLOADED" | "SYNTHETIC / SIMULATED DATA";
export type DatasetColumnType = "NUMBER" | "DATE / TIME" | "BOOLEAN" | "TEXT" | "EMPTY";
export type QualityStatus = "VALID" | "WARNING" | "ERROR";

export interface DatasetColumn {
  name: string;
  type: DatasetColumnType;
  nonNullCount: number;
  missingCount: number;
  uniqueValues: number;
}

export interface DatasetSummary {
  rows: number;
  columns: number;
  missingValues: number;
  duplicateRows: number;
  dataTypes: Record<DatasetColumnType, number>;
}

export interface DatasetQualityCheck {
  key: string;
  label: string;
  count: number;
  status: QualityStatus;
  description: string;
}

export interface DatasetQualityResult {
  status: QualityStatus;
  checks: DatasetQualityCheck[];
  invalidRows: number;
}

export interface DatasetRecord {
  id: string;
  name: string;
  source: DatasetSource;
  fileType: string;
  sizeBytes: number;
  loadedAt: string;
  columns: string[];
  rows: DatasetRow[];
  summary: DatasetSummary;
  columnDetails: DatasetColumn[];
  quality: DatasetQualityResult;
}

export const EXPECTED_DATASET_COLUMNS = [
  "Customer_ID",
  "Date",
  "Arrival_Time",
  "Transaction_Type",
  "Priority",
  "Counter_ID",
  "Staff_ID",
  "Service_Start",
  "Service_End",
  "Waiting_Time",
  "Service_Time",
  "Avg_Service_Time",
  "Queue_Length",
  "Arrival_Rate",
  "Active_Counters",
  "Staff_Available",
  "Staff_Utilization",
  "Counter_Utilization",
  "Current_Workload",
  "Transaction_Status",
  "Risk_Level",
] as const;
