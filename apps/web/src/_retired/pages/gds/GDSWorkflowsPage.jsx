import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Play, Clock, CheckCircle, AlertTriangle, Flame, Lock, FileText, Plus, Network, GitBranch, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import WorkflowDependencyMap from "@/components/gds/WorkflowDependencyMap";
import WorkflowAlertSystem from "@/components/gds/WorkflowAlertSystem";
import WorkflowPerformanceTrends from "@/components/gds/WorkflowPerformanceTrends";

const WORKFLOW_TYPE_COLORS = {
  incident_response: DANGER,
  vulnerability_remediation: HIGH,
  threat_hunting: "#a855f7",
  compliance_audit: LOW,
  cloud_remediation: "#60a5fa",
  executive_reporting: "#fbbf24",
  security_assessment: CYAN,
  devsecops_pipeline: "#14b8a6",
  identity_access_review: "#8b5cf6",
  mssp_client_onboarding: "#ec4899"
};

const STATUS_COLORS = {
  running: CYAN,
  completed: LOW,
  awaiting_approval: HIGH,
  failed: DANGER,
  rolled_back: "#a855f7",
  sla_breached: DANGER
};

export default function GDSWorkflowsPage() {
  const navigate = useNavigate();
  const [workflowTypeFilter, setWorkflowTypeFilter] = useState("all");

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["workflow-metrics"],
    queryFn: () => base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ["workflow-recent-runs"],
    queryFn: () => base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "status", limit: 10 }).then(r => r.data),
    refetchInterval: 15000,
  });

  const m = metrics || {};
  const workflows = m.workflows || {};
  const runs = m.runs || {};
  const approvals = m.approvals || {};
  const sla = m.sla || {};

  const workflowTypeData = Object.entries(workflows.by_type || {}).map(([type, count]) => ({
    name: type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    color: WORKFLOW_TYPE_COLORS[type] || MUTED
  }));

  const recentRunsData = recentRuns?.runs || [];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Workflow Intelligence Engine" }]} />

      {/* Alert System */}
      <WorkflowAlertSystem />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Activity className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Workflow Intelligence Engine</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-008 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>16-stage execution · 10 workflow types · Approval · Retry · Rollback · SLA</span>
          <button
            onClick={() => navigate("/workflows/compare")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
            <GitBranch className="w-4 h-4" />
            Compare
          </button>
          <button
            onClick={() => navigate("/workflows/builder")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Workflows</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{workflows.total ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Runs</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{runs.total ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Completed Runs</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{runs.completed ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Steps Executed</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#60a5fa" }}>{m.steps?.total ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Pending Approvals</p>
          <p className="text-2xl font-black font-mono" style={{ color: approvals.pending > 0 ? HIGH : MUTED }}>{approvals.pending ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>SLA Breaches</p>
          <p className="text-2xl font-black font-mono" style={{ color: sla.breached > 0 ? DANGER : MUTED }}>{sla.breached ?? 0}</p>
        </Card>
      </div>

      {/* Workflow Type Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Workflow Distribution by Type</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Active workflows categorized by type</p>
        </div>
        {workflowTypeData.length === 0 ? (
          <EmptyState icon={FileText} title="No workflow data" description="Workflows will appear here after creation" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={workflowTypeData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis type="number" stroke={MUTED} fontSize={10} />
              <YAxis dataKey="name" type="category" stroke={MUTED} fontSize={9} width={120} />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {workflowTypeData.map((entry, index) => (
                  <rect key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Dependency Map */}
      <WorkflowDependencyMap workflows={[]} />

      {/* Performance Trends */}
      <WorkflowPerformanceTrends />

      {/* Recent Runs Table */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Recent Workflow Runs</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Latest execution activity</p>
        </div>
        {isLoading ? <Skeleton lines={6} /> : recentRunsData.length === 0 ? (
          <EmptyState icon={Activity} title="No runs yet" description="Workflow runs will appear here after execution" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Workflow", "Type", "Status", "Progress", "Steps", "SLA", "Approval", "Created"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentRunsData.map((run, i) => {
                  const statusColor = STATUS_COLORS[run.status] || MUTED;
                  const progress = run.progress_pct || 0;
                  return (
                    <tr key={run.run_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3">
                        <p className="text-white font-bold truncate max-w-[200px]">{run.workflow_name || "Untitled"}</p>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase"
                          style={{ color: WORKFLOW_TYPE_COLORS[run.workflow_type] || MUTED, background: `${WORKFLOW_TYPE_COLORS[run.workflow_type] || MUTED}18`, border: `1px solid ${WORKFLOW_TYPE_COLORS[run.workflow_type] || MUTED}30` }}>
                          {(run.workflow_type || "unknown").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                          style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
                          {run.status || "unknown"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: progress >= 75 ? LOW : progress >= 50 ? CYAN : HIGH }} />
                          </div>
                          <span className="text-[9px] font-bold" style={{ color: TEXT }}>{progress}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>
                        {run.steps_completed ?? 0} / {run.total_steps ?? 0}
                      </td>
                      <td className="py-2 px-3">
                        {run.sla_breached && <Flame className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-2 px-3">
                        {run.approval_pending && <Lock className="w-3.5 h-3.5" style={{ color: HIGH }} />}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>
                        {run.created_date ? new Date(run.created_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}