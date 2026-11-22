import React from "react";
import ComplianceScoreRing from "./ComplianceScoreRing";

const STATUS_COLOR = { compliant: "bg-emerald-500/20 text-emerald-400", partial: "bg-amber-500/20 text-amber-400", non_compliant: "bg-red-500/20 text-red-400", not_started: "bg-slate-500/20 text-slate-400" };

export default function ComplianceScoreCard({ framework, onAnalyze }) {
  return (
    <div className="rounded-2xl p-4 flex-shrink-0 w-64" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-white">{framework.name}</p>
          <p className="text-[10px] text-slate-500">{framework.version || "—"}</p>
        </div>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_COLOR[framework.status] || STATUS_COLOR.not_started}`}>{framework.status}</span>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <ComplianceScoreRing score={framework.score || 0} />
        <div className="text-xs text-slate-400 space-y-1">
          <p className="text-emerald-400 font-semibold">✅ {framework.passing_count || 0} passing</p>
          <p className="text-red-400 font-semibold">❌ {framework.failing_count || 0} failing</p>
          <p className="text-slate-500">{framework.not_tested_count || 0} untested</p>
        </div>
      </div>

      <button onClick={() => onAnalyze(framework)} className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
        🧠 AI Gap Analysis
      </button>
    </div>
  );
}