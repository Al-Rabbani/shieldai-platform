import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

export default function ComplianceAndCIEMColumn({ frameworks, ciemFindings }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-3">📋 Compliance Status</p>
        {frameworks.length === 0 ? <p className="text-xs text-slate-500">No compliance data.</p> : (
          <div className="space-y-2.5">
            {frameworks.map((f, i) => {
              const score = f.score || 0;
              const color = score >= 80 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">{f.name}</span>
                    <span className="font-bold" style={{ color }}>{score}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-3">🪪 CIEM Findings</p>
        {ciemFindings.length === 0 ? <p className="text-xs text-slate-500">No identity risks.</p> : (
          <div className="space-y-2">
            {ciemFindings.slice(0, 5).map((f, i) => (
              <div key={i} className="text-xs border-b border-slate-800 last:border-0 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white truncate flex-1">{f.identity_name}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ml-2 ${SEV_COLOR[f.severity] || SEV_COLOR.low}`}>{f.severity}</span>
                </div>
                <p className="text-slate-500 mt-0.5">{f.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}