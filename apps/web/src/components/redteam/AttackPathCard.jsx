import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };

export default function AttackPathCard({ path, onDeepDive }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #ef4444" }}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-white">{path.title}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-red-400">Risk {path.risk_score}</span>
          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[path.severity] || SEV_COLOR.medium}`}>{path.severity}</span>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-2">📍 <span className="text-slate-500">ENTRY:</span> {path.entry_point}</p>
      <p className="text-xs text-slate-400">🎯 <span className="text-slate-500">TARGET:</span> {path.account_name} ({path.provider})</p>

      {path.attack_steps?.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-slate-300">
          {path.attack_steps.map((step, i) => (
            <React.Fragment key={i}>
              <span className="px-2 py-1 rounded bg-slate-800">{step}</span>
              {i < path.attack_steps.length - 1 && <span className="text-slate-600">→</span>}
            </React.Fragment>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-2">💥 <span className="text-slate-500">Blast Radius:</span> {path.blast_radius}</p>
      <p className="text-xs text-red-400 font-semibold mt-1">💰 Financial Impact: ${(path.estimated_financial_impact_usd || 0).toLocaleString()}+</p>

      <button onClick={() => onDeepDive(path)} className="mt-3 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
        🤖 AI Deep Dive
      </button>
    </div>
  );
}