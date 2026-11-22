import React from "react";

const TONE = {
  green: "#10b981",
  blue: "#3b82f6",
  red: "#ef4444",
  amber: "#f59e0b",
  slate: "#64748b",
  violet: "#a855f7",
};

export default function ExecSummaryStrip({ tiles = [], headline }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      {headline && (
        <p className="text-[13px] leading-relaxed text-slate-200">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mr-2 align-middle">
            HEADLINE
          </span>
          {headline}
        </p>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((tile) => {
          const accent = TONE[tile.tone] || TONE.slate;
          return (
            <div
              key={tile.label}
              className="rounded-lg p-3"
              style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${accent}` }}
            >
              <p className="text-[9px] uppercase tracking-wider text-slate-500">{tile.label}</p>
              <p className="text-2xl font-bold font-mono text-white mt-1 leading-none">{tile.value}</p>
              <p className="text-[10px] text-slate-500 mt-1.5">{tile.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}