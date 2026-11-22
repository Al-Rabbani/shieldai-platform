import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DANGER, HIGH, MEDIUM, LOW, MUTED, CARD, BORDER, CYAN, TEXT } from "@/components/gds/GDSOSShared";

const SEV_COLOR = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function getSev(item) {
  const s = (item.severity || item.normalized_severity || item.risk_level || "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

// Normalise findings from multiple entity types into heatmap cells
function normalizeSources(cloudFindings, triaged, vmFindings, containerFindings, dastFindings) {
  const cells = [];

  const addAll = (arr, sourceLabel) => arr.forEach(item => cells.push({
    id: `${sourceLabel}-${item.id}`,
    label: (item.title || item.asset_name || item.cve_id || sourceLabel || "?").slice(0, 18),
    sev: getSev(item),
    source: sourceLabel,
    asset: item.asset_name || item.resource || item.identity_name || item.target_url || "—",
    title: item.title || item.vulnerability_type || item.finding_type || "—",
    status: item.status || "open",
  }));

  addAll(cloudFindings, "Cloud");
  addAll(triaged.filter(f => f.status === "open" || !f.status), "Code");
  addAll(vmFindings, "VM");
  addAll(containerFindings, "Container");
  addAll(dastFindings, "DAST");

  return cells.sort((a, b) => (SEV_ORDER[a.sev] ?? 9) - (SEV_ORDER[b.sev] ?? 9));
}

const SOURCE_COLORS = {
  Cloud: "#0EA5E9",
  Code: "#8B5CF6",
  VM: "#F59E0B",
  Container: "#10B981",
  DAST: "#EF4444",
};

function HeatCell({ cell, isHovered, onHover, onLeave }) {
  const color = SEV_COLOR[cell.sev] || MUTED;
  const srcColor = SOURCE_COLORS[cell.source] || MUTED;
  return (
    <div
      onMouseEnter={() => onHover(cell)}
      onMouseLeave={onLeave}
      className="rounded-md cursor-pointer transition-all duration-150"
      title={cell.title}
      style={{
        background: `${color}${isHovered ? "45" : "15"}`,
        border: `1px solid ${color}${isHovered ? "90" : "30"}`,
        boxShadow: isHovered ? `0 0 16px ${color}55` : "none",
        transform: isHovered ? "scale(1.12)" : "scale(1)",
        aspectRatio: "1",
        minHeight: 28,
        position: "relative",
      }}>
      {/* Source dot */}
      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: srcColor }} />
    </div>
  );
}

export default function GlobalRiskHeatmap() {
  const [hovered, setHovered] = useState(null);
  const [activeSource, setActiveSource] = useState("all");

  const { data: cloudFindings = [] } = useQuery({ queryKey: ["ghm-cloud"], queryFn: () => base44.entities.CloudFinding.list("-detected_at", 80).catch(() => []) });
  const { data: triaged = [] } = useQuery({ queryKey: ["ghm-triaged"], queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []) });
  const { data: vmFindings = [] } = useQuery({ queryKey: ["ghm-vm"], queryFn: () => base44.entities.VMFinding.list("-created_date", 60).catch(() => []) });
  const { data: containerFindings = [] } = useQuery({ queryKey: ["ghm-container"], queryFn: () => base44.entities.ContainerFinding.list("-created_date", 60).catch(() => []) });
  const { data: dastFindings = [] } = useQuery({ queryKey: ["ghm-dast"], queryFn: () => base44.entities.DASTFinding.list("-created_date", 40).catch(() => []) });

  const allCells = useMemo(
    () => normalizeSources(cloudFindings, triaged, vmFindings, containerFindings, dastFindings),
    [cloudFindings, triaged, vmFindings, containerFindings, dastFindings]
  );

  const filtered = activeSource === "all" ? allCells : allCells.filter(c => c.source === activeSource);

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  filtered.forEach(c => { if (counts[c.sev] != null) counts[c.sev]++; });

  const sources = ["all", "Cloud", "Code", "VM", "Container", "DAST"];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b flex-wrap gap-3" style={{ borderColor: BORDER }}>
        <div>
          <h3 className="font-bold text-white">Global Risk Heatmap</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Vulnerability severity distribution across all monitored assets</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {Object.entries(counts).map(([sev, n]) => (
            <span key={sev} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: SEV_COLOR[sev] }} />
              <span style={{ color: SEV_COLOR[sev] }} className="font-black">{n}</span>
              <span style={{ color: MUTED }} className="capitalize">{sev}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Source filter tabs */}
      <div className="flex items-center gap-1.5 px-5 pt-4 pb-2 flex-wrap">
        {sources.map(src => {
          const active = activeSource === src;
          const color = src === "all" ? CYAN : SOURCE_COLORS[src];
          return (
            <button key={src} onClick={() => setActiveSource(src)}
              className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{
                color: active ? color : MUTED,
                background: active ? `${color}18` : "transparent",
                border: `1px solid ${active ? color + "50" : BORDER}`,
              }}>
              {src === "all" ? `All (${allCells.length})` : `${src} (${allCells.filter(c => c.source === src).length})`}
            </button>
          );
        })}
      </div>

      <div className="p-5 flex gap-5">
        {/* Grid */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-40 rounded-xl" style={{ border: `1px dashed ${BORDER}` }}>
              <p className="text-sm text-center px-4" style={{ color: MUTED }}>
                No open findings yet — connect assets and run scans to populate the heatmap
              </p>
            </div>
          ) : (
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(28px, 1fr))" }}>
              {filtered.map((cell, i) => (
                <HeatCell
                  key={cell.id || i}
                  cell={cell}
                  isHovered={hovered?.id === cell.id}
                  onHover={setHovered}
                  onLeave={() => setHovered(null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="w-52 flex-shrink-0">
          <div className="rounded-xl p-4 min-h-36 h-full" style={{ background: "#050e1f", border: `1px solid ${BORDER}` }}>
            {hovered ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
                    style={{ color: SEV_COLOR[hovered.sev], background: `${SEV_COLOR[hovered.sev]}18` }}>
                    {hovered.sev}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                    style={{ color: SOURCE_COLORS[hovered.source] || MUTED, background: `${SOURCE_COLORS[hovered.source] || MUTED}18` }}>
                    {hovered.source}
                  </span>
                </div>
                <p className="text-xs font-bold text-white leading-snug">{hovered.title}</p>
                {hovered.asset && hovered.asset !== "—" && (
                  <p className="text-[10px] font-mono truncate" style={{ color: MUTED }}>
                    Asset: <span style={{ color: TEXT }}>{hovered.asset}</span>
                  </p>
                )}
                <p className="text-[10px] capitalize" style={{ color: MUTED }}>
                  Status: <span className="text-white">{hovered.status}</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-4 gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                  <span className="text-sm">👆</span>
                </div>
                <p className="text-[10px]" style={{ color: MUTED }}>Hover a cell to see asset details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 pb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-[9px]" style={{ color: MUTED }}>
          <span>Severity:</span>
          {[["critical", DANGER], ["high", HIGH], ["medium", MEDIUM], ["low", LOW]].map(([l, c]) => (
            <span key={l} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm" style={{ background: `${c}28`, border: `1px solid ${c}60` }} />
              <span className="capitalize">{l}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[9px]" style={{ color: MUTED }}>
          <span>Source dot:</span>
          {Object.entries(SOURCE_COLORS).map(([src, c]) => (
            <span key={src} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: c }} />
              <span>{src}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}