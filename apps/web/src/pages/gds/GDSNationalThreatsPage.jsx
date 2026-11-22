import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Crown, Globe, Target } from "lucide-react";
import { SovereignBreadcrumb, SovereignBanner, SovereignBadge, ClassificationBanner, SOVEREIGN_PAGE_BG, SOVEREIGN_CARD, SOVEREIGN_GOLD, BORDER, MUTED, CRITICAL_RED } from "@/components/gds/NationalCommandShared";
import { Card } from "@/components/gds/GDSOSShared";

const THREAT_TYPE_COLORS = { nation_state_apt: CRITICAL_RED, ransomware_group: "#f97316", election_interference: SOVEREIGN_GOLD, critical_infra_targeting: "#7f1d1d", ai_enabled_attack: "#a855f7", cyber_espionage: "#8b5cf6", supply_chain_compromise: "#f97316", insider_threat: "#6366f1", hacktivist: "#f59e0b", cyber_terrorism: CRITICAL_RED, advanced_persistent_threat: CRITICAL_RED, state_aligned_actor: CRITICAL_RED, criminal_syndicate: "#f97316", geopolitical_actor: "#a855f7" };

export default function GDSNationalThreatsPage() {
  const { data: threats = [] } = useQuery({ queryKey: ["national-threats"], queryFn: () => base44.entities.NationalThreat.list("-probability_30d", 100).catch(() => []) });
  const stats = { active: threats.filter(t => t.campaign_active).length, nationState: threats.filter(t => t.threat_type === "nation_state_apt").length, existential: threats.filter(t => t.severity === "existential").length, fiveEyes: threats.filter(t => t.five_eyes_shared).length };

  return (
    <div style={SOVEREIGN_PAGE_BG}>
      <SovereignBreadcrumb items={[{ label: "Threat Intelligence" }]} />
      <SovereignBanner />
      <ClassificationBanner level="SECRET" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">National Threat Intelligence</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-001 · Sovereign Threat Assessment</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Threats</p><p className="text-3xl font-black" style={{ color: SOVEREIGN_GOLD }}>{stats.active}</p></Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Nation-State APT</p><p className="text-3xl font-black" style={{ color: CRITICAL_RED }}>{stats.nationState}</p></Card>
        <Card className="p-4 text-center" style={{ ...SOVEREIGN_CARD, borderColor: stats.existential > 0 ? CRITICAL_RED + "60" : SOVEREIGN_GOLD + "40" }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Existential</p><p className={`text-3xl font-black ${stats.existential > 0 ? 'animate-pulse' : ''}`} style={{ color: stats.existential > 0 ? CRITICAL_RED : SOVEREIGN_GOLD }}>{stats.existential}</p></Card>
        <Card className="p-4 text-center" style={SOVEREIGN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Five Eyes</p><p className="text-3xl font-black" style={{ color: "#3b82f6" }}>{stats.fiveEyes}</p></Card>
      </div>

      <Card className="p-5" style={SOVEREIGN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Title</th>
              <th className="pb-3">Threat Type</th>
              <th className="pb-3">Severity</th>
              <th className="pb-3">Classification</th>
              <th className="pb-3">Origin</th>
              <th className="pb-3">Targeted Sectors</th>
              <th className="pb-3">Campaign</th>
              <th className="pb-3">IOCs</th>
              <th className="pb-3">Prob 30d</th>
              <th className="pb-3">Impact USD</th>
              <th className="pb-3">Five Eyes</th>
              <th className="pb-3">Advisory</th>
              <th className="pb-3">Last Seen</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {threats.map(threat => (
              <tr key={threat.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-semibold text-white max-w-xs truncate">{threat.title}</td>
                <td className="py-3"><SovereignBadge color={THREAT_TYPE_COLORS[threat.threat_type] || MUTED}>{threat.threat_type || "unknown"}</SovereignBadge></td>
                <td className="py-3"><SovereignBadge color={threat.severity === "existential" ? CRITICAL_RED : threat.severity === "critical" ? "#dc2626" : threat.severity === "high" ? "#f97316" : MUTED}>{threat.severity || "medium"}</SovereignBadge></td>
                <td className="py-3"><SovereignBadge color={threat.classification === "top_secret" ? CRITICAL_RED : threat.classification === "secret" ? "#dc2626" : "#3b82f6"}>{threat.classification || "official"}</SovereignBadge></td>
                <td className="py-3" style={{ color: MUTED }}>{threat.origin_country || "Unknown"}</td>
                <td className="py-3"><div className="flex gap-1">{(threat.targeted_sectors || []).slice(0, 3).map((s, i) => (<span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{s}</span>))}</div></td>
                <td className="py-3">{threat.campaign_active ? <span className="text-green-400 text-xs font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Active</span> : <span style={{ color: MUTED }}>Inactive</span>}</td>
                <td className="py-3 text-white">{threat.ioc_count || 0}</td>
                <td className="py-3"><span className={`text-lg font-black ${(threat.probability_30d || 0) > 50 ? 'text-red-400' : 'text-amber-400'}`}>{threat.probability_30d || 0}%</span></td>
                <td className="py-3 text-white">${threat.estimated_impact_usd ? (threat.estimated_impact_usd/1000000000).toFixed(2) : "—"}B</td>
                <td className="py-3">{threat.five_eyes_shared ? <Shield className="w-4 h-4 text-blue-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3">{threat.advisory_issued ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3" style={{ color: MUTED }}>{threat.last_seen ? new Date(threat.last_seen).toLocaleDateString() : "—"}</td>
                <td className="py-3"><SovereignBadge color={threat.status === "active" ? "#10b981" : threat.status === "contained" ? "#f97316" : MUTED}>{threat.status || "unknown"}</SovereignBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}