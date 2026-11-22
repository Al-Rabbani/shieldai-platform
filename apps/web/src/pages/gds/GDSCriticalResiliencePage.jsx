import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Shield, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { OTBreadcrumb, OTBadge, OTGauge, OT_PAGE_BG, OT_CARD, OT_AMBER, OT_RED, OT_GREEN, OT_CRITICAL, OT_BLUE, BORDER, MUTED, RISK_CATEGORY_COLORS } from "@/components/gds/CriticalInfrastructureShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCriticalResiliencePage() {
  const { data: risks = [] } = useQuery({ queryKey: ["ci-risks"], queryFn: () => base44.entities.OperationalRisk.list("-risk_score", 100).catch(() => []) });
  const { data: plans = [] } = useQuery({ queryKey: ["ci-recovery"], queryFn: () => base44.entities.RecoveryPlan.list("-target_rto_hours", 100).catch(() => []) });

  const stats = {
    totalRisks: risks.length,
    catastrophic: risks.filter(r => r.impact === "catastrophic_infrastructure").length,
    totalPlans: plans.length,
    needsUpdate: plans.filter(p => p.status === "needs_update").length,
  };

  return (
    <div style={OT_PAGE_BG}>
      <OTBreadcrumb items={[{ label: "Operational Resilience Center" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">OPERATIONAL RESILIENCE CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-005 · OT/ICS SECURITY</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Risks</p>
          <p className="text-3xl font-black" style={{ color: OT_AMBER }}>{stats.totalRisks}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.catastrophic > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.catastrophic > 0 ? OT_CRITICAL + "60" : OT_RED + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Catastrophic Level</p>
          <p className="text-3xl font-black" style={{ color: stats.catastrophic > 0 ? OT_CRITICAL : OT_RED }}>{stats.catastrophic}</p>
        </Card>
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Recovery Plans</p>
          <p className="text-3xl font-black" style={{ color: OT_GREEN }}>{stats.totalPlans}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.needsUpdate > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.needsUpdate > 0 ? OT_AMBER + "40" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Needs Update</p>
          <p className="text-3xl font-black" style={{ color: stats.needsUpdate > 0 ? OT_AMBER : OT_GREEN }}>{stats.needsUpdate}</p>
        </Card>
      </div>

      <Card className="p-5 mb-6" style={OT_CARD}>
        <h3 className="text-sm font-bold text-white mb-4">Operational Risks</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-3 px-3">Title</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Likelihood</th>
                <th className="py-3 px-3">Impact</th>
                <th className="py-3 px-3">Risk Score</th>
                <th className="py-3 px-3">Op Impact</th>
                <th className="py-3 px-3">Pop Risk</th>
                <th className="py-3 px-3">Daily Exposure</th>
                <th className="py-3 px-3">Cascading</th>
                <th className="py-3 px-3">NERC CIP</th>
                <th className="py-3 px-3">IEC 62443</th>
                <th className="py-3 px-3">Control Eff.</th>
                <th className="py-3 px-3">Residual</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {risks.map(risk => (
                <tr key={risk.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 px-3 text-white font-bold">{risk.title}</td>
                  <td className="py-3 px-3"><OTBadge color={RISK_CATEGORY_COLORS[risk.risk_category] || OT_RED}>{risk.risk_category}</OTBadge></td>
                  <td className="py-3 px-3"><OTBadge color={risk.likelihood === "almost_certain" ? OT_CRITICAL : risk.likelihood === "likely" ? OT_RED : risk.likelihood === "possible" ? OT_AMBER : OT_BLUE}>{risk.likelihood}</OTBadge></td>
                  <td className="py-3 px-3"><OTBadge color={risk.impact === "catastrophic_infrastructure" ? OT_CRITICAL : risk.impact === "major" ? OT_RED : OT_AMBER}>{risk.impact}</OTBadge></td>
                  <td className="py-3 px-3 text-center"><OTGauge score={risk.risk_score || 0} size={40} /></td>
                  <td className="py-3 px-3 text-[10px] text-white">{risk.operational_impact || "—"}</td>
                  <td className="py-3 px-3 text-center"><span className="text-white font-bold">{(risk.population_at_risk / 1000000).toFixed(1)}M</span></td>
                  <td className="py-3 px-3 text-[10px]">${(risk.daily_economic_exposure_usd / 1000000).toFixed(1)}M</td>
                  <td className="py-3 px-3"><div className="flex gap-1">{risk.cascading_sectors?.slice(0, 2).map((s, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OT_RED}15`, color: OT_RED }}>{s}</span>)}</div></td>
                  <td className="py-3 px-3 text-[10px] font-mono">{risk.nerc_cip_ref || "—"}</td>
                  <td className="py-3 px-3 text-[10px] font-mono">{risk.iec_62443_ref || "—"}</td>
                  <td className="py-3 px-3 text-center"><div className="w-16 h-1.5 rounded-full bg-white/10 mx-auto"><div className="h-full rounded-full" style={{ width: `${risk.control_effectiveness_pct || 0}%`, background: (risk.control_effectiveness_pct || 0) < 60 ? OT_RED : (risk.control_effectiveness_pct || 0) < 80 ? OT_AMBER : OT_GREEN }} /></div></td>
                  <td className="py-3 px-3 text-center"><OTGauge score={risk.residual_risk_score || 0} size={40} /></td>
                  <td className="py-3 px-3"><OTBadge color={risk.status === "critical" ? OT_CRITICAL : risk.status === "high" ? OT_RED : OT_AMBER}>{risk.status}</OTBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5" style={OT_CARD}>
        <h3 className="text-sm font-bold text-white mb-4">Recovery Plans</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Plan Type</th>
                <th className="py-3 px-3">Target RTO</th>
                <th className="py-3 px-3">Target RPO</th>
                <th className="py-3 px-3">Tested RTO</th>
                <th className="py-3 px-3">Last Tested</th>
                <th className="py-3 px-3">Test Passed</th>
                <th className="py-3 px-3">Manual Ops</th>
                <th className="py-3 px-3">Backup Ready</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 px-3 text-white font-bold">{plan.name}</td>
                  <td className="py-3 px-3"><OTBadge color={plan.plan_type === "ransomware_recovery" ? OT_RED : plan.plan_type === "ot_compromise" ? OT_CRITICAL : OT_AMBER}>{plan.plan_type}</OTBadge></td>
                  <td className="py-3 px-3 text-[10px] text-white">{plan.target_rto_hours}h</td>
                  <td className="py-3 px-3 text-[10px] text-white">{plan.target_rpo_hours}h</td>
                  <td className="py-3 px-3 text-[10px]"><span className={plan.tested_rto_hours <= plan.target_rto_hours ? "text-green-500 font-bold" : "text-red-500 font-bold"}>{plan.tested_rto_hours || 0}h</span></td>
                  <td className="py-3 px-3 text-[10px]">{plan.last_tested ? new Date(plan.last_tested).toLocaleDateString() : "—"}</td>
                  <td className="py-3 px-3 text-center">{plan.test_passed ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : <AlertTriangle className="w-4 h-4 inline" style={{ color: OT_RED }} />}</td>
                  <td className="py-3 px-3 text-center">{plan.manual_ops_capable ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : "—"}</td>
                  <td className="py-3 px-3 text-center">{plan.backup_systems_ready ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : <Shield className="w-4 h-4 inline" style={{ color: OT_RED }} />}</td>
                  <td className="py-3 px-3"><OTBadge color={plan.status === "active_recovery" ? OT_CRITICAL : plan.status === "needs_update" ? OT_AMBER : OT_GREEN}>{plan.status}</OTBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}