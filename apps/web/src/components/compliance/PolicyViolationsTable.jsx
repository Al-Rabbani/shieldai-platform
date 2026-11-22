import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

export default function PolicyViolationsTable({ violations, onView }) {
  if (violations.length === 0) return <p className="text-sm text-slate-500">No policy violations found.</p>;
  return (
    <div className="space-y-1.5">
      {violations.map((v, i) => (
        <div key={v.id || i} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-xs" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <span className="text-white col-span-3 truncate">{v.policy_name}</span>
          <span className="text-slate-400">{v.framework || "—"}</span>
          <span className="text-slate-400">{v.control_id || "—"}</span>
          <span className="text-slate-400 col-span-2 truncate">{v.resource || "—"}</span>
          <span className={`font-bold uppercase px-1.5 py-0.5 rounded w-fit ${SEV_COLOR[v.severity] || SEV_COLOR.low}`}>{v.severity}</span>
          <span className="text-slate-400">{v.status}</span>
          <span className="text-slate-500">{v.detected_at ? new Date(v.detected_at).toLocaleDateString() : "—"}</span>
          <button onClick={() => onView(v)} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition justify-self-end">
            View
          </button>
        </div>
      ))}
    </div>
  );
}