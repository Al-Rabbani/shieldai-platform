import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Wrench, Shield, CheckCircle, AlertTriangle, TrendingUp, Clock3, Key, RotateCcw, Lock, Eye, FileCheck, BarChart3 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CATEGORY_COLORS = {
  scanner: "#3b82f6", cloud: "#06b6d4", devsecops: "#10b981", identity: "#8b5cf6",
  notification: "#14b8a6", threat_intel: DANGER, compliance: "#22c55e", workflow: "#a855f7",
  ai_model: "#7c3aed", reporting: "#6b7280", data_query: "#0ea5e9", internal: "#f59e0b"
};

const RISK_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GDSToolsPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["tool-metrics"],
    queryFn: () => base44.functions.invoke("gdsToolExecutionEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: recentExecutions } = useQuery({
    queryKey: ["tool-recent-executions"],
    queryFn: () => base44.entities.ToolAuditRecord.list("-created_date", 10).catch(() => []),
    refetchInterval: 15000,
  });

  const m = metrics || {};
  const registry = m.registry || {};
  const execution = m.execution || {};
  const approvals = m.approvals || {};
  const output = m.output || {};
  const rollbacks = m.rollbacks || {};

  const categoryData = Object.entries(registry.by_category || {}).map(([cat, count]) => ({
    name: cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    color: CATEGORY_COLORS[cat] || MUTED
  }));

  const byRisk = registry.by_risk || {};

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tool Execution Engine" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Wrench className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Tool Execution Engine</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-009 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>19-stage pipeline · 34 built-in tools · Zero Trust RBAC · Circuit Breaker · Output Validator</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tools</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{registry.total_tools ?? 0}</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>{registry.built_in ?? 0} built-in · {registry.registered_db ?? 0} registered</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Executions</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{execution.total ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Duration</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#60a5fa" }}>{formatDuration(execution.avg_duration_ms)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Pending Approvals</p>
          <p className="text-2xl font-black font-mono" style={{ color: approvals.pending > 0 ? HIGH : MUTED }}>{approvals.pending ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Secret Leaks</p>
          <p className="text-2xl font-black font-mono" style={{ color: output.secret_leaks > 0 ? DANGER : MUTED }}>{output.secret_leaks ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Rollbacks</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#14b8a6" }}>{rollbacks.total ?? 0}</p>
        </Card>
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Critical", value: byRisk.critical || 0, color: DANGER },
          { label: "High", value: byRisk.high || 0, color: HIGH },
          { label: "Medium", value: byRisk.medium || 0, color: MEDIUM },
          { label: "Low", value: byRisk.low || 0, color: LOW }
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center" style={{ borderLeft: `3px solid ${color}` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label} Risk</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Category Breakdown */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Tools by Category</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Distribution across tool types</p>
        </div>
        {categoryData.length === 0 ? (
          <EmptyState icon={BarChart3} title="No tool data" description="Tools will appear here after registration" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis type="number" stroke={MUTED} fontSize={10} />
              <YAxis dataKey="name" type="category" stroke={MUTED} fontSize={9} width={100} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {categoryData.map((entry, i) => (<rect key={i} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Recent Executions */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Recent Tool Executions</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Latest execution activity</p>
        </div>
        {isLoading ? <Skeleton lines={6} /> : recentExecutions.length === 0 ? (
          <EmptyState icon={Clock3} title="No executions yet" description="Tool executions will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Tool", "Action", "Actor", "Risk", "Verdict", "Approval", "Secrets", "Validated", "Rollback", "Duration", "Created"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentExecutions.map((exec, i) => (
                  <tr key={exec.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{exec.tool_name || "—"}</span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{exec.tool_action || "—"}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{exec.actor_id || "—"}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: RISK_COLORS[exec.risk_level] || MUTED, background: `${RISK_COLORS[exec.risk_level] || MUTED}15` }}>{exec.risk_level || "—"}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: exec.policy_verdict === "approved" ? LOW : exec.policy_verdict === "rejected" ? DANGER : HIGH, background: `${exec.policy_verdict === "approved" ? LOW : exec.policy_verdict === "rejected" ? DANGER : HIGH}15` }}>{exec.policy_verdict || "—"}</span>
                    </td>
                    <td className="py-2 px-3">{exec.approval_required && <Lock className="w-3.5 h-3.5" style={{ color: HIGH }} />}</td>
                    <td className="py-2 px-3">{exec.secret_used && <Key className="w-3.5 h-3.5" style={{ color: CYAN }} />}</td>
                    <td className="py-2 px-3">{exec.output_validated && <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} />}</td>
                    <td className="py-2 px-3">{exec.rollback_executed && <RotateCcw className="w-3.5 h-3.5" style={{ color: "#14b8a6" }} />}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{formatDuration(exec.duration_ms)}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{exec.created_date ? new Date(exec.created_date).toLocaleDateString() : "—"}</td>
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

function formatDuration(ms) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  return `${s}s`;
}