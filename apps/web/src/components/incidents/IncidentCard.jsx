import React from "react";
import IncidentStatusTracker from "./IncidentStatusTracker";

const BORDER = { critical: "#ef4444", high: "#f97316", resolved: "#22c55e" };
const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };
const STATUS_PILL = {
  investigating: "bg-red-500/20 text-red-400 animate-pulse",
  resolved: "bg-emerald-500/20 text-emerald-400",
  open: "bg-amber-500/20 text-amber-400",
  new: "bg-amber-500/20 text-amber-400",
  contained: "bg-yellow-500/20 text-yellow-400",
};

export default function IncidentCard({ incident, onCommand, onTimeline, onImpact, onTriage }) {
  const border = incident.status === "resolved" ? BORDER.resolved : (BORDER[incident.severity] || BORDER.high);

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${border}` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-bold text-white flex-1">{incident.title}</p>
        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-700/40 text-slate-300">{incident.incident_type}</span>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[incident.severity] || SEV_COLOR.low}`}>{incident.severity}</span>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_PILL[incident.status] || STATUS_PILL.open}`}>{incident.status}</span>
      </div>

      <p className="text-sm font-bold text-red-400 mt-2">${(incident.financial_impact_usd || 0).toLocaleString()} impact</p>

      {incident.kill_chain_stage && <p className="text-xs text-slate-500 mt-1">Kill Chain: {incident.kill_chain_stage}</p>}
      {incident.mitre_techniques?.length > 0 && <p className="text-xs text-slate-500 mt-1">MITRE: {incident.mitre_techniques.join(", ")}</p>}

      <IncidentStatusTracker status={incident.status} />

      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => onCommand(incident)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">🤖 AI Command</button>
        <button onClick={() => onTimeline(incident)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700 transition">📋 Timeline</button>
        <button onClick={() => onImpact(incident)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700 transition">📊 Impact</button>
        {onTriage && (
          <button onClick={(e) => { e.stopPropagation(); onTriage(incident); }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition">⚡ One-Click Triage</button>
        )}
      </div>
    </div>
  );
}