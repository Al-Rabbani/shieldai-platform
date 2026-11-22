import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bot, Crown, Activity, Zap } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, KpiCard, Skeleton, EmptyState, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const TRUST_COLORS = { sovereign: "#a855f7", trusted: "#10b981", verified: "#3b82f6", external: "#f59e0b", untrusted: "#ef4444" };

export default function GDSA2ANetworkPage() {
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["a2a-agents"],
    queryFn: () => base44.entities.A2AAgent.list("", 100).catch(() => []),
  });

  const sovereignAgents = agents.filter(a => a.trust_level === "sovereign").length;
  const activeAgents = agents.filter(a => a.is_active).length;
  const offlineAgents = agents.filter(a => !a.is_active).length;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Integration Hub", path: "/integration-hub" }, { label: "A2A Network" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">A2A Agent Network</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Agent-to-Agent communication and collaboration</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Agents" value={agents.length} color={CYAN} icon={Bot} />
        <KpiCard label="Sovereign" value={sovereignAgents} color="#a855f7" icon={Crown} />
        <KpiCard label="Active" value={activeAgents} color={LOW} icon={Activity} pulse={activeAgents > 0} />
        <KpiCard label="Offline" value={offlineAgents} color={DANGER} icon={Zap} />
      </div>

      {/* Agent Network Grid */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Agent Network</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{agents.length} agents</span>
        </div>
        {isLoading ? <Skeleton lines={6} /> : agents.length === 0 ? (
          <EmptyState icon={Bot} title="No agents" description="Register A2A agents to enable collaboration" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, i) => {
              const trustColor = TRUST_COLORS[agent.trust_level] || MUTED;
              return (
                <div key={agent.id || i} className="p-4 rounded-xl" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5" style={{ color: CYAN }} />
                      <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                    </div>
                    {agent.trust_level === "sovereign" && <Crown className="w-4 h-4" style={{ color: "#a855f7" }} />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: MUTED }}>Type</span>
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{agent.agent_type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: MUTED }}>Trust Level</span>
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: trustColor, background: `${trustColor}15` }}>{agent.trust_level}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: MUTED }}>Tasks</span>
                      <span className="text-[10px] font-mono text-white">{agent.tasks_completed || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: MUTED }}>Success Rate</span>
                      <span className={`text-[10px] font-bold ${agent.success_rate_pct >= 90 ? "text-green-400" : agent.success_rate_pct >= 70 ? "text-amber-400" : "text-red-400"}`}>
                        {agent.success_rate_pct || 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: MUTED }}>Last Active</span>
                      <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(agent.last_active)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: BORDER }}>
                      <span className="text-[10px]" style={{ color: MUTED }}>Status</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${agent.is_active ? "text-green-400 bg-green-400/15" : "text-slate-400 bg-slate-400/15"}`}>
                        {agent.is_active ? "active" : "offline"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}