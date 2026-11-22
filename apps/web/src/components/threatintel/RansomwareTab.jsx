import React from "react";

const LEVEL_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

export default function RansomwareTab({ groups }) {
  if (groups.length === 0) return <p className="text-sm text-slate-500">No ransomware groups tracked.</p>;
  return (
    <div className="space-y-1.5">
      {groups.map((g, i) => (
        <div key={g.id || i} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-xs" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <span className="text-white col-span-3 truncate">{g.group_name}</span>
          <span className="text-slate-400 col-span-2">{g.victims_count ?? 0} victims</span>
          <span className={`font-bold uppercase px-1.5 py-0.5 rounded w-fit ${LEVEL_COLOR[g.threat_level] || LEVEL_COLOR.low}`}>{g.threat_level}</span>
          <span className="text-slate-400 col-span-3 truncate">{g.target_sectors}</span>
          <span className="text-slate-500 col-span-3 truncate">{g.ransomware_family}</span>
        </div>
      ))}
    </div>
  );
}