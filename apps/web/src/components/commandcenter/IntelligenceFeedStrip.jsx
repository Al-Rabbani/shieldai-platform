import React from "react";
import { formatDistanceToNow } from "date-fns";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };

export default function IntelligenceFeedStrip({ feeds }) {
  if (!feeds?.length) return null;

  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Intelligence Feed</p>
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
        {feeds.map(f => (
          <div key={f.id} className="flex-shrink-0 w-64 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[f.severity] || SEV_COLOR.low}`}>{f.severity}</span>
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400">Affects GDS</span>
            </div>
            <p className="text-xs font-medium text-white line-clamp-2">{f.title}</p>
            <p className="text-[10px] text-slate-500 mt-1">{f.detected_at ? formatDistanceToNow(new Date(f.detected_at), { addSuffix: true }) : "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}