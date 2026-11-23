import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Activity, Target, GitBranch, Clock3 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

export default function GDSGASCIOrchestrationPage() {
  const { data: sessions = [], isLoading: loadS } = useQuery({
    queryKey: ["gasci-sessions"],
    queryFn: () => base44.entities.AIKernelSession.list("-started_at", 100).catch(() => []),
  });

  const { data: goals = [], isLoading: loadG } = useQuery({
    queryKey: ["gasci-goals"],
    queryFn: () => base44.entities.Goal.list("-created_date", 100).catch(() => []),
  });

  const { data: plans = [], isLoading: loadP } = useQuery({
    queryKey: ["gasci-plans"],
    queryFn: () => base44.entities.ExecutionPlan.list("-created_date", 100).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Orchestration" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">AI Orchestration Center</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Session management and goal execution</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Active Sessions</h3>
        </div>
        {loadS ? <Skeleton lines={5} /> : sessions.length === 0 ? (
          <p className="text-sm" style={{ color: MUTED }}>No sessions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Session ID", "Intent", "Type", "Stage", "Status", "Duration", "Started"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 50).map(session => (
                  <tr key={session.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-4"><p className="text-xs font-mono" style={{ color: CYAN }}>{session.session_id}</p></td>
                    <td className="py-3 px-4"><p className="text-xs text-white max-w-xs truncate">{session.intent}</p></td>
                    <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{session.intent_type}</span></td>
                    <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>{session.pipeline_stage}</span></td>
                    <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded capitalize ${session.status === 'active' ? 'bg-green-400/20 text-green-400' : 'bg-gray-400/20 text-gray-400'}`}>{session.status}</span></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{session.duration_ms || 0}ms</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{new Date(session.started_at).toLocaleString()}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4" style={{ color: LOW }} />
          <h3 className="text-sm font-bold text-white">Active Goals</h3>
        </div>
        {loadG ? <Skeleton lines={5} /> : goals.filter(g => g.status === "active").length === 0 ? (
          <p className="text-sm" style={{ color: MUTED }}>No active goals</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.filter(g => g.status === "active").slice(0, 9).map(goal => (
              <Card key={goal.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white truncate">{goal.goal_statement}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${goal.priority === 'critical' ? 'bg-red-400/20 text-red-400' : 'bg-blue-400/20 text-blue-400'}`}>{goal.priority}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-2 rounded-full" style={{ width: `${goal.progress_pct || 0}%`, background: LOW }} />
                  </div>
                  <span className="text-[10px]" style={{ color: MUTED }}>{goal.progress_pct || 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{goal.goal_type}</span>
                  <span className="text-[10px]" style={{ color: MUTED }}>{goal.required_agents?.length || 0} agents</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4" style={{ color: HIGH }} />
          <h3 className="text-sm font-bold text-white">Execution Plans</h3>
        </div>
        {loadP ? <Skeleton lines={5} /> : plans.length === 0 ? (
          <p className="text-sm" style={{ color: MUTED }}>No execution plans</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Plan Name", "Strategy", "Steps", "Agents", "Confidence", "Status"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.slice(0, 50).map(plan => (
                  <tr key={plan.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-4"><p className="text-xs font-semibold text-white">{plan.plan_name}</p></td>
                    <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>{plan.strategy}</span></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{plan.total_steps || 0}</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{plan.agents_involved?.length || 0}</p></td>
                    <td className="py-3 px-4"><p className={`text-xs font-bold ${plan.confidence_score >= 80 ? 'text-green-400' : plan.confidence_score >= 65 ? 'text-yellow-400' : 'text-red-400'}`}>{plan.confidence_score || 0}%</p></td>
                    <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded capitalize ${plan.status === 'executing' ? 'bg-blue-400/20 text-blue-400' : 'bg-gray-400/20 text-gray-400'}`}>{plan.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}