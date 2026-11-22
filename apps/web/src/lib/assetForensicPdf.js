import { jsPDF } from "jspdf";

const WINDOW_DAYS = 30;
const stampText = (iso) => (iso ? String(iso).slice(0, 16).replace("T", " ") : "—");

export function exportAssetForensicPdf({ asset, events = [], drifts = [], logs = [], unreverted = 0 } = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;
  const CW = W - M * 2;
  let y = 0;

  const sorted = [...events].filter((event) => event.at).sort((a, b) => new Date(b.at) - new Date(a.at));
  const criticalDrift = drifts.filter((drift) => drift.severity === "critical").length;
  const assetName = asset?.name || "Unknown asset";

  const drawHeader = (continued) => {
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(116, 91, 241);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("GDS OS", M, 9);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(`Forensic Change Report — ${assetName}`.slice(0, 78), M, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Configuration drift and change history · last ${WINDOW_DAYS} days · generated ${stampText(new Date().toISOString())} UTC${continued ? " · continued" : ""}`,
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

  // Asset identity strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(M, y, CW, 14, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(assetName, M + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    [
      asset?.cloud_provider || "provider unknown",
      asset?.type || "type unknown",
      asset?.region || "region unknown",
      asset?.risk_score != null ? `risk ${asset.risk_score}` : null,
      asset?.business_criticality ? `${asset.business_criticality} criticality` : null,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 130),
    M + 3,
    y + 11
  );
  y += 22;

  // KPI tiles
  const tiles = [
    { label: "Drift events", value: String(drifts.length), note: `${criticalDrift} critical` },
    { label: "Logged changes", value: String(logs.length), note: "configuration changes" },
    { label: "Unreverted", value: String(unreverted), note: unreverted > 0 ? "needs review" : "all closed" },
    { label: "Total events", value: String(sorted.length), note: `${WINDOW_DAYS}-day window` },
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

  const tableHeader = (columns) => {
    ensure(10);
    doc.setFillColor(241, 245, 249);
    doc.rect(M, y - 4.5, CW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    columns.forEach((column) => doc.text(column.label, M + column.x, y));
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
  };

  sectionTitle(`Drift events (${drifts.length})`);
  if (!drifts.length) {
    paragraph("No configuration drift was detected on this asset in the last 30 days.");
  } else {
    tableHeader([
      { label: "Detected (UTC)", x: 2 },
      { label: "Drift", x: 42 },
      { label: "Severity", x: 96 },
      { label: "Status", x: 122 },
    ]);
    const ordered = [...drifts].sort((a, b) => new Date(b.detected_at || 0) - new Date(a.detected_at || 0));
    ordered.forEach((drift, index) => {
      const type = String(drift.drift_type || "configuration drift").replace(/_/g, " ");
      const expected = doc.splitTextToSize(`expected: ${drift.expected_value ?? "—"}`, CW - 4).slice(0, 1);
      const actual = doc.splitTextToSize(`actual: ${drift.actual_value ?? "—"}`, CW - 4).slice(0, 1);
      const rowHeight = 13;
      ensure(rowHeight + 3);
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, y - 4, CW, rowHeight, "F");
      }
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(stampText(drift.detected_at), M + 2, y);
      doc.text(type.slice(0, 34), M + 42, y);
      doc.text(String(drift.severity || "—"), M + 96, y);
      doc.text(String(drift.status || "detected").replace(/_/g, " "), M + 122, y);
      doc.setFontSize(6.5);
      doc.setTextColor(16, 118, 92);
      doc.text(expected[0] || "", M + 4, y + 4);
      doc.setTextColor(178, 52, 52);
      doc.text(actual[0] || "", M + 4, y + 7.5);
      y += rowHeight;
    });
  }
  y += 3;

  sectionTitle(`Configuration changes (${logs.length})`);
  if (!logs.length) {
    paragraph("No configuration change was logged against this asset in the last 30 days.");
  } else {
    tableHeader([
      { label: "Logged (UTC)", x: 2 },
      { label: "Change", x: 42 },
      { label: "Actor", x: 140 },
    ]);
    const orderedLogs = [...logs].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    orderedLogs.forEach((log, index) => {
      ensure(9);
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(M, y - 4, CW, 8, "F");
      }
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(stampText(log.timestamp), M + 2, y);
      doc.text(String(log.action || "configuration change").slice(0, 62), M + 42, y);
      doc.text(String(log.actor_email || log.actor_type || "system").slice(0, 28), M + 140, y);
      y += 8;
    });
  }
  y += 3;

  sectionTitle("Chronological event trail");
  if (!sorted.length) {
    paragraph("Nothing was recorded for this asset in the reporting window.");
  } else {
    sorted.forEach((event) => {
      const kind = event.kind === "drift" ? `drift · ${event.severity || "unknown"}` : "configuration change";
      ensure(11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(stampText(event.at), M + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`${String(event.title || "").slice(0, 70)}`, M + 42, y);
      doc.setFontSize(6.5);
      doc.setTextColor(120, 133, 150);
      doc.text(`${kind}${event.actor ? ` · ${event.actor}` : ""}`.slice(0, 90), M + 42, y + 3.5);
      y += 10;
    });
  }

  ensure(16);
  doc.setDrawColor(226, 232, 240);
  doc.line(M, H - 14, W - M, H - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `GDS OS · Forensic change report for ${assetName} · read live from drift and audit records at generation time`,
    M,
    H - 9
  );

  const safeName = assetName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 40) || "asset";
  const filename = `GDS-Forensic-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return { filename, events: sorted.length };
}