import React from "react";

const LEVEL_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

export default function APTActorsTab({ actors }) {
  if (actors.length === 0) return <p className="text-sm text-slate-500">No APT actors tracked.</p>;
  return (
    <div className="space-y-1.5">
      {actors.map((a, i) => (
        <div key={a.id || i} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-xs" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <span className="text-white col-span-3 truncate">{a.actor_name}</span>
          <span className="text-slate-400 col-span-2">{a.origin_country}</span>
          <span className={`font-bold uppercase px-1.5 py-0.5 rounded w-fit ${LEVEL_COLOR[a.threat_level] || LEVEL_COLOR.low}`}>{a.threat_level}</span>
          <span className="text-slate-400 col-span-4 truncate">{a.target_sectors}</span>
          <span className="text-slate-500 col-span-2">{a.last_seen ? new Date(a.last_seen).toLocaleDateString() : "—"}</span>
        </div>
      ))}
    </div>
  );
}