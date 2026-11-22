import React, { useMemo } from "react";
import { bandDistribution, bandForScore, bandStyle, weightedScore, baseScoreOf, weightForType, RISK_BANDS } from "@/lib/riskScoring";

export default function RiskBandPreview({ assets, config }) {
  const summary = useMemo(() => {
    const counts = bandDistribution(assets, config);
    const changed = (assets || []).filter((asset) => {
      const next = bandForScore(weightedScore(asset, config), config);
      return asset.risk_band && asset.risk_band !== next;
    }).length;
    const top = [...(assets || [])]
      .sort((a, b) => weightedScore(b, config) - weightedScore(a, config))
      .slice(0, 5);
    return { counts, changed, top };
  }, [assets, config]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {RISK_BANDS.map((band) => (
          <div key={band.key} className="rounded-lg px-2.5 py-2" style={{ background: "#0a0f1e", border: `1px solid ${band.color}40`, borderLeft: `3px solid ${band.color}` }}>
            <p className="text-lg font-bold" style={{ color: band.color }}>{summary.counts[band.key]}</p>
            <p className="text-[10px] text-slate-400">{band.label}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-500">
        {assets.length} asset{assets.length === 1 ? "" : "s"} scored with this model
        {summary.changed > 0 ? ` · ${summary.changed} would move to a different band than currently stored` : ""}
      </p>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1F2937" }}>
        <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-slate-500" style={{ background: "#0f172a" }}>Highest weighted exposure</div>
        {summary.top.length === 0 ? (
          <p className="px-2.5 py-3 text-[11px] text-slate-500">No assets discovered yet.</p>
        ) : (
          summary.top.map((asset) => {
            const score = weightedScore(asset, config);
            const band = bandStyle(bandForScore(score, config));
            return (
              <div key={asset.id} className="flex items-center gap-2 px-2.5 py-1.5 border-t border-slate-800">
                <span className="text-[11px] text-white flex-1 min-w-0 truncate">{asset.name}</span>
                <span className="text-[9px] text-slate-500 capitalize">{asset.type?.replace(/_/g, " ")} ×{weightForType(config, asset.type).toFixed(2)}</span>
                <span className="text-[10px] font-mono text-slate-500">{baseScoreOf(asset)}→<span style={{ color: band.color }}>{score}</span></span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: band.color, background: `${band.color}1a` }}>{band.label}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}