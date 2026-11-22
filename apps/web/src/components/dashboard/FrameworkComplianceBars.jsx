import React from "react";

export default function FrameworkComplianceBars({ frameworks }) {
  if (frameworks.length === 0) {
    return <p className="text-xs text-slate-500 py-6 text-center">No compliance checklist items recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {frameworks.map((row) => {
        const color = row.percent >= 80 ? "#10b981" : row.percent >= 50 ? "#f59e0b" : "#ef4444";
        return (
          <div key={row.framework}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-white uppercase">{row.framework}</p>
              <p className="text-[11px] font-mono text-slate-400">
                {row.complete}/{row.total} controls · <span style={{ color }}>{row.percent}%</span>
              </p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#0a0f1e" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${row.percent}%`, background: color }} />
            </div>
            {row.missingEvidence > 0 && (
              <p className="text-[10px] text-amber-400/80 mt-1">{row.missingEvidence} control(s) complete but missing evidence</p>
            )}
          </div>
        );
      })}
    </div>
  );
}