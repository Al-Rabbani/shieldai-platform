import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Shield, FileText, Activity, Crown } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge, AnimatedArc } from "@/components/gds/GDSOSShared";
import { HCBreadcrumb, HCBanner, HCBadge, HCStat, HC_PAGE_BG, HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, HC_PURPLE, BORDER, MUTED, TEXT, THREAT_TYPE_COLORS } from "@/components/gds/HealthcareSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSHealthcareThreatsPage() {
  const { data: threats = [], isLoading } = useQuery({ queryKey: ["hc-threats"], queryFn: () => base44.entities.HealthcareThreat.filter({ status: "active" }, "-last_seen", 100).catch(() => []) });
  const { data: researchProjects = [] } = useQuery({ queryKey: ["hc-research"], queryFn: () => base44.entities.ResearchProject.list("-risk_score", 50).catch(() => []) });

  const stats = {
    activeThreats: threats.length,
    patientSafetyThreats: threats.filter(t => t.patient_safety_risk).length,
    cisaAdvisories: threats.filter(t => t.cisa_advisory_id).length,
    nationStateTargets: researchProjects.filter(p => p.nation_state_target_risk).length,
  };

  return (
    <div style={HC_PAGE_BG}>
      <HCBreadcrumb items={[{ label: "Healthcare Threat Intelligence" }]} />
      <HCBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">HEALTHCARE THREAT INTELLIGENCE</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-004 · Threat Monitoring & Research Security</p>
        </div>
        <LiveDataBadge />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Threats</p>
          <p className="text-3xl font-black" style={{ color: HC_TEAL }}>{stats.activeThreats}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.patientSafetyThreats > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Patient Safety Threats</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.patientSafetyThreats}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_ORANGE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>CISA Advisories Active</p>
          <p className="text-3xl font-black" style={{ color: HC_ORANGE }}>{stats.cisaAdvisories}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.nationStateTargets > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_PURPLE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Nation-State Research Targets</p>
          <p className="text-3xl font-black" style={{ color: HC_PURPLE }}>{stats.nationStateTargets}</p>
        </Card>
      </div>

      {/* THREATS TABLE */}
      <Card className="p-5 mb-6" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: HC_RED }} />
            Healthcare Threats
          </h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{threats.length} active</span>
        </div>

        {isLoading ? <Skeleton lines={10} /> : threats.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="No Threats" description="No active healthcare threats" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Threat Actor</th>
                  <th className="pb-3">Patient Safety</th>
                  <th className="pb-3">Probability 30d</th>
                  <th className="pb-3">Advisories</th>
                  <th className="pb-3">Last Seen</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {threats.slice(0, 50).map(t => (
                  <tr key={t.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-bold text-white">{t.title}</td>
                    <td className="py-3"><HCBadge color={THREAT_TYPE_COLORS[t.threat_type] || HC_ORANGE}>{t.threat_type}</HCBadge></td>
                    <td className="py-3"><SevBadge sev={t.severity} /></td>
                    <td className="py-3 text-white">{t.threat_actor || "—"}</td>
                    <td className="py-3">{t.patient_safety_risk ? <Heart className="w-4 h-4" style={{ color: HC_RED }} /> : "—"}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${t.probability_30d || 0}%`, background: (t.probability_30d || 0) > 50 ? HC_RED : HC_ORANGE }} />
                        </div>
                        <span className="text-[9px]" style={{ color: MUTED }}>{t.probability_30d || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {t.cisa_advisory_id && <HCBadge color={HC_ORANGE}>CISA</HCBadge>}
                        {t.hhs_advisory_id && <HCBadge color={HC_RED}>HHS</HCBadge>}
                      </div>
                    </td>
                    <td className="py-3" style={{ color: MUTED }}>{timeAgo(t.last_seen)}</td>
                    <td className="py-3"><HCBadge color={HC_GREEN}>{t.status}</HCBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* RESEARCH PROJECTS */}
      <Card className="p-5" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: HC_PURPLE }} />
            Research Projects
          </h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{researchProjects.length} projects</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Project Name</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Nation State Risk</th>
                <th className="pb-3">Genetic Data</th>
                <th className="pb-3">Data Volume</th>
                <th className="pb-3">IRB Approved</th>
                <th className="pb-3">Risk Score</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {researchProjects.slice(0, 50).map(p => (
                <tr key={p.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-bold text-white">{p.project_name}</td>
                  <td className="py-3"><HCBadge color={HC_PURPLE}>{p.project_type}</HCBadge></td>
                  <td className="py-3">{p.nation_state_target_risk ? <Crown className="w-4 h-4" style={{ color: HC_RED }} /> : "—"}</td>
                  <td className="py-3">{p.genetic_data ? <span className="text-[10px]" style={{ color: HC_PURPLE }}>DNA</span> : "—"}</td>
                  <td className="py-3 text-white">{p.data_volume_gb || 0} GB</td>
                  <td className="py-3">{p.irb_approved ? <Shield className="w-4 h-4" style={{ color: HC_GREEN }} /> : "—"}</td>
                  <td className="py-3"><AnimatedArc score={p.risk_score || 0} size={50} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Heart({ className, style }) {
  return <span className={className} style={style}>⚕️</span>;
}