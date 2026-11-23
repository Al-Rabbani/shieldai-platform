import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import {
  Settings, Building2, GitBranch, CheckCircle2, XCircle, Shield, Users,
  Clock, Database, Code2, Zap, Bot, RefreshCw, ChevronRight
} from "lucide-react";

const C = "#00d9ff";
const CARD = "#111827";
const BORDER = "#1a2a3a";
const DANGER = "#ff3b3b";
const SUCCESS = "#00ff88";

const INTEGRATION_DISPLAY = [
  { key: "github",   label: "GitHub",          color: "#f0f6ff" },
  { key: "gitlab",   label: "GitLab",          color: "#fc6d26" },
  { key: "aws",      label: "AWS",             color: "#f97316" },
  { key: "slack",    label: "Slack",           color: "#36c5f0" },
  { key: "gmail",    label: "Gmail",           color: "#ea4335" },
  { key: "googlecalendar", label: "Google Calendar", color: "#4285f4" },
  { key: "jira",     label: "Jira",            color: "#0052cc" },
];

const PLATFORM_STATS = [
  { label: "Backend Functions", value: 65, icon: Zap, color: C },
  { label: "Entity Schemas",    value: 69, icon: Database, color: "#a78bfa" },
  { label: "Active Automations",value: 21, icon: RefreshCw, color: SUCCESS },
  { label: "AI Agents",         value: 8,  icon: Bot,  color: "#ffb83b" },
];

