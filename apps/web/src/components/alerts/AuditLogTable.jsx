import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400", info: "bg-slate-500/20 text-slate-400" };

export default function AuditLogTable({ logs }) {
  if (logs.length === 0) return <p className="text-sm text-slate-500">No recent agent actions.</p>;
  return (
    <div className="space-y-1.5">
      {logs.map((l, i) => (
        <div key={l.id || i} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-xs" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <span className="text-white col-span-2 truncate">{l.actor_email || l.actor_id || "—"}</span>
          <span className="text-slate-300 col-span-4 truncate">{l.action}</span>
          <span className="text-slate-400 col-span-2 truncate">{l.resource_name || l.resource_type || "—"}</span>
          <span className={`font-bold uppercase px-1.5 py-0.5 rounded w-fit ${SEV_COLOR[l.severity] || SEV_COLOR.info}`}>{l.severity || "info"}</span>
          <span className={l.outcome === "failure" ? "text-red-400" : "text-emerald-400"}>{l.outcome || "success"}</span>
          <span className="text-slate-500 col-span-2">{l.timestamp ? new Date(l.timestamp).toLocaleString() : "—"}</span>
        </div>
      ))}
    </div>
  );
}