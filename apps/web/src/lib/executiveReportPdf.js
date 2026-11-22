import { jsPDF } from "jspdf";

const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const fmtDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "—");
const fmtDateTime = (value) =>
  value ? new Date(value).toISOString().slice(0, 16).replace("T", " ") : "—";

export function exportExecutiveReport({
  scores = [],
  incidents = [],
  frameworks = [],
  resolvedFindings = [],
  openFindings = [],
  periodDays = 30,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const CW = W - M * 2;
  let y = 0;

  const series = scores
    .filter((row) => row.calculated_at && Number.isFinite(Number(row.overall_score)))
    .sort((a, b) => new Date(a.calculated_at) - new Date(b.calculated_at))
    .slice(-periodDays);
  const latest = series[series.length - 1] || null;
  const first = series[0] || null;
  const delta = latest && first ? Number(latest.overall_score) - Number(first.overall_score) : null;

  const since = new Date(Date.now() - periodDays * 86400000);
  const resolvedInPeriod = resolvedFindings.filter((finding) => finding.fixed_at && new Date(finding.fixed_at) >= since);
  const complianceAvg = frameworks.length
    ? Math.round(frameworks.reduce((sum, row) => sum + Number(row.score || 0), 0) / frameworks.length)
    : null;

  const drawHeader = (continued) => {
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(116, 91, 241);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("GDS OS", M, 9);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text("Executive Security Report", M, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${periodDays}-day posture, incident resolution and compliance · generated ${fmtDateTime(new Date())} UTC${continued ? " · continued" : ""}`,
      M,
      22
    );
    y = 34;
  };

  const ensure = (needed) => {
    if (y + needed > H - 18) {
      doc.addPage();
      drawHeader(true);
    }
  };

  const sectionTitle = (text) => {
    ensure(14);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(text, M, y);
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y + 2, W - M, y + 2);
    y += 8;
  };

  const paragraph = (text, size = 8.5) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(text, CW);
    ensure(lines.length * 4.2 + 4);
    doc.text(lines, M, y);
    y += lines.length * 4.2 + 3;
  };

  const table = (columns, rows) => {
    const rowHeight = 7;
    ensure(rowHeight * (rows.length + 1) + 6);
    doc.setFillColor(241, 245, 249);
    doc.rect(M, y - 4.5, CW, rowHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    let x = M + 2;
    columns.forEach((column) => {
      doc.text(column.label, x, y);
      x += column.width;
    });
    y += rowHeight;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    rows.forEach((row, index) => {
      ensure(rowHeight + 4);
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, y - 4.5, CW, rowHeight, "F");
      }
      x = M + 2;
      columns.forEach((column, columnIndex) => {
        const value = doc.splitTextToSize(String(row[columnIndex] ?? "—"), column.width - 2)[0] || "—";
        doc.text(value, x, y);
        x += column.width;
      });
      y += rowHeight;
    });
    y += 4;
  };

  drawHeader(false);

  // KPI tiles
  const tiles = [
    { label: "Overall risk", value: latest ? `${Math.round(Number(latest.overall_score))}/100` : "—", note: latest?.grade ? `Grade ${latest.grade}` : "No snapshot" },
    { label: `${periodDays}-day change`, value: delta == null ? "—" : `${delta > 0 ? "+" : ""}${Math.round(delta)}`, note: delta == null ? "Trend unavailable" : delta <= 0 ? "Improving" : "Worsening" },
    { label: "Open findings", value: String(openFindings.length), note: `${openFindings.filter((f) => (f.severity || "") === "critical").length} critical` },
    { label: "Resolved", value: String(resolvedInPeriod.length), note: `last ${periodDays} days` },
    { label: "Compliance", value: complianceAvg == null ? "—" : `${complianceAvg}%`, note: `${frameworks.length} frameworks` },
  ];
  const gap = 3;
  const tileWidth = (CW - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((tile, index) => {
    const tileX = M + index * (tileWidth + gap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(tileX, y, tileWidth, 18, 2, 2, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(tile.label.toUpperCase(), tileX + 3, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(tile.value, tileX + 3, y + 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(120, 133, 150);
    doc.text(tile.note, tileX + 3, y + 16.5);
  });
  y += 26;

  // 30-day risk trend
  sectionTitle(`${periodDays}-day risk trend`);
  if (series.length < 2) {
    paragraph("Not enough posture snapshots recorded in this period to draw a trend. The GDS OS risk engine stores one snapshot per evaluation run.");
  } else {
    const chartHeight = 46;
    const chartWidth = CW;
    const values = series.map((row) => Number(row.overall_score));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    ensure(chartHeight + 18);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(M, y, chartWidth, chartHeight, "FD");

    for (let i = 0; i <= 4; i += 1) {
      const gy = y + (chartHeight / 4) * i;
      doc.setDrawColor(226, 232, 240);
      doc.line(M, gy, M + chartWidth, gy);
    }

    const pointX = (index) => M + 6 + (index * (chartWidth - 12)) / Math.max(1, series.length - 1);
    const pointY = (value) => y + chartHeight - 6 - ((value - min) / span) * (chartHeight - 14);

    doc.setDrawColor(116, 91, 241);
    doc.setLineWidth(0.7);
    values.forEach((value, index) => {
      if (index === 0) return;
      doc.line(pointX(index - 1), pointY(values[index - 1]), pointX(index), pointY(value));
    });
    doc.setLineWidth(0.2);

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`${Math.round(max)}`, M + 1.5, y + 5);
    doc.text(`${Math.round(min)}`, M + 1.5, y + chartHeight - 3);
    doc.text(fmtDate(series[0].calculated_at), M + 6, y + chartHeight + 4);
    doc.text(fmtDate(series[series.length - 1].calculated_at), M + chartWidth - 24, y + chartHeight + 4);

    y += chartHeight + 9;
    paragraph(
      `Posture moved from ${Math.round(values[0])} to ${Math.round(values[values.length - 1])} across ${series.length} snapshots${
        delta == null ? "" : ` (${delta > 0 ? "+" : ""}${Math.round(delta)} points)`
      }. ${resolvedInPeriod.length} finding(s) were resolved in the same period.`
    );
  }

  // Top resolved incidents
  const topIncidents = [...incidents]
    .filter((incident) => (incident.status || "").toLowerCase() === "resolved")
    .sort(
      (a, b) =>
        (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0) ||
        new Date(b.closed_at || 0) - new Date(a.closed_at || 0)
    )
    .slice(0, 6);

  sectionTitle("Top resolved incidents");
  if (topIncidents.length === 0) {
    paragraph("No incident is recorded as resolved yet. Incidents appear here once their status reaches resolved.");
  } else {
    table(
      [
        { label: "Incident", width: 88 },
        { label: "Severity", width: 22 },
        { label: "Type", width: 30 },
        { label: "Closed", width: 40 },
      ],
      topIncidents.map((incident) => [
        incident.title || "Untitled incident",
        String(incident.severity || "—").toUpperCase(),
        String(incident.incident_type || "—").replace(/_/g, " "),
        fmtDate(incident.closed_at),
      ])
    );
  }

  // Compliance status
  sectionTitle("Compliance status");
  if (frameworks.length === 0) {
    paragraph("No compliance framework score is recorded yet. Run a compliance assessment to populate this section.");
  } else {
    table(
      [
        { label: "Framework", width: 78 },
        { label: "Score", width: 22 },
        { label: "Passing", width: 26 },
        { label: "Failing", width: 26 },
        { label: "Status", width: 34 },
      ],
      frameworks.map((framework) => [
        framework.name || "Framework",
        `${Math.round(Number(framework.score || 0))}%`,
        String(framework.passing_count ?? "—"),
        String(framework.failing_count ?? "—"),
        String(framework.status || "—").replace(/_/g, " "),
      ])
    );
    paragraph(
      `Average framework score across ${frameworks.length} framework(s) is ${complianceAvg}%. Failing controls are listed on the Audit & Compliance dashboard.`
    );
  }

  sectionTitle("What leadership should act on");
  const criticalOpen = openFindings.filter((finding) => (finding.severity || "") === "critical").length;
  const breached = openFindings.filter((finding) => finding.sla_breached).length;
  const actions = [];
  if (criticalOpen > 0) actions.push(`${criticalOpen} critical finding(s) remain open — assign each an owner and a fix date this week.`);
  if (breached > 0) actions.push(`${breached} finding(s) are past their SLA deadline; escalate the owning team.`);
  if (complianceAvg != null && complianceAvg < 80) actions.push(`Compliance average of ${complianceAvg}% is below the 80% threshold — close failing controls first.`);
  if (delta != null && delta > 0) actions.push(`Risk rose ${Math.round(delta)} points over ${periodDays} days — review the newest exposure before the next board review.`);
  if (actions.length === 0) actions.push("No blocking exposure is open: keep the current remediation cadence and reassess at the next review.");
  actions.forEach((action) => paragraph(`• ${action}`, 8));

  ensure(16);
  doc.setDrawColor(226, 232, 240);
  doc.line(M, H - 14, W - M, H - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("GDS OS · Executive Security Report · figures read live from the platform at generation time", M, H - 9);

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`GDS-Executive-Report-${stamp}.pdf`);
  return { filename: `GDS-Executive-Report-${stamp}.pdf`, trendPoints: series.length, resolvedIncidents: topIncidents.length };
}