import React from "react";

export default function AgentTelemetryBar({ totalExecutions, avgSuccessRate, mostActive }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Executions</p>
        <p className="text-2xl font-bold text-white mt-1">{totalExecutions == null ? "Unmeasured" : totalExecutions.toLocaleString()}</p>
      </div>
      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Avg Success Rate</p>
        <p className="text-2xl font-bold text-emerald-400 mt-1">{avgSuccessRate == null ? "Unmeasured" : `${avgSuccessRate}%`}</p>
      </div>
      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Most Active Agent</p>
        <p className="text-sm font-bold text-white mt-1 truncate">{mostActive?.display_name || mostActive?.name || "—"}</p>
        <p className="text-[10px] text-slate-500">{mostActive ? `${(mostActive.executions_total || 0).toLocaleString()} executions` : ""}</p>
      </div>
    </div>
  );
}
