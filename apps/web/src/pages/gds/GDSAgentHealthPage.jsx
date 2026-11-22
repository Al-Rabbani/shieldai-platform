import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Heart, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, EmptyState, Skeleton, PAGE_BG
} from "@/components/gds/GDSOSShared";
import GDSPageShell from "@/components/gds/GDSPageShell";

function gradeColor(grade) {
  switch (grade) {
    case "A": return LOW;
    case "B": return "#84cc16";
    case "C": return MEDIUM;
    case "D": return HIGH;
    case "F": return DANGER;
    default: return MUTED;
  }
}

function getHealthColor(score) {
  if (score >= 90) return LOW;
  if (score >= 70) return "#84cc16";
  if (score >= 50) return MEDIUM;
  if (score >= 30) return HIGH;
  return DANGER;
}

export default function GDSAgentHealthPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["agent-health"],
    queryFn: () => base44.functions.invoke("gdsAgentRuntime", { action: "health_check" }).then(r => r.data),
    refetchInterval: 60000, // 60s auto-refresh
  });

  const catalogHealth = data?.catalog_health || [];
  const registeredHealth = data?.registered_health || [];
  const recovering = data?.recovering || [];

  const aliveCount = [...catalogHealth, ...registeredHealth].filter(a => a.status === "heartbeat_recent").length;
  const total = catalogHealth.length + registeredHealth.length;
  const isHealthy = false; // No tool execution evidence is returned by this endpoint.

  return (
    <GDSPageShell
      title="Agent Health Monitor"
      breadcrumbs={[{ label: "Agent Runtime", path: "/agents" }, { label: "Health Monitor" }]}
      version="EDP-003 v1.0"
      live
    >
      {/* Overall Health Banner */}
      <div className={`mb-6 p-4 rounded-2xl border ${isHealthy ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isHealthy ? (
              <CheckCircle className="w-6 h-6" style={{ color: LOW }} />
            ) : (
              <AlertTriangle className="w-6 h-6" style={{ color: DANGER }} />
            )}
            <div>
              <p className={`text-sm font-black ${isHealthy ? "text-emerald-400" : "text-red-400"}`}>
                {isHealthy ? "ALL SYSTEMS HEALTHY" : "CAPABILITY UNVERIFIED"}
              </p>
              <p className={`text-xs ${isHealthy ? "text-emerald-300/70" : "text-red-300/70"}`}>
                {aliveCount}/{total} recent heartbeats · {recovering.length} recovering · tool execution unverified
              </p>
            </div>
          </div>
          <button onClick={() => refetch()} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Catalog Health Grid */}
      <Card className="mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Catalog Agent Health</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{catalogHealth.length} agents</span>
        </div>
        {isLoading ? (
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
          </div>
        ) : catalogHealth.length === 0 ? (
          <EmptyState icon={Heart} title="No catalog data" description="Health check data unavailable" />
        ) : (
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {catalogHealth.map(agent => {
              const isAlive = agent.status === "heartbeat_recent";
              const isRecent = agent.last_heartbeat_seconds != null && agent.last_heartbeat_seconds < 300;
              return (
                <div key={agent.agent_id}
                  className={`p-3 rounded-xl border transition-all ${
                    isAlive && isRecent ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white/[0.02] border-gray-500/20"
                  }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${
                      isAlive ? "animate-pulse bg-emerald-400" : "bg-gray-500"
                    }`} />
                    <p className="text-[10px] font-bold text-white truncate">{agent.name}</p>
                  </div>
                  <p className="text-[9px] font-mono" style={{ color: MUTED }}>{agent.last_heartbeat_seconds == null ? 'No heartbeat' : `${agent.last_heartbeat_seconds}s ago`}</p>
                  <p className={`text-[10px] font-black mt-1 ${isAlive ? "text-emerald-400" : "text-gray-400"}`}>
                    {agent.health_score == null ? 'Unmeasured' : `${agent.health_score}%`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Registered Health Table */}
      <Card className="mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Registered Agent Health</h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
          </div>
        ) : registeredHealth.length === 0 ? (
          <EmptyState icon={Activity} title="No registered agents" description="Custom agents will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Agent ID", "Health Score", "Grade", "Success Rate", "Avg Duration", "Failures", "Last Heartbeat", "Status", "Action"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registeredHealth.map((a, i) => {
                  const score = a.health_score;
                  const grade = score == null ? null : score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
                  const gradeColorVal = gradeColor(grade);
                  const healthColor = getHealthColor(score);
                  return (
                    <tr key={a.agent_id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[11px]" style={{ color: TEXT }}>{a.agent_id}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            {score != null && <div className="h-full rounded-full" style={{ width: `${score}%`, background: healthColor }} />}
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: MUTED }}>{score == null ? 'Unmeasured' : `${score}%`}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded"
                          style={{ color: gradeColorVal, background: `${gradeColorVal}15`, border: `1px solid ${gradeColorVal}30` }}>
                          {grade || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]" style={{ color: (a.success_rate || 0) >= 80 ? LOW : MEDIUM }}>
                        {a.success_rate == null ? 'Unmeasured' : `${a.success_rate}%`}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]" style={{ color: CYAN }}>{a.avg_duration_ms == null ? 'Unmeasured' : `${a.avg_duration_ms}ms`}</td>
                      <td className="py-2 px-3 font-mono text-[11px]" style={{ color: (a.consecutive_failures || 0) > 0 ? DANGER : MUTED }}>
                        {a.consecutive_failures || 0}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{a.last_heartbeat_seconds == null ? 'No heartbeat' : `${a.last_heartbeat_seconds}s ago`}</td>
                      <td className="py-2 px-3"><span className={`text-[10px] font-bold capitalize ${a.status === "heartbeat_recent" ? "text-emerald-400" : "text-orange-400"}`}>{a.status}</span></td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] text-slate-500">Runtime action unavailable</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recovery Panel */}
      {recovering.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-sm font-bold text-white">Recovering Agents</h3>
          </div>
          <div className="p-4 space-y-2">
            {recovering.map(a => (
              <div key={a.agent_id} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}25` }}>
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-4 h-4 animate-spin" style={{ color: HIGH }} />
                  <div>
                    <p className="text-xs font-bold text-white">{a.agent_id}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>Strategy: {a.recovery_strategy || "auto_retry"}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ color: HIGH, background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>
                  Attempt {a.recovery_attempts || 1}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </GDSPageShell>
  );
}