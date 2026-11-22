import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

export default function ThreatFeedsTab({ feeds }) {
  if (feeds.length === 0) return <p className="text-sm text-slate-500">No threat feed items.</p>;
  return (
    <div className="space-y-1.5">
      {feeds.map((f, i) => (
        <div key={f.id || i} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-xs" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <span className="text-slate-400 col-span-2 uppercase">{f.feed_type}</span>
          <span className="text-white col-span-4 truncate">{f.title}</span>
          <span className={`font-bold uppercase px-1.5 py-0.5 rounded w-fit ${SEV_COLOR[f.severity] || SEV_COLOR.low}`}>{f.severity}</span>
          <span className="text-slate-400 col-span-2">{f.cve_id || f.package_name || "—"}</span>
          <span className="text-slate-500 col-span-3 truncate">{f.source || "—"}</span>
        </div>
      ))}
    </div>
  );
}