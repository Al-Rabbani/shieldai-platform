import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Search, Filter, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Lock, RotateCcw, Flame, Play, FileText, Eye, Download } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { Link } from "react-router-dom";
import WorkflowAlertSystem from "@/components/gds/WorkflowAlertSystem";

const STATUS_COLORS = {
  running: CYAN,
  completed: LOW,
  awaiting_approval: HIGH,
  failed: DANGER,
  rolled_back: "#a855f7",
  sla_breached: DANGER
};

export default function GDSWorkflowRunsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRun, setSelectedRun] = useState(null);
  const [expandedRun, setExpandedRun] = useState(null);

  const { data: metrics } = useQuery({
    queryKey: ["workflow-runs-metrics"],
    queryFn: () => base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "sla_check" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: runsData } = useQuery({
    queryKey: ["workflow-runs-list"],
    queryFn: () => base44.entities.WorkflowRun.list("-created_date", 50).catch(() => []),
  });

  const { data: stepsData } = useQuery({
    queryKey: ["workflow-run-steps", expandedRun],
    queryFn: () => expandedRun ? base44.entities.WorkflowRunStep.filter({ run_id: expandedRun }, "-created_date", 100).catch(() => []) : Promise.resolve([]),
    enabled: !!expandedRun,
  });

  const approveMutation = useMutation({
    mutationFn: async (approvalId) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "approve", approval_id: approvalId });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-runs-metrics"]);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (approvalId) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "reject", approval_id: approvalId });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-runs-metrics"]);
    }
  });

  const runs = runsData || [];
  const filteredRuns = runs.filter(run => {
    if (statusFilter !== "all" && run.status !== statusFilter) return false;
    if (typeFilter !== "all" && run.workflow_type !== typeFilter) return false;
    return true;
  });

  const slaData = metrics || {};
  const pendingApprovals = slaData.pending_approvals || [];

  const formatDuration = (ms) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Workflows", path: "/workflows" }, { label: "Run Dashboard" }]} />

      {/* Alert System */}
      <WorkflowAlertSystem />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Workflow Run Dashboard</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Live execution monitoring with SLA tracking</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
            <input
              placeholder="Search runs..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            {WORKFLOW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </Card>

      {/* SLA Monitor Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">SLA Monitor</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Active</p>
              <p className="text-2xl font-black" style={{ color: CYAN }}>{slaData.active_slas || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Breached</p>
              <p className="text-2xl font-black" style={{ color: DANGER }}>{slaData.breached_count || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>At Risk</p>
              <p className="text-2xl font-black" style={{ color: HIGH }}>{slaData.at_risk_count || 0}</p>
            </div>
          </div>
          {slaData.breached_slas && slaData.breached_slas.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold mb-2" style={{ color: DANGER }}>Breached SLAs</h4>
              <div className="space-y-2">
                {slaData.breached_slas.slice(0, 3).map((sla, idx) => (
                  <div key={idx} className="p-2 rounded-lg" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
                    <p className="text-[10px] font-mono text-white truncate">{sla.sla_id}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>Deadline: {new Date(sla.deadline).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Pending Approvals Panel */}
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: HIGH }} />
            <h3 className="text-sm font-bold text-white">Pending Approvals</h3>
          </div>
          {pendingApprovals.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No pending approvals" description="All workflow steps are approved" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Approval ID", "Run ID", "Step", "Role Required", "Requested", "Actions"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map((approval, idx) => (
                    <tr key={approval.approval_id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{approval.approval_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{approval.run_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3 text-white">#{approval.step_number || "—"}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                          {approval.role_required || "admin"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>
                        {approval.requested_at ? new Date(approval.requested_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveMutation.mutate(approval.approval_id)}
                            disabled={approveMutation.isPending}
                            className="px-2 py-1 rounded text-[9px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
                            style={{ background: `${LOW}15`, border: `1px solid ${LOW}30`, color: LOW }}>
                            Approve
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(approval.approval_id)}
                            disabled={rejectMutation.isPending}
                            className="px-2 py-1 rounded text-[9px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
                            style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER }}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Runs Table */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Workflow Runs</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{filteredRuns.length} runs found</p>
        </div>
        {filteredRuns.length === 0 ? (
          <EmptyState icon={Activity} title="No workflow runs" description="Runs will appear here after execution" />
        ) : (
          <div className="space-y-3">
            {filteredRuns.map((run, idx) => (
              <div key={run.run_id || idx}>
                <div
                  className="p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    background: expandedRun === run.run_id ? `${CYAN}05` : "rgba(255,255,255,0.02)",
                    borderColor: expandedRun === run.run_id ? CYAN + "40" : BORDER,
                    borderLeftWidth: 4,
                    borderLeftColor: STATUS_COLORS[run.status] || MUTED
                  }}
                  onClick={() => setExpandedRun(expandedRun === run.run_id ? null : run.run_id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${STATUS_COLORS[run.status] || MUTED}20`, border: `1px solid ${STATUS_COLORS[run.status] || MUTED}30` }}>
                        <Activity className="w-4 h-4" style={{ color: STATUS_COLORS[run.status] || MUTED }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-white truncate">{run.run_id?.slice(0, 20)}...</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
                            run.status === "completed" ? "text-emerald-400" :
                            run.status === "running" ? "text-blue-400" :
                            run.status === "failed" ? "text-red-400" : "text-slate-400"
                          }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                            {run.status || "unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          <span style={{ color: MUTED }}>Workflow: <span style={{ color: TEXT }}>{run.workflow_name || "Unknown"}</span></span>
                          <span style={{ color: MUTED }}>Steps: <span style={{ color: TEXT }}>{run.steps_completed || 0}/{run.total_steps || 0}</span></span>
                          <span style={{ color: MUTED }}>Duration: <span style={{ color: TEXT }}>{formatDuration(run.duration_ms)}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {run.sla_breached && <Flame className="w-4 h-4" style={{ color: DANGER }} />}
                      {run.approval_pending && <Lock className="w-4 h-4" style={{ color: HIGH }} />}
                      {run.rollback_executed && <RotateCcw className="w-4 h-4" style={{ color: "#a855f7" }} />}
                      <Link
                        to={`/workflows/history/${run.run_id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                        style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                        <Eye className="w-3.5 h-3.5" />
                        View History
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Expanded Steps */}
                {expandedRun === run.run_id && stepsData && stepsData.length > 0 && (
                  <div className="mt-3 ml-11 space-y-2">
                    <h4 className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Execution Steps</h4>
                    {stepsData.map((step, stepIdx) => (
                      <div key={step.id || stepIdx} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-white">Step {step.step_number || stepIdx + 1}: {step.step_name || "Untitled"}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{step.status || "pending"}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            {step.fn && <span className="font-mono" style={{ color: TEXT }}>{step.fn}</span>}
                            <span style={{ color: MUTED }}>Duration: {formatDuration(step.duration_ms)}</span>
                            {step.retry_count > 0 && <span style={{ color: HIGH }}>Retries: {step.retry_count}</span>}
                          </div>
                        </div>
                        {step.output_summary && (
                          <p className="text-[10px] mt-2" style={{ color: MUTED }}>{step.output_summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const WORKFLOW_TYPES = [
  { value: "incident_response", label: "Incident Response", icon: "🔴" },
  { value: "vulnerability_remediation", label: "Vulnerability Remediation", icon: "🔧" },
  { value: "threat_hunting", label: "Threat Hunting", icon: "🕵️" },
  { value: "compliance_audit", label: "Compliance Audit", icon: "✅" },
  { value: "cloud_remediation", label: "Cloud Remediation", icon: "☁️" },
  { value: "executive_reporting", label: "Executive Reporting", icon: "📊" },
  { value: "security_assessment", label: "Security Assessment", icon: "🛡️" },
  { value: "devsecops_pipeline", label: "DevSecOps Pipeline", icon: "💻" },
  { value: "identity_access_review", label: "Identity Access Review", icon: "🔐" },
  { value: "mssp_client_onboarding", label: "MSSP Client Onboarding", icon: "🏢" }
];