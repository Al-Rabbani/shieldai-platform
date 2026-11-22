import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bot, Activity, CheckCircle, Clock, AlertTriangle, Users, Zap, Shield } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, COPILOT_PURPLE, COPILOT_ORANGE, BORDER, MUTED, TEXT } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCoPilotAgentsPage() {
  const { data: assignments = [] } = useQuery({ queryKey: ["copilot-agents"], queryFn: () => base44.entities.CopilotAgentAssignment.list("-started_at", 100).catch(() => []) });

  const stats = {
    total: assignments.length,
    running: assignments.filter(a => a.status === "running").length,
    completed: assignments.filter(a => a.status === "completed").length,
    failed: assignments.filter(a => a.status === "failed").length,
  };

  const roleCounts = assignments.reduce((acc, a) => {
    acc[a.agent_role] = (acc[a.agent_role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Agent Assignments" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">AI AGENT ORCHESTRATION</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v7.0 · HEART OF THE GDS OS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CopilotStat label="Total Assignments" value={stats.total} sub="All agents" color={COPILOT_ELECTRIC} />
        <CopilotStat label="Active Now" value={stats.running} sub="Currently running" color={COPILOT_BLUE} pulse={stats.running > 0} />
        <CopilotStat label="Completed" value={stats.completed} sub="Successfully finished" color={COPILOT_GREEN} />
        <CopilotStat label="Failed" value={stats.failed} sub="Requires attention" color={COPILOT_RED} />
      </div>

      <div className="mb-6" style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: COPILOT_PURPLE }} /> Agent Workload Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(roleCounts).map(([role, count]) => (
              <div key={role} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>{role.replace(/_/g, " ")}</p>
                <p className="text-2xl font-black" style={{ color: COPILOT_ELECTRIC }}>{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> All Agent Assignments
          </h3>
          {assignments.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>No agent assignments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                    <th className="pb-3">Agent</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Task</th>
                    <th className="pb-3">Priority</th>
                    <th className="pb-3">Lead</th>
                    <th className="pb-3">Evidence</th>
                    <th className="pb-3">Collaboration</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {assignments.slice(0, 20).map(agent => (
                    <tr key={agent.id} className="border-t" style={{ borderColor: BORDER }}>
                      <td className="py-3 font-bold text-white">{agent.agent_name}</td>
                      <td className="py-3"><CopilotBadge color={COPILOT_PURPLE}>{agent.agent_role.replace(/_/g, " ")}</CopilotBadge></td>
                      <td className="py-3 max-w-[200px] truncate" style={{ color: MUTED }}>{agent.task_description}</td>
                      <td className="py-3"><CopilotBadge color={agent.priority === "critical" ? COPILOT_RED : agent.priority === "high" ? COPILOT_ORANGE : agent.priority === "medium" ? COPILOT_AMBER : COPILOT_GREEN}>{agent.priority}</CopilotBadge></td>
                      <td className="py-3">{agent.was_lead ? <Zap className="w-3.5 h-3.5" style={{ color: COPILOT_AMBER }} /> : <span style={{ color: MUTED }}>—</span>}</td>
                      <td className="py-3" style={{ color: MUTED }}>{agent.evidence_produced}</td>
                      <td className="py-3"><div className="flex gap-1">{(agent.collaborated_with || []).slice(0, 2).map((c, i) => <CopilotBadge key={i} color={COPILOT_BLUE}>{c.slice(0, 8)}</CopilotBadge>)}</div></td>
                      <td className="py-3" style={{ color: MUTED }}>{agent.duration_ms}ms</td>
                      <td className="py-3"><CopilotBadge color={agent.status === "completed" ? COPILOT_GREEN : agent.status === "running" ? COPILOT_BLUE : agent.status === "failed" ? COPILOT_RED : COPILOT_AMBER}>{agent.status}</CopilotBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}