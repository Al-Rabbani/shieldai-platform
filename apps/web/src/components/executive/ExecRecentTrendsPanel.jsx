import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const TONE = { up: { color: "#10b981", icon: TrendingUp }, down: { color: "#ef4444", icon: TrendingDown }, flat: { color: "#f59e0b", icon: Minus } };

export default function ExecRecentTrendsPanel({ rows = [] }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-sm font-bold text-white">Recent security trends</p>
      <p className="text-[10px] text-slate-500 mb-3">What moved over the last 30 days, read from stored findings and posture snapshots.</p>

      {rows.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-6 text-center">No trend data recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const tone = TONE[row.direction] || TONE.flat;
            const Icon = row.icon || tone.icon;
            return (
              <div
                key={row.label}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}
              >
                <Icon size={13} style={{ color: row.direction === "flat" ? tone.color : (row.color || tone.color) }} className="flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-200">{row.label}</p>
                  <p className="text-[9px] text-slate-500">{row.note}</p>
                </div>
                <span className="text-sm font-bold font-mono" style={{ color: row.direction === "flat" ? "#f59e0b" : (row.color || tone.color) }}>
                  {row.value}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}