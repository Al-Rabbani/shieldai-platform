import React from "react";

const BORDER = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#3b82f6" };
const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };

export default function ThreatFeedCard({ feed, onBrief }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${BORDER[feed.severity] || BORDER.low}` }}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_COLOR[feed.severity] || SEV_COLOR.low}`}>{feed.severity}</span>
        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-700/40 text-slate-300">{feed.feed_type?.replace(/_/g, " ")}</span>
        {feed.affects_you && (
          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/30 text-red-300 animate-pulse">⚠️ AFFECTS GDS</span>
        )}
      </div>

      <p className="text-sm font-bold text-white">{feed.title}</p>
      {feed.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{feed.description}</p>}

      {feed.affects_you && feed.action_required && (
        <div className="mt-2 rounded-lg px-3 py-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300">
          ⚡ Action Required: {feed.action_required}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {feed.source && <span className="px-2 py-0.5 rounded bg-slate-800">{feed.source}</span>}
          <span>{feed.published_at ? new Date(feed.published_at).toLocaleDateString() : "—"}</span>
        </div>
        <button onClick={() => onBrief(feed)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
          🧠 AI Brief
        </button>
      </div>
    </div>
  );
}