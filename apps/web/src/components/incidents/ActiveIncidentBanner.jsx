import React from "react";
import { formatDistanceToNow } from "date-fns";

const SEV_COLOR = { critical: "bg-red-500/30 text-red-300", high: "bg-orange-500/30 text-orange-300", medium: "bg-amber-500/30 text-amber-300", low: "bg-blue-500/30 text-blue-300" };

export default function ActiveIncidentBanner({ incident, onCommand, onViewDetails }) {
  if (!incident) return null;
  const mentionsGdpr = /gdpr/i.test(`${incident.title} ${incident.description || ""} ${incident.business_impact || ""}`);

  return (
    <div className="rounded-xl p-4 border-2 border-red-500 bg-red-500/10 animate-pulse-red">
      <p className="text-base font-bold text-red-400">🔴 ACTIVE INCIDENT: {incident.title}</p>
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[incident.severity] || SEV_COLOR.high}`}>{incident.severity}</span>
        <span className="text-xs text-red-300 font-semibold">${(incident.financial_impact_usd || 0).toLocaleString()} exposure</span>
        <span className="text-xs text-slate-400">
          Opened {incident.opened_at ? formatDistanceToNow(new Date(incident.opened_at), { addSuffix: true }) : "—"}
        </span>
      </div>

      {mentionsGdpr && (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-300">
          ⏱ GDPR 72hr Notification Window — ACT NOW
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={() => onCommand(incident)} className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition">🤖 AI Command →</button>
        <button onClick={() => onViewDetails(incident)} className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-700/50 text-slate-200 hover:bg-slate-700 transition">View Details →</button>
      </div>
    </div>
  );
}