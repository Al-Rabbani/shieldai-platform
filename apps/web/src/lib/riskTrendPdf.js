import { jsPDF } from "jspdf";

const fmtDate = (label) => label || "—";

export function exportRiskTrendPdf({ points = [], windowDays = 180 } = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const CW = W - M * 2;
  let y = 0;

  const series = points.filter((point) => Number.isFinite(Number(point.score)));
  const first = series[0] || null;
  const latest = series[series.length - 1] || null;
  const delta = first && latest ? latest.score - first.score : null;
  const months = Math.round(windowDays / 30);

  const drawHeader = (continued) => {
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(116, 91, 241);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("GDS OS", M, 9);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text(`Aggregate Risk Trend — ${months}-Month Review`, M, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Security maturity for quarterly leadership review · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC${continued ? " · continued" : ""}`,
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

  drawHeader(false);

  // KPI tiles
  const tiles = [
    { label: "Current score", value: latest ? String(latest.score) : "—", note: latest?.grade ? `Grade ${latest.grade}` : "No snapshot" },
    { label: `${months}-month change`, value: delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}`, note: delta == null ? "Trend unavailable" : delta > 0 ? "Improving" : delta < 0 ? "Declining" : "Flat" },
    { label: "Baseline", value: first ? String(first.score) : "—", note: first ? `on ${first.label}` : "No baseline" },
    { label: "Snapshots", value: String(series.length), note: `last ${windowDays} days` },
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

  sectionTitle(`${months}-month risk score trend`);
  if (series.length < 2) {
    paragraph("Not enough posture snapshots are stored in this period to draw a trend. Each evaluation run stores one snapshot.");
  } else {
    const values = series.map((point) => Number(point.score));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);
    const chartHeight = 54;
    ensure(chartHeight + 20);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(M, y, CW, chartHeight, "FD");
    for (let i = 0; i <= 4; i += 1) {
      const gy = y + (chartHeight / 4) * i;
      doc.setDrawColor(226, 232, 240);
      doc.line(M, gy, M + CW, gy);
    }

    const pointX = (index) => M + 6 + (index * (CW - 12)) / Math.max(1, series.length - 1);
    const pointY = (value) => y + chartHeight - 6 - ((value - min) / span) * (chartHeight - 14);

    doc.setDrawColor(delta != null && delta < 0 ? 239 : 16, delta != null && delta < 0 ? 68 : 185, delta != null && delta < 0 ? 68 : 129);
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
    doc.text(fmtDate(series[0].label), M + 6, y + chartHeight + 4);
    doc.text(fmtDate(latest.label), M + CW - 16, y + chartHeight + 4);

    y += chartHeight + 9;
    paragraph(
      `Aggregate risk score moved from ${first.score} (${first.label}) to ${latest.score} (${latest.label}) across ${series.length} snapshots` +
        `${delta == null ? "" : `, a ${delta > 0 ? "+" : ""}${delta} point change`}. A higher score means stronger posture; this trend covers the last ${months} months of continuous evaluation.`
    );
  }

  sectionTitle("Snapshot detail");
  const rows = [...series].reverse();
  const rowHeight = 7;
  ensure(rowHeight * 2 + 6);
  doc.setFillColor(241, 245, 249);
  doc.rect(M, y - 4.5, CW, rowHeight, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text("Snapshot date", M + 2, y);
  doc.text("Score", M + 70, y);
  doc.text("Grade", M + 96, y);
  doc.text("Change", M + 122, y);
  y += rowHeight;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  rows.forEach((row, index) => {
    ensure(rowHeight + 4);
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(M, y - 4.5, CW, rowHeight, "F");
    }
    doc.text(fmtDate(row.label), M + 2, y);
    doc.text(String(row.score), M + 70, y);
    doc.text(String(row.grade || "—"), M + 96, y);
    doc.text(String(row.delta == null ? "—" : row.delta > 0 ? `+${row.delta}` : row.delta), M + 122, y);
    y += rowHeight;
  });

  ensure(16);
  doc.setDrawColor(226, 232, 240);
  doc.line(M, H - 14, W - M, H - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("GDS OS · Aggregate Risk Trend · figures read live from stored posture snapshots at generation time", M, H - 9);

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `GDS-Risk-Trend-${months}M-${stamp}.pdf`;
  doc.save(filename);
  return { filename, points: series.length };
}