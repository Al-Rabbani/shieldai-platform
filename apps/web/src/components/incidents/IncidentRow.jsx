import React, { useState } from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };
const STATUS_COLOR = { new: "bg-red-500/20 text-red-400", investigating: "bg-orange-500/20 text-orange-400", contained: "bg-yellow-500/20 text-yellow-400", resolved: "bg-emerald-500/20 text-emerald-400" };

export default function IncidentRow({ incident, onActivateAI, onUpdateStatus, busy }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {incident.status === "new" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
        <span className="text-sm font-semibold text-white flex-1 truncate">{incident.title}</span>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[incident.severity] || SEV_COLOR.low}`}>{incident.severity}</span>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_COLOR[incident.status] || STATUS_COLOR.new}`}>{incident.status}</span>
        <span className="text-xs text-slate-500 w-28 truncate">{incident.incident_type}</span>
        <span className="text-xs text-slate-500 w-16">{(incident.affected_assets || []).length} assets</span>
        <span className="text-xs text-slate-500 w-24">{incident.opened_at ? new Date(incident.opened_at).toLocaleDateString() : "—"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
          <p className="text-xs text-slate-300">{incident.description}</p>
          {incident.affected_assets?.length > 0 && <p className="text-xs text-slate-500">Affected: {incident.affected_assets.join(", ")}</p>}
          {incident.mitre_techniques?.length > 0 && <p className="text-xs text-slate-500">MITRE: {incident.mitre_techniques.join(", ")}</p>}
          {incident.kill_chain_stage && <p className="text-xs text-slate-500">Kill Chain Stage: {incident.kill_chain_stage}</p>}
          {incident.business_impact && <p className="text-xs text-slate-500">Business Impact: {incident.business_impact}</p>}
          {incident.assigned_to && <p className="text-xs text-slate-500">Assigned To: {incident.assigned_to}</p>}

          <div className="flex flex-wrap gap-2 pt-2">
            <button disabled={busy} onClick={() => onActivateAI(incident)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition disabled:opacity-50">
              🤖 Activate AI Incident Commander
            </button>
            <button disabled={busy} onClick={() => onUpdateStatus(incident, "contained")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/25 transition disabled:opacity-50">Contain</button>
            <button disabled={busy} onClick={() => onUpdateStatus(incident, "investigating")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30 hover:bg-orange-500/25 transition disabled:opacity-50">Escalate</button>
            <button disabled={busy} onClick={() => onUpdateStatus(incident, "resolved")} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition disabled:opacity-50">Resolve</button>
          </div>
        </div>
      )}
    </div>
  );
}