import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

export default function DarkWebTab({ alerts, onHunt }) {
  if (alerts.length === 0) return <p className="text-sm text-slate-500">No dark web alerts.</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {alerts.map((a, i) => (
        <div key={a.id || i} className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">{a.alert_type}</span>
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[a.severity] || SEV_COLOR.low}`}>{a.severity}</span>
          </div>
          <p className="text-sm font-semibold text-white">{a.title}</p>
          <p className="text-xs text-slate-500 mt-1">Target: {a.target_org} · {a.detected_at ? new Date(a.detected_at).toLocaleString() : "—"}</p>
          <button onClick={() => onHunt(a)} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
            🎯 Hunt This Threat
          </button>
        </div>
      ))}
    </div>
  );
}