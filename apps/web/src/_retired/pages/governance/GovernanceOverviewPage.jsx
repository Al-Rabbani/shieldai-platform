import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList, Scale, AlertTriangle, FileText, Lock, BookOpen, DollarSign } from "lucide-react";

const C = "#00d9ff";
const CARD = "#111827";
const BORDER = "#1a2a3a";
const DANGER = "#ff3b3b";
const SUCCESS = "#00ff88";
const SEV = { critical: "#ff3b3b", high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff" };

const FRAMEWORK_DEFAULTS = [
  { name: "SOC 2", score: 78, color: "#3b9eff" },
  { name: "ISO 27001", score: 65, color: "#a78bfa" },
  { name: "PCI-DSS", score: 42, color: DANGER },
  { name: "GDPR", score: 71, color: "#00d9ff" },
  { name: "HIPAA", score: 55, color: "#ffb83b" },
  { name: "NIST CSF", score: 68, color: "#00ff88" },
];

function SevBadge({ sev }) {
  const color = SEV[sev] || "#64748b";
  return <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color, background: `${color}18` }}>{sev || "—"}</span>;
}

function ComplianceBar({ name, score, color }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-semibold text-white">{name}</span>
        <span className="font-black font-mono" style={{ color: score >= 75 ? SUCCESS : score >= 50 ? "#ffb83b" : DANGER }}>{score}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: score >= 75 ? SUCCESS : score >= 50 ? "#ffb83b" : DANGER }} />
      </div>
    </div>
  );
}

