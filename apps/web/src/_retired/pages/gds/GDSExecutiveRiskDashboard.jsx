import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, CheckCircle, Activity, RefreshCw, Download, Calendar } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

function TrendIndicator({ value, trend }) {
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const color = trend === "up" ? LOW : trend === "down" ? DANGER : MUTED;
  return (
    <div className="flex items-center gap-1">
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="text-[10px] font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

function RiskGauge({ score, size = 100 }) {
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 70 ? LOW : score >= 40 ? MEDIUM : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.25} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

export default function GDSExecutiveRiskDashboard() {
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ["executive-risk-dashboard"],
    queryFn: () => base44.functions.invoke("gdsExecutiveRiskDashboard").then(r => r.data.dashboard),
    refetchInterval: 60000,
  });

  const calculateRiskMutation = useMutation({
    mutationFn: () => base44.functions.invoke("gdsUnifiedRiskCalculator").then(r => r.data),
  });

  const risk = dashboard?.risk || {};
  const compliance = dashboard?.compliance || {};
  const workflow = dashboard?.workflow || {};

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Executive Risk Dashboard" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Executive Risk Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Real-time risk posture and compliance overview for leadership</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: CYAN }}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={() => calculateRiskMutation.mutate()} disabled={calculateRiskMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Activity className="w-4 h-4" />
            {calculateRiskMutation.isPending ? "Calculating..." : "Recalculate Risk"}
          </button>
        </div>
      </div>

      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5" glow>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
              <Shield className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Overall Risk Score</p>
              <p className="text-2xl font-black" style={{ color: risk.avg_risk_score >= 70 ? LOW : risk.avg_risk_score >= 40 ? MEDIUM : DANGER }}>
                {risk.avg_risk_score || 0}
              </p>
            </div>
          </div>
          <RiskGauge score={risk.avg_risk_score} size={60} />
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
              <Activity className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Assets</p>
              <p className="text-2xl font-black text-white">{risk.total_assets || 0}</p>
            </div>
          </div>
          <div className="flex gap-2 text-[10px]">
            <span style={{ color: DANGER }}>{risk.high_risk || 0} High</span>
            <span style={{ color: MEDIUM }}>{risk.medium_risk || 0} Med</span>
            <span style={{ color: LOW }}>{risk.low_risk || 0} Low</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40` }}>
              <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Compliance Score</p>
              <p className="text-2xl font-black" style={{ color: compliance.avg_score >= 70 ? LOW : compliance.avg_score >= 40 ? MEDIUM : DANGER }}>
                {compliance.avg_score || 0}%
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-[10px]">
            <span style={{ color: LOW }}>{compliance.passing || 0} Passing</span>
            <span style={{ color: DANGER }}>{compliance.failing || 0} Failing</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}40` }}>
              <AlertTriangle className="w-5 h-5" style={{ color: HIGH }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Open Findings</p>
              <p className="text-2xl font-black text-white">{workflow.by_status.discovered + workflow.by_status.triaged + workflow.by_status.assigned || 0}</p>
            </div>
          </div>
          <div className="flex gap-2 text-[10px]">
            <span style={{ color: MUTED }}>{workflow.by_status.in_remediation || 0} In Progress</span>
            <span style={{ color: LOW }}>{workflow.by_status.resolved || 0} Resolved</span>
          </div>
        </Card>
      </div>

      {/* Workflow Status */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Vulnerability Workflow Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
          {Object.entries(workflow.by_status || {}).map(([status, count]) => (
            <div key={status} className="text-center p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <p className="text-2xl font-black text-white">{count}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: MUTED }}>{status.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* SLA Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">SLA Compliance</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Compliance Rate</span>
                <span className="text-lg font-black" style={{ color: workflow.sla_compliance >= 90 ? LOW : workflow.sla_compliance >= 70 ? MEDIUM : DANGER }}>
                  {workflow.sla_compliance || 0}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full" 
                  style={{ 
                    width: `${workflow.sla_compliance || 0}%`,
                    background: workflow.sla_compliance >= 90 ? LOW : workflow.sla_compliance >= 70 ? MEDIUM : DANGER
                  }} 
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Average Time to Remediate</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black" style={{ color: CYAN }}>
              {workflow.avg_time_to_remediate || 0}<span className="text-sm font-bold" style={{ color: MUTED }}>h</span>
            </div>
            <div className="flex-1">
              <p className="text-[10px]" style={{ color: MUTED }}>
                Based on {workflow.by_status.resolved + workflow.by_status.closed || 0} resolved findings
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}