import React from "react";

const FIELD = "w-full px-2.5 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none";

const ROWS = [
  { field: "critical_threshold", label: "Critical at or above", color: "#ef4444" },
  { field: "high_threshold", label: "High at or above", color: "#f97316" },
  { field: "medium_threshold", label: "Medium at or above", color: "#eab308" },
];

export default function RiskBandThresholds({ config, onChange }) {
  return (
    <div className="space-y-2">
      {ROWS.map((row) => (
        <label key={row.field} className="flex items-center gap-2">
          <span className="w-1.5 h-6 rounded-full" style={{ background: row.color }} aria-hidden="true" />
          <span className="flex-1 text-[11px] text-slate-300">{row.label}</span>
          <input
            type="number"
            min="1"
            max="100"
            value={config[row.field]}
            onChange={(e) => onChange(row.field, e.target.value)}
            className={`${FIELD} w-16 text-right`}
            aria-label={row.label}
          />
        </label>
      ))}
      <p className="text-[10px] text-slate-500">
        Anything below medium counts as low. Critical must be the highest value, then high, then medium.
      </p>
    </div>
  );
}