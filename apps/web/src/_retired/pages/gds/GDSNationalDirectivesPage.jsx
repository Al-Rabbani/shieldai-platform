import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, FileText, AlertTriangle } from "lucide-react";
import { SovereignBreadcrumb, SovereignBanner, SovereignBadge, ClassificationBanner, SOVEREIGN_PAGE_BG, SOVEREIGN_CARD, SOVEREIGN_GOLD, BORDER, MUTED, CRITICAL_RED } from "@/components/gds/NationalCommandShared";
import { Card } from "@/components/gds/GDSOSShared";

const DIRECTIVE_TYPE_COLORS = { emergency_directive: CRITICAL_RED, binding: "#dc2626", technical_alert: "#f97316", national_advisory: "#f59e0b", executive_order: SOVEREIGN_GOLD };
const POLICY_TYPE_COLORS = { national_security: CRITICAL_RED, cybersecurity: "#3b82f6", data_protection: "#10b981", critical_infra: "#f97316", emergency_response: "#dc2626", intelligence: "#a855f7", defense: CRITICAL_RED, privacy: "#8b5cf6", compliance: "#f59e0b", procurement: "#06b6d4", personnel: "#14b8a6", international: "#3b82f6" };
const URGENCY_COLORS = { immediate: CRITICAL_RED, flash: "#dc2626", urgent: "#f97316", priority: "#3b82f6", routine: "#6b7280" };

export default function GDSNationalDirectivesPage() {
  const { data: directives = [] } = useQuery({ queryKey: ["national-directives"], queryFn: () => base44.entities.NationalDirective.list("-issued_at", 100).catch(() => []) });
  const { data: policies = [] } = useQuery({ queryKey: ["national-policies"], queryFn: () => base44.entities.NationalPolicy.list("-created_date", 100).catch(() => []) });
  const [tab, setTab] = useState("directives");

  const data = tab === "directives" ? directives : policies;
  const stats = { totalDirectives: directives.length, issued: directives.filter(d => d.status === "issued").length, overdue: directives.filter(d => d.deadline && new Date(d.deadline) < new Date()).length, totalPolicies: policies.length };

  return (
    <div style={SOVEREIGN_PAGE_BG}>
      <SovereignBreadcrumb items={[{ label: "Directives & Policy" }]} />
      <SovereignBanner />
      <ClassificationBanner level="SECRET" />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">National Directives & Policy</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-001 · Sovereign Directives</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("directives")} className={`text-xs font-bold px-4 py-2 rounded-lg ${tab === "directives" ? '' : 'opacity-60'}`} style={{ background: tab === "directives" ? `${SOVEREIGN_GOLD}20` : `${SOVEREIGN_GOLD}08`, color: tab === "directives" ? SOVEREIGN_GOLD : MUTED, border: `1px solid ${tab === "directives" ? SOVEREIGN_GOLD + '40' : SOVEREIGN_GOLD + '20'}` }}>Directives ({stats.totalDirectives})</button>
        <button onClick={() => setTab("policies")} className={`text-xs font-bold px-4 py-2 rounded-lg ${tab === "policies" ? '' : 'opacity-60'}`} style={{ background: tab === "policies" ? `${SOVEREIGN_GOLD}20` : `${SOVEREIGN_GOLD}08`, color: tab === "policies" ? SOVEREIGN_GOLD : MUTED, border: `1px solid ${tab === "policies" ? SOVEREIGN_GOLD + '40' : SOVEREIGN_GOLD + '20'}` }}>Policies ({stats.totalPolicies})</button>
      </div>

      {tab === "directives" && (
        <div className="flex items-center justify-end mb-4">
          <button className="text-[10px] font-bold px-4 py-2 rounded" style={{ background: `${SOVEREIGN_GOLD}20`, color: SOVEREIGN_GOLD, border: `1px solid ${SOVEREIGN_GOLD}40` }}>Issue New Directive</button>
        </div>
      )}

      <Card className="p-5" style={SOVEREIGN_CARD}>
        {tab === "directives" ? (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Directive Ref</th>
                <th className="pb-3">Title</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Issuing Authority</th>
                <th className="pb-3">Urgency</th>
                <th className="pb-3">Addressed To</th>
                <th className="pb-3">Compliance Rate</th>
                <th className="pb-3">Agencies</th>
                <th className="pb-3">Deadline</th>
                <th className="pb-3">Linked Threat</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {directives.map(d => (
                <tr key={d.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-mono font-bold" style={{ color: SOVEREIGN_GOLD }}>{d.directive_ref}</td>
                  <td className="py-3 font-semibold text-white max-w-xs truncate">{d.title}</td>
                  <td className="py-3"><SovereignBadge color={DIRECTIVE_TYPE_COLORS[d.directive_type] || MUTED}>{d.directive_type || "general"}</SovereignBadge></td>
                  <td className="py-3" style={{ color: MUTED }}>{d.issuing_authority || "—"}</td>
                  <td className="py-3"><SovereignBadge color={URGENCY_COLORS[d.urgency] || MUTED}>{d.urgency || "routine"}</SovereignBadge></td>
                  <td className="py-3 text-white">{d.addressed_to_count || 0}</td>
                  <td className="py-3"><div className="w-16 h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${d.compliance_rate_pct || 0}%`, background: (d.compliance_rate_pct || 0) < 50 ? CRITICAL_RED : (d.compliance_rate_pct || 0) < 75 ? "#f97316" : "#10b981" }} /></div></td>
                  <td className="py-3 text-white">{d.agencies_compliant || 0}/{d.agencies_total || 0}</td>
                  <td className="py-3" style={{ color: (d.deadline && new Date(d.deadline) < new Date()) ? CRITICAL_RED : MUTED }}>{d.deadline ? (new Date(d.deadline) < new Date() ? "OVERDUE" : new Date(d.deadline).toLocaleDateString()) : "—"}</td>
                  <td className="py-3">{d.linked_threat ? <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${CRITICAL_RED}15`, color: CRITICAL_RED }}>{d.linked_threat}</span> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3"><SovereignBadge color={d.status === "issued" ? "#10b981" : d.status === "pending" ? "#f97316" : MUTED}>{d.status || "draft"}</SovereignBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Title</th>
                <th className="pb-3">Policy Type</th>
                <th className="pb-3">Issuing Authority</th>
                <th className="pb-3">Mandatory</th>
                <th className="pb-3">Compliance Deadline</th>
                <th className="pb-3">Linked Frameworks</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {policies.map(p => (
                <tr key={p.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-semibold text-white">{p.title}</td>
                  <td className="py-3"><SovereignBadge color={POLICY_TYPE_COLORS[p.policy_type] || MUTED}>{p.policy_type || "general"}</SovereignBadge></td>
                  <td className="py-3" style={{ color: MUTED }}>{p.issuing_authority || "—"}</td>
                  <td className="py-3">{p.is_mandatory ? <Shield className="w-4 h-4 text-blue-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3" style={{ color: (p.compliance_deadline && new Date(p.compliance_deadline) < new Date()) ? CRITICAL_RED : MUTED }}>{p.compliance_deadline ? new Date(p.compliance_deadline).toLocaleDateString() : "—"}</td>
                  <td className="py-3"><div className="flex gap-1">{(p.linked_frameworks || []).slice(0, 3).map((f, i) => (<span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{f}</span>))}</div></td>
                  <td className="py-3"><SovereignBadge color={p.status === "active" ? "#10b981" : p.status === "pending" ? "#f97316" : MUTED}>{p.status || "draft"}</SovereignBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}