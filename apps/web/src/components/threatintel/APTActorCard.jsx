import React from "react";

const LEVEL_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-blue-500/20 text-blue-400" };
const FEATURED_ACTORS = ["lockbit", "scattered spider", "volt typhoon"];

export default function APTActorCard({ actor, onAnalyze }) {
  const techniques = actor.mitre_techniques || [];
  const shown = techniques.slice(0, 3);
  const extra = techniques.length - shown.length;
  const featured = FEATURED_ACTORS.some(n => (actor.actor_name || "").toLowerCase().includes(n));

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: featured ? "1px solid #ef4444" : "1px solid #1F2937" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-bold text-white">{actor.actor_name}</p>
          <p className="text-xs text-slate-500 mt-0.5">🌐 {actor.origin_country || "Unknown"}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {featured && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500 text-white animate-pulse">ACTIVE THREAT</span>}
          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${LEVEL_COLOR[actor.threat_level] || LEVEL_COLOR.low}`}>{actor.threat_level}</span>
        </div>
      </div>

      {actor.sophistication && (
        <span className="inline-block mt-2 text-[9px] font-medium uppercase px-2 py-0.5 rounded bg-purple-500/15 text-purple-400">{actor.sophistication.replace(/_/g, " ")}</span>
      )}

      <p className="text-xs text-slate-400 mt-2">Active campaigns: <span className="text-white font-semibold">{actor.active_campaigns ?? 0}</span></p>
      {actor.target_sectors && <p className="text-xs text-slate-500 mt-1">Targets: {actor.target_sectors}</p>}
      <p className="text-[10px] text-slate-600 mt-2">Last seen: {actor.last_seen ? new Date(actor.last_seen).toLocaleDateString() : "—"}</p>

      {shown.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {shown.map((t, i) => (
            <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t}</span>
          ))}
          {extra > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">+{extra} more</span>}
        </div>
      )}

      {onAnalyze && (
        <button onClick={() => onAnalyze(actor)} className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">🤖 AI APT Analysis</button>
      )}
    </div>
  );
}