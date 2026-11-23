import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, SectionCard, StatusBadge, LoadingSpinner, EmptyState, ProgressBar, gradeFromScore, gradeColor } from "@/components/dashboards/DashboardShared";
import { Building2, Users, UserCog, Briefcase } from "lucide-react";

export default function OrganizationManagementPage() {
  const [org, setOrg] = useState(null);
  const [units, setUnits] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [riskProfile, setRiskProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Organization.list("-created_at", 1).catch(() => []),
      base44.entities.BusinessUnit.list().catch(() => []),
      base44.entities.Team.list().catch(() => []),
      base44.entities.TeamMember.list().catch(() => []),
      base44.entities.MSSPClientOrganization.list("-activated_at", 50).catch(() => []),
      base44.entities.OrganizationRiskProfile.list("-calculated_at", 1).catch(() => []),
    ]).then(([o, u, t, m, c, rp]) => {
      setOrg(o[0] || null); setUnits(u); setTeams(t); setMembers(m); setClients(c); setRiskProfile(rp[0] || null); setLoading(false);
    });
  }, []);

  if (loading) return <DashboardPage title="Organization Management" badge="EDP-015"><LoadingSpinner /></DashboardPage>;

  const riskBars = riskProfile ? [
    { label: "Cloud", value: riskProfile.cloud_risk || 0 },
    { label: "Code", value: riskProfile.code_risk || 0 },
    { label: "Identity", value: riskProfile.identity_risk || 0 },
    { label: "Data", value: riskProfile.data_risk || 0 },
    { label: "Runtime", value: riskProfile.runtime_risk || 0 },
    { label: "Supply Chain", value: riskProfile.supply_chain_risk || 0 },
    { label: "Governance", value: riskProfile.governance_risk || 0 },
  ] : [];

  return (
    <DashboardPage title="Organization Management" badge="EDP-015" subtitle="Business units, teams, members, MSSP clients, and organizational risk profile">
      {org && (
        <div className="rounded-xl p-5 flex items-center gap-6 flex-wrap" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #3b82f6" }}>
          <Building2 size={32} className="text-blue-400" />
          <div>
            <h2 className="text-lg font-bold text-white">{org.name}</h2>
            <p className="text-xs text-slate-400">Plan: {org.plan} · {org.member_count} members · {org.integrations_count} integrations</p>
          </div>
          <div className="flex items-center gap-6 ml-auto">
            <div className="text-center"><p className="text-2xl font-bold" style={{ color: gradeColor(gradeFromScore(org.risk_score || 0)) }}>{org.risk_score ?? "—"}</p><p className="text-[10px] text-slate-500">Risk Score</p></div>
            <StatusBadge status={org.status} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Business Units">
          {units.length === 0 ? <EmptyState message="No business-unit store on this platform; this is not a measured zero" /> : (
            <div className="grid grid-cols-1 gap-2">
              {units.map(u => (
                <div key={u.id} className="rounded-lg p-3 flex items-center gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <Building2 size={16} className="text-slate-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{u.name}</p>
                    <p className="text-[10px] text-slate-500">{u.type} · {u.cost_center}</p>
                  </div>
                  <span className="text-xs text-slate-400">{u.headcount} ppl</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Teams">
          {teams.length === 0 ? <EmptyState message="No team store on this platform; this is not a measured zero" /> : (
            <div className="space-y-2">
              {teams.map(t => (
                <div key={t.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-blue-400" />
                    <p className="text-sm font-semibold text-white flex-1">{t.name}</p>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{t.team_type} · {t.member_count} members · {t.agent_count} agents</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Team Members">
          {members.length === 0 ? <EmptyState message="No team members" /> : (
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="rounded-lg p-3 flex items-center gap-2" style={{ background: "#0a0f1e", border: m.is_agent ? "1px solid #8b5cf6" : "1px solid #1F2937" }}>
                  <UserCog size={14} className={m.is_agent ? "text-purple-400" : "text-slate-400"} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{m.name}</p>
                    <p className="text-[10px] text-slate-500">{m.role} · {m.specialization}</p>
                  </div>
                  {m.is_agent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">AI AGENT</span>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="MSSP Clients">
          {clients.length === 0 ? <EmptyState message="No MSSP client store on this platform; /mssp/customers serves the real five and this panel does not read it" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-slate-500 border-b border-slate-700">
                  <th className="text-left py-2 px-3">Client</th><th className="text-left py-2 px-3">Plan</th><th className="text-left py-2 px-3">MRR</th><th className="text-left py-2 px-3">SLA</th><th className="text-left py-2 px-3">Risk</th><th className="text-left py-2 px-3">Status</th>
                </tr></thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id} className="border-b border-slate-800 hover:bg-blue-500/5">
                      <td className="py-2 px-3 text-white font-medium">{c.client_name}</td>
                      <td className="py-2 px-3 text-slate-400">{c.plan}</td>
                      <td className="py-2 px-3 text-emerald-400 font-medium">${(c.mrr_usd / 1000).toFixed(0)}K</td>
                      <td className="py-2 px-3 text-slate-400">{c.sla_tier}</td>
                      <td className="py-2 px-3" style={{ color: gradeColor(gradeFromScore(c.risk_score || 0)) }}>{c.risk_score ?? "—"}</td>
                      <td className="py-2 px-3"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Risk Profile">
          {!riskProfile ? <EmptyState message="No risk profile calculated" /> : (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: gradeColor(riskProfile.risk_grade || gradeFromScore(riskProfile.overall_risk_score || 0)) }}>{riskProfile.overall_risk_score}</p>
                  <p className="text-[10px] text-slate-500">Overall Risk</p>
                </div>
                <div>
                  <span className="text-lg font-bold" style={{ color: gradeColor(riskProfile.risk_grade || gradeFromScore(riskProfile.overall_risk_score || 0)) }}>Grade {riskProfile.risk_grade || gradeFromScore(riskProfile.overall_risk_score || 0)}</span>
                  <p className="text-[11px] text-slate-400">Trend: {riskProfile.trend}</p>
                </div>
              </div>
              <div className="space-y-2">
                {riskBars.map(bar => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[11px] mb-1"><span className="text-slate-400">{bar.label}</span><span className="text-white font-medium">{bar.value}</span></div>
                    <ProgressBar value={bar.value} color={bar.value > 70 ? "#ef4444" : bar.value > 40 ? "#f59e0b" : "#10b981"} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </DashboardPage>
  );
}