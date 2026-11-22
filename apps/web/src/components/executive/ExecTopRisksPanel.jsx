import React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

const SEV = {
  critical: { color: "#ef4444", label: "critical" },
  high: { color: "#f97316", label: "high" },
  medium: { color: "#eab308", label: "medium" },
  low: { color: "#3b82f6", label: "low" },
};

function isOverdue(finding) {
  if (finding.sla_breached === true) return true;
  if (!finding.sla_deadline) return false;
  const deadline = new Date(finding.sla_deadline).getTime();
  return Number.isFinite(deadline) && deadline < Date.now();
}

export default function ExecTopRisksPanel({ findings = [] }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-white">Highest current exposures</p>
          <p className="text-[10px] text-slate-500">The findings leadership should know about, by CVSS score.</p>
        </div>
        <Link to="/sla-radar" className="text-[10px] font-bold text-blue-400 hover:text-blue-300">SLA radar →</Link>
      </div>

      {findings.length === 0 ? (
        <p className="text-[11px] text-emerald-400 py-6 text-center">No critical or high findings are open right now.</p>
      ) : (
        <div className="space-y-1.5">
          {findings.map((finding) => {
            const sev = SEV[finding.severity || finding.normalized_severity] || { color: "#64748b", label: "info" };
            const overdue = isOverdue(finding);
            return (
              <div
                key={finding.id}
                className="flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-2"
                style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}
              >
                <span className="text-[9px] font-bold uppercase w-[54px]" style={{ color: sev.color }}>{sev.label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-100 truncate">{finding.title}</p>
                  <p className="text-[9px] text-slate-500 truncate">
                    {finding.asset_name || "unassigned asset"}
                    {finding.owner_team ? ` · ${finding.owner_team}` : ""}
                    {finding.cve_id ? ` · ${finding.cve_id}` : ""}
                  </p>
                </div>
                {overdue && (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-red-300">
                    <Clock size={9} /> SLA missed
                  </span>
                )}
                <span className="text-[11px] font-mono text-slate-300 w-9 text-right">{finding.cvss_score ?? "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}