import React from "react";

const STATUS_COLOR = { active: "bg-red-500/20 text-red-400", dormant: "bg-slate-500/20 text-slate-400", disbanded: "bg-slate-600/20 text-slate-500", law_enforcement_action: "bg-blue-500/20 text-blue-400" };

export default function RansomwareGroupCard({ group }) {
  const victims = group.victims_this_month || 0;
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-start justify-between">
        <p className="text-base font-bold text-white">{group.group_name}</p>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_COLOR[group.status] || STATUS_COLOR.dormant} ${group.status === "active" ? "animate-pulse" : ""}`}>{group.status}</span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">🌐 {group.origin_country || "Unknown"}</p>

      <p className="text-xs text-slate-400 mt-3">
        Victims this month: <span className={`font-bold ${victims > 0 ? "text-red-400" : "text-slate-300"}`}>{victims}</span>
      </p>
      <p className="text-xs text-slate-400 mt-1">
        Avg ransom: <span className="text-white font-semibold">{group.avg_ransom_usd ? `$${group.avg_ransom_usd.toLocaleString()}` : "—"}</span>
      </p>

      {group.double_extortion && (
        <span className="inline-block mt-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400">Double Extortion</span>
      )}

      {group.target_sectors && <p className="text-xs text-slate-500 mt-2">Targets: {group.target_sectors}</p>}
    </div>
  );
}