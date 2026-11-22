import React from "react";

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

export default function DateRangeFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "#0d1117", border: "1px solid #1F2937" }}>
      {RANGES.map(r => (
        <button
          key={r.days}
          onClick={() => onChange(r.days)}
          className={`text-[10px] font-semibold px-2 py-1 rounded-md transition ${
            value === r.days ? "bg-blue-500 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}