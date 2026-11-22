import { jsPDF } from "jspdf";

const COLUMNS = [
  { key: "incidentType", label: "Incident Type", width: 30 },
  { key: "date", label: "Date", width: 20 },
  { key: "severity", label: "Severity Level", width: 20 },
  { key: "agentId", label: "Agent ID", width: 26 },
  { key: "agentType", label: "Agent Type", width: 20 },
  { key: "status", label: "Status", width: 20 },
  { key: "evidenceId", label: "Evidence ID", width: 30 },
  { key: "description", label: "Evidence Description", width: 65 },
  { key: "source", label: "Evidence Source", width: 46 },
];

const NOT_RECORDED = "Not recorded";
const UNCLASSIFIED = "unclassified";

function pretty(value) {
  if (!value) return NOT_RECORDED;
  return String(value).replace(/_/g, " ");
}

function formatDate(value) {
  if (!value) return NOT_RECORDED;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? NOT_RECORDED : d.toISOString().slice(0, 10);
}

function toRow(record) {
  return {
    incidentType: record.incident_type ? pretty(record.incident_type) : NOT_RECORDED,
    date: formatDate(record.collected_at),
    severity: record.severity_level ? pretty(record.severity_level) : NOT_RECORDED,
    agentId: record.agent_id || NOT_RECORDED,
    agentType: record.agent_type || NOT_RECORDED,
    status: pretty(record.integrity_status),
    evidenceId: record.evidence_id || NOT_RECORDED,
    description: record.description || record.title || NOT_RECORDED,
    source: record.source_system || NOT_RECORDED,
    groupKey: record.incident_type || UNCLASSIFIED,
  };
}

export function buildEvidenceGroups(records) {
  const groups = new Map();
  records.forEach((record) => {
    const row = toRow(record);
    if (!groups.has(row.groupKey)) groups.set(row.groupKey, []);
    groups.get(row.groupKey).push(row);
  });
  return [...groups.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([key, rows]) => ({
      key,
      label: key === UNCLASSIFIED ? "Unclassified (no incident type recorded)" : pretty(key),
      rows: rows.sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

export function exportEvidencePdf(records) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const groups = buildEvidenceGroups(records);
  const generatedAt = new Date();

  const drawHeader = (continued) => {
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, pageWidth, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Forensic Evidence Report", margin, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `GDS OS · generated ${generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC · ${records.length} record(s)` +
        (continued ? " · continued" : ""),
      margin,
      14
    );
    doc.setTextColor(30, 41, 59);
  };

  const drawTableHead = (y) => {
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    let x = margin + 1;
    COLUMNS.forEach((col) => {
      doc.text(col.label, x, y + 4.7);
      x += col.width;
    });
    return y + 7;
  };

  drawHeader(false);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const scopeLine = doc.splitTextToSize(
    "Records are grouped by incident type. Severity Level, Agent ID and Agent Type are optional fields: when an evidence record was collected without them, the cell prints \"Not recorded\" instead of an inferred value.",
    pageWidth - margin * 2
  );
  doc.text(scopeLine, margin, 26);

  // Summary table
  let y = 30 + scopeLine.length * 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Summary by incident type", margin, y);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, 170, 7, "F");
  doc.setFontSize(7.5);
  doc.text("Incident Type", margin + 1, y + 4.7);
  doc.text("Records", margin + 70, y + 4.7);
  doc.text("Date range", margin + 95, y + 4.7);
  doc.text("Severities", margin + 140, y + 4.7);
  y += 7;
  doc.setFont("helvetica", "normal");
  groups.forEach((group) => {
    const dates = group.rows.map((r) => r.date).filter((d) => d !== NOT_RECORDED).sort();
    const severities = [...new Set(group.rows.map((r) => r.severity))].join(", ");
    doc.text(group.label.length > 60 ? `${group.label.slice(0, 58)}…` : group.label, margin + 1, y + 4.4);
    doc.text(String(group.rows.length), margin + 70, y + 4.4);
    doc.text(dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : NOT_RECORDED, margin + 95, y + 4.4);
    doc.text(severities.length > 45 ? `${severities.slice(0, 43)}…` : severities, margin + 140, y + 4.4);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 6.5, margin + 170, y + 6.5);
    y += 7;
  });

  // Detail tables, grouped by incident type
  groups.forEach((group) => {
    y += 6;
    if (y > pageHeight - 40) {
      doc.addPage();
      drawHeader(true);
      y = 26;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${group.label} — ${group.rows.length} record(s)`, margin, y);
    y += 4;
    y = drawTableHead(y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    group.rows.forEach((row) => {
      const cells = COLUMNS.map((col) => doc.splitTextToSize(String(row[col.key] ?? ""), col.width - 2));
      const lineCount = Math.max(...cells.map((c) => c.length));
      const rowHeight = lineCount * 3.4 + 2.6;
      if (y + rowHeight > pageHeight - 12) {
        doc.addPage();
        drawHeader(true);
        y = 26;
        y = drawTableHead(y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
      }
      let x = margin + 1;
      cells.forEach((lines, index) => {
        lines.slice(0, 3).forEach((line, lineIndex) => {
          doc.text(line, x, y + 3.4 + lineIndex * 3.4);
        });
        x += COLUMNS[index].width;
      });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
      y += rowHeight;
    });
  });

  doc.save(`Forensic_Evidence_Report_${generatedAt.toISOString().slice(0, 10)}.pdf`);
}