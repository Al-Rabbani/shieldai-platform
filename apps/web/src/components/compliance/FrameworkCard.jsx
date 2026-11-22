import React from "react";

const STATUS_COLOR = { compliant: "bg-emerald-500/20 text-emerald-400", partial: "bg-amber-500/20 text-amber-400", non_compliant: "bg-red-500/20 text-red-400", not_started: "bg-slate-500/20 text-slate-400" };

export default function FrameworkCard({ framework, onAnalyze }) {
  const score = framework.score || 0;
  const color = score < 30 ? "#EF4444" : score < 60 ? "#F59E0B" : "#10B981";
  return (
    <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">{framework.name}</p>
          <p className="text-[10px] text-slate-500">{framework.version || "—"}</p>
        </div>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_COLOR[framework.status] || STATUS_COLOR.not_started}`}>{framework.status}</span>
      </div>

      <p className="text-4xl font-black mt-3" style={{ color }}>{score}%</p>
      <div className="h-2 rounded-full bg-slate-800 mt-2">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <span>✅ {framework.passing_count || 0} passing</span>
        <span>❌ {framework.failing_count || 0} failing</span>
        <span>{framework.not_tested_count || 0} untested</span>
      </div>

      <p className="text-[10px] text-slate-600 mt-2">Last assessed: {framework.last_assessed ? new Date(framework.last_assessed).toLocaleDateString() : "—"}</p>

      <button onClick={() => onAnalyze(framework)} className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
        🧠 AI Compliance Analysis
      </button>
    </div>
  );
}