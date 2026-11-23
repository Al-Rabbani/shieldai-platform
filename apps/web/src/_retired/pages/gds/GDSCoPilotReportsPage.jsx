import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bot, Activity, CheckCircle, Clock, AlertTriangle, Users, Zap, Shield, TrendingUp, Award, Target, BarChart3, Star, FileText, Calendar, Bell, ArrowLeft, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, COPILOT_PURPLE, COPILOT_ORANGE, COPILOT_GOLD, COPILOT_TEAL, BORDER, MUTED, TEXT, AGENT_FLEET, AGENT_TIERS } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

// ─── Agent Drill-Down View ────────────────────────────────────────────────────
function AgentDrillDown({ agentName, agentRole, onBack }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: tasks = [] } = useQuery({
    queryKey: ["agent-tasks-drilldown", agentName],
    queryFn: () => base44.entities.CopilotTask.list("-created_date", 200).catch(() => []),
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ["agent-assignments-drilldown", agentName],
    queryFn: () => base44.entities.CopilotAgentAssignment.filter({ agent_name: agentName }, "-created_date", 100).catch(() => []),
  });

  const filteredAssignments = statusFilter === "all" ? assignments : assignments.filter(a => a.status === statusFilter);
  const completed = assignments.filter(a => a.status === "completed").length;
  const failed = assignments.filter(a => a.status === "failed").length;
  const successRate = assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0;
  const totalEvidence = assignments.reduce((sum, a) => sum + (a.evidence_produced || 0), 0);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition" style={{ color: COPILOT_ELECTRIC }}>
        <ArrowLeft className="w-4 h-4" /> Back to All Agents
      </button>
      <div className="mb-6">
        <h2 className="text-xl font-black text-white">{agentName}</h2>
        <p className="text-xs mt-1 font-semibold uppercase" style={{ color: MUTED }}>{agentRole?.replace(/_/g, " ")}</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <CopilotStat label="Total Tasks" value={assignments.length} color={COPILOT_BLUE} />
        <CopilotStat label="Success Rate" value={`${successRate}%`} color={successRate >= 80 ? COPILOT_GREEN : successRate >= 50 ? COPILOT_AMBER : COPILOT_RED} />
        <CopilotStat label="Failed" value={failed} color={failed > 0 ? COPILOT_RED : COPILOT_GREEN} />
        <CopilotStat label="Evidence Produced" value={totalEvidence} color={COPILOT_PURPLE} />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-bold" style={{ color: MUTED }}>Filter by status:</span>
        {["all", "completed", "running", "failed", "assigned"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all capitalize"
            style={{
              background: statusFilter === s ? `${COPILOT_ELECTRIC}20` : "rgba(255,255,255,0.04)",
              border: `1px solid ${statusFilter === s ? COPILOT_ELECTRIC : BORDER}`,
              color: statusFilter === s ? COPILOT_ELECTRIC : MUTED,
            }}>{s === "all" ? "All" : s}</button>
        ))}
        <span className="ml-auto text-xs" style={{ color: MUTED }}>{filteredAssignments.length} tasks</span>
      </div>

      <div style={COPILOT_CARD}>
        <div className="divide-y" style={{ borderColor: BORDER }}>
          {filteredAssignments.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: MUTED }}>No task history found for this filter.</div>
          ) : filteredAssignments.map(a => (
            <div key={a.id} className="flex items-start gap-3 p-4">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                a.status === "completed" ? "bg-emerald-500" : a.status === "failed" ? "bg-red-500" : a.status === "running" ? "bg-blue-500" : "bg-muted-foreground"
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{a.task_description || "Task"}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-[10px] capitalize px-1.5 py-0.5 rounded font-bold"
                    style={{ background: a.priority === "critical" ? `${COPILOT_RED}20` : a.priority === "high" ? `${COPILOT_AMBER}20` : "rgba(255,255,255,0.06)", color: a.priority === "critical" ? COPILOT_RED : a.priority === "high" ? COPILOT_AMBER : MUTED }}>
                    {a.priority || "normal"}
                  </span>
                  {a.evidence_produced > 0 && <span className="text-[10px]" style={{ color: MUTED }}>📎 {a.evidence_produced} evidence</span>}
                  {a.duration_ms > 0 && <span className="text-[10px]" style={{ color: MUTED }}>⏱ {a.duration_ms}ms</span>}
                  {a.was_lead && <span className="text-[10px] text-amber-400">★ Lead Agent</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${
                  a.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : a.status === "failed" ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"
                }`}>{a.status}</span>
                <p className="text-[10px] mt-1" style={{ color: MUTED }}>{a.created_date ? new Date(a.created_date).toLocaleDateString() : ""}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GDSCoPilotReportsPage() {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskAgentFilter, setTaskAgentFilter] = useState("all");

  const { data: assignments = [] } = useQuery({ 
    queryKey: ["copilot-agents"], 
    queryFn: () => base44.entities.CopilotAgentAssignment.list("-started_at", 500).catch(() => []) 
  });
  const { data: executions = [] } = useQuery({ 
    queryKey: ["copilot-executions"], 
    queryFn: () => base44.entities.CopilotExecution.list("-started_at", 500).catch(() => []) 
  });
  const { data: approvals = [] } = useQuery({ 
    queryKey: ["copilot-approvals"], 
    queryFn: () => base44.entities.CopilotApproval.list("-decided_at", 500).catch(() => []) 
  });
  const { data: tasks = [] } = useQuery({ 
    queryKey: ["copilot-tasks"], 
    queryFn: () => base44.entities.CopilotTask.list("-created_date", 500).catch(() => []) 
  });
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["copilot-critical-alerts"],
    queryFn: () => base44.entities.CopilotAuditLog.filter({ event_type: "task_completed" }, "-created_date", 50).catch(() => []),
    refetchInterval: 15000,
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const failedTasks = tasks.filter(t => t.status === "failed").length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalApprovals = approvals.length;
  const approvedCount = approvals.filter(a => a.status === "approved").length;
  const approvalRate = totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0;

  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter(e => e.status === "completed").length;
  const executionSuccessRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0;

  const threatDecisions = approvals.filter(a => 
    a.status === "approved" && (a.risk_level === "high" || a.risk_level === "critical")
  ).length;

  const agentPerformance = useMemo(() => {
    return assignments.reduce((acc, a) => {
      if (!acc[a.agent_name]) {
        acc[a.agent_name] = { name: a.agent_name, role: a.agent_role, total: 0, completed: 0, failed: 0, evidence: 0 };
      }
      acc[a.agent_name].total++;
      if (a.status === "completed") acc[a.agent_name].completed++;
      if (a.status === "failed") acc[a.agent_name].failed++;
      acc[a.agent_name].evidence += a.evidence_produced || 0;
      return acc;
    }, {});
  }, [assignments]);

  const topAgents = Object.values(agentPerformance)
    .map(a => ({ ...a, successRate: a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0 }))
    .sort((a, b) => b.successRate - a.successRate || b.completed - a.completed)
    .slice(0, 5);

  const allAgentsCompletionData = useMemo(() => {
    return AGENT_FLEET.map(agent => {
      const perf = agentPerformance[agent.name] || { total: 0, completed: 0 };
      const tier = AGENT_TIERS[agent.tier] || AGENT_TIERS.specialist;
      return {
        name: agent.name.split(" ").slice(2).join(" ") || agent.name,
        completionRate: perf.total > 0 ? Math.round((perf.completed / perf.total) * 100) : 0,
        total: perf.total,
        completed: perf.completed,
        tier: agent.tier,
        tierColor: tier.color,
        tierLabel: tier.label,
      };
    }).sort((a, b) => b.completionRate - a.completionRate || b.total - a.total);
  }, [agentPerformance]);

  const uniqueAgentNames = useMemo(() => [...new Set(assignments.map(a => a.agent_name).filter(Boolean))].sort(), [assignments]);

  const filteredAssignments = useMemo(() => assignments.filter(a => {
    if (taskStatusFilter !== "all" && a.status !== taskStatusFilter) return false;
    if (taskAgentFilter !== "all" && a.agent_name !== taskAgentFilter) return false;
    return true;
  }), [assignments, taskStatusFilter, taskAgentFilter]);

  const getBarColor = (tier, rate) => {
    if (rate >= 80) return COPILOT_GREEN;
    if (rate >= 60) return COPILOT_BLUE;
    if (rate >= 40) return COPILOT_AMBER;
    if (rate >= 20) return COPILOT_ORANGE;
    return COPILOT_RED;
  };

  if (selectedAgent) {
    return (
      <div style={COPILOT_PAGE_BG}>
        <AgentDrillDown agentName={selectedAgent.name} agentRole={selectedAgent.role} onBack={() => setSelectedAgent(null)} />
      </div>
    );
  }

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Performance Reports" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">AGENT PERFORMANCE REPORTS</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v8.0 · 35 AGENTS · PERFORMANCE ANALYTICS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="mb-6 flex items-center gap-2">
        {["7d", "30d", "90d", "all"].map(range => (
          <button key={range} onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${timeRange === range ? 'ring-2' : ''}`}
            style={{ 
              background: timeRange === range ? `${COPILOT_ELECTRIC}20` : "rgba(255,255,255,0.05)", 
              border: `1px solid ${timeRange === range ? COPILOT_ELECTRIC : BORDER}`, 
              color: timeRange === range ? COPILOT_ELECTRIC : MUTED 
            }}>
            {range === "all" ? "All Time" : range}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <CopilotStat label="Task Completion" value={`${taskCompletionRate}%`} sub={`${completedTasks}/${totalTasks}`} color={COPILOT_GREEN} />
        <CopilotStat label="Approval Rate" value={`${approvalRate}%`} sub={`${approvedCount}/${totalApprovals}`} color={COPILOT_BLUE} />
        <CopilotStat label="Execution Success" value={`${executionSuccessRate}%`} sub={`${successfulExecutions}/${totalExecutions}`} color={COPILOT_PURPLE} />
        <CopilotStat label="Threat Decisions" value={threatDecisions} sub="High/Critical approved" color={COPILOT_RED} />
        <CopilotStat label="Active Agents" value={Object.keys(agentPerformance).length} sub="Total agents" color={COPILOT_AMBER} />
      </div>

      {/* 35 Agents Bar Chart */}
      <div className="mb-6" style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> Task Completion Rates — All 35 Agents (Last 30 Days)
          </h3>
          <p className="text-[10px] mb-4" style={{ color: MUTED }}>Sorted by completion rate. Color indicates performance tier: Green ≥80%, Blue ≥60%, Amber ≥40%, Orange ≥20%, Red &lt;20%</p>
          
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allAgentsCompletionData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke={MUTED}
                  fontSize={9}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: MUTED }}
                />
                <YAxis 
                  stroke={MUTED}
                  fontSize={10}
                  label={{ value: 'Completion Rate (%)', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 10 }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: "#0a0f1c", 
                    border: `1px solid ${COPILOT_ELECTRIC}40`, 
                    borderRadius: 8,
                    fontSize: 11
                  }}
                  labelStyle={{ color: COPILOT_ELECTRIC, fontWeight: 'bold', marginBottom: 4 }}
                  formatter={(value, name) => {
                    if (name === 'completionRate') return [`${value}%`, 'Completion Rate'];
                    if (name === 'total') return [value, 'Total Tasks'];
                    if (name === 'completed') return [value, 'Completed'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar 
                  dataKey="completionRate" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                >
                  {allAgentsCompletionData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor(entry.tier, entry.completionRate)}
                      opacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: BORDER }}>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Avg Completion</p>
              <p className="text-2xl font-black" style={{ color: COPILOT_ELECTRIC }}>
                {allAgentsCompletionData.length > 0 ? Math.round(allAgentsCompletionData.reduce((sum, a) => sum + a.completionRate, 0) / allAgentsCompletionData.length) : 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Top Performer</p>
              <p className="text-2xl font-black" style={{ color: COPILOT_GOLD }}>
                {allAgentsCompletionData[0]?.completionRate || 0}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Active Agents</p>
              <p className="text-2xl font-black" style={{ color: COPILOT_GREEN }}>
                {allAgentsCompletionData.filter(a => a.total > 0).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Total Tasks</p>
              <p className="text-2xl font-black" style={{ color: COPILOT_PURPLE }}>
                {allAgentsCompletionData.reduce((sum, a) => sum + a.total, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Task Alerts Panel */}
      <div className="mb-6" style={COPILOT_CARD}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: COPILOT_RED }} />
              Critical Agent Task Completion Alerts
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                style={{ background: `${COPILOT_RED}20`, color: COPILOT_RED }}>
                LIVE
              </span>
            </h3>
            <span className="text-[10px] font-bold" style={{ color: MUTED }}>{auditLogs.length} alerts</span>
          </div>
          {auditLogs.length === 0 ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Shield className="w-5 h-5" style={{ color: MUTED }} />
              <p className="text-sm" style={{ color: MUTED }}>No critical task completions yet. Alerts appear here automatically when agents finish critical/high priority tasks.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.slice(0, 10).map(log => {
                const isCritical = log.risk_level === "critical";
                const alertColor = isCritical ? COPILOT_RED : COPILOT_AMBER;
                const agentMatch = log.action_summary?.match(/\[CRITICAL TASK COMPLETE\] (.+?) —/);
                const agentName = agentMatch ? agentMatch[1] : log.actor_id || "Unknown Agent";
                const taskMatch = log.action_summary?.match(/— (.+)$/);
                const taskDesc = taskMatch ? taskMatch[1] : log.action_summary;
                return (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: `${alertColor}08`, border: `1px solid ${alertColor}25` }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: alertColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold truncate" style={{ color: alertColor }}>{agentName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                          style={{ background: `${alertColor}20`, color: alertColor }}>
                          {isCritical ? "CRITICAL" : "HIGH"}
                        </span>
                      </div>
                      <p className="text-[11px] truncate" style={{ color: TEXT }}>{taskDesc}</p>
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ color: MUTED }}>
                      {log.created_date ? new Date(log.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Agent Task Filter Panel */}
      <div className="mb-6" style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: COPILOT_BLUE }} /> Agent Task Log
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-1" style={{ background: `${COPILOT_BLUE}20`, color: COPILOT_BLUE }}>{filteredAssignments.length} tasks</span>
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: MUTED }}>Status:</span>
              {["all", "completed", "running", "failed", "assigned"].map(s => (
                <button key={s} onClick={() => setTaskStatusFilter(s)}
                  className="text-xs px-3 py-1 rounded-lg font-semibold transition-all capitalize"
                  style={{ background: taskStatusFilter === s ? `${COPILOT_ELECTRIC}20` : "rgba(255,255,255,0.04)", border: `1px solid ${taskStatusFilter === s ? COPILOT_ELECTRIC : BORDER}`, color: taskStatusFilter === s ? COPILOT_ELECTRIC : MUTED }}>
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: MUTED }}>Agent:</span>
              <select value={taskAgentFilter} onChange={e => setTaskAgentFilter(e.target.value)}
                className="text-xs rounded-lg border px-2 py-1 outline-none"
                style={{ background: "#0a0f1c", borderColor: BORDER, color: TEXT }}>
                <option value="all">All Agents</option>
                {uniqueAgentNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {(taskStatusFilter !== "all" || taskAgentFilter !== "all") && (
              <button onClick={() => { setTaskStatusFilter("all"); setTaskAgentFilter("all"); }}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                style={{ background: "rgba(255,255,255,0.06)", color: MUTED }}>
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {filteredAssignments.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: MUTED }}>No tasks match the selected filters.</p>
            ) : filteredAssignments.slice(0, 50).map(a => (
              <div key={a.id}
                onClick={() => setSelectedAgent({ name: a.agent_name, role: a.agent_role })}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-80 transition-all"
                style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === "completed" ? "bg-emerald-500" : a.status === "failed" ? "bg-red-500" : a.status === "running" ? "bg-blue-500" : "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{a.agent_name}</p>
                  <p className="text-[10px] truncate" style={{ color: MUTED }}>{a.task_description || "Task"}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded capitalize font-bold flex-shrink-0"
                  style={{ background: a.priority === "critical" ? `${COPILOT_RED}20` : a.priority === "high" ? `${COPILOT_AMBER}20` : "rgba(255,255,255,0.06)", color: a.priority === "critical" ? COPILOT_RED : a.priority === "high" ? COPILOT_AMBER : MUTED }}>
                  {a.priority || "normal"}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize flex-shrink-0 ${a.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : a.status === "failed" ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"}`}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: COPILOT_AMBER }} /> Top Performing Agents
            </h3>
            <p className="text-[10px] mb-3" style={{ color: MUTED }}>Click any agent to view their full task execution history →</p>
            <div className="space-y-3">
              {topAgents.map((agent, idx) => (
                <div key={agent.name} onClick={() => setSelectedAgent({ name: agent.name, role: agent.role })}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black" 
                    style={{ background: idx === 0 ? COPILOT_AMBER : idx === 1 ? MUTED : idx === 2 ? COPILOT_ORANGE : BORDER, color: idx < 3 ? "#0a0f1c" : TEXT }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{agent.name}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{agent.role.replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black" style={{ color: COPILOT_GREEN }}>{agent.successRate}%</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{agent.completed}/{agent.total} tasks</p>
                  </div>
                  <span className="text-[10px] ml-1" style={{ color: MUTED }}>→</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: COPILOT_PURPLE }} /> Workload Distribution by Agent Role
            </h3>
            <div className="space-y-3">
              {Object.entries(
                assignments.reduce((acc, a) => {
                  acc[a.agent_role] = (acc[a.agent_role] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([role, count], idx) => (
                  <div key={role} className="flex items-center gap-3">
                    <div className="w-32 text-[10px] font-bold truncate" style={{ color: TEXT }}>{role.replace(/_/g, " ")}</div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / assignments.length) * 100}%`, background: idx === 0 ? COPILOT_PURPLE : COPILOT_BLUE }} />
                    </div>
                    <div className="text-xs font-black w-8 text-right" style={{ color: COPILOT_ELECTRIC }}>{count}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}