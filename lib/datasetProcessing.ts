import * as XLSX from "@e965/xlsx";
import {
  EXPECTED_DATASET_COLUMNS,
  type DatasetCell,
  type DatasetColumn,
  type DatasetColumnType,
  type DatasetQualityCheck,
  type DatasetQualityResult,
  type DatasetRecord,
  type DatasetRow,
  type DatasetSource,
  type DatasetSummary,
  type QualityStatus,
} from "./datasetTypes";

const NUMERIC_FIELDS = ["Waiting_Time", "Service_Time", "Avg_Service_Time", "Queue_Length", "Arrival_Rate", "Active_Counters", "Staff_Available", "Staff_Utilization", "Counter_Utilization", "Current_Workload"];
const TIME_FIELDS = ["Arrival_Time", "Service_Start", "Service_End"];
const TRANSACTION_STATUSES = new Set(["WAITING", "PROCESSING", "COMPLETED", "DELAYED"]);
const RISK_LEVELS = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const TIME_LIKE = /(?:^|_)(?:DATE|TIME|START|END)(?:$|_)/i;

export interface DatasetInput {
  name: string;
  source: DatasetSource;
  fileType: string;
  sizeBytes: number;
  rows: DatasetRow[];
  columns: string[];
}

export async function parseLocalSpreadsheet(file: File): Promise<DatasetInput> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("The selected file does not contain a worksheet.");
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) throw new Error("The first worksheet could not be read.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: true, defval: null, blankrows: false });
  if (matrix.length === 0) throw new Error("The selected file is empty.");

  const headerCells = matrix[0].map((value, index) => {
    const heading = cellToString(value).trim();
    return heading || `Column_${index + 1}`;
  });
  const columns = makeUniqueHeaders(headerCells);
  const rows: DatasetRow[] = matrix.slice(1).map((cells) => {
    const row = Object.create(null) as DatasetRow;
    columns.forEach((column, index) => {
      row[column] = normalizeCell(cells[index]);
    });
    return row;
  });

  return {
    name: file.name,
    source: "USER UPLOADED",
    fileType: extensionOf(file.name),
    sizeBytes: file.size,
    rows,
    columns,
  };
}

