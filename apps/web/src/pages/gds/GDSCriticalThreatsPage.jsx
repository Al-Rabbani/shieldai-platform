import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Crown, Globe, FileText, Users, DollarSign } from "lucide-react";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { OTBreadcrumb, OTBadge, OTGauge, OT_PAGE_BG, OT_CARD, OT_AMBER, OT_RED, OT_CRITICAL, OT_GREEN, OT_BLUE, BORDER, MUTED, SECTOR_COLORS, PROTOCOL_COLORS, formatPopulation, formatCurrencyUSD } from "@/components/gds/CriticalInfrastructureShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCriticalThreatsPage() {
  const { data: threats = [] } = useQuery({ queryKey: ["ci-threats"], queryFn: () => base44.entities.InfrastructureThreat.list("-severity", 100).catch(() => []) });
  const { data: dependencies = [] } = useQuery({ queryKey: ["ci-dependencies"], queryFn: () => base44.entities.InfrastructureDependency.list("-risk_score", 100).catch(() => []) });

  const stats = {
    active: threats.filter(t => t.status === "active").length,
    existential: threats.filter(t => t.severity === "existential_infrastructure").length,
    cisaAdvisories: threats.filter(t => t.cisa_advisory).length,
    fiveEyes: threats.filter(t => t.five_eyes_classified).length,
  };

  return (
    <div style={OT_PAGE_BG}>
      <OTBreadcrumb items={[{ label: "Industrial Threat Intelligence" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">INDUSTRIAL THREAT INTELLIGENCE</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-005 · OT/ICS SECURITY</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className={`p-4 text-center ${stats.active > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.active > 0 ? OT_RED + "40" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Threats</p>
          <p className="text-3xl font-black" style={{ color: stats.active > 0 ? OT_RED : OT_GREEN }}>{stats.active}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.existential > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.existential > 0 ? OT_CRITICAL + "60" : OT_AMBER + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Existential</p>
          <p className="text-3xl font-black" style={{ color: stats.existential > 0 ? OT_CRITICAL : OT_AMBER }}>{stats.existential}</p>
        </Card>
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>CISA Advisories</p>
          <p className="text-3xl font-black" style={{ color: OT_AMBER }}>{stats.cisaAdvisories}</p>
        </Card>
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Five Eyes Classified</p>
          <p className="text-3xl font-black" style={{ color: OT_GREEN }}>{stats.fiveEyes}</p>
        </Card>
      </div>

      <Card className="p-5 mb-6" style={OT_CARD}>
        <h3 className="text-sm font-bold text-white mb-4">Infrastructure Threats</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-3 px-3">Title</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Origin</th>
                <th className="py-3 px-3">Sectors</th>
                <th className="py-3 px-3">Protocols</th>
                <th className="py-3 px-3">Malware</th>
                <th className="py-3 px-3">IOCs</th>
                <th className="py-3 px-3">MITRE ICS</th>
                <th className="py-3 px-3">CISA</th>
                <th className="py-3 px-3">Prob 30d</th>
                <th className="py-3 px-3">Impact</th>
                <th className="py-3 px-3">Pop Risk</th>
                <th className="py-3 px-3">Five Eyes</th>
              </tr>
            </thead>
            <tbody>
              {threats.map(threat => (
                <tr key={threat.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 px-3 text-white font-bold max-w-xs truncate">{threat.title}</td>
                  <td className="py-3 px-3"><OTBadge color={threat.threat_type === "nation_state" ? OT_CRITICAL : OT_RED}>{threat.threat_type}</OTBadge></td>
                  <td className="py-3 px-3"><OTBadge color={threat.severity === "existential_infrastructure" ? OT_CRITICAL : threat.severity === "critical" ? OT_RED : OT_AMBER}>{threat.severity}</OTBadge></td>
                  <td className="py-3 px-3 text-[10px] text-white">{threat.threat_actor || "—"}</td>
                  <td className="py-3 px-3 text-[10px] text-white">{threat.origin_country || "—"}</td>
                  <td className="py-3 px-3"><div className="flex gap-1">{threat.targeted_sectors?.slice(0, 3).map((s, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${SECTOR_COLORS[s] || OT_AMBER}15`, color: SECTOR_COLORS[s] || OT_AMBER }}>{s}</span>)}</div></td>
                  <td className="py-3 px-3"><div className="flex gap-1">{threat.targeted_protocols?.slice(0, 2).map((p, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${PROTOCOL_COLORS[p] || OT_AMBER}15`, color: PROTOCOL_COLORS[p] || OT_AMBER }}>{p}</span>)}</div></td>
                  <td className="py-3 px-3 text-[10px]">{threat.malware_family ? <span className="text-red-500 font-bold">{threat.malware_family}</span> : "—"}</td>
                  <td className="py-3 px-3 text-center text-white">{threat.ioc_count || 0}</td>
                  <td className="py-3 px-3"><div className="flex gap-1">{threat.mitre_ics_techniques?.slice(0, 3).map((t, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OT_RED}15`, color: OT_RED }}>{t}</span>)}</div></td>
                  <td className="py-3 px-3 text-center">{threat.cisa_advisory ? <FileText className="w-4 h-4 inline" style={{ color: OT_AMBER }} /> : "—"}</td>
                  <td className="py-3 px-3 text-center"><div className="w-12 h-1.5 rounded-full bg-white/10 mx-auto"><div className="h-full rounded-full" style={{ width: `${threat.probability_30d || 0}%`, background: (threat.probability_30d || 0) > 50 ? OT_CRITICAL : OT_AMBER }} /></div></td>
                  <td className="py-3 px-3 text-[10px]">{formatCurrencyUSD(threat.potential_impact_usd)}</td>
                  <td className="py-3 px-3 text-center"><span className="text-white font-bold">{formatPopulation(threat.population_at_risk)}</span></td>
                  <td className="py-3 px-3 text-center">{threat.five_eyes_classified ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5" style={OT_CARD}>
        <h3 className="text-sm font-bold text-white mb-4">Infrastructure Dependencies</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-3 px-3">From</th>
                <th className="py-3 px-3">To</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Critical</th>
                <th className="py-3 px-3">Cascades To</th>
                <th className="py-3 px-3">RTO/RPO</th>
                <th className="py-3 px-3">Backup</th>
                <th className="py-3 px-3">Capacity</th>
                <th className="py-3 px-3">Risk</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {dependencies.map(dep => (
                <tr key={dep.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 px-3 text-white font-bold">{dep.from_sector}</td>
                  <td className="py-3 px-3 text-white font-bold">→ {dep.to_sector}</td>
                  <td className="py-3 px-3"><OTBadge color={dep.dependency_type === "power_supply" ? OT_AMBER : dep.dependency_type === "control_system" ? OT_RED : OT_BLUE}>{dep.dependency_type}</OTBadge></td>
                  <td className="py-3 px-3 text-center">{dep.is_critical ? <Shield className="w-4 h-4 inline" style={{ color: OT_AMBER }} /> : "—"}</td>
                  <td className="py-3 px-3"><div className="flex gap-1">{dep.failure_cascades_to?.slice(0, 3).map((s, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OT_RED}15`, color: OT_RED }}>{s}</span>)}</div></td>
                  <td className="py-3 px-3 text-[10px] text-white">{dep.rto_hours}h / {dep.rpo_hours}h</td>
                  <td className="py-3 px-3 text-center">{dep.has_backup ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : <Shield className="w-4 h-4 inline" style={{ color: OT_RED }} />}</td>
                  <td className="py-3 px-3 text-center"><div className="w-16 h-1.5 rounded-full bg-white/10 mx-auto"><div className="h-full rounded-full" style={{ width: `${dep.backup_capacity_pct || 0}%`, background: (dep.backup_capacity_pct || 0) < 50 ? OT_RED : OT_GREEN }} /></div></td>
                  <td className="py-3 px-3 text-center"><OTGauge score={dep.risk_score || 0} size={40} /></td>
                  <td className="py-3 px-3"><OTBadge color={dep.status === "failed" ? OT_CRITICAL : dep.status === "degraded" ? OT_RED : OT_GREEN}>{dep.status}</OTBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}