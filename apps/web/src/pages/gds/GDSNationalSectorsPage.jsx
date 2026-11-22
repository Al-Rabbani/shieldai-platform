import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Activity, TrendingUp } from "lucide-react";
import { SovereignBreadcrumb, SovereignBanner, SovereignBadge, ClassificationBanner, SOVEREIGN_PAGE_BG, SOVEREIGN_CARD, SOVEREIGN_GOLD, BORDER, MUTED, CRITICAL_RED } from "@/components/gds/NationalCommandShared";
import { Card } from "@/components/gds/GDSOSShared";

const SECTOR_TYPE_COLORS = { energy: "#dc2626", water: "#3b82f6", healthcare: "#14b8a6", financial: "#10b981", transport: "#f97316", telecom: "#a855f7", government: "#3b82f6", defense: CRITICAL_RED, election: SOVEREIGN_GOLD, food: "#84cc16", manufacturing: "#6366f1", chemical: "#f97316", nuclear: "#7f1d1d", dams: "#3b82f6", emergency: CRITICAL_RED, it: "#06b6d4", postal: "#84cc16", commercial: "#10b981", education: "#8b5cf6" };

export default function GDSNationalSectorsPage() {
  const { data: sectors = [] } = useQuery({ queryKey: ["national-sectors"], queryFn: () => base44.entities.NationalSector.list("-risk_score", 100).catch(() => []) });
  const stats = { total: sectors.length, critical: sectors.filter(s => s.is_critical).length, elevated: sectors.filter(s => ["elevated", "alert", "crisis"].includes(s.status)).length, totalRisk: sectors.reduce((s, sec) => s + (sec.risk_score || 0), 0) };

  return (
    <div style={SOVEREIGN_PAGE_BG}>
      <SovereignBreadcrumb items={[{ label: "National Sectors" }]} />
      <SovereignBanner />
      <ClassificationBanner level="OFFICIAL" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">National Sector Overview</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-001 · Sector Risk Assessment</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Sectors</p><p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.critical > 0 ? CRITICAL_RED + "60" : SOVEREIGN_GOLD + "40" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical</p><p className={`text-3xl font-black ${stats.critical > 0 ? 'animate-pulse' : ''}`} style={{ color: stats.critical > 0 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.critical}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.elevated > 0 ? "#f9731660" : SOVEREIGN_GOLD + "40" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Elevated/Alert</p><p className="text-3xl font-black" style={{ color: stats.elevated > 0 ? "#f97316" : SOVEREIGN_GOLD }}>{stats.elevated}</p></Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Risk Score</p><p className="text-3xl font-black" style={{ color: stats.totalRisk / (stats.total || 1) > 75 ? CRITICAL_RED : stats.totalRisk / (stats.total || 1) > 50 ? "#f97316" : SOVEREIGN_GOLD }}>{Math.round(stats.totalRisk / (stats.total || 1))}</p></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.map(sector => (
          <Card key={sector.id} className="p-5 hover:scale-[1.02] transition-transform" style={{ ...SOVEREIGN_CARD, borderColor: sector.threat_level === "critical" ? CRITICAL_RED + "60" : sector.threat_level === "severe" ? "#dc262660" : SOVEREIGN_GOLD + "40" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-base font-bold text-white">{sector.name}</h4>
                <p className="text-[9px] mt-1" style={{ color: MUTED }}>{sector.sector_type || "general"}</p>
              </div>
              {sector.is_critical && <Shield className="w-5 h-5" style={{ color: CRITICAL_RED }} />}
            </div>
            <div className="flex items-center justify-between mb-3">
              <SovereignBadge color={SECTOR_TYPE_COLORS[sector.sector_type] || MUTED}>{sector.sector_type || "general"}</SovereignBadge>
              <SovereignBadge color={sector.threat_level === "critical" ? CRITICAL_RED : sector.threat_level === "severe" ? "#dc2626" : sector.threat_level === "high" ? "#f97316" : MUTED}>{sector.threat_level || "low"}</SovereignBadge>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-16 h-16 rounded bg-white/5 flex items-center justify-center">
                <span className="text-2xl font-black" style={{ color: (sector.risk_score || 0) > 75 ? CRITICAL_RED : (sector.risk_score || 0) > 50 ? "#f97316" : "#10b981" }}>{sector.risk_score || 0}</span>
              </div>
              <div className="flex-1">
                <div className="w-full h-2 rounded-full bg-white/10 mb-1">
                  <div className="h-full rounded-full" style={{ width: `${sector.risk_score || 0}%`, background: (sector.risk_score || 0) > 75 ? CRITICAL_RED : (sector.risk_score || 0) > 50 ? "#f97316" : "#10b981" }} />
                </div>
                <p className="text-[8px]" style={{ color: MUTED }}>Risk Score</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div><p className="text-lg font-bold text-white">{sector.agency_count || 0}</p><p className="text-[8px]" style={{ color: MUTED }}>Agencies</p></div>
              <div><p className="text-lg font-bold text-white">{sector.asset_count || 0}</p><p className="text-[8px]" style={{ color: MUTED }}>Assets</p></div>
              <div><p className={`text-lg font-bold ${sector.active_incidents > 0 ? 'text-red-400' : 'text-white'}`}>{sector.active_incidents || 0}</p><p className="text-[8px]" style={{ color: MUTED }}>Incidents</p></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-1">{(sector.compliance_frameworks || []).slice(0, 2).map((f, i) => (<span key={i} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{f}</span>))}</div>
              <SovereignBadge color={sector.status === "normal" ? "#10b981" : sector.status === "elevated" ? "#f59e0b" : sector.status === "alert" ? "#f97316" : sector.status === "crisis" ? CRITICAL_RED : MUTED}>{sector.status || "normal"}</SovereignBadge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}