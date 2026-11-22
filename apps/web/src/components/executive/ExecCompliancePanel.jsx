import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";

const STATUS = {
  compliant: { label: "Compliant", color: "#10b981", icon: CheckCircle2 },
  partial: { label: "Partial", color: "#f59e0b", icon: AlertTriangle },
  non_compliant: { label: "Non-compliant", color: "#ef4444", icon: XCircle },
  not_started: { label: "Not started", color: "#64748b", icon: MinusCircle },
};

const barColor = (score) => (score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444");

export default function ExecCompliancePanel({ frameworks = [], readiness = 0 }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-white">Compliance readiness</p>
          <p className="text-[10px] text-slate-500">Assessed control score per framework{ frameworks.length ? ` · ${frameworks.length} framework${frameworks.length === 1 ? "" : "s"}` : "" }</p>
        </div>
        <span className="text-2xl font-black font-mono" style={{ color: barColor(readiness) }}>{readiness}%</span>
      </div>

      {frameworks.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-6 text-center">No framework assessments recorded yet.</p>
      ) : (
        <div className="space-y-2.5">
          {frameworks.map((framework) => {
            const status = STATUS[framework.status] || STATUS.not_started;
            const StatusIcon = status.icon;
            const score = Math.max(0, Math.min(100, Number(framework.score) || 0));
            return (
              <div key={framework.name}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-slate-200">{framework.name}</span>
                  <span className="flex items-center gap-1 text-[9px]" style={{ color: status.color }}>
                    <StatusIcon size={9} /> {status.label}
                  </span>
                  <span className="ml-auto text-[11px] font-mono text-white">{score}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#0a0f1e" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: barColor(score) }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-600 mt-3">Scores reflect the latest recorded assessment per framework, not an auditor attestation.</p>
    </div>
  );
}