import React from "react";

function Tile({ children, border }) {
  return (
    <div className="rounded-2xl p-4 flex-1 min-w-0" style={{ background: "#111827", border: `1px solid ${border || "#1F2937"}` }}>
      {children}
    </div>
  );
}

export default function HeroMetrics({ risk, criticalFindings, cloudCritical, cloudTotal, complianceAvg, activeIncidents }) {
  return (
    <div className="grid grid-cols-5 gap-4">
      <Tile border="#10B98150">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Global Risk Score</p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-4xl font-black text-emerald-400">{risk?.overall_score ?? "—"}</span>
          <span className="text-lg font-bold text-emerald-400 mb-0.5">{risk?.grade ?? ""}</span>
        </div>
        <p className="text-emerald-400 text-xs mt-1">↗ {risk?.trend || "stable"}</p>
      </Tile>

      <Tile border={criticalFindings > 0 ? "#EF444450" : "#1F2937"}>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Critical Findings</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-4xl font-black text-white">{criticalFindings}</span>
          {criticalFindings > 0 && <span className="text-[10px] bg-red-500/20 text-red-400 rounded-full px-2 py-0.5">OPEN</span>}
        </div>
      </Tile>

      <Tile border="#F59E0B50">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Cloud Critical</p>
        <p className="text-4xl font-black text-amber-400 mt-1">{cloudCritical}</p>
        <p className="text-xs text-slate-500 mt-1">of {cloudTotal} total</p>
      </Tile>

      <Tile border={complianceAvg < 50 ? "#EF444450" : "#1F2937"}>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Compliance Avg</p>
        <p className={`text-4xl font-black mt-1 ${complianceAvg < 50 ? "text-red-400" : "text-emerald-400"}`}>{complianceAvg}%</p>
        <div className="h-1.5 rounded-full bg-slate-800 mt-2">
          <div className={`h-full rounded-full ${complianceAvg < 50 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${complianceAvg}%` }} />
        </div>
      </Tile>

      <Tile border={activeIncidents > 0 ? "#EF444450" : "#1F2937"}>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Active Incidents</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-4xl font-black text-white">{activeIncidents}</span>
          {activeIncidents > 0 && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
        </div>
      </Tile>
    </div>
  );
}