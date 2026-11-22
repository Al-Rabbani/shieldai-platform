import React from "react";
import { formatDistanceToNow } from "date-fns";

const TYPE_COLOR = { ransomware_mention: "bg-red-500/20 text-red-400", credential_leak: "bg-orange-500/20 text-orange-400", data_breach: "bg-purple-500/20 text-purple-400", threat_actor_mention: "bg-amber-500/20 text-amber-400" };
const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };

export default function DarkWebAlertCard({ alert, onInvestigate }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${TYPE_COLOR[alert.alert_type] || "bg-slate-500/20 text-slate-400"}`}>{alert.alert_type?.replace(/_/g, " ")}</span>
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[alert.severity] || SEV_COLOR.low}`}>{alert.severity}</span>
      </div>
      <p className="text-sm font-bold text-white">{alert.title}</p>
      {alert.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{alert.description}</p>}

      <div className="flex items-center gap-2 flex-wrap mt-3 text-[10px] text-slate-500">
        {alert.target_org && <span className="px-2 py-0.5 rounded bg-slate-800">🎯 {alert.target_org}</span>}
        {alert.source && <span className="px-2 py-0.5 rounded bg-slate-800">{alert.source}</span>}
        <span>{alert.detected_at ? formatDistanceToNow(new Date(alert.detected_at), { addSuffix: true }) : "—"}</span>
      </div>

      <button onClick={() => onInvestigate(alert)} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
        🧠 AI Investigation
      </button>
    </div>
  );
}