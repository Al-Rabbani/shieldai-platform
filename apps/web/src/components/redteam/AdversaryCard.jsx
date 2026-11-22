import React from "react";

export default function AdversaryCard({ adversary, onSimulate }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #ef4444" }}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-bold text-white">{adversary.emoji} {adversary.name}</p>
        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400">{adversary.severity}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1">{adversary.type} · {adversary.origin}</p>
      {adversary.victims_this_month != null && <p className="text-xs text-red-400 font-semibold mt-1">{adversary.victims_this_month} victims this month</p>}

      <div className="mt-2">
        <p className="text-[9px] text-slate-500 uppercase mb-1">Known Entry Vectors</p>
        <div className="flex flex-wrap gap-1">
          {adversary.entry_vectors.map(v => <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300">{v}</span>)}
        </div>
      </div>

      <div className="mt-2">
        <p className="text-[9px] text-slate-500 uppercase mb-1">Targets</p>
        <div className="flex flex-wrap gap-1">
          {adversary.targets.map(v => <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{v}</span>)}
        </div>
      </div>

      <button onClick={() => onSimulate(adversary)} className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition">
        🎭 Simulate Attack — Auth Required
      </button>
    </div>
  );
}