export default function GovernanceOverviewPage() {
  const { data: frameworks = [], isLoading: loadFw } = useQuery({
    queryKey: ["compliance-frameworks"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
    initialData: [], refetchInterval: 60000,
  });
  const { data: violations = [], isLoading: loadViol } = useQuery({
    queryKey: ["policy-violations"],
    queryFn: () => base44.entities.PolicyViolation.list("-detected_at", 100).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });
  const { data: auditLogs = [], isLoading: loadAudit } = useQuery({
    queryKey: ["audit-logs-gov"],
    queryFn: () => base44.entities.AuditLog.list("-timestamp", 50).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });
  const { data: boardReports = [], isLoading: loadReports } = useQuery({
    queryKey: ["board-reports"],
    queryFn: () => base44.entities.BoardRiskReport.list("-created_date", 20).catch(() => []),
    initialData: [],
  });

  // Merge real framework data with defaults
  const displayFrameworks = FRAMEWORK_DEFAULTS.map(def => {
    const real = frameworks.find(f => f.name?.toLowerCase().includes(def.name.toLowerCase()) || f.framework_name?.toLowerCase().includes(def.name.toLowerCase()));
    return { ...def, score: real?.score ?? real?.compliance_score ?? def.score };
  });

  const openViolations = violations.filter(v => v.status === "open" || !v.status).length;
  const critViolations = violations.filter(v => v.severity === "critical").length;

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,217,255,0.1)", border: `1px solid rgba(0,217,255,0.3)` }}>
            <ClipboardList className="w-5 h-5" style={{ color: C }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Governance</h1>
            <p className="text-[9px] font-bold tracking-widest text-slate-500">COMPLIANCE · POLICY · AUDIT · BOARD REPORTS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/governance/violations" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border text-slate-400 hover:text-white transition-all" style={{ borderColor: BORDER }}>
            Violations <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{ background: `${DANGER}20`, color: DANGER }}>{openViolations}</span>
          </Link>
          <Link to="/governance/reports" className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-black"
            style={{ background: `linear-gradient(135deg,${C},#0ea5e9)` }}>
            <FileText className="w-3.5 h-3.5" /> Board Reports
          </Link>
        </div>
      </div>

      {/* Compliance Frameworks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4" style={{ color: C }} />
              <h3 className="text-sm font-bold text-white">Compliance Frameworks</h3>
            </div>
            <Link to="/governance/compliance" className="text-[10px]" style={{ color: C }}>Evidence vault →</Link>
          </div>
          <div className="space-y-4">
            {displayFrameworks.map(f => <ComplianceBar key={f.name} {...f} />)}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 content-start">
          {[
            { label: "Open Violations", value: openViolations, color: DANGER, icon: AlertTriangle, link: "/governance/violations" },
            { label: "Critical Violations", value: critViolations, color: DANGER, icon: AlertTriangle, link: "/governance/violations" },
            { label: "Board Reports", value: boardReports.length, color: C, icon: FileText, link: "/governance/reports" },
            { label: "Audit Events", value: auditLogs.length, color: "#a78bfa", icon: BookOpen, link: "/audit-log" },
          ].map(s => (
            <Link key={s.label} to={s.link}
              className="rounded-xl p-4 block transition-all"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${s.color}40`}
              onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Policy Violations */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: "#ffb83b" }} />
            <h3 className="text-sm font-bold text-white">Policy Violations</h3>
          </div>
          <Link to="/governance/violations" className="text-[10px]" style={{ color: C }}>All violations →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                {["Policy Name", "Framework", "Control ID", "Resource", "Resource Type", "Severity", "Status", "Detected"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadViol ? (
                [...Array(3)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
              ) : violations.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center">
                  <Scale className="w-7 h-7 mx-auto mb-2" style={{ color: SUCCESS }} />
                  <p className="text-sm text-slate-500">No policy violations detected</p>
                </td></tr>
              ) : (
                violations.slice(0, 30).map((v, i) => {
                  const status = v.status || "open";
                  const statusColor = status === "open" ? DANGER : status === "resolved" ? SUCCESS : "#ffb83b";
                  return (
                    <tr key={v.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)`, borderLeft: `2px solid ${SEV[v.severity] || "#64748b"}` }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,217,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0a0e17" : CARD}>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-semibold text-white truncate max-w-48 block">{v.policy_name || v.rule_name || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-400">{v.framework || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-mono" style={{ color: C }}>{v.control_id || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-400 truncate max-w-32 block">{v.resource || v.resource_name || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] capitalize px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{v.resource_type || "—"}</span></td>
                      <td className="px-4 py-2.5"><SevBadge sev={v.severity} /></td>
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] capitalize px-2 py-0.5 rounded" style={{ color: statusColor, background: `${statusColor}18` }}>{status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[9px] text-slate-500">
                        {v.detected_at ? formatDistanceToNow(new Date(v.detected_at), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log + Board Reports side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Audit Log */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: "#a78bfa" }} />
              <h3 className="text-sm font-bold text-white">Audit Log</h3>
            </div>
            <Link to="/audit-log" className="text-[10px]" style={{ color: C }}>Full log →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                  {["Actor", "Action", "Resource Type", "Resource", "Time", "Outcome"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadAudit ? (
                  [...Array(3)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-600">No audit events</td></tr>
                ) : (
                  auditLogs.slice(0, 15).map((log, i) => {
                    const outcome = log.outcome || "success";
                    return (
                      <tr key={log.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)` }}>
                        <td className="px-4 py-2.5"><span className="text-[9px] font-semibold text-white">{log.actor_email?.split("@")[0] || log.actor_id || "System"}</span></td>
                        <td className="px-4 py-2.5"><span className="text-[9px] text-slate-400">{(log.action || "").replace(/_/g, " ")}</span></td>
                        <td className="px-4 py-2.5"><span className="text-[9px] capitalize px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{log.resource_type || "—"}</span></td>
                        <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-400 truncate max-w-28 block">{log.resource_name || "—"}</span></td>
                        <td className="px-4 py-2.5 text-[9px] text-slate-500">
                          {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded capitalize"
                            style={{ color: outcome === "failure" ? DANGER : SUCCESS, background: outcome === "failure" ? "rgba(255,59,59,0.1)" : "rgba(0,255,136,0.08)" }}>
                            {outcome}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Board Reports */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: C }} />
              <h3 className="text-sm font-bold text-white">Board Reports</h3>
            </div>
            <Link to="/governance/reports" className="text-[10px]" style={{ color: C }}>All reports →</Link>
          </div>
          {loadReports ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
          ) : boardReports.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-7 h-7 mx-auto mb-2 text-slate-700" />
              <p className="text-sm text-slate-500">No board reports generated</p>
              <Link to="/governance/reports" className="text-[10px] mt-2 block" style={{ color: C }}>Generate first report →</Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {boardReports.slice(0, 8).map((r, i) => (
                <div key={r.id || i} className="px-5 py-4 flex items-start gap-3 transition-colors"
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,217,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(0,217,255,0.08)", border: `1px solid rgba(0,217,255,0.2)` }}>
                    <FileText className="w-4 h-4" style={{ color: C }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{r.title || r.report_title || `Board Report ${i + 1}`}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[9px] text-slate-500">
                      <span>{r.period || r.report_period || "—"}</span>
                      {r.risk_score != null && <span>Risk: <span className="font-bold" style={{ color: r.risk_score > 70 ? DANGER : "#ffb83b" }}>{r.risk_score}</span></span>}
                      {r.financial_exposure && <span>Exposure: <span className="font-bold" style={{ color: DANGER }}>{r.financial_exposure}</span></span>}
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-600 flex-shrink-0">
                    {r.created_date ? formatDistanceToNow(new Date(r.created_date), { addSuffix: true }) : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}