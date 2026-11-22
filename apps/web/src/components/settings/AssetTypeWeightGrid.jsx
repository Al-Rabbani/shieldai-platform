import React from "react";
import { ASSET_TYPES } from "@/lib/riskScoring";

export default function AssetTypeWeightGrid({ config, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ASSET_TYPES.map((type) => {
        const value = Number(config[type.weightField] ?? type.defaultWeight);
        const exampleRaw = 60;
        const exampleWeighted = Math.min(100, Math.round(exampleRaw * value));
        return (
          <div key={type.key} className="rounded-lg px-2.5 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-white">{type.label}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">×{value.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={value}
              onChange={(e) => onChange(type.weightField, Number(e.target.value))}
              aria-label={`${type.label} weight`}
              className="w-full mt-1.5 accent-blue-500"
            />
            <p className="text-[9px] text-slate-500 mt-0.5">A raw score of {exampleRaw} becomes {exampleWeighted}</p>
          </div>
        );
      })}
    </div>
  );
}