import React from "react";

const RISK_COLOR = { critical: "text-red-400 border-red-500/40", high: "text-orange-400 border-orange-500/40", medium: "text-yellow-400 border-yellow-500/40", low: "text-emerald-400 border-emerald-500/40", info: "text-slate-400 border-slate-500/40" };

export default function AttackSurfaceCards({ assets }) {
  if (assets.length === 0) return <p className="text-sm text-slate-500 p-4">No attack surface assets found.</p>;
  return (
    <div className="grid grid-cols-3 gap-4">
      {assets.map((a, i) => (
        <div key={a.id || i} className={`rounded-xl p-4 border ${RISK_COLOR[a.risk_level]?.split(" ")[1] || "border-slate-700"}`} style={{ background: "#111827" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white truncate">{a.name}</p>
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${RISK_COLOR[a.risk_level]?.split(" ")[0] || "text-slate-400"} bg-white/5`}>{a.risk_level}</span>
          </div>
          <p className="text-[10px] text-slate-500 uppercase mb-2">{a.asset_type}</p>
          {a.is_internet_facing ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">INTERNET-FACING</span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-700/40 text-slate-400">INTERNAL</span>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div><p className="text-slate-500 text-[10px]">Findings</p><p className="text-white font-semibold">{a.finding_count ?? 0}</p></div>
            <div><p className="text-slate-500 text-[10px]">CVEs</p><p className="text-white font-semibold">{a.cve_count ?? 0}</p></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 truncate">Tech: {a.technologies || "—"}</p>
        </div>
      ))}
    </div>
  );
}