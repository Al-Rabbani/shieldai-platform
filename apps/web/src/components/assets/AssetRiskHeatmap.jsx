import React from "react";

function riskColor(score) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

export default function AssetRiskHeatmap({ assets, onSelect }) {
  if (assets.length === 0) return null;
  const sorted = [...assets].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cloud Resource Risk Heatmap</p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#22c55e" }} /> Low</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#eab308" }} /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#f97316" }} /> High</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#ef4444" }} /> Critical</span>
        </div>
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))" }}>
        {sorted.map((a) => {
          const score = a.risk_score || 0;
          const color = riskColor(score);
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              title={`${a.name} · Risk ${score}`}
              className="aspect-square rounded-md flex items-center justify-center text-[10px] font-bold text-white/90 transition-transform hover:scale-110 hover:z-10 relative"
              style={{ background: color, opacity: 0.35 + (score / 100) * 0.65 }}
            >
              {score}
            </button>
          );
        })}
      </div>
    </div>
  );
}