import React from "react";

const STEPS = [
  { key: "new", label: "New" },
  { key: "investigating", label: "Investigating" },
  { key: "contained", label: "Containment" },
  { key: "resolved", label: "Resolved" },
];

export default function IncidentStatusTracker({ status }) {
  const idx = Math.max(0, STEPS.findIndex(s => s.key === status));

  return (
    <div className="flex items-center gap-1 mt-3">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                i < idx ? "bg-emerald-500" : i === idx ? "bg-red-500 animate-pulse" : "bg-slate-700"
              }`}
            />
            <span className={`text-[8px] uppercase font-bold truncate ${i <= idx ? "text-slate-300" : "text-slate-600"}`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <span className={`h-0.5 flex-1 rounded ${i < idx ? "bg-emerald-500" : "bg-slate-700"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}