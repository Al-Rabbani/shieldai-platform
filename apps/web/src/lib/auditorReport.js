import { jsPDF } from "jspdf";

const FRAMEWORK_LABEL = { soc2: "SOC 2", iso27001: "ISO 27001", nist: "NIST CSF" };
const NOT_RECORDED = "Not recorded";

const pretty = (value) => (value ? String(value).replace(/_/g, " ") : NOT_RECORDED);
const frameworkLabel = (value) => FRAMEWORK_LABEL[value] || (value ? String(value).toUpperCase() : NOT_RECORDED);
const formatDate = (value) => {
  if (!value) return NOT_RECORDED;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? NOT_RECORDED : d.toISOString().slice(0, 10);
};

const INCIDENT_COLUMNS = [
  { label: "Reference", width: 30 },
  { label: "Incident", width: 60 },
  { label: "Severity", width: 20 },
  { label: "Status", width: 24 },
  { label: "Type", width: 26 },
  { label: "Opened", width: 22 },
];

const CONTROL_COLUMNS = [
  { label: "Framework", width: 24 },
  { label: "Control", width: 22 },
  { label: "Control title", width: 74 },
  { label: "Status", width: 22 },
  { label: "Owner", width: 40 },
];

export function exportAuditorReport({ title, preparedFor, incidents = [], controls = [] }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedAt = new Date();
  const reportTitle = title || "Auditor Evidence Report";
  let y = 0;

  const drawHeader = (continued) => {
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, pageWidth, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(reportTitle, margin, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `GDS OS · Auditor evidence bundle · generated ${generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC${continued ? " · continued" : ""}`,
      margin,
      15
    );
    doc.setTextColor(30, 41, 59);
  };

  const ensure = (needed) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      drawHeader(true);
      y = 28;
    }
  };

  const tableHead = (columns) => {
    ensure(9);
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    let x = margin + 1;
    columns.forEach((col) => {
      doc.text(col.label, x, y + 4.7);
      x += col.width;
    });
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
  };

  const tableRow = (columns, values) => {
    const cells = columns.map((col, index) => doc.splitTextToSize(String(values[index] ?? ""), col.width - 2));
    const lineCount = Math.max(...cells.map((cell) => cell.length), 1);
    const rowHeight = lineCount * 3.2 + 2.4;
    ensure(rowHeight + 2);
    let x = margin + 1;
    cells.forEach((lines, index) => {
      lines.slice(0, 3).forEach((line, lineIndex) => doc.text(line, x, y + 3.2 + lineIndex * 3.2));
      x += columns[index].width;
    });
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
    y += rowHeight;
  };

  const sectionTitle = (label) => {
    ensure(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(label, margin, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
  };

  drawHeader(false);
  y = 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(reportTitle, margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  [
    `Prepared for: ${preparedFor || NOT_RECORDED}`,
    `Generated: ${generatedAt.toLocaleString()}`,
    `Scope: ${incidents.length} incident(s) · ${controls.length} compliance control(s)`,
  ].forEach((line) => {
    doc.text(line, margin, y);
    y += 4.6;
  });
  y += 4;

  if (incidents.length > 0) {
    sectionTitle(`Incidents in scope — ${incidents.length}`);
    y += 2;
    tableHead(INCIDENT_COLUMNS);
    incidents.forEach((incident) => {
      tableRow(INCIDENT_COLUMNS, [
        incident.id ? `INC-${String(incident.id).slice(-6).toUpperCase()}` : NOT_RECORDED,
        incident.title || NOT_RECORDED,
        pretty(incident.severity),
        pretty(incident.status),
        incident.incident_type ? pretty(incident.incident_type) : NOT_RECORDED,
        formatDate(incident.opened_at),
      ]);
    });
    y += 6;
  }

  if (controls.length > 0) {
    sectionTitle(`Compliance controls in scope — ${controls.length}`);
    y += 2;
    tableHead(CONTROL_COLUMNS);
    controls.forEach((control) => {
      tableRow(CONTROL_COLUMNS, [
        frameworkLabel(control.framework),
        control.control_ref || NOT_RECORDED,
        control.title || NOT_RECORDED,
        pretty(control.status),
        control.owner || NOT_RECORDED,
      ]);
    });
    y += 6;
  }

  ensure(30);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const note = doc.splitTextToSize(
    "This bundle reproduces stored records in GDS OS at generation time. Incident and compliance entries are printed as recorded; missing values print \"Not recorded\" and nothing is inferred. Reviewer attestation: ______________________   Date: ____________",
    contentWidth
  );
  doc.text(note, margin, y);

  doc.save(`Auditor_Evidence_Report_${generatedAt.toISOString().slice(0, 10)}.pdf`);
}