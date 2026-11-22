import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Lock } from "lucide-react";
import { SovereignBreadcrumb, SovereignBanner, SovereignBadge, ClassificationBanner, SOVEREIGN_PAGE_BG, SOVEREIGN_CARD, SOVEREIGN_GOLD, BORDER, MUTED, CRITICAL_RED } from "@/components/gds/NationalCommandShared";
import { Card } from "@/components/gds/GDSOSShared";

const AGENCY_TYPE_COLORS = { defense: "#dc2626", intelligence: "#a855f7", national_cert: "#3b82f6", central_bank: "#c9a84c", election: "#f59e0b", homeland_security: "#dc2626", treasury: "#10b981", justice: "#8b5cf6", energy: "#f97316", transport: "#06b6d4", health: "#14b8a6", commerce: "#10b981", state: "#3b82f6", interior: "#0ea5e9", agriculture: "#84cc16", education: "#8b5cf6", labor: "#f97316", housing: "#f43f5e", veterans: "#6366f1", foreign_affairs: "#3b82f6" };
const CLASSIFICATION_COLORS = { unclassified: "#6b7280", official: "#3b82f6", secret: "#f97316", top_secret: "#dc2626", sci: "#7f1d1d" };

export default function GDSNationalAgenciesPage() {
  const { data: agencies = [] } = useQuery({ queryKey: ["gov-agencies"], queryFn: () => base44.entities.GovernmentAgency.list("-risk_score", 100).catch(() => []) });
  const stats = { total: agencies.length, critical: agencies.filter(a => a.is_critical_infrastructure).length, sharing: agencies.filter(a => a.inter_agency_sharing).length, highThreat: agencies.filter(a => ["high", "severe", "critical"].includes(a.threat_level)).length };

  return (
    <div style={SOVEREIGN_PAGE_BG}>
      <SovereignBreadcrumb items={[{ label: "Government Agencies" }]} />
      <SovereignBanner />
      <ClassificationBanner level="OFFICIAL" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Government Agency Dashboard</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-001 · National Agency Oversight</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Agencies</p><p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.critical > 0 ? CRITICAL_RED + "60" : SOVEREIGN_GOLD + "40" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical Infra</p><p className={`text-3xl font-black ${stats.critical > 0 ? 'animate-pulse' : ''}`} style={{ color: stats.critical > 0 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.critical}</p></Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Sharing Intel</p><p className="text-3xl font-black" style={{ color: "#3b82f6" }}>{stats.sharing}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.highThreat > 0 ? "#f9731660" : SOVEREIGN_GOLD + "40" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>High/Severe</p><p className="text-3xl font-black" style={{ color: stats.highThreat > 0 ? "#f97316" : SOVEREIGN_GOLD }}>{stats.highThreat}</p></Card>
      </div>

      <Card className="p-5" style={SOVEREIGN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Name</th>
              <th className="pb-3">Short</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Classification</th>
              <th className="pb-3">Region</th>
              <th className="pb-3">Risk</th>
              <th className="pb-3">Open</th>
              <th className="pb-3">Critical</th>
              <th className="pb-3">Compliance</th>
              <th className="pb-3">Threat</th>
              <th className="pb-3">Incidents</th>
              <th className="pb-3">Sharing</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {agencies.map(agency => (
              <tr key={agency.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-semibold text-white">{agency.name}</td>
                <td className="py-3"><span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: `${SOVEREIGN_GOLD}15`, color: SOVEREIGN_GOLD }}>{agency.short_name || "—"}</span></td>
                <td className="py-3"><SovereignBadge color={AGENCY_TYPE_COLORS[agency.agency_type] || MUTED}>{agency.agency_type || "general"}</SovereignBadge></td>
                <td className="py-3"><SovereignBadge color={CLASSIFICATION_COLORS[agency.classification_level] || MUTED}>{agency.classification_level || "unclassified"}</SovereignBadge></td>
                <td className="py-3" style={{ color: MUTED }}>{agency.region || "—"}</td>
                <td className="py-3"><div className="w-12 h-6 rounded bg-white/5 flex items-center justify-center"><span className="text-xs font-bold" style={{ color: (agency.risk_score || 0) > 75 ? CRITICAL_RED : "#f97316" }}>{agency.risk_score || 0}</span></div></td>
                <td className="py-3 text-white">{agency.open_findings || 0}</td>
                <td className="py-3"><span className={agency.critical_findings > 0 ? "text-red-400 font-bold" : MUTED}>{agency.critical_findings || 0}</span></td>
                <td className="py-3"><div className="w-12 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${agency.compliance_score || 0}%`, background: (agency.compliance_score || 0) > 75 ? "#10b981" : "#f97316" }} /></div></td>
                <td className="py-3"><SovereignBadge color={agency.threat_level === "critical" ? CRITICAL_RED : agency.threat_level === "severe" ? "#dc2626" : agency.threat_level === "high" ? "#f97316" : "#3b82f6"}>{agency.threat_level || "low"}</SovereignBadge></td>
                <td className="py-3"><span className={agency.active_incidents > 0 ? "text-red-400 font-bold" : MUTED}>{agency.active_incidents || 0}</span></td>
                <td className="py-3">{agency.inter_agency_sharing ? <Shield className="w-4 h-4 text-blue-400" /> : <Lock className="w-4 h-4" style={{ color: MUTED }} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}