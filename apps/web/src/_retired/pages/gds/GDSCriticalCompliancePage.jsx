import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Lock, Calendar, TrendingUp, FileText } from "lucide-react";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { OTBreadcrumb, OTBadge, OTGauge, OT_PAGE_BG, OT_CARD, OT_AMBER, OT_RED, OT_GREEN, OT_BLUE, BORDER, MUTED } from "@/components/gds/CriticalInfrastructureShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCriticalCompliancePage() {
  const { data: policies = [] } = useQuery({ queryKey: ["ci-policies"], queryFn: () => base44.entities.InfrastructurePolicy.list("-compliance_rate_pct", 100).catch(() => []) });

  const stats = {
    active: policies.filter(p => p.status === "active").length,
    avgCompliance: policies.length > 0 ? Math.round(policies.reduce((s, p) => s + (p.compliance_rate_pct || 0), 0) / policies.length) : 0,
    below60: policies.filter(p => (p.compliance_rate_pct || 0) < 60).length,
    dueSoon: policies.filter(p => p.next_review && new Date(p.next_review) < new Date(Date.now() + 30*24*60*60*1000)).length,
  };

  return (
    <div style={OT_PAGE_BG}>
      <OTBreadcrumb items={[{ label: "ICS/OT Compliance & Policy" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">ICS/OT COMPLIANCE & POLICY</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-005 · OT/ICS SECURITY</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Policies</p>
          <p className="text-3xl font-black" style={{ color: OT_AMBER }}>{stats.active}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...OT_CARD, border: `2px solid ${stats.avgCompliance < 60 ? OT_RED + "40" : stats.avgCompliance < 80 ? OT_AMBER + "40" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Compliance</p>
          <p className="text-3xl font-black" style={{ color: stats.avgCompliance < 60 ? OT_RED : stats.avgCompliance < 80 ? OT_AMBER : OT_GREEN }}>{stats.avgCompliance}%</p>
        </Card>
        <Card className={`p-4 text-center ${stats.below60 > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.below60 > 0 ? OT_RED + "60" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Below 60%</p>
          <p className="text-3xl font-black" style={{ color: stats.below60 > 0 ? OT_RED : OT_GREEN }}>{stats.below60}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.dueSoon > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.dueSoon > 0 ? OT_AMBER + "40" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Reviews Due</p>
          <p className="text-3xl font-black" style={{ color: stats.dueSoon > 0 ? OT_AMBER : OT_GREEN }}>{stats.dueSoon}</p>
        </Card>
      </div>

      <Card className="p-5" style={OT_CARD}>
        <h3 className="text-sm font-bold text-white mb-4">Infrastructure Policies</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-3 px-3">Title</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Regulatory</th>
                <th className="py-3 px-3">Mandatory</th>
                <th className="py-3 px-3">Sectors</th>
                <th className="py-3 px-3">Compliance</th>
                <th className="py-3 px-3">Sites</th>
                <th className="py-3 px-3">Last Reviewed</th>
                <th className="py-3 px-3">Next Review</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map(policy => (
                <tr key={policy.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 px-3 text-white font-bold">{policy.title}</td>
                  <td className="py-3 px-3"><OTBadge color={policy.policy_type === "nerc_cip" ? OT_AMBER : policy.policy_type === "iec_62443" ? OT_BLUE : policy.policy_type === "plc_change_management" ? OT_RED : OT_GREEN}>{policy.policy_type}</OTBadge></td>
                  <td className="py-3 px-3"><div className="flex gap-1">{policy.regulatory_basis?.slice(0, 2).map((r, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OT_AMBER}15`, color: OT_AMBER }}>{r}</span>)}</div></td>
                  <td className="py-3 px-3 text-center">{policy.mandatory ? <Lock className="w-4 h-4 inline" style={{ color: OT_RED }} /> : "—"}</td>
                  <td className="py-3 px-3"><div className="flex gap-1">{policy.sectors_covered?.slice(0, 2).map((s, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${OT_BLUE}15`, color: OT_BLUE }}>{s}</span>)}</div></td>
                  <td className="py-3 px-3 text-center">
                    <div className="w-20 h-1.5 rounded-full bg-white/10 mx-auto mb-1">
                      <div className="h-full rounded-full" style={{ width: `${policy.compliance_rate_pct || 0}%`, background: (policy.compliance_rate_pct || 0) < 60 ? OT_RED : (policy.compliance_rate_pct || 0) < 80 ? OT_AMBER : OT_GREEN }} />
                    </div>
                    <span className="text-[10px] font-bold">{policy.compliance_rate_pct || 0}%</span>
                  </td>
                  <td className="py-3 px-3 text-[10px] text-white">{policy.sites_compliant || 0}/{policy.sites_total || 0}</td>
                  <td className="py-3 px-3 text-[10px]">{policy.last_reviewed ? new Date(policy.last_reviewed).toLocaleDateString() : "—"}</td>
                  <td className="py-3 px-3 text-[10px]">
                    <span className={policy.next_review && new Date(policy.next_review) < new Date(Date.now() + 30*24*60*60*1000) ? "text-amber-500 font-bold" : "text-white"}>
                      {policy.next_review ? new Date(policy.next_review).toLocaleDateString() : "—"}
                    </span>
                  </td>
                  <td className="py-3 px-3"><OTBadge color={policy.status === "expired" ? OT_RED : policy.status === "review" ? OT_AMBER : OT_GREEN}>{policy.status}</OTBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}