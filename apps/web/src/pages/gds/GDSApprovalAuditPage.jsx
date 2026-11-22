import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock3, FileText, Search, Filter, CheckCircle, AlertTriangle, Shield, TrendingUp, Activity, Download } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSApprovalAuditPage() {
  const [filterDecision, setFilterDecision] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [dateRange, setDateRange] = useState("7d");

  const { data: auditRecords } = useQuery({
    queryKey: ["approvals-audit"],
    queryFn: () => base44.entities.ApprovalAuditRecord.list("-created_date", 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: escalations } = useQuery({
    queryKey: ["approvals-escalations"],
    queryFn: () => base44.entities.ApprovalEscalation.list("-notified_at", 20).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: slaRecords } = useQuery({
    queryKey: ["approvals-sla"],
    queryFn: () => base44.entities.ApprovalSLA.list("-deadline", 20).catch(() => []),
    refetchInterval: 30000,
  });

  const audit = auditRecords || [];
  const escalationList = escalations || [];
  const slaList = slaRecords || [];

  const filteredAudit = audit.filter(record => {
    const matchDecision = filterDecision === "all" || record.decision === filterDecision;
    const matchRisk = filterRisk === "all" || record.risk_level === filterRisk;
    const matchLevel = filterLevel === "all" || record.approval_level === filterLevel;
    return matchDecision && matchRisk && matchLevel;
  });

  function formatDuration(ms) {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  }

  function formatSLA(seconds) {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function exportApprovalsAudit() {
    const report = {
      export_date: new Date().toISOString(),
      export_type: "approvals_compliance_report",
      summary: {
        total_audit_records: audit.length,
        total_escalations: escalationList.length,
        total_sla_records: slaList.length
      },
      audit_records: audit.map(r => ({
        stage_number: r.stage_number,
        stage_name: r.stage_name,
        action: r.action,
        actor_id: r.actor_id,
        actor_role: r.actor_role,
        approval_level: r.approval_level,
        decision: r.decision,
        risk_level: r.risk_level,
        input_summary: r.input_summary,
        output_summary: r.output_summary,
        signature_captured: r.signature_captured,
        evidence_attached: r.evidence_attached,
        escalated: r.escalated,
        duration_ms: r.duration_ms,
        correlation_id: r.correlation_id,
        created_date: r.created_date
      })),
      escalations: escalationList.map(e => ({
        escalation_id: e.escalation_id,
        request_id: e.request_id,
        escalation_level: e.escalation_level,
        triggered_by: e.triggered_by,
        original_role: e.original_role,
        escalated_to_role: e.escalated_to_role,
        notified_at: e.notified_at,
        response: e.response,
        sla_breached: e.sla_breached
      })),
      sla_tracking: slaList.map(s => ({
        sla_id: s.sla_id,
        request_id: s.request_id,
        sla_type: s.sla_type,
        sla_seconds: s.sla_seconds,
        deadline: s.deadline,
        status: s.status,
        breached: s.breached,
        breach_duration_seconds: s.breach_duration_seconds,
        escalation_count: s.escalation_count
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `approvals-compliance-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Approval Audit Log" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Clock3 className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Approval Audit & Compliance Trail</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-010 v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportApprovalsAudit} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Download className="w-4 h-4" /> Export All
          </button>
        </div>
        <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>18-stage pipeline audit · Digital signatures · Evidence chain</span>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterDecision} onChange={e => setFilterDecision(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Decisions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Risk</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Levels</option>
            <option value="standard">Standard</option>
            <option value="elevated">Elevated</option>
            <option value="critical">Critical</option>
          </select>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </Card>

      {/* Audit Timeline */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Audit Timeline</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Complete approval pipeline execution history</p>
        </div>
        {filteredAudit.length > 0 ? (
          <div className="space-y-4">
            {filteredAudit.map((record, idx) => (
              <div key={record.id || idx} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                    <span className="text-[10px] font-bold" style={{ color: CYAN }}>{record.stage_number || idx + 1}</span>
                  </div>
                </div>
                <div className="flex-1 pb-4" style={{ borderBottom: idx < filteredAudit.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-white">{record.stage_name || `Stage ${record.stage_number || idx + 1}`}</h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{record.action || "execution"}</span>
                        {record.decision && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${record.decision === "approved" ? "text-green-400" : record.decision === "rejected" ? "text-red-400" : "text-cyan-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{record.decision}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{record.actor_id || "system"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${record.risk_level === "critical" ? "text-red-400" : record.risk_level === "high" ? "text-orange-400" : record.risk_level === "medium" ? "text-yellow-400" : "text-green-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{record.risk_level}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{record.approval_level}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px]" style={{ color: MUTED }}>{record.created_date ? new Date(record.created_date).toLocaleString("en-IE") : "—"}</p>
                      <p className="text-[10px] font-mono" style={{ color: MUTED }}>{formatDuration(record.duration_ms)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Input Summary</p>
                      <p className="font-mono" style={{ color: TEXT }}>{record.input_summary || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Output Summary</p>
                      <p className="font-mono font-bold" style={{ color: CYAN }}>{record.output_summary || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs flex-wrap">
                    {record.signature_captured && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: LOW }}>
                        <CheckCircle className="w-3 h-3" /> Signature Captured
                      </span>
                    )}
                    {record.evidence_attached && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: CYAN }}>
                        <FileText className="w-3 h-3" /> Evidence Attached
                      </span>
                    )}
                    {record.escalated && (
                      <span className="flex items-center gap-1 text-[10px]" style={{ color: DANGER }}>
                        <AlertTriangle className="w-3 h-3" /> Escalated
                      </span>
                    )}
                    {record.correlation_id && (
                      <span className="text-[10px] font-mono" style={{ color: MUTED }}>Correlation: {record.correlation_id.slice(0, 12)}...</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Clock3} title="No audit records" description="Approval audit records will appear here" />
        )}
      </Card>

      {/* Escalations Panel */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Escalations</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Approval escalations and responses</p>
        </div>
        {escalationList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Escalation ID", "Request ID", "Level", "Triggered By", "From Role", "To Role", "Notified At", "Response", "SLA Breach"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {escalationList.map((esc, i) => (
                  <tr key={esc.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{esc.escalation_id ? esc.escalation_id.slice(0, 12) + "..." : "—"}</td>
                    <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{esc.request_id ? esc.request_id.slice(0, 12) + "..." : "—"}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: HIGH, background: `${HIGH}10`, border: `1px solid ${HIGH}30` }}>Level {esc.escalation_level || 1}</span></td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{esc.triggered_by || "system"}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{esc.original_role || "—"}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: CYAN }}>{esc.escalated_to_role || "—"}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{esc.notified_at ? new Date(esc.notified_at).toLocaleString("en-IE") : "—"}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${esc.response === "acknowledged" ? "text-green-400" : "text-red-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{esc.response || "pending"}</span></td>
                    <td className="py-2 px-3">{esc.sla_breached ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={TrendingUp} title="No escalations" description="Escalation records will appear here" />
        )}
      </Card>

      {/* SLA Panel */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">SLA Tracking</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Approval SLA compliance and breaches</p>
        </div>
        {slaList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["SLA ID", "Request ID", "Type", "SLA Duration", "Deadline", "Status", "Breached", "Breach Duration", "Escalations"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slaList.map((sla, i) => {
                  const isBreached = sla.status === "breached";
                  return (
                    <tr key={sla.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{sla.sla_id ? sla.sla_id.slice(0, 12) + "..." : "—"}</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{sla.request_id ? sla.request_id.slice(0, 12) + "..." : "—"}</td>
                      <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{sla.sla_type || "standard"}</span></td>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{formatSLA(sla.sla_seconds)}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{sla.deadline ? new Date(sla.deadline).toLocaleString("en-IE") : "—"}</td>
                      <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${sla.status === "met" ? "text-green-400" : sla.status === "breached" ? "text-red-400" : "text-cyan-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{sla.status || "active"}</span></td>
                      <td className="py-2 px-3">{isBreached ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} /> : <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} />}</td>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: isBreached ? DANGER : MUTED }}>{formatDuration(sla.breach_duration_seconds * 1000)}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{sla.escalation_count || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Clock3} title="No SLA records" description="SLA tracking records will appear here" />
        )}
      </Card>
    </div>
  );
}