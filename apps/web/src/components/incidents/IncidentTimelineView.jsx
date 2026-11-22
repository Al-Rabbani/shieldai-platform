import React from "react";

export default function IncidentTimelineView({ events }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No timeline events recorded yet.</p>;
  }
  const sorted = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="space-y-0">
      {sorted.map((e, i) => (
        <div key={e.id || i} className="flex gap-3 pb-4 relative">
          {i < sorted.length - 1 && <span className="absolute left-[27px] top-5 bottom-0 w-px bg-slate-700" />}
          <div className="flex-shrink-0 w-14 text-right">
            <span className="text-[10px] font-mono text-slate-500">{e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
          </div>
          <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
          <div className="flex-1">
            <p className="text-sm text-white font-medium">{e.title}</p>
            {e.description && <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}