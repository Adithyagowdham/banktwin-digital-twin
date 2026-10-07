export interface ReportExportRow {
  section: string;
  item: string;
  value: string | number;
  source: string;
}

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function ReportExport({ rows }: { rows: ReportExportRow[] }) {
  function downloadReport() {
    if (rows.length === 0) return;
    const table = [["Section", "Item", "Value", "Source"], ...rows.map((row) => [row.section, row.item, row.value, row.source])];
    const csv = table.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "BANKTWIN_RESEARCH_REPORT.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <button type="button" className="twin-control-button twin-control-button--primary" onClick={downloadReport} disabled={rows.length === 0} title={rows.length ? "Download available report data as CSV" : "No report data available to export"}>DOWNLOAD REPORT DATA</button>;
}
