import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Activity, Clock, Shield, Users, DollarSign } from "lucide-react";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { OTBreadcrumb, OTBadge, OT_PAGE_BG, OT_CARD, OT_AMBER, OT_RED, OT_CRITICAL, OT_GREEN, OT_ORANGE, BORDER, MUTED, INCIDENT_TYPE_COLORS, formatPopulation, formatCurrencyUSD, timeAgo } from "@/components/gds/CriticalInfrastructureShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCriticalIncidentsPage() {
  const { data: incidents = [] } = useQuery({ queryKey: ["ci-incidents"], queryFn: () => base44.entities.IndustrialIncident.list("-severity", 100).catch(() => []) });

  const stats = {
    open: incidents.filter(i => i.status !== "closed").length,
    operationalImpact: incidents.filter(i => i.operational_impact).length,
    safetyTriggered: incidents.filter(i => i.safety_system_triggered).length,
    productionLoss: incidents.reduce((s, i) => s + (i.production_loss_hours || 0), 0),
  };

  return (
    <div style={OT_PAGE_BG}>
      <OTBreadcrumb items={[{ label: "Industrial Incident Management" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">INDUSTRIAL INCIDENT MANAGEMENT</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-005 · OT/ICS SECURITY</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className={`p-4 text-center ${stats.open > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.open > 0 ? OT_RED + "40" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Incidents</p>
          <p className="text-3xl font-black" style={{ color: stats.open > 0 ? OT_RED : OT_GREEN }}>{stats.open}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.operationalImpact > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.operationalImpact > 0 ? OT_CRITICAL + "40" : OT_AMBER + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Operational Impact</p>
          <p className="text-3xl font-black" style={{ color: stats.operationalImpact > 0 ? OT_CRITICAL : OT_AMBER }}>{stats.operationalImpact}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.safetyTriggered > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.safetyTriggered > 0 ? OT_CRITICAL + "60" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Safety Triggered</p>
          <p className="text-3xl font-black" style={{ color: stats.safetyTriggered > 0 ? OT_CRITICAL : OT_GREEN }}>{stats.safetyTriggered}</p>
        </Card>
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Production Hours Lost</p>
          <p className="text-3xl font-black" style={{ color: OT_RED }}>{stats.productionLoss}</p>
        </Card>
      </div>

      <Card className="p-5" style={OT_CARD}>
        <h3 className="text-sm font-bold text-white mb-4">Active Incidents</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-3 px-3">Ref</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Op Impact</th>
                <th className="py-3 px-3">Processes</th>
                <th className="py-3 px-3">Population</th>
                <th className="py-3 px-3">Economic</th>
                <th className="py-3 px-3">Prod Loss</th>
                <th className="py-3 px-3">Safety</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">MITRE ICS</th>
                <th className="py-3 px-3">Notified</th>
                <th className="py-3 px-3">Detected</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 px-3 font-mono text-[10px] text-amber-500">{inc.incident_ref}</td>
                  <td className="py-3 px-3"><OTBadge color={INCIDENT_TYPE_COLORS[inc.incident_type] || OT_RED}>{inc.incident_type}</OTBadge></td>
                  <td className="py-3 px-3"><OTBadge color={inc.severity === "operational_shutdown" ? OT_CRITICAL : inc.severity === "critical" ? OT_RED : OT_AMBER}>{inc.severity}</OTBadge></td>
                  <td className="py-3 px-3 text-center">{inc.operational_impact ? <Activity className="w-4 h-4 inline" style={{ color: OT_CRITICAL }} /> : "—"}</td>
                  <td className="py-3 px-3"><div className="flex gap-1">{inc.affected_processes?.slice(0, 2).map((p, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OT_AMBER}15`, color: OT_AMBER }}>{p}</span>)}</div></td>
                  <td className="py-3 px-3 text-center"><span className={inc.population_impacted > 100000 ? "text-red-500 font-bold" : "text-white"}>{formatPopulation(inc.population_impacted)}</span></td>
                  <td className="py-3 px-3 text-[10px]">{formatCurrencyUSD(inc.economic_impact_usd)}</td>
                  <td className="py-3 px-3 text-center"><span className={inc.production_loss_hours > 24 ? "text-red-500 font-bold" : "text-white"}>{inc.production_loss_hours || 0}h</span></td>
                  <td className="py-3 px-3 text-center">{inc.safety_system_triggered ? <AlertTriangle className="w-5 h-5 inline animate-pulse" style={{ color: OT_CRITICAL }} /> : "—"}</td>
                  <td className="py-3 px-3 text-[10px] text-white">{inc.threat_actor || "—"}</td>
                  <td className="py-3 px-3"><div className="flex gap-1">{inc.mitre_ics_techniques?.slice(0, 2).map((t, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OT_RED}15`, color: OT_RED }}>{t}</span>)}</div></td>
                  <td className="py-3 px-3 text-center">{inc.regulatory_notified ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : "—"}</td>
                  <td className="py-3 px-3 text-[10px]">{timeAgo(inc.detected_at)}</td>
                  <td className="py-3 px-3"><OTBadge color={inc.status === "open" ? OT_RED : inc.status === "investigating" ? OT_ORANGE : inc.status === "contained" ? OT_AMBER : OT_GREEN}>{inc.status}</OTBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}