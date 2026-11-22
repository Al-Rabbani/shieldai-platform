import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Activity, Server, Zap } from "lucide-react";
import { SovereignBreadcrumb, SovereignBanner, SovereignBadge, ClassificationBanner, SOVEREIGN_PAGE_BG, SOVEREIGN_CARD, SOVEREIGN_GOLD, NAVY_BASE, BORDER, MUTED, CRITICAL_RED } from "@/components/gds/NationalCommandShared";
import { Card } from "@/components/gds/GDSOSShared";

const ASSET_TYPE_COLORS = { power_grid: "#dc2626", water_treatment: "#3b82f6", nuclear_plant: "#7f1d1d", election_system: SOVEREIGN_GOLD, telecom_backbone: "#a855f7", financial_system: "#10b981", transport_hub: "#f97316", military_base: "#dc2626", government_datacenter: "#3b82f6", hospital_network: "#14b8a6", fuel_pipeline: "#f97316", satellite_ground: "#8b5cf6", emergency_services: "#dc2626", food_supply: "#84cc16", pharmaceutical: "#14b8a6", defense_contractor: "#dc2626", research_lab: "#a855f7", port_authority: "#06b6d4", airport_system: "#f97316", rail_network: "#f97316" };

export default function GDSNationalInfrastructurePage() {
  const { data: infrastructure = [] } = useQuery({ queryKey: ["critical-infra"], queryFn: () => base44.entities.CriticalInfrastructure.list("-risk_score", 100).catch(() => []) });
  const stats = { total: infrastructure.length, otScada: infrastructure.filter(a => a.has_ot_components || a.has_ics_scada).length, criticalThreat: infrastructure.filter(a => ["critical", "severe"].includes(a.threat_level)).length, operational: infrastructure.filter(a => a.status === "operational").length };

  return (
    <div style={SOVEREIGN_PAGE_BG}>
      <SovereignBreadcrumb items={[{ label: "Critical Infrastructure" }]} />
      <SovereignBanner />
      <ClassificationBanner level="SECRET" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Critical Infrastructure Protection</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-001 · National Asset Defense</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Assets</p><p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>OT/SCADA</p><p className="text-3xl font-black" style={{ color: "#f97316" }}>{stats.otScada}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.criticalThreat > 0 ? CRITICAL_RED + "60" : SOVEREIGN_GOLD + "40" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical Threat</p><p className={`text-3xl font-black ${stats.criticalThreat > 0 ? 'animate-pulse' : ''}`} style={{ color: stats.criticalThreat > 0 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.criticalThreat}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.operational < stats.total ? "#f9731660" : "#10b98160" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Operational</p><p className="text-3xl font-black" style={{ color: stats.operational === stats.total ? "#10b981" : "#f97316" }}>{stats.operational}</p></Card>
      </div>

      <Card className="p-5" style={SOVEREIGN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Name</th>
              <th className="pb-3">Asset Type</th>
              <th className="pb-3">Sector</th>
              <th className="pb-3">Region</th>
              <th className="pb-3">OT/SCADA</th>
              <th className="pb-3">Population</th>
              <th className="pb-3">Econ Value/Day</th>
              <th className="pb-3">Risk Score</th>
              <th className="pb-3">Threat Level</th>
              <th className="pb-3">Open Vulns</th>
              <th className="pb-3">Critical</th>
              <th className="pb-3">RTO/RPO</th>
              <th className="pb-3">Redundancy</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {infrastructure.map(asset => (
              <tr key={asset.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-semibold text-white">{asset.name}</td>
                <td className="py-3"><SovereignBadge color={ASSET_TYPE_COLORS[asset.asset_type] || MUTED}>{asset.asset_type || "general"}</SovereignBadge></td>
                <td className="py-3" style={{ color: MUTED }}>{asset.sector || "—"}</td>
                <td className="py-3" style={{ color: MUTED }}>{asset.region || "—"}</td>
                <td className="py-3">{asset.has_ot_components || asset.has_ics_scada ? <Zap className="w-4 h-4 text-amber-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3 text-white">{asset.population_served ? `${(asset.population_served/1000000).toFixed(1)}M` : "—"}</td>
                <td className="py-3 text-white">${asset.economic_value_daily_usd ? (asset.economic_value_daily_usd/1000000000).toFixed(2) : "—"}B</td>
                <td className="py-3"><div className="w-16 h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${asset.risk_score || 0}%`, background: (asset.risk_score || 0) > 75 ? CRITICAL_RED : (asset.risk_score || 0) > 50 ? "#f97316" : "#10b981" }} /></div></td>
                <td className="py-3"><SovereignBadge color={asset.threat_level === "critical" ? CRITICAL_RED : asset.threat_level === "severe" ? "#dc2626" : asset.threat_level === "high" ? "#f97316" : MUTED}>{asset.threat_level || "low"}</SovereignBadge></td>
                <td className="py-3 text-white">{asset.open_vulnerabilities || 0}</td>
                <td className="py-3">{asset.critical_vulnerabilities > 0 ? <span className="text-red-400 font-bold">{asset.critical_vulnerabilities}</span> : <span style={{ color: MUTED }}>0</span>}</td>
                <td className="py-3" style={{ color: MUTED }}>{asset.rto_hours ? `${asset.rto_hours}h/${asset.rpo_hours || 0}h` : "—"}</td>
                <td className="py-3">{asset.has_redundancy ? <Shield className="w-4 h-4 text-green-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3"><SovereignBadge color={asset.status === "operational" ? "#10b981" : asset.status === "degraded" ? "#f97316" : asset.status === "incident" ? CRITICAL_RED : MUTED}>{asset.status || "unknown"}</SovereignBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}