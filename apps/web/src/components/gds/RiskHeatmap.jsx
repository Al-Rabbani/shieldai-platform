import React, { useState } from "react";
import { DANGER, HIGH, MEDIUM, LOW, MUTED, CARD, BORDER, CYAN } from "@/components/gds/GDSOSShared";

const SEV_COLOR = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW, info: MUTED };
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

// Map an asset/finding to a heatmap cell
function getRisk(asset) {
  const s = (asset.severity || asset.risk_level || asset.risk_score_level || "").toLowerCase();
  if (asset.risk_score >= 80 || s === "critical") return "critical";
  if (asset.risk_score >= 60 || s === "high") return "high";
  if (asset.risk_score >= 35 || s === "medium") return "medium";
  return "low";
}

function HeatCell({ asset, isHovered, onHover, onLeave }) {
  const risk = getRisk(asset);
  const color = SEV_COLOR[risk];
  return (
    <div
      onMouseEnter={() => onHover(asset)}
      onMouseLeave={onLeave}
      className="rounded-lg cursor-pointer transition-all duration-150 flex items-center justify-center"
      style={{
        background: `${color}${isHovered ? "40" : "18"}`,
        border: `1px solid ${color}${isHovered ? "80" : "35"}`,
        boxShadow: isHovered ? `0 0 14px ${color}55` : "none",
        transform: isHovered ? "scale(1.07)" : "scale(1)",
        aspectRatio: "1",
        minHeight: 36,
      }}>
      <span className="text-[8px] font-black uppercase text-center leading-tight px-0.5 truncate"
        style={{ color }}>
        {(asset.service || asset.asset_type || asset.provider || "?").slice(0, 5)}
      </span>
    </div>
  );
}

export default function RiskHeatmap({ assets = [], title = "Asset Risk Heatmap" }) {
  const [hovered, setHovered] = useState(null);

  // Sort by risk severity desc
  const sorted = [...assets].sort((a, b) => (SEV_ORDER[getRisk(a)] ?? 9) - (SEV_ORDER[getRisk(b)] ?? 9));

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  sorted.forEach(a => { const r = getRisk(a); if (counts[r] != null) counts[r]++; });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
        <h3 className="font-bold text-white">{title}</h3>
        <div className="flex items-center gap-3 text-[10px]">
          {Object.entries(counts).map(([sev, n]) => (
            <span key={sev} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: SEV_COLOR[sev] }} />
              <span style={{ color: SEV_COLOR[sev] }} className="font-bold">{n}</span>
              <span style={{ color: MUTED }} className="capitalize">{sev}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="p-5 flex gap-5">
        {/* Grid */}
        <div className="flex-1">
          {sorted.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm" style={{ color: MUTED }}>No asset data — connect a cloud account to populate the heatmap</p>
            </div>
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(36px, 1fr))` }}>
              {sorted.map((asset, i) => (
                <HeatCell
                  key={asset.id || i}
                  asset={asset}
                  isHovered={hovered?.id === asset.id}
                  onHover={setHovered}
                  onLeave={() => setHovered(null)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tooltip panel */}
        <div className="w-56 flex-shrink-0">
          <div className="rounded-xl p-4 h-full min-h-32" style={{ background: "#050e1f", border: `1px solid ${BORDER}` }}>
            {hovered ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
                    style={{ color: SEV_COLOR[getRisk(hovered)], background: `${SEV_COLOR[getRisk(hovered)]}18` }}>
                    {getRisk(hovered)}
                  </span>
                  {hovered.risk_score != null && (
                    <span className="text-[10px] font-mono" style={{ color: CYAN }}>Score: {hovered.risk_score}</span>
                  )}
                </div>
                <p className="text-xs font-bold text-white break-words">{hovered.asset_name || hovered.nickname || hovered.name || "Unknown"}</p>
                {hovered.service && <p className="text-[10px]" style={{ color: MUTED }}>Service: <span className="text-white">{hovered.service}</span></p>}
                {hovered.provider && <p className="text-[10px]" style={{ color: MUTED }}>Provider: <span className="text-white">{hovered.provider?.toUpperCase()}</span></p>}
                {hovered.region && <p className="text-[10px]" style={{ color: MUTED }}>Region: <span className="font-mono text-white">{hovered.region}</span></p>}
                {hovered.critical_count != null && (
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    Critical: <span className="font-bold" style={{ color: DANGER }}>{hovered.critical_count}</span>
                    {" · "}High: <span className="font-bold" style={{ color: HIGH }}>{hovered.high_count ?? 0}</span>
                  </p>
                )}
                {hovered.status && <p className="text-[10px] capitalize" style={{ color: MUTED }}>Status: <span className="text-white">{hovered.status}</span></p>}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-4">
                <div className="w-8 h-8 rounded-full mb-2 flex items-center justify-center"
                  style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                  <span className="text-sm">👆</span>
                </div>
                <p className="text-[10px]" style={{ color: MUTED }}>Hover over an asset cell to see its real-time threat details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 pb-4 flex items-center gap-2 text-[9px]" style={{ color: MUTED }}>
        <span>Risk:</span>
        {[["critical", DANGER], ["high", HIGH], ["medium", MEDIUM], ["low", LOW]].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: `${color}30`, border: `1px solid ${color}60` }} />
            <span className="capitalize">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}