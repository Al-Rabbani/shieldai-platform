import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, TrendingUp, AlertTriangle, Clock, CheckCircle, Zap, ArrowUpRight, ArrowDownRight, Timer, Target } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, AnimatedArc } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from "recharts";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS = {
  running: CYAN,
  completed: LOW,
  awaiting_approval: HIGH,
  failed: DANGER,
  rolled_back: "#a855f7",
  sla_breached: DANGER
};

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

export default function GDSWorkflowExecutivePage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("7d");

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["workflow-executive-metrics", timeRange],
    queryFn: () => base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "executive_summary", time_range: timeRange }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ["workflow-recent-runs-exec"],
    queryFn: () => base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "status", limit: 5 }).then(r => r.data),
    refetchInterval: 15000,
  });

  const m = metrics || {};
  const activeWorkflows = m.active_workflows || [];
  const efficiencyMetrics = m.efficiency || {};
  const bottlenecks = m.bottlenecks || [];
  const summary = m.summary || {};

  const workflowTypeData = Object.entries(summary.by_type || {}).map(([type, count]) => ({
    name: type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    color: WORKFLOW_TYPE_COLORS[type] || MUTED
  }));

  const efficiencyTrend = efficiencyMetrics.trend || [];
  const totalEfficiencyGain = efficiencyMetrics.total_gain_hours || 0;
  const avgTimeSaved = efficiencyMetrics.avg_time_saved_pct || 0;

  const bottleneckData = bottlenecks.slice(0, 5).map(b => ({
    name: b.workflow_type?.replace(/_/g, " ") || "Unknown",
    value: b.avg_delay_minutes || 0,
    color: DANGER
  }));

  const activeByStatus = activeWorkflows.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(activeByStatus).map(([status, count]) => ({
    name: status.replace(/_/g, " "),
    value: count,
    color: STATUS_COLORS[status] || MUTED
  }));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Workflow Intelligence Engine" }, { label: "Executive Summary" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Activity className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Executive Summary</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Workflow Intelligence Engine Performance Overview</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-008 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={() => navigate("/workflows")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Activity className="w-4 h-4" />
            Full Dashboard
          </button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton lines={8} />
      ) : (
        <>
          {/* Executive KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Workflows</p>
                  <p className="text-3xl font-black font-mono mt-1" style={{ color: CYAN }}>{summary.total_active ?? 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                  <Activity className="w-5 h-5" style={{ color: CYAN }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" style={{ color: LOW }} />
                <span className="text-[10px] font-bold" style={{ color: LOW }}>+{summary.new_today ?? 0} today</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Efficiency Gain</p>
                  <p className="text-3xl font-black font-mono mt-1" style={{ color: LOW }}>{totalEfficiencyGain}h</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}30` }}>
                  <TrendingUp className="w-5 h-5" style={{ color: LOW }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" style={{ color: LOW }} />
                <span className="text-[10px] font-bold" style={{ color: LOW }}>+{avgTimeSaved}% faster</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Pending Bottlenecks</p>
                  <p className="text-3xl font-black font-mono mt-1" style={{ color: bottlenecks.length > 0 ? HIGH : MUTED }}>{bottlenecks.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: HIGH }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3" style={{ color: MUTED }} />
                <span className="text-[10px] font-bold" style={{ color: MUTED }}>{bottlenecks.reduce((sum, b) => sum + (b.avg_delay_minutes || 0), 0)} min avg delay</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Completion Rate</p>
                  <p className="text-3xl font-black font-mono mt-1" style={{ color: summary.success_rate >= 90 ? LOW : summary.success_rate >= 70 ? MEDIUM : DANGER }}>{summary.success_rate ?? 0}%</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                  <CheckCircle className="w-5 h-5" style={{ color: CYAN }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" style={{ color: MUTED }} />
                <span className="text-[10px] font-bold" style={{ color: MUTED }}>{summary.completed_total ?? 0} completed</span>
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Workflows by Status */}
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Active Workflows by Status</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time workflow execution states</p>
              </div>
              {statusData.length === 0 ? (
                <EmptyState icon={Activity} title="No active workflows" description="Workflows will appear here once started" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {statusData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Efficiency Trend */}
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Efficiency Gain Trend</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Hours saved through automation</p>
              </div>
              {efficiencyTrend.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No efficiency data" description="Efficiency metrics will appear after workflow executions" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={efficiencyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="day" stroke={MUTED} fontSize={10} />
                    <YAxis stroke={MUTED} fontSize={10} />
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Area type="monotone" dataKey="hours_saved" stroke={LOW} fill={`${LOW}20`} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Workflow Distribution */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Workflow Distribution by Type</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Active workflows categorized by type</p>
            </div>
            {workflowTypeData.length === 0 ? (
              <EmptyState icon={Activity} title="No workflow data" description="Workflows will appear here after creation" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={workflowTypeData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis type="number" stroke={MUTED} fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke={MUTED} fontSize={9} width={120} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {workflowTypeData.map((entry, index) => (
                      <rect key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Top Bottlenecks */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Top Bottlenecks</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Workflows with highest average delays</p>
            </div>
            {bottleneckData.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No bottlenecks detected" description="All workflows are performing optimally" />
            ) : (
              <div className="space-y-3">
                {bottleneckData.map((bottleneck, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,59,59,0.05)", border: `1px solid ${DANGER}30` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                        <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{bottleneck.name}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>Avg delay: {bottleneck.value} minutes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(bottleneck.value / 60 * 100, 100)}%`, background: DANGER }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: DANGER }}>{Math.round(bottleneck.value)}m</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Active Workflows */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Recently Active Workflows</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Latest workflow execution activity</p>
            </div>
            {recentRuns?.runs?.length === 0 ? (
              <EmptyState icon={Activity} title="No recent runs" description="Workflow runs will appear here after execution" />
            ) : (
              <div className="space-y-2">
                {(recentRuns?.runs || []).slice(0, 5).map((run, i) => {
                  const statusColor = STATUS_COLORS[run.status] || MUTED;
                  return (
                    <div key={run.run_id || i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                        <div>
                          <p className="text-sm font-bold text-white">{run.workflow_name || "Untitled"}</p>
                          <p className="text-[10px]" style={{ color: MUTED }}>{(run.workflow_type || "unknown").replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] px-2 py-0.5 rounded capitalize" style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
                          {run.status || "unknown"}
                        </span>
                        <span className="text-[10px]" style={{ color: MUTED }}>{run.created_date ? new Date(run.created_date).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}