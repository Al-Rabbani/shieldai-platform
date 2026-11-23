import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, Activity, Globe, Users, Zap, Crown } from "lucide-react";
import { SovereignBreadcrumb, SovereignBanner, SovereignBadge, ClassificationBanner, SOVEREIGN_PAGE_BG, SOVEREIGN_CARD, SOVEREIGN_GOLD, MUTED, CRITICAL_RED } from "@/components/gds/NationalCommandShared";
import { CARD, BORDER, Card } from "@/components/gds/GDSOSShared";

const SOC_TYPE_COLORS = { national_soc: SOVEREIGN_GOLD, military_soc: "#7f1d1d", election_soc: "#f59e0b", sector_soc: "#3b82f6", intelligence_soc: "#a855f7", regional_soc: "#10b981", federal_soc: "#3b82f6", state_soc: "#f97316", local_soc: "#6b7280", private_soc: "#6366f1" };
const CLASSIFICATION_COLORS = { unclassified: "#6b7280", official: "#3b82f6", secret: "#f97316", top_secret: "#dc2626", sci: "#7f1d1d" };

export default function GDSNationalSOCsPage() {
  const { data: socs = [] } = useQuery({ queryKey: ["regional-socs"], queryFn: () => base44.entities.RegionalSOC.list("-analysts_on_duty", 100).catch(() => []) });
  const { data: tenant } = useQuery({ queryKey: ["gov-tenant"], queryFn: () => base44.entities.GovernmentTenant.list().then(r => r[0]).catch(() => null) });
  
  const stats = { total: socs.length, national: socs.filter(s => s.soc_type === "national_soc").length, operational: socs.filter(s => s.status === "operational").length, avgMttd: socs.length > 0 ? socs.reduce((s, soc) => s + (soc.mttd_minutes || 0), 0) / socs.length : 0 };

  return (
    <div style={SOVEREIGN_PAGE_BG}>
      <SovereignBreadcrumb items={[{ label: "SOC Network" }]} />
      <SovereignBanner />
      <ClassificationBanner level="TOP SECRET" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">National SOC Network</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-001 · Distributed SOC Operations</p>
      </div>

      {tenant && (
        <Card className="p-5 mb-6" style={{ ...SOVEREIGN_CARD, border: `2px solid ${SOVEREIGN_GOLD}40` }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">{tenant.nation_name}</h3>
              <div className="flex items-center gap-2">
                <SovereignBadge color={tenant.sovereignty_status === "sovereign" ? SOVEREIGN_GOLD : MUTED}>{tenant.sovereignty_status || "sovereign"}</SovereignBadge>
                <SovereignBadge color={tenant.classification_ceiling === "top_secret" ? CRITICAL_RED : tenant.classification_ceiling === "secret" ? "#dc2626" : "#3b82f6"}>{tenant.classification_ceiling || "official"}</SovereignBadge>
                {tenant.is_five_eyes && <SovereignBadge color="#3b82f6">Five Eyes</SovereignBadge>}
                {tenant.is_nato && <SovereignBadge color="#06b6d4">NATO</SovereignBadge>}
                {tenant.is_eu && <SovereignBadge color="#3b82f6">EU</SovereignBadge>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center"><p className="text-2xl font-black" style={{ color: SOVEREIGN_GOLD }}>{tenant.total_agencies || 0}</p><p className="text-[9px]" style={{ color: MUTED }}>Agencies</p></div>
              <div className="text-center"><p className="text-2xl font-black" style={{ color: SOVEREIGN_GOLD }}>{tenant.total_assets || 0}</p><p className="text-[9px]" style={{ color: MUTED }}>Assets</p></div>
              <div className="w-20 h-20 rounded bg-white/5 flex items-center justify-center"><span className="text-3xl font-black" style={{ color: (tenant.cyber_maturity_level || 0) >= 4 ? "#10b981" : (tenant.cyber_maturity_level || 0) >= 3 ? "#f97316" : CRITICAL_RED }}>{tenant.cyber_maturity_level || 0}<span className="text-sm">/5</span></span></div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total SOCs</p><p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>National SOC</p><p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{stats.national}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.operational < stats.total ? "#f9731660" : "#10b98160" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Operational</p><p className="text-3xl font-black" style={{ color: stats.operational === stats.total ? "#10b981" : "#f97316" }}>{stats.operational}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.avgMttd > 30 ? "#f9731660" : "#10b98160" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg MTTD</p><p className="text-3xl font-black" style={{ color: stats.avgMttd > 30 ? "#f97316" : "#10b981" }}>{Math.round(stats.avgMttd)}m</p></Card>
      </div>

      <Card className="p-5" style={SOVEREIGN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Name</th>
              <th className="pb-3">SOC Type</th>
              <th className="pb-3">Classification</th>
              <th className="pb-3">Region</th>
              <th className="pb-3">Agencies</th>
              <th className="pb-3">Analysts</th>
              <th className="pb-3">Alerts Today</th>
              <th className="pb-3">Active Incidents</th>
              <th className="pb-3">Threats</th>
              <th className="pb-3">MTTD</th>
              <th className="pb-3">MTTR</th>
              <th className="pb-3">Automation</th>
              <th className="pb-3">Intel Feeds</th>
              <th className="pb-3">Sharing</th>
              <th className="pb-3">Allied</th>
              <th className="pb-3">Last Drill</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {socs.map(soc => (
              <tr key={soc.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-semibold text-white">{soc.name}</td>
                <td className="py-3"><SovereignBadge color={SOC_TYPE_COLORS[soc.soc_type] || MUTED}>{soc.soc_type || "regional"}</SovereignBadge></td>
                <td className="py-3"><SovereignBadge color={CLASSIFICATION_COLORS[soc.classification_level] || MUTED}>{soc.classification_level || "official"}</SovereignBadge></td>
                <td className="py-3" style={{ color: MUTED }}>{soc.region || "—"}</td>
                <td className="py-3 text-white">{soc.agencies_monitored || 0}</td>
                <td className="py-3 text-white">{soc.analysts_on_duty || 0}</td>
                <td className="py-3 text-white">{soc.alerts_today || 0}</td>
                <td className="py-3">{soc.incidents_active > 0 ? <span className="text-red-400 font-bold">{soc.incidents_active}</span> : <span style={{ color: MUTED }}>0</span>}</td>
                <td className="py-3 text-white">{soc.threats_tracking || 0}</td>
                <td className="py-3"><span className={soc.mttd_minutes < 15 ? "text-green-400" : soc.mttd_minutes < 30 ? "text-amber-400" : "text-red-400"}>{soc.mttd_minutes || 0}m</span></td>
                <td className="py-3 text-white">{soc.mttr_minutes || 0}m</td>
                <td className="py-3"><div className="w-16 h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${soc.automation_rate_pct || 0}%`, background: (soc.automation_rate_pct || 0) > 70 ? "#10b981" : "#f97316" }} /></div></td>
                <td className="py-3 text-white">{soc.threat_intel_feeds || 0}</td>
                <td className="py-3">{soc.inter_agency_sharing ? <Shield className="w-4 h-4 text-blue-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3"><div className="flex gap-1">{(soc.allied_connections || []).slice(0, 3).map((a, i) => (<span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{a}</span>))}</div></td>
                <td className="py-3" style={{ color: soc.last_drill && new Date(soc.last_drill) < new Date(Date.now() - 60*24*60*60*1000) ? "#f97316" : MUTED }}>{soc.last_drill ? new Date(soc.last_drill).toLocaleDateString() : "—"}</td>
                <td className="py-3"><SovereignBadge color={soc.status === "operational" ? "#10b981" : soc.status === "incident" ? CRITICAL_RED : soc.status === "offline" ? "#6b7280" : MUTED}>{soc.status || "unknown"}</SovereignBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}