import React from "react";

export default function IncidentStatusChips({ incidents }) {
  const investigating = incidents.filter(i => i.status === "investigating" || i.status === "new" || i.status === "open").length;
  const contained = incidents.filter(i => i.status === "contained").length;
  const resolved = incidents.filter(i => i.status === "resolved").length;

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 ${investigating > 0 ? "animate-pulse" : ""}`}>
        Investigating {investigating}
      </span>
      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400">Contained {contained}</span>
      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Resolved {resolved}</span>
    </div>
  );
}