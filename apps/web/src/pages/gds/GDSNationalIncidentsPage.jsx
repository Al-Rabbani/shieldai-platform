import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Globe, Flag, Activity } from "lucide-react";
import { SovereignBreadcrumb, SovereignBanner, SovereignBadge, ClassificationBanner, SOVEREIGN_PAGE_BG, SOVEREIGN_CARD, SOVEREIGN_GOLD, BORDER, MUTED, CRITICAL_RED } from "@/components/gds/NationalCommandShared";
import { Card } from "@/components/gds/GDSOSShared";

const INCIDENT_TYPE_COLORS = { state_sponsored_attack: CRITICAL_RED, ransomware_national: CRITICAL_RED, energy_grid_attack: "#f97316", election_interference: SOVEREIGN_GOLD, data_breach_gov: "#a855f7", critical_infra_compromise: CRITICAL_RED, supply_chain_attack: "#f97316", apt_campaign: CRITICAL_RED, ddos_national: "#f59e0b", insider_threat: "#6366f1", cyber_espionage: "#a855f7", sabotage_attempt: CRITICAL_RED, misinformation_campaign: "#f59e0b", financial_system_attack: "#10b981", healthcare_system_attack: "#14b8a6" };

export default function GDSNationalIncidentsPage() {
  const { data: incidents = [] } = useQuery({ queryKey: ["national-incidents"], queryFn: () => base44.entities.NationalIncident.filter({ status: { $ne: "closed" } }, "-detected_at", 100).catch(() => []) });
  const stats = { active: incidents.length, emergency: incidents.filter(i => i.severity === "national_emergency").length, crossBorder: incidents.filter(i => i.is_cross_border).length, crisis: incidents.filter(i => i.national_crisis_declared).length };

  return (
    <div style={SOVEREIGN_PAGE_BG}>
      <SovereignBreadcrumb items={[{ label: "Incident Management" }]} />
      <SovereignBanner />
      <ClassificationBanner level="SECRET" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">National Incident Management</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-001 · Sovereign Incident Response</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active</p><p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{stats.active}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.emergency > 0 ? CRITICAL_RED + "60" : SOVEREIGN_GOLD + "40" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>National Emergency</p><p className={`text-3xl font-black ${stats.emergency > 0 ? 'animate-pulse' : ''}`} style={{ color: stats.emergency > 0 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.emergency}</p></Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Cross-Border</p><p className="text-3xl font-black" style={{ color: "#3b82f6" }}>{stats.crossBorder}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.crisis > 0 ? CRITICAL_RED + "60" : SOVEREIGN_GOLD + "40" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Crisis Declared</p><p className={`text-3xl font-black ${stats.crisis > 0 ? 'animate-pulse' : ''}`} style={{ color: stats.crisis > 0 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.crisis}</p></Card>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Active Incidents</h3>
        <button className="text-[10px] font-bold px-4 py-2 rounded" style={{ background: `${CRITICAL_RED}20`, color: CRITICAL_RED, border: `1px solid ${CRITICAL_RED}40` }}>⚠ Declare National Crisis</button>
      </div>

      <Card className="p-5" style={SOVEREIGN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">National Ref</th>
              <th className="pb-3">Title</th>
              <th className="pb-3">Incident Type</th>
              <th className="pb-3">Severity</th>
              <th className="pb-3">Classification</th>
              <th className="pb-3">Affected Agencies</th>
              <th className="pb-3">Population</th>
              <th className="pb-3">Impact USD</th>
              <th className="pb-3">Threat Actor</th>
              <th className="pb-3">Nation State</th>
              <th className="pb-3">Cross Border</th>
              <th className="pb-3">Crisis</th>
              <th className="pb-3">Containment</th>
              <th className="pb-3">Detected</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {incidents.map(inc => (
              <tr key={inc.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-mono font-bold" style={{ color: SOVEREIGN_GOLD }}>{inc.national_ref}</td>
                <td className="py-3 font-semibold text-white">{inc.title}</td>
                <td className="py-3"><SovereignBadge color={INCIDENT_TYPE_COLORS[inc.incident_type] || MUTED}>{inc.incident_type || "unknown"}</SovereignBadge></td>
                <td className="py-3"><SovereignBadge color={inc.severity === "national_emergency" ? CRITICAL_RED : inc.severity === "critical" ? "#dc2626" : "#f97316"}>{inc.severity || "high"}</SovereignBadge></td>
                <td className="py-3"><SovereignBadge color={inc.classification === "top_secret" ? CRITICAL_RED : inc.classification === "secret" ? "#dc2626" : "#3b82f6"}>{inc.classification || "official"}</SovereignBadge></td>
                <td className="py-3"><div className="flex gap-1">{(inc.affected_agencies || []).slice(0, 2).map((a, i) => (<span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{a}</span>))}</div></td>
                <td className="py-3 text-white">{inc.affected_population ? `${(inc.affected_population/1000000).toFixed(1)}M` : "—"}</td>
                <td className="py-3 text-white">${inc.estimated_impact_usd ? (inc.estimated_impact_usd/1000000000).toFixed(2) : "—"}B</td>
                <td className="py-3" style={{ color: MUTED }}>{inc.threat_actor || "Unknown"}</td>
                <td className="py-3">{inc.nation_state_attribution ? <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${CRITICAL_RED}15`, color: CRITICAL_RED }}>{inc.nation_state_attribution}</span> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3">{inc.is_cross_border ? <Globe className="w-4 h-4 text-blue-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3">{inc.national_crisis_declared ? <SovereignBadge color={CRITICAL_RED}>CRISIS</SovereignBadge> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3"><div className="w-16 h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${inc.containment_progress || 0}%`, background: (inc.containment_progress || 0) > 75 ? "#10b981" : (inc.containment_progress || 0) > 30 ? "#f97316" : CRITICAL_RED }} /></div></td>
                <td className="py-3" style={{ color: MUTED }}>{inc.detected_at ? new Date(inc.detected_at).toLocaleDateString() : "—"}</td>
                <td className="py-3"><SovereignBadge color={inc.status === "active" ? "#10b981" : inc.status === "contained" ? "#f97316" : inc.status === "recovering" ? "#3b82f6" : MUTED}>{inc.status || "unknown"}</SovereignBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}