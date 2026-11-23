import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Activity, Users, DollarSign, Crown, Zap } from "lucide-react";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { OTBreadcrumb, OTBanner, OTBadge, OTStat, OTGauge, OT_PAGE_BG, OT_CARD, OT_AMBER, OT_ORANGE, OT_RED, OT_GREEN, OT_BLUE, BORDER, MUTED, SECTOR_COLORS } from "@/components/gds/CriticalInfrastructureShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCriticalInfrastructurePage() {
  const { data: sectors = [] } = useQuery({ queryKey: ["ci-sectors"], queryFn: () => base44.entities.InfrastructureSector.list("-risk_score", 100).catch(() => []) });
  const { data: otAssets = [] } = useQuery({ queryKey: ["ci-ot-assets"], queryFn: () => base44.entities.OTAsset.list().catch(() => []) });
  const { data: threats = [] } = useQuery({ queryKey: ["ci-threats"], queryFn: () => base44.entities.InfrastructureThreat.filter({ status: "active" }).catch(() => []) });
  const { data: incidents = [] } = useQuery({ queryKey: ["ci-incidents"], queryFn: () => base44.entities.IndustrialIncident.filter({ status: { $ne: "closed" } }).catch(() => []) });

  const safetyIncident = incidents.some(i => i.operational_impact && i.safety_system_triggered);
  const existentialThreats = threats.filter(t => t.severity === "existential_infrastructure").length;
  const totalPopulation = sectors.reduce((s, sec) => s + (sec.population_served || 0), 0);
  const dailyEconomicValue = sectors.reduce((s, sec) => s + (sec.daily_economic_value_usd || 0), 0);

  const stats = {
    sectors: sectors.length,
    otAssets: otAssets.length,
    population: totalPopulation,
    dailyValue: dailyEconomicValue,
    incidents: incidents.length,
    existentialThreats,
  };

  return (
    <div style={OT_PAGE_BG}>
      <OTBreadcrumb items={[{ label: "Command Center" }]} />
      <OTBanner safetyIncident={safetyIncident} existentialThreat={existentialThreats} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">CRITICAL INFRASTRUCTURE PROTECTION COMMAND CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-005 · OT/ICS Security Platform</p>
        </div>
        <LiveDataBadge label="OT/ICS LIVE" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Sectors Protected</p>
          <p className="text-3xl font-black" style={{ color: OT_AMBER }}>{stats.sectors}</p>
        </Card>
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>OT Assets</p>
          <p className="text-3xl font-black" style={{ color: OT_ORANGE }}>{stats.otAssets}</p>
        </Card>
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Population Protected</p>
          <p className="text-2xl font-black" style={{ color: OT_GREEN }}>{(stats.population/1000000).toFixed(2)}M</p>
        </Card>
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Daily Economic Value</p>
          <p className="text-xl font-black" style={{ color: OT_GREEN }}>${(stats.dailyValue/1000000000).toFixed(2)}B</p>
        </Card>
        <Card className={`p-4 text-center ${stats.incidents > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.incidents > 0 ? OT_RED + "40" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Operational Incidents</p>
          <p className="text-3xl font-black" style={{ color: stats.incidents > 0 ? OT_RED : OT_GREEN }}>{stats.incidents}</p>
        </Card>
        <Card className={`p-4 text-center ${existentialThreats > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${existentialThreats > 0 ? OT_RED + "60" : OT_AMBER + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Existential Threats</p>
          <p className="text-3xl font-black" style={{ color: existentialThreats > 0 ? OT_RED : OT_AMBER }}>{existentialThreats}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* SECTORS GRID */}
        <Card className="p-5" style={OT_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: OT_AMBER }} />Protected Sectors</h3>
            <Link to="/critical-infrastructure/sectors" className="text-[10px] font-bold" style={{ color: OT_AMBER }}>View All →</Link>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {sectors.slice(0, 8).map(sec => (
              <div key={sec.id} className="p-4 rounded-xl" style={{ background: "#0f1620", border: `1px solid ${SECTOR_COLORS[sec.sector_type] || OT_AMBER}30` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{sec.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <OTBadge color={SECTOR_COLORS[sec.sector_type] || OT_AMBER}>{sec.sector_type}</OTBadge>
                      <OTBadge color={sec.threat_level === "critical" ? OT_RED : sec.threat_level === "severe" ? OT_ORANGE : OT_AMBER}>{sec.threat_level}</OTBadge>
                    </div>
                  </div>
                  <OTGauge score={sec.risk_score || 0} size={50} />
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-[8px]" style={{ color: MUTED }}>OT Assets</p><p className="text-sm font-bold text-white">{sec.ot_asset_count || 0}</p></div>
                  <div><p className="text-[8px]" style={{ color: MUTED }}>ICS</p><p className="text-sm font-bold text-white">{sec.ics_controllers || 0}</p></div>
                  <div><p className="text-[8px]" style={{ color: MUTED }}>Population</p><p className="text-sm font-bold" style={{ color: OT_GREEN }}>{((sec.population_served || 0)/1000000).toFixed(1)}M</p></div>
                  <div><p className="text-[8px]" style={{ color: MUTED }}>Daily Value</p><p className="text-sm font-bold" style={{ color: OT_GREEN }}>${((sec.daily_economic_value_usd || 0)/1000000).toFixed(1)}M</p></div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                  <OTBadge color={sec.iec_62443_level === "SL4" ? "#fbbf24" : sec.iec_62443_level === "SL3" ? OT_BLUE : sec.iec_62443_level === "SL2" ? OT_GREEN : MUTED}>{sec.iec_62443_level}</OTBadge>
                  <span className="text-[9px]" style={{ color: sec.active_incidents > 0 ? OT_RED : MUTED }}>{sec.active_incidents > 0 ? `${sec.active_incidents} incidents` : "No incidents"}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* THREAT OVERVIEW */}
        <Card className="p-5" style={OT_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: OT_RED }} />Active Threats</h3>
            <Link to="/critical-infrastructure/threats" className="text-[10px] font-bold" style={{ color: OT_AMBER }}>View All →</Link>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {threats.slice(0, 8).map(threat => (
              <div key={threat.id} className="p-4 rounded-xl" style={{ background: "#0f1620", border: `1px solid ${threat.severity === "existential_infrastructure" ? OT_RED + "60" : threat.severity === "critical" ? OT_RED + "40" : OT_ORANGE + "30"}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {threat.severity === "existential_infrastructure" && <Crown className="w-3 h-3" style={{ color: OT_RED }} />}
                      <OTBadge color={threat.severity === "existential_infrastructure" ? OT_RED : threat.severity === "critical" ? OT_RED : OT_ORANGE}>{threat.severity}</OTBadge>
                      <OTBadge color={OT_RED}>{threat.threat_type}</OTBadge>
                    </div>
                    <p className="text-xs font-bold text-white">{threat.title}</p>
                  </div>
                  <OTGauge score={threat.probability_30d || 0} size={40} />
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span style={{ color: MUTED }}>{threat.origin_country || "Unknown"}</span>
                  <span className="font-bold" style={{ color: (threat.probability_30d || 0) > 50 ? OT_RED : OT_ORANGE }}>{threat.probability_30d || 0}% probability</span>
                </div>
                {threat.cisa_advisory_ref && (
                  <div className="mt-2 flex items-center gap-2">
                    <OTBadge color="#fbbf24">CISA Advisory</OTBadge>
                    <span className="text-[9px] font-mono" style={{ color: "#fbbf24" }}>{threat.cisa_advisory_ref}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}