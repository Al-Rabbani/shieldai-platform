import React from "react";

export default function CodeRepoDetailCard({ repo }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-white">{repo.full_name || repo.name}</p>
        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">{repo.language || "Unknown"}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1">{repo.team ? `Team: ${repo.team} · ` : ""}{repo.provider}</p>

      <div className="grid grid-cols-4 gap-2 mt-3">
        <div className="text-center rounded-lg p-2" style={{ background: "#0a0f1e" }}>
          <p className="text-lg font-bold text-red-400">{repo.critical_count || 0}</p>
          <p className="text-[9px] text-slate-500 uppercase">Critical</p>
        </div>
        <div className="text-center rounded-lg p-2" style={{ background: "#0a0f1e" }}>
          <p className="text-lg font-bold text-orange-400">{repo.high_count || 0}</p>
          <p className="text-[9px] text-slate-500 uppercase">High</p>
        </div>
        <div className="text-center rounded-lg p-2" style={{ background: "#0a0f1e" }}>
          <p className="text-lg font-bold text-amber-400">{repo.medium_count || 0}</p>
          <p className="text-[9px] text-slate-500 uppercase">Medium</p>
        </div>
        <div className="text-center rounded-lg p-2" style={{ background: "#0a0f1e" }}>
          <p className="text-lg font-bold text-blue-400">{repo.low_count || 0}</p>
          <p className="text-[9px] text-slate-500 uppercase">Low</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-slate-400">
        <p>Tech Debt: <span className="text-white font-semibold">{repo.tech_debt_hours || 0}h</span></p>
        <p>Duplicated Lines: <span className="text-white font-semibold">{repo.duplicated_lines_pct || 0}%</span></p>
        <p>Test Coverage: <span className="text-white font-semibold">{repo.test_coverage_pct || 0}%</span></p>
      </div>
    </div>
  );
}