export function buildDataset(input: DatasetInput): DatasetRecord {
  const columnDetails = inspectColumns(input.columns, input.rows);
  const summary = summarizeDataset(input.columns, input.rows, columnDetails);
  const quality = inspectQuality(input.columns, input.rows, summary);
  return {
    id: `${input.source.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    name: input.name,
    source: input.source,
    fileType: input.fileType,
    sizeBytes: input.sizeBytes,
    loadedAt: new Date().toISOString(),
    columns: input.columns,
    rows: input.rows,
    summary,
    columnDetails,
    quality,
  };
}

export function generateSyntheticDataset(customerCount: number, seed: number): DatasetInput {
  const random = createRandom(seed);
  const columns = [...EXPECTED_DATASET_COLUMNS];
  const counterBusyTime = Array<number>(8).fill(0);
  const counterAvailableAt = Array<number>(8).fill(0);
  const staffCount = 5;
  const staffAvailableAt = Array<number>(staffCount).fill(0);
  const rows: DatasetRow[] = [];
  const types = ["Deposit", "Withdrawal", "Account Opening", "Loan Service", "Cash Transfer", "General Inquiry"];
  const startDate = new Date(2025, 0, 15, 9, 0, 0, 0);
  const horizon = Math.max(60, customerCount * 1.5);
  const arrivalTimes = Array.from({ length: customerCount }, () => random() * horizon).sort((left, right) => left - right);
  const customerArrivals: Array<{ counter: number; arrival: number; serviceStart: number }> = [];

  for (let index = 0; index < customerCount; index += 1) {
    const arrivalMinute = customerCount === 1 ? 0 : arrivalTimes[index];
    const arrival = new Date(startDate.getTime() + arrivalMinute * 60_000);
    const counterIndex = Math.floor(random() * counterAvailableAt.length);
    const staffIndex = counterIndex % staffCount;
    const serviceDuration = 2 + random() * 8;
    const arrivalSeconds = Math.round(arrivalMinute * 60);
    const serviceStartSeconds = Math.max(arrivalSeconds, Math.round(counterAvailableAt[counterIndex] * 60), Math.round(staffAvailableAt[staffIndex] * 60));
    const serviceDurationSeconds = Math.max(1, Math.round(serviceDuration * 60));
    const serviceEndSeconds = serviceStartSeconds + serviceDurationSeconds;
    const serviceStartMinute = serviceStartSeconds / 60;
    const serviceEndMinute = serviceEndSeconds / 60;
    const waitingTime = (serviceStartSeconds - arrivalSeconds) / 60;
    const serviceTime = serviceDurationSeconds / 60;
    const queueLength = customerArrivals.filter((entry) => entry.counter === counterIndex && entry.arrival <= arrivalSeconds && entry.serviceStart > arrivalSeconds).length;
    const arrivalRate = customerCount / horizon;
    const activeCounters = counterAvailableAt.filter((availableAt) => availableAt <= arrivalMinute).length;
    const busyStaff = staffAvailableAt.filter((availableAt) => availableAt > arrivalMinute).length;
    const staffUtilization = (busyStaff / staffCount) * 100;
    const currentWorkload = queueLength + counterAvailableAt.filter((availableAt) => availableAt > arrivalMinute).length;
    const transactionType = types[Math.floor(random() * types.length)];
    const priority = random() < 0.12 ? "Priority" : "Normal";
    const status = serviceStartMinute > horizon
      ? waitingTime >= 10 ? "DELAYED" : "WAITING"
      : serviceEndMinute > horizon ? "PROCESSING" : waitingTime >= 10 ? "DELAYED" : "COMPLETED";

    counterAvailableAt[counterIndex] = serviceEndMinute;
    staffAvailableAt[staffIndex] = serviceEndMinute;
    counterBusyTime[counterIndex] += serviceTime;
    customerArrivals.push({ counter: counterIndex, arrival: arrivalSeconds, serviceStart: serviceStartSeconds });

    const utilization = Math.min(100, counterBusyTime[counterIndex] / Math.max(serviceEndMinute, 1) * 100);
    const risk = waitingTime >= 20 || queueLength >= 6 ? "HIGH" : waitingTime >= 10 || queueLength >= 3 ? "MEDIUM" : "LOW";
    rows.push({
      Customer_ID: `CU-${String(index + 1).padStart(5, "0")}`,
      Date: arrival.toISOString().slice(0, 10),
      Arrival_Time: timeOfDay(new Date(startDate.getTime() + arrivalSeconds * 1000)),
      Transaction_Type: transactionType,
      Priority: priority,
      Counter_ID: `C${String(counterIndex + 1).padStart(2, "0")}`,
      Staff_ID: `ST-${String(staffIndex + 1).padStart(2, "0")}`,
      Service_Start: timeFromMinutes(startDate, serviceStartMinute),
      Service_End: timeFromMinutes(startDate, serviceEndMinute),
      Waiting_Time: round(waitingTime, 3),
      Service_Time: round(serviceTime, 3),
      Avg_Service_Time: round(serviceTime, 3),
      Queue_Length: queueLength,
      Arrival_Rate: round(arrivalRate, 4),
      Active_Counters: activeCounters,
      Staff_Available: 1,
      Staff_Utilization: round(staffUtilization, 1),
      Counter_Utilization: round(utilization, 1),
      Current_Workload: currentWorkload,
      Transaction_Status: status,
      Risk_Level: risk,
    });
  }

  return {
    name: `BANKTWIN_SYNTHETIC_${customerCount}_CUSTOMERS.csv`,
    source: "SYNTHETIC / SIMULATED DATA",
    fileType: "CSV",
    sizeBytes: 0,
    rows,
    columns,
  };
}

export function datasetToCsv(dataset: DatasetRecord): string {
  const header = dataset.columns.map(escapeCsv).join(",");
  const rows = dataset.rows.map((row) => dataset.columns.map((column) => escapeCsv(row[column] === null ? "" : String(row[column]))).join(","));
  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function inspectColumns(columns: string[], rows: DatasetRow[]): DatasetColumn[] {
  return columns.map((name) => {
    const values = rows.map((row) => row[name]);
    const present = values.filter((value) => !isMissing(value));
    return {
      name,
      type: inferColumnType(name, present),
      nonNullCount: present.length,
      missingCount: values.length - present.length,
      uniqueValues: new Set(present.map((value) => stableValue(value))).size,
    };
  });
}

function summarizeDataset(columns: string[], rows: DatasetRow[], columnDetails: DatasetColumn[]): DatasetSummary {
  const dataTypes: Record<DatasetColumnType, number> = { NUMBER: 0, "DATE / TIME": 0, BOOLEAN: 0, TEXT: 0, EMPTY: 0 };
  for (const column of columnDetails) dataTypes[column.type] += 1;
  return {
    rows: rows.length,
    columns: columns.length,
    missingValues: columnDetails.reduce((total, column) => total + column.missingCount, 0),
    duplicateRows: countDuplicateRows(rows, columns),
    dataTypes,
  };
}

function inspectQuality(columns: string[], rows: DatasetRow[], summary: DatasetSummary): DatasetQualityResult {
  const byNormalizedName = new Map(columns.map((column) => [normalizeColumnName(column), column]));
  const getColumn = (name: string) => byNormalizedName.get(normalizeColumnName(name));
  const missingColumns = EXPECTED_DATASET_COLUMNS.filter((name) => !getColumn(name));
  const invalidNumericRows = new Set<number>();
  const invalidDateTimeRows = new Set<number>();
  const negativeWaitingRows = new Set<number>();
  const negativeServiceRows = new Set<number>();
  const invalidOrderRows = new Set<number>();
  const unknownStatuses = new Set<number>();
  const unknownRiskLabels = new Set<number>();

  for (const field of NUMERIC_FIELDS) {
    const column = getColumn(field);
    if (!column) continue;
    rows.forEach((row, index) => {
      const value = row[column];
      if (!isMissing(value) && parseNumeric(value) === null && !(field === "Staff_Available" && typeof value === "boolean")) invalidNumericRows.add(index);
    });
  }

  for (const field of ["Date", ...TIME_FIELDS]) {
    const column = getColumn(field);
    if (!column) continue;
    rows.forEach((row, index) => {
      const value = row[column];
      if (!isMissing(value) && parseTimeValue(value) === null) invalidDateTimeRows.add(index);
    });
  }

  const waitingColumn = getColumn("Waiting_Time");
  if (waitingColumn) rows.forEach((row, index) => {
    const value = row[waitingColumn];
    const numeric = isMissing(value) ? null : parseNumeric(value);
    if (numeric !== null && numeric < 0) negativeWaitingRows.add(index);
  });

  const serviceColumn = getColumn("Service_Time");
  if (serviceColumn) rows.forEach((row, index) => {
    const value = row[serviceColumn];
    const numeric = isMissing(value) ? null : parseNumeric(value);
    if (numeric !== null && numeric < 0) negativeServiceRows.add(index);
  });

  const arrivalColumn = getColumn("Arrival_Time");
  const startColumn = getColumn("Service_Start");
  const endColumn = getColumn("Service_End");
  rows.forEach((row, index) => {
    const arrival = arrivalColumn ? parseTimeValue(row[arrivalColumn]) : null;
    const start = startColumn ? parseTimeValue(row[startColumn]) : null;
    const end = endColumn ? parseTimeValue(row[endColumn]) : null;
    if ((arrival !== null && start !== null && start < arrival) || (start !== null && end !== null && end < start)) invalidOrderRows.add(index);
  });

  const statusColumn = getColumn("Transaction_Status");
  if (statusColumn) rows.forEach((row, index) => {
    const value = row[statusColumn];
    if (!isMissing(value) && !TRANSACTION_STATUSES.has(String(value).trim().toUpperCase())) unknownStatuses.add(index);
  });

  const riskColumn = getColumn("Risk_Level");
  if (riskColumn) rows.forEach((row, index) => {
    const value = row[riskColumn];
    if (!isMissing(value) && !RISK_LEVELS.has(String(value).trim().toUpperCase())) unknownRiskLabels.add(index);
  });

  const checks: DatasetQualityCheck[] = [
    check("missing-values", "MISSING VALUES", summary.missingValues, summary.missingValues ? "WARNING" : "VALID", "Blank or null cells across the dataset."),
    check("duplicate-rows", "DUPLICATE ROWS", summary.duplicateRows, summary.duplicateRows ? "WARNING" : "VALID", "Rows identical across all available columns."),
    check("invalid-numeric", "INVALID NUMERIC VALUES", invalidNumericRows.size, invalidNumericRows.size ? "ERROR" : "VALID", "Non-numeric values in expected numeric columns."),
    check("invalid-dates", "INVALID DATE / TIME VALUES", invalidDateTimeRows.size, invalidDateTimeRows.size ? "ERROR" : "VALID", "Values that could not be interpreted as dates or times."),
    check("negative-wait", "NEGATIVE WAITING TIMES", negativeWaitingRows.size, negativeWaitingRows.size ? "ERROR" : "VALID", "Waiting_Time values below zero."),
    check("negative-service", "NEGATIVE SERVICE TIMES", negativeServiceRows.size, negativeServiceRows.size ? "ERROR" : "VALID", "Service_Time values below zero."),
    check("time-order", "INVALID SERVICE CHRONOLOGY", invalidOrderRows.size, invalidOrderRows.size ? "ERROR" : "VALID", "Service start before arrival or service end before service start."),
    check("unknown-status", "UNKNOWN TRANSACTION STATUSES", unknownStatuses.size, unknownStatuses.size ? "WARNING" : "VALID", "Allowed: WAITING, PROCESSING, COMPLETED, DELAYED."),
    check("unknown-risk", "UNKNOWN RISK LABELS", unknownRiskLabels.size, unknownRiskLabels.size ? "WARNING" : "VALID", "Allowed: LOW, MEDIUM, HIGH, CRITICAL."),
    check("missing-schema", "MISSING EXPECTED COLUMNS", missingColumns.length, missingColumns.length ? "WARNING" : "VALID", missingColumns.length ? `Not present: ${missingColumns.join(", ")}` : "All expected columns are available."),
  ];

  const status: QualityStatus = checks.some((item) => item.status === "ERROR") ? "ERROR" : checks.some((item) => item.status === "WARNING") ? "WARNING" : "VALID";
  const invalidRows = new Set([...invalidNumericRows, ...invalidDateTimeRows, ...negativeWaitingRows, ...negativeServiceRows, ...invalidOrderRows]).size;
  return { status, checks, invalidRows };
}

function check(key: string, label: string, count: number, status: QualityStatus, description: string): DatasetQualityCheck {
  return { key, label, count, status, description };
}

function inferColumnType(name: string, values: DatasetCell[]): DatasetColumnType {
  if (values.length === 0) return "EMPTY";
  if (values.every((value) => typeof value === "boolean")) return "BOOLEAN";
  if (TIME_LIKE.test(name) && values.every((value) => parseTimeValue(value) !== null)) return "DATE / TIME";
  if (values.every((value) => parseNumeric(value) !== null)) return "NUMBER";
  return "TEXT";
}

function countDuplicateRows(rows: DatasetRow[], columns: string[]): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    const signature = JSON.stringify(columns.map((column) => row[column] ?? null));
    if (seen.has(signature)) duplicates += 1;
    else seen.add(signature);
  }
  return duplicates;
}

function isMissing(value: DatasetCell | undefined): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function stableValue(value: DatasetCell): string {
  return `${typeof value}:${String(value)}`;
}

function parseNumeric(value: DatasetCell | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseTimeValue(value: DatasetCell | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const text = value.trim();
  const numeric = Number(text);
  if (Number.isFinite(numeric)) return numeric;
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/.exec(text);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = Number(timeMatch[3] ?? 0);
    if (hours < 24 && minutes < 60 && seconds < 60) return hours * 3600 + minutes * 60 + seconds;
    return null;
  }
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? timestamp / 1000 : null;
}

function normalizeCell(value: unknown): DatasetCell {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return value instanceof Date ? value.toISOString() : String(value);
}

function makeUniqueHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  return headers.map((header) => {
    const count = (counts.get(header) ?? 0) + 1;
    counts.set(header, count);
    return count === 1 ? header : `${header}_${count}`;
  });
}

function extensionOf(name: string): string {
  return name.split(".").pop()?.toUpperCase() ?? "UNKNOWN";
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function timeOfDay(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function timeFromMinutes(start: Date, minutes: number): string {
  return timeOfDay(new Date(start.getTime() + minutes * 60_000));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
