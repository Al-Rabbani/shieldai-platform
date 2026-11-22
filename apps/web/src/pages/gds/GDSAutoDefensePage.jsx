import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Activity, AlertTriangle, CheckCircle, TrendingDown, Zap, Lock, RotateCcw } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";
const AUTONOMY_COLORS = ["#6b7280", "#3b82f6", "#f59e0b", "#10b981", "#00ff88", "#ff3b3b"];

export default function GDSAutoDefensePage() {
  const { data: healingEvents = [], isLoading: loadH } = useQuery({
    queryKey: ["auto-defense-healing"],
    queryFn: () => base44.entities.SelfHealingEvent.list("-triggered_at", 100).catch(() => []),
  });

  const { data: drift = [], isLoading: loadD } = useQuery({
    queryKey: ["auto-defense-drift"],
    queryFn: () => base44.entities.ConfigurationDrift.list("-detected_at", 100).catch(() => []),
  });

  const { data: executions = [], isLoading: loadE } = useQuery({
    queryKey: ["auto-defense-executions"],
    queryFn: () => base44.entities.RemediationExecution.list("-executed_at", 200).catch(() => []),
  });

  const selfHealingCount = healingEvents.filter(e => e.success).length;
  const driftDetected = drift.filter(d => d.status === "detected").length;
  const avgRiskReduction = healingEvents.length > 0 ? Math.round(healingEvents.reduce((sum, e) => sum + (e.risk_reduction_percent || 0), 0) / healingEvents.length) : 0;
  const automationRate = healingEvents.length > 0 ? Math.round((healingEvents.filter(e => e.was_automated).length / healingEvents.length) * 100) : 0;

  const execStats = {
    successRate: executions.length > 0 ? Math.round((executions.filter(e => e.status === "success").length / executions.length) * 100) : 0,
    avgRiskReduction: executions.length > 0 ? Math.round(executions.reduce((sum, e) => sum + (e.risk_reduction_percent || 0), 0) / executions.length) : 0,
    rollbacksTriggered: executions.filter(e => e.rollback_triggered).length
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Auto Defense", path: "/auto-defense" }, { label: "Command" }]} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Autonomous Defense Command</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Self-healing infrastructure and automated remediation</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Self-Healing Events</p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: LOW }} />
            <p className="text-2xl font-black" style={{ color: LOW }}>{selfHealingCount}</p>
          </div>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}30` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Drift Detected</p>
          <p className="text-2xl font-black" style={{ color: MEDIUM }}>{driftDetected}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}30` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Patches Pending</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>0</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Awaiting Approval</p>
          <p className="text-2xl font-black" style={{ color: DANGER }}>0</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Risk Reduced</p>
          <div className="flex items-center justify-center gap-2">
            <TrendingDown className="w-4 h-4" style={{ color: LOW }} />
            <p className="text-2xl font-black" style={{ color: LOW }}>{avgRiskReduction}%</p>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Automation Rate</p>
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" style={{ color: CYAN }} />
            <p className="text-2xl font-black" style={{ color: CYAN }}>{automationRate}%</p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-[9px] font-bold uppercase mb-3" style={{ color: MUTED }}>Autonomy Level Legend</p>
        <div className="grid grid-cols-6 gap-2">
          {["Manual", "Assisted", "Semi-Auto", "High-Auto", "Full-Auto", "Autonomous"].map((label, i) => (
            <div key={i} className="text-center">
              <div className="h-2 rounded-full mb-1" style={{ background: AUTONOMY_COLORS[i] }} />
              <p className="text-[9px] font-bold" style={{ color: TEXT }}>{label}</p>
              <p className="text-[8px]" style={{ color: MUTED }}>Level {i}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" style={{ color: LOW }} />
            <h3 className="text-sm font-bold text-white">Latest Self-Healing Events</h3>
          </div>
          {loadH ? <Skeleton lines={5} /> : healingEvents.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>No events</p>
          ) : (
            <div className="space-y-2">
              {healingEvents.slice(0, 8).map(event => (
                <div key={event.id} className="p-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white truncate">{event.asset}</span>
                    {event.was_automated ? <Zap className="w-3 h-3" style={{ color: LOW }} /> : <Lock className="w-3 h-3" style={{ color: MUTED }} />}
                  </div>
                  <p className="text-[10px]" style={{ color: MUTED }}>{event.healing_action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: DANGER }}>{event.risk_before || 0}</span>
                    <span className="text-[8px]" style={{ color: MUTED }}>→</span>
                    <span className="text-[10px]" style={{ color: LOW }}>{event.risk_after || 0}</span>
                    <span className="text-[9px] font-bold" style={{ color: LOW }}>{event.risk_reduction_percent || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Active Remediation Plans</h3>
          </div>
          <p className="text-sm" style={{ color: MUTED }}>Plans view</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: MEDIUM }} />
            <h3 className="text-sm font-bold text-white">Configuration Drift</h3>
          </div>
          {loadD ? <Skeleton lines={5} /> : drift.length === 0 ? (
            <p className="text-sm" style={{ color: MUTED }}>No drift detected</p>
          ) : (
            <div className="space-y-2">
              {drift.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 8).map(d => (
                <div key={d.id} className="p-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white truncate">{d.asset}</span>
                    {d.auto_fixable ? <CheckCircle className="w-3 h-3" style={{ color: LOW }} /> : <Lock className="w-3 h-3" style={{ color: MUTED }} />}
                  </div>
                  <p className="text-[10px]" style={{ color: MUTED }}>{d.drift_type?.replace(/_/g, " ")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${d.severity === 'critical' ? 'bg-red-400/20 text-red-400' : d.severity === 'high' ? 'bg-orange-400/20 text-orange-400' : 'bg-yellow-400/20 text-yellow-400'}`}>{d.severity}</span>
                    <span className="text-[9px]" style={{ color: MUTED }}>Risk: {d.risk_score || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Execution Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Success Rate</p>
            <p className={`text-3xl font-black ${execStats.successRate >= 90 ? 'text-green-400' : execStats.successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{execStats.successRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Risk Reduction</p>
            <p className="text-3xl font-black" style={{ color: LOW }}>{execStats.avgRiskReduction}%</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Rollbacks Triggered</p>
            <div className="flex items-center justify-center gap-2">
              <RotateCcw className="w-5 h-5" style={{ color: DANGER }} />
              <p className="text-3xl font-black" style={{ color: DANGER }}>{execStats.rollbacksTriggered}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}