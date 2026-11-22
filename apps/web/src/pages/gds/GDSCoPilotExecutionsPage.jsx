import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Play, Pause, RotateCcw, Zap, CheckCircle, AlertTriangle, Clock, Shield, Activity, Target } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, COPILOT_PURPLE, COPILOT_ORANGE, BORDER, MUTED, TEXT, timeAgo } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { Button } from "@/components/ui/button";

export default function GDSCoPilotExecutionsPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: executions = [] } = useQuery({ 
    queryKey: ["copilot-executions"], 
    queryFn: () => base44.entities.CopilotExecution.list("-started_at", 100).catch(() => []) 
  });
  const { data: tasks = [] } = useQuery({ 
    queryKey: ["copilot-tasks"], 
    queryFn: () => base44.entities.CopilotTask.list("-created_date", 200).catch(() => []) 
  });
  const { data: approvals = [] } = useQuery({ 
    queryKey: ["copilot-approvals-pending"], 
    queryFn: () => base44.entities.CopilotApproval.filter({ status: "pending" }, "-requested_at", 50).catch(() => []) 
  });

  const filteredExecutions = filterStatus === "all" ? executions : executions.filter(e => e.status === filterStatus);

  const stats = {
    running: executions.filter(e => e.status === "running").length,
    completed: executions.filter(e => e.status === "completed").length,
    failed: executions.filter(e => e.status === "failed").length,
    awaitingApproval: executions.filter(e => e.status === "awaiting_approval").length,
  };

  const triggerExecutionMutation = useMutation({
    mutationFn: async (executionId) => {
      const execution = executions.find(e => e.id === executionId);
      if (execution) {
        await base44.entities.CopilotExecution.update(executionId, { status: "running" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["copilot-executions"]);
    },
  });

  const triggerApprovalMutation = useMutation({
    mutationFn: async (approvalId) => {
      await base44.entities.CopilotApproval.update(approvalId, { 
        decision: "approved", 
        status: "approved", 
        decided_at: new Date().toISOString() 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["copilot-approvals-pending"]);
      queryClient.invalidateQueries(["copilot-executions"]);
    },
  });

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Action & Execution Center" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">ACTION & EXECUTION CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v7.0 · TRIGGER AGENT ACTIONS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <CopilotStat label="Running" value={stats.running} sub="Active executions" color={COPILOT_BLUE} pulse={stats.running > 0} />
        <CopilotStat label="Completed" value={stats.completed} sub="Successful" color={COPILOT_GREEN} />
        <CopilotStat label="Failed" value={stats.failed} sub="Requires attention" color={COPILOT_RED} />
        <CopilotStat label="Awaiting Approval" value={stats.awaitingApproval} sub="Pending decisions" color={COPILOT_AMBER} pulse={stats.awaitingApproval > 0} />
        <CopilotStat label="Total Tasks" value={tasks.length} sub="All tasks" color={COPILOT_PURPLE} />
      </div>

      {approvals.length > 0 && (
        <div className="mb-6" style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: COPILOT_AMBER }} /> Pending Approvals - Quick Actions
            </h3>
            <div className="space-y-2">
              {approvals.slice(0, 5).map(approval => (
                <div key={approval.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4" style={{ color: COPILOT_AMBER }} />
                    <div>
                      <p className="text-xs font-bold text-white">{approval.action_title}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>Risk: {approval.risk_level} · {approval.sla_minutes}m SLA</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => triggerApprovalMutation.mutate(approval.id)}
                      disabled={triggerApprovalMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: COPILOT_GREEN, color: "white" }}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} 
          className="px-4 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All Status</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="awaiting_approval">Awaiting Approval</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: COPILOT_BLUE }} /> Active Executions
            </h3>
            <div className="space-y-3">
              {filteredExecutions.filter(e => e.status === "running" || e.status === "awaiting_approval").length === 0 ? (
                <p className="text-xs" style={{ color: MUTED }}>No active executions</p>
              ) : (
                filteredExecutions.filter(e => e.status === "running" || e.status === "awaiting_approval").slice(0, 8).map(exec => (
                  <div key={exec.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-bold text-white">{exec.plan_name}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{exec.strategy} · {exec.agents_assigned?.length || 0} agents</p>
                      </div>
                      <CopilotBadge color={exec.status === "running" ? COPILOT_BLUE : COPILOT_AMBER}>{exec.status.replace(/_/g, " ")}</CopilotBadge>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${exec.progress_pct}%`, background: COPILOT_GRADIENT }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: COPILOT_ELECTRIC }}>{exec.progress_pct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-3 h-3" style={{ color: MUTED }} />
                        <span className="text-[10px]" style={{ color: MUTED }}>{exec.completed_steps}/{exec.total_steps} steps</span>
                      </div>
                      {exec.status === "awaiting_approval" && (
                        <Button size="sm" onClick={() => triggerExecutionMutation.mutate(exec.id)}
                          className="px-3 py-1 rounded-lg text-[10px] font-bold"
                          style={{ background: COPILOT_GREEN, color: "white" }}>
                          <Play className="w-3 h-3 mr-1" /> Resume
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: COPILOT_PURPLE }} /> Recent Task Activity
            </h3>
            <div className="space-y-2">
              {tasks.slice(0, 10).map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3">
                    {task.status === "completed" ? <CheckCircle className="w-4 h-4" style={{ color: COPILOT_GREEN }} /> :
                     task.status === "failed" ? <AlertTriangle className="w-4 h-4" style={{ color: COPILOT_RED }} /> :
                     task.status === "running" ? <Activity className="w-4 h-4" style={{ color: COPILOT_BLUE }} /> :
                     <Clock className="w-4 h-4" style={{ color: MUTED }} />}
                    <div>
                      <p className="text-xs font-bold text-white">{task.task_name}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>Step {task.step_number} · {task.duration_ms}ms</p>
                    </div>
                  </div>
                  <CopilotBadge color={task.status === "completed" ? COPILOT_GREEN : task.status === "failed" ? COPILOT_RED : task.status === "running" ? COPILOT_BLUE : COPILOT_AMBER}>{task.status}</CopilotBadge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <RotateCcw className="w-4 h-4" style={{ color: COPILOT_RED }} /> Execution History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Strategy</th>
                  <th className="pb-3">Progress</th>
                  <th className="pb-3">Agents</th>
                  <th className="pb-3">Risk Level</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Evidence</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {filteredExecutions.slice(0, 20).map(exec => (
                  <tr key={exec.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-bold text-white">{exec.plan_name}</td>
                    <td className="py-3" style={{ color: MUTED }}>{exec.strategy}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className="h-full rounded-full" style={{ width: `${exec.progress_pct}%`, background: COPILOT_GRADIENT }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: COPILOT_ELECTRIC }}>{exec.progress_pct}%</span>
                      </div>
                    </td>
                    <td className="py-3" style={{ color: MUTED }}>{exec.agents_assigned?.length || 0}</td>
                    <td className="py-3"><CopilotBadge color={exec.risk_level === "critical" ? COPILOT_RED : exec.risk_level === "high" ? COPILOT_ORANGE : exec.risk_level === "medium" ? COPILOT_AMBER : COPILOT_GREEN}>{exec.risk_level}</CopilotBadge></td>
                    <td className="py-3" style={{ color: MUTED }}>{exec.duration_ms}ms</td>
                    <td className="py-3" style={{ color: MUTED }}>{exec.evidence_count}</td>
                    <td className="py-3"><CopilotBadge color={exec.status === "completed" ? COPILOT_GREEN : exec.status === "failed" ? COPILOT_RED : exec.status === "running" ? COPILOT_BLUE : COPILOT_AMBER}>{exec.status}</CopilotBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}