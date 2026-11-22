import React from "react";
import AnimatedNumber from "@/components/shared/AnimatedNumber";

function gradeColor(grade) {
  if (grade === "A") return "#10B981";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "#F59E0B";
  return "#EF4444";
}

export function RiskScoreTile({ risk }) {
  const color = gradeColor(risk?.grade);
  const arrow = risk?.trend === "improving" ? "↗" : risk?.trend === "degrading" ? "↘" : "→";
  return (
    <div className="rounded-2xl p-4" style={{ background: "#111827", border: `1px solid ${color}50` }}>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Global Risk Score</p>
      <div className="flex items-end gap-2 mt-1">
        <span className="text-4xl font-black" style={{ color }}>{risk?.overall_score != null ? <AnimatedNumber value={risk.overall_score} /> : "—"}</span>
        <span className="text-lg font-bold mb-0.5" style={{ color }}>{risk?.grade ?? ""}</span>
      </div>
      <p className="text-xs mt-1" style={{ color }}>{arrow} {risk?.trend || "stable"}</p>
    </div>
  );
}

export default function StatTile({ label, value, subtext, subtextColor, danger, pulse }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#111827", border: `1px solid ${danger ? "#EF444450" : "#1F2937"}` }}>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-4xl font-black ${danger ? "text-red-400" : "text-white"}`}>{typeof value === "number" ? <AnimatedNumber value={value} /> : value}</span>
        {pulse && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
      </div>
      {subtext && <p className={`text-xs mt-1 ${subtextColor || "text-slate-500"}`}>{subtext}</p>}
    </div>
  );
}