function StatusDot({ connected }) {
  return connected
    ? <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: SUCCESS }}><CheckCircle2 className="w-3 h-3" />Connected</span>
    : <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: "#64748b" }}><XCircle className="w-3 h-3" />Not Connected</span>;
}

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: orgSettings = [], isLoading: loadOrg } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => base44.entities.OrgSettings.list().catch(() => []),
    initialData: [],
  });
  const { data: integrations = [], isLoading: loadInt } = useQuery({
    queryKey: ["integration-configs"],
    queryFn: () => base44.entities.IntegrationConfig.list().catch(() => []),
    initialData: [],
  });
  const { data: msspTenants = [], isLoading: loadMSSP } = useQuery({
    queryKey: ["mssp-tenants"],
    queryFn: () => base44.entities.MSSPTenant.list().catch(() => []),
    initialData: [],
  });

  const org = orgSettings[0] || {};

  // Build integration map from entities + known defaults
  const intMap = {};
  integrations.forEach(i => { intMap[i.integration_type?.toLowerCase()] = i; });

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,217,255,0.1)", border: `1px solid rgba(0,217,255,0.3)` }}>
            <Settings className="w-5 h-5" style={{ color: C }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Settings & Admin</h1>
            <p className="text-[9px] font-bold tracking-widest text-slate-500">ORGANIZATION · INTEGRATIONS · SLA · MSSP TENANTS</p>
          </div>
        </div>
        <Link to="/settings" className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-black"
          style={{ background: `linear-gradient(135deg,${C},#0ea5e9)` }}>
          <Settings className="w-3.5 h-3.5" /> Full Settings
        </Link>
      </div>

      {/* Top row: Org Card + SLA Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Organization */}
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: C }} />
              <h3 className="text-sm font-bold text-white">Organization</h3>
            </div>
            <Link to="/settings/organization" className="text-[10px]" style={{ color: C }}>Edit →</Link>
          </div>
          {loadOrg ? (
            <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />)}</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: "Organization Name", value: org.organization_name || "GDS Platform" },
                { label: "Domain", value: org.domain || "globaldigitalsecurity.com" },
                { label: "Plan", value: org.plan || "Enterprise", highlight: C },
                { label: "Industry", value: org.industry || "Technology" },
                { label: "Data Residency", value: (org.data_residency || "us").toUpperCase(), highlight: "#a78bfa" },
                { label: "MFA Required", value: org.mfa_required !== false ? "Yes" : "No", highlight: org.mfa_required !== false ? SUCCESS : DANGER },
                { label: "SSO Enabled", value: org.sso_enabled ? "Yes" : "No", highlight: org.sso_enabled ? SUCCESS : "#64748b" },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(26,42,58,0.8)" }}>
                  <span className="text-[10px] text-slate-500">{label}</span>
                  <span className="text-[10px] font-semibold" style={{ color: highlight || "white" }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SLA Configuration */}
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "#ffb83b" }} />
              <h3 className="text-sm font-bold text-white">SLA Configuration</h3>
            </div>
            <Link to="/settings/organization" className="text-[10px]" style={{ color: C }}>Edit →</Link>
          </div>
          <div className="space-y-3">
            {[
              { label: "Critical SLA", value: `${org.sla_critical_hours || 24}h`, color: DANGER },
              { label: "High SLA", value: `${org.sla_high_hours || 72}h`, color: "#ff7b3b" },
              { label: "Medium SLA", value: `${org.sla_medium_hours || 168}h (7d)`, color: "#ffb83b" },
              { label: "Low SLA", value: `${org.sla_low_hours || 720}h (30d)`, color: "#3b9eff" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "#0a0e17", border: `1px solid ${BORDER}` }}>
                <span className="text-[10px] font-semibold text-white">{label}</span>
                <span className="text-[10px] font-black font-mono" style={{ color }}>{value}</span>
              </div>
            ))}
            <div className="pt-2 space-y-2">
              {[
                { label: "Auto-Triage", enabled: org.auto_triage_enabled !== false },
                { label: "Auto-Fix", enabled: !!org.auto_fix_enabled },
                { label: "CI Gate", enabled: !!org.ci_gate_enabled },
              ].map(({ label, enabled }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{label}</span>
                  <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: enabled ? SUCCESS : "#64748b" }}>
                    {enabled ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" style={{ color: C }} />
            <h3 className="text-sm font-bold text-white">Integrations</h3>
          </div>
          <Link to="/settings/integrations" className="text-[10px]" style={{ color: C }}>Manage all →</Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {INTEGRATION_DISPLAY.map(intg => {
            const record = intMap[intg.key];
            const connected = record?.status === "connected" || record?.status === "active";
            return (
              <div key={intg.key} className="rounded-xl p-3 text-center flex flex-col items-center gap-2"
                style={{ background: "#0a0e17", border: `1px solid ${connected ? `${SUCCESS}30` : BORDER}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                  style={{ background: `${intg.color}18`, color: intg.color }}>
                  {intg.label[0]}
                </div>
                <p className="text-[9px] font-semibold text-white">{intg.label}</p>
                <StatusDot connected={connected} />
              </div>
            );
          })}
        </div>
      </div>

      {/* MSSP Tenants */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <h3 className="text-sm font-bold text-white">MSSP Tenants</h3>
          </div>
          <Link to="/mssp" className="text-[10px]" style={{ color: C }}>Full MSSP portal →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                {["Tenant Name", "Plan", "Risk Score", "Total Findings", "SLA Compliance", "Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadMSSP ? (
                [...Array(3)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
              ) : msspTenants.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center">
                  <Users className="w-7 h-7 mx-auto mb-2 text-slate-700" />
                  <p className="text-sm text-slate-500">No MSSP tenants configured</p>
                  <Link to="/mssp" className="text-[10px] mt-1 block" style={{ color: C }}>Set up MSSP portal →</Link>
                </td></tr>
              ) : (
                msspTenants.slice(0, 15).map((t, i) => {
                  const riskColor = (t.risk_score || 0) > 70 ? DANGER : (t.risk_score || 0) > 40 ? "#ffb83b" : SUCCESS;
                  const slaColor = (t.sla_compliance_pct || 0) >= 90 ? SUCCESS : (t.sla_compliance_pct || 0) >= 70 ? "#ffb83b" : DANGER;
                  const statusColor = t.status === "active" ? SUCCESS : t.status === "suspended" ? DANGER : "#64748b";
                  return (
                    <tr key={t.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)` }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(0,217,255,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0a0e17" : CARD}>
                      <td className="px-4 py-3"><span className="text-xs font-semibold text-white">{t.name || t.tenant_name}</span></td>
                      <td className="px-4 py-3"><span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ color: C, background: "rgba(0,217,255,0.1)" }}>{t.plan || "Pro"}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${t.risk_score || 0}%`, background: riskColor }} />
                          </div>
                          <span className="text-[9px] font-mono" style={{ color: riskColor }}>{t.risk_score || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-mono text-white">{t.total_findings ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black font-mono" style={{ color: slaColor }}>{t.sla_compliance_pct != null ? `${t.sla_compliance_pct}%` : "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-semibold capitalize px-2 py-0.5 rounded" style={{ color: statusColor, background: `${statusColor}18` }}>{t.status || "active"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Stats Footer */}
      <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <h3 className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-4">Platform Statistics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_STATS.map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "#0a0e17", border: `1px solid ${BORDER}` }}>
              <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
              <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}