import React from "react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, SEV_COLOR } from "@/components/gds/GDSOSShared";

export function AnimatedChartTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background: "#080d1a",
        border: `1px solid ${CYAN}40`,
        boxShadow: `0 0 24px rgba(0,212,255,0.12)`,
        animation: "fadeIn 0.15s ease-out",
        minWidth: 160,
      }}>
      {label && <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || CYAN }} />
            <span className="text-xs capitalize" style={{ color: MUTED }}>{p.name || p.dataKey}</span>
          </div>
          <span className="text-sm font-black font-mono" style={{ color: p.color || CYAN }}>
            {p.value}{unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export default AnimatedChartTooltip;

export function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background: "#080d1a",
        border: `1px solid ${CYAN}35`,
        boxShadow: `0 0 20px rgba(0,212,255,0.10)`,
        animation: "fadeIn 0.12s ease-out",
        minWidth: 180,
      }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{label}</p>
      {payload.map((p, i) => {
        const color = p.dataKey === "critical" ? DANGER : p.dataKey === "high" ? HIGH : p.dataKey === "medium" ? MEDIUM : p.dataKey === "low" ? LOW : CYAN;
        return (
          <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-[11px] capitalize" style={{ color: MUTED }}>{p.name || p.dataKey}</span>
            </div>
            <span className="text-[11px] font-black font-mono" style={{ color }}>{p.value}</span>
          </div>
        );
      })}
      <div className="mt-2 pt-2 flex justify-between" style={{ borderTop: `1px solid ${BORDER}` }}>
        <span className="text-[10px]" style={{ color: MUTED }}>Total</span>
        <span className="text-[11px] font-black font-mono text-white">{total}</span>
      </div>
    </div>
  );
}