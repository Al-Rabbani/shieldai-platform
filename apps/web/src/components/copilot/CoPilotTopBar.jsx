import React from "react";
import { Bell, Settings } from "lucide-react";

function gradeColor(grade) {
  if (grade === "A") return "#22c55e";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "#f59e0b";
  return "#ef4444";
}

export default function CoPilotTopBar({ risk, notificationCount = 0 }) {
  const color = gradeColor(risk?.grade);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ background: "#0d1428", borderBottom: "1px solid #1e3a5f" }}>
      <span className="text-lg">🔮</span>
      <span className="text-sm font-bold text-white">GDS AGENT OS v2.0</span>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
      </span>

      <span className="ml-auto flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: color + "22", color, border: `1px solid ${color}55` }}>
        {risk?.overall_score ?? "—"} {risk?.grade ?? "—"} {risk?.trend === "improving" ? "↗" : risk?.trend === "degrading" ? "↘" : "→"}
      </span>

      <button className="relative flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-slate-200">
        <Bell size={15} />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {notificationCount > 9 ? "9+" : notificationCount}
          </span>
        )}
      </button>
      <button className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-slate-200">
        <Settings size={15} />
      </button>
    </div>
  );
}