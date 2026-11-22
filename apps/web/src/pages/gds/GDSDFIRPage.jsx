import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, AlertTriangle, Shield, CheckCircle, Clock, Users, Phone } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge, AnimatedArc } from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const BG = "#020817";

const INCIDENT_TYPE_COLORS = {
  ransomware: DANGER, malware: DANGER, phishing: HIGH, cloud_compromise: HIGH, data_breach: DANGER,
  insider_threat: "#a855f7", ddos: "#f97316", apt: DANGER, credential_theft: HIGH,
  lateral_movement: HIGH, c2: DANGER, data_exfiltration: DANGER, privilege_escalation: HIGH,
  initial_access: MEDIUM, discovery: MEDIUM, default: MUTED
};

const PHASE_COLORS = { containment: "#3b82f6", eradication: "#f59e0b", recovery: "#10b981" };

export default function GDSDFIRPage() {
  const { data: incidents = [] } = useQuery({
    queryKey: ["dfir-incidents"],
    queryFn: () => base44.entities.Incident.filter({ status: { $in: ["new", "investigating", "contained"] } }, "-created_at", 100).catch(() => []),
  });

  const { data: containmentActions = [] } = useQuery({
    queryKey: ["dfir-containment"],
    queryFn: () => base44.entities.ContainmentAction.list("", 500).catch(() => []),
  });

  const { data: eradicationActions = [] } = useQuery({
    queryKey: ["dfir-eradication"],
    queryFn: () => base44.entities.EradicationAction.list("", 500).catch(() => []),
  });

  const { data: recoveryActions = [] } = useQuery({
    queryKey: ["dfir-recovery"],
    queryFn: () => base44.entities.RecoveryAction.list("", 500).catch(() => []),
  });

  const { data: correctiveActions = [] } = useQuery({
    queryKey: ["dfir-corrective"],
    queryFn: () => base44.entities.CorrectiveAction.filter({ status: "open" }).catch(() => []),
  });

  const { data: regulatoryNotifications = [] } = useQuery({
    queryKey: ["dfir-regulatory"],
    queryFn: () => base44.entities.RegulatoryNotification.filter({ status: { $in: ["draft", "legal_review", "pending_submission"] } }).catch(() => []),
  });

  const { data: responseTeams = [] } = useQuery({
    queryKey: ["dfir-teams"],
    queryFn: () => base44.entities.ResponseTeam.filter({ status: "active" }).catch(() => []),
  });

  const openIncidents = incidents.length;
  const criticalP1 = incidents.filter(i => i.severity === "critical" || i.priority === "P1").length;
  const contained = incidents.filter(i => i.is_contained).length;
  const recovered = incidents.filter(i => i.is_recovered).length;
  const containedPercent = openIncidents > 0 ? Math.round((contained / openIncidents) * 100) : 0;
  const recoveredPercent = openIncidents > 0 ? Math.round((recovered / openIncidents) * 100) : 0;

  const containmentTotal = containmentActions.length;
  const containmentCompleted = containmentActions.filter(a => a.status === "completed").length;
  const containmentPercent = containmentTotal > 0 ? Math.round((containmentCompleted / containmentTotal) * 100) : 0;

  const eradicationTotal = eradicationActions.length;
  const eradicationVerified = eradicationActions.filter(a => a.verified).length;
  const eradicationPercent = eradicationTotal > 0 ? Math.round((eradicationVerified / eradicationTotal) * 100) : 0;

  const recoveryTotal = recoveryActions.length;
  const recoveryCompleted = recoveryActions.filter(a => a.status === "completed").length;
  const recoveryPercent = recoveryTotal > 0 ? Math.round((recoveryCompleted / recoveryTotal) * 100) : 0;

  const regulatoryDue = regulatoryNotifications.filter(n => {
    if (!n.deadline) return false;
    return new Date(n.deadline) < new Date(Date.now() + 24 * 60 * 60 * 1000);
  }).length;

  const phaseData = [
    { name: "Containment", percent: containmentPercent, color: PHASE_COLORS.containment },
    { name: "Eradication", percent: eradicationPercent, color: PHASE_COLORS.eradication },
    { name: "Recovery", percent: recoveryPercent, color: PHASE_COLORS.recovery },
  ];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Command Center" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6" style={{ color: DANGER }} />
          <div>
            <h1 className="text-2xl font-black text-white">Incident Command Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time incident response operations</p>
          </div>
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Incidents</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{openIncidents}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical P1</p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DANGER }} />
            <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{criticalP1}</p>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Contained %</p>
          <p className="text-2xl font-black font-mono" style={{ color: containedPercent >= 80 ? LOW : containedPercent >= 50 ? MEDIUM : DANGER }}>{containedPercent}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Recovered %</p>
          <p className="text-2xl font-black font-mono" style={{ color: recoveredPercent >= 80 ? LOW : recoveredPercent >= 50 ? MEDIUM : DANGER }}>{recoveredPercent}%</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: correctiveActions.length > 0 ? `${HIGH}08` : "transparent", border: correctiveActions.length > 0 ? `1px solid ${HIGH}20` : "none" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Corrective Open</p>
          <p className="text-2xl font-black font-mono" style={{ color: correctiveActions.length > 0 ? HIGH : MUTED }}>{correctiveActions.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: regulatoryDue > 0 ? `${DANGER}08` : "transparent", border: regulatoryDue > 0 ? `1px solid ${DANGER}20` : "none" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Regulatory Due</p>
          <p className="text-2xl font-black font-mono" style={{ color: regulatoryDue > 0 ? DANGER : MUTED }}>{regulatoryDue}</p>
        </Card>
      </div>

      {/* Phase Progress */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Response Phase Progress</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {phaseData.map(phase => (
            <div key={phase.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>{phase.name}</span>
                <span className="text-sm font-black" style={{ color: phase.color }}>{phase.percent}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${phase.percent}%`, background: phase.color }} />
              </div>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>
                {phase.name === "Containment" && `${containmentCompleted}/${containmentTotal} actions`}
                {phase.name === "Eradication" && `${eradicationVerified}/${eradicationTotal} verified`}
                {phase.name === "Recovery" && `${recoveryCompleted}/${recoveryTotal} actions`}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Response Teams */}
      {responseTeams.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Active Response Teams</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {responseTeams.map(team => (
              <Card key={team.id} className="p-4" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}20` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">{team.team_name}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded animate-pulse" style={{ background: `${CYAN}15`, color: CYAN }}>ACTIVE</span>
                </div>
                <div className="space-y-1 text-[10px]" style={{ color: MUTED }}>
                  <p>Commander: <span style={{ color: TEXT }}>{team.commander_name || team.commander}</span></p>
                  <p>Members: <span style={{ color: TEXT }}>{team.member_count || team.members?.length || 0}</span></p>
                  {team.bridge_call_link && (
                    <a href={team.bridge_call_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-2 px-2 py-1 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>
                      <Phone className="w-3 h-3" />
                      Join Bridge
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Latest Incidents */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Latest Incidents</h3>
        </div>
        {incidents.length === 0 ? (
          <EmptyState icon={Target} title="No active incidents" description="No incidents currently in response" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["ID", "Title", "Type", "Severity", "Phases", "Assigned", "Opened", "SLA"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {incidents.slice(0, 20).map(inc => {
                  const typeColor = INCIDENT_TYPE_COLORS[inc.incident_type?.toLowerCase()] || INCIDENT_TYPE_COLORS.default;
                  return (
                    <tr key={inc.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5">
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono font-bold" style={{ color: CYAN }}>INC-{inc.id?.slice(-6).toUpperCase()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs">{inc.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{inc.incident_type || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4"><SevBadge sev={inc.severity} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {inc.is_contained && <Shield className="w-3 h-3" style={{ color: PHASE_COLORS.containment }} title="Contained" />}
                          {inc.is_eradicated && <CheckCircle className="w-3 h-3" style={{ color: PHASE_COLORS.eradication }} title="Eradicated" />}
                          {inc.is_recovered && <CheckCircle className="w-3 h-3" style={{ color: PHASE_COLORS.recovery }} title="Recovered" />}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{inc.assigned_to_name || "Unassigned"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: MUTED }}>{timeAgo(inc.created_at)}</p>
                      </td>
                      <td className="py-3 px-4">
                        {inc.sla_deadline && (() => {
                          const hoursLeft = (new Date(inc.sla_deadline) - new Date()) / (1000 * 60 * 60);
                          const isBreached = hoursLeft < 0;
                          const isUrgent = hoursLeft < 1;
                          return (
                            <span className={`text-[10px] font-bold ${isBreached || isUrgent ? 'animate-pulse' : ''}`} style={{ color: isBreached ? DANGER : isUrgent ? HIGH : MUTED }}>
                              {isBreached ? `BREACHED` : hoursLeft < 1 ? `${Math.round(hoursLeft * 60)}m` : `${Math.round(hoursLeft)}h`}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}