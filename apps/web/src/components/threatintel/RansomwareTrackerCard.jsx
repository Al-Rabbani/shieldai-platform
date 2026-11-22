import React from "react";

const LEVEL_BADGE = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400" };

export default function RansomwareTrackerCard({ group, onBrief }) {
  const isLockBit = /lockbit/i.test(group.group_name || "");
  return (
    <div className={`rounded-xl p-4 ${isLockBit ? "border-2 border-red-500 animate-pulse-red" : ""}`} style={{ background: "#111827", border: isLockBit ? undefined : "1px solid #1F2937" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-base font-bold text-white">🦅 {group.group_name}</p>
        <div className="flex gap-1.5">
          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse">🔴 {group.status}</span>
          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${LEVEL_BADGE[group.threat_level] || LEVEL_BADGE.medium}`}>{group.threat_level}</span>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-1">Origin: {group.origin_country} | RaaS Model | Double Extortion: {group.double_extortion ? "YES" : "NO"}</p>

      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <p className="text-slate-400">Victims this month: <span className="text-red-400 font-bold">{group.victims_this_month ?? 0}</span></p>
        <p className="text-slate-400">Total tracked: <span className="text-white font-bold">{(group.victims_count ?? 0).toLocaleString()}</span></p>
      </div>
      <p className="text-xs text-slate-400 mt-1">Avg ransom demand: <span className="text-white font-semibold">${(group.avg_ransom_usd || 0).toLocaleString()}</span></p>
      <p className="text-xs text-slate-500 mt-1">Leak site: {group.leak_site || "Unknown"}</p>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {(group.target_sectors || []).map(s => (
          <span key={s} className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">{s}</span>
        ))}
      </div>

      {isLockBit && (
        <p className="text-[11px] font-bold text-red-400 mt-3">⚠️ GDS Relevance: DIRECT TARGET — active incident in progress</p>
      )}

      <div className="flex justify-end gap-2 mt-3">
        <button onClick={() => onBrief(group)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">🤖 AI Threat Brief</button>
        <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700 transition">View IOCs →</button>
      </div>
    </div>
  );
}