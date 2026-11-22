import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, FolderOpen, FileBarChart, ArrowRight, CheckCircle2 } from "lucide-react";
import ScoreGauge from "@/components/shared/ScoreGauge";
import { FrameworkBadge, SeverityBadge } from "@/components/shared/PillarBadge";

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

function complianceStatus(score) {
  if (score >= 90) return { label: "Compliant", color: "#16a34a", icon: "✅" };
  if (score >= 70) return { label: "Partial", color: "#d97706", icon: "⚠️" };
  if (score > 0) return { label: "Non-Compliant", color: "#dc2626", icon: "❌" };
  return { label: "Not Started", color: "#475569", icon: "—" };
}

export default function GovernanceOverview() {
  const { data: frameworks = [] } = useQuery({ queryKey: ["gov-frameworks"], queryFn: () => base44.entities.ComplianceFramework.list("-created_date", 20) });
  const { data: violations = [] } = useQuery({ queryKey: ["gov-violations"], queryFn: () => base44.entities.PolicyViolation.list("-detected_at", 100) });
  const { data: evidence = [] } = useQuery({ queryKey: ["gov-evidence"], queryFn: () => base44.entities.EvidencePack.list("-created_date", 100) });
  const { data: reports = [] } = useQuery({ queryKey: ["gov-reports"], queryFn: () => base44.entities.AuditReport.list("-created_date", 20) });

  const avgScore = frameworks.length > 0
    ? Math.round(frameworks.reduce((s, f) => s + (f.score || 0), 0) / frameworks.length)
    : 0;
  const openViolations = violations.filter(v => v.status === "open").length;
  const recentViolations = [...violations].sort((a, b) => new Date(b.detected_at || 0) - new Date(a.detected_at || 0)).slice(0, 5);

  return (
    <div className="min-h-screen -m-6 p-6 space-y-6" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-mono">GOVERNANCE OVERVIEW</h1>
            <p className="text-[11px] text-slate-500">Compliance, policy enforcement & audit management</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Compliance Score", value: `${avgScore}%`, color: "#6366f1", icon: <Shield className="w-4 h-4" />, sublabel: `${frameworks.length} frameworks` },
          { label: "Open Violations", value: openViolations, color: "#dc2626", icon: <AlertTriangle className="w-4 h-4" />, sublabel: "policy breaches", pulse: openViolations > 0 },
          { label: "Evidence Items", value: evidence.length, color: "#d97706", icon: <FolderOpen className="w-4 h-4" />, sublabel: "collected" },
          { label: "Audit Reports", value: reports.length, color: "#0891b2", icon: <FileBarChart className="w-4 h-4" />, sublabel: "generated" },
        ].map(({ label, value, color, icon, sublabel, pulse }) => (
          <div key={label} className="rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ color }}>{icon}</div>
              {pulse && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />}
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-mono">{label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{sublabel}</p>
          </div>
        ))}
      </div>

      {/* Framework grid */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded bg-indigo-500 inline-block" />
          Compliance Frameworks
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {frameworks.map(fw => {
            const score = fw.score || 0;
            const status = complianceStatus(score);
            const daysToAudit = daysUntil(fw.next_audit_date);
            const auditSoon = daysToAudit != null && daysToAudit >= 0 && daysToAudit <= 30;
            return (
              <div key={fw.id} className="rounded-xl p-5 card-hover" style={{ background: "#161b22", border: "1px solid #30363d" }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FrameworkBadge framework={fw.name} />
                      <span className="text-xs font-semibold text-white">{fw.version || ""}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Owner: {fw.owner || "—"}</p>
                    {auditSoon ? (
                      <p className="text-[10px] text-amber-400 mt-0.5">⚠️ Audit in {daysToAudit} days</p>
                    ) : fw.next_audit_date ? (
                      <p className="text-[10px] text-slate-600 mt-0.5">Next audit: {new Date(fw.next_audit_date).toLocaleDateString()}</p>
                    ) : null}
                  </div>
                  <ScoreGauge score={score} size={72} strokeWidth={7} />
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[10px] font-semibold" style={{ color: status.color }}>{status.icon} {status.label}</span>
                </div>

                <div className="flex gap-3 text-[10px] mb-4">
                  <span className="px-2 py-0.5 rounded font-mono" style={{ color: "#16a34a", background: "rgba(22,163,74,0.1)" }}>✅ {fw.passing_controls || 0} Pass</span>
                  <span className="px-2 py-0.5 rounded font-mono" style={{ color: "#dc2626", background: "rgba(220,38,38,0.1)" }}>❌ {fw.failing_controls || 0} Fail</span>
                  <span className="px-2 py-0.5 rounded font-mono" style={{ color: "#64748b", background: "rgba(100,116,139,0.1)" }}>❓ {fw.not_tested_controls || 0} N/T</span>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-600">
                    {fw.last_assessed ? `Last: ${new Date(fw.last_assessed).toLocaleDateString()}` : "Not assessed"}
                  </p>
                  <Link to={`/governance/compliance`}
                    className="flex items-center gap-1 text-[11px] font-semibold transition-colors hover:text-indigo-300"
                    style={{ color: "#6366f1" }}>
                    View Details <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
          {frameworks.length === 0 && (
            <div className="col-span-3 py-16 text-center" style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 12 }}>
              <Shield className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-600">No compliance frameworks configured</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Violations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1 h-4 rounded bg-red-500 inline-block" />
            Recent Policy Violations
          </h2>
          <Link to="/governance/violations" className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Severity", "Policy Name", "Framework", "Resource", "Status", "Detected"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentViolations.map((v, i) => (
                <tr key={v.id} style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                  className="hover:bg-indigo-500/5 transition-colors">
                  <td className="px-4 py-3"><SeverityBadge severity={v.severity} /></td>
                  <td className="px-4 py-3"><span className="text-xs text-white">{v.policy_name || v.title || "—"}</span></td>
                  <td className="px-4 py-3"><FrameworkBadge framework={v.framework} size="xs" /></td>
                  <td className="px-4 py-3"><span className="text-[11px] font-mono text-slate-400 truncate max-w-xs block">{v.resource || "—"}</span></td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded capitalize"
                      style={{
                        color: v.status === "open" ? "#dc2626" : v.status === "resolved" ? "#16a34a" : "#d97706",
                        background: v.status === "open" ? "rgba(220,38,38,0.1)" : v.status === "resolved" ? "rgba(22,163,74,0.1)" : "rgba(217,119,6,0.1)"
                      }}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="text-[11px] text-slate-500">{v.detected_at ? new Date(v.detected_at).toLocaleDateString() : "—"}</span></td>
                </tr>
              ))}
              {recentViolations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-600 text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                    No policy violations — all clear!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}