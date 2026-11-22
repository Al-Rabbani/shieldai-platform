import React from "react";

export default function IntegrationCard({ icon, name, connected, statusLabel, details, primaryAction, secondaryAction }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-bold text-white">{icon} {name}</p>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${connected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/40 text-slate-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-500"}`} /> {statusLabel}
        </span>
      </div>
      <div className="text-xs text-slate-400 mt-2 space-y-0.5">{details}</div>
      <div className="flex gap-2 mt-3">
        <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700 transition">Test Connection</button>
        <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">{secondaryAction}</button>
      </div>
    </div>
  );
}