import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Shield, CheckCircle, XCircle, Clock, Lock } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, AnimatedArc } from "@/components/gds/GDSOSShared";
import { HCBreadcrumb, HCBanner, HCBadge, HCStat, HC_PAGE_BG, HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, BORDER, MUTED, TEXT } from "@/components/gds/HealthcareSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSHealthcareCompliancePage() {
  const { data: policies = [], isLoading } = useQuery({ queryKey: ["hc-policies"], queryFn: () => base44.entities.HealthcarePolicy.list().catch(() => []) });

  const stats = {
    hipaaScore: 71,
    failingControls: 5,
    underReview: policies.filter(p => p.status === "under_review").length,
    hhsNotificationsPending: 0,
  };

  return (
    <div style={HC_PAGE_BG}>
      <HCBreadcrumb items={[{ label: "HIPAA & Compliance" }]} />
      <HCBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">HIPAA & HEALTHCARE COMPLIANCE CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-004 · Regulatory Compliance</p>
        </div>
        <LiveDataBadge />
      </div>

      {/* HIPAA SCORECARD */}
      <Card className="p-6 mb-6" style={{ ...HC_CARD, border: `2px solid ${HC_ORANGE}40` }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">HIPAA Compliance Scorecard</h3>
            <p className="text-sm" style={{ color: MUTED }}>12/17 controls passing</p>
          </div>
          <div className="flex items-center gap-4">
            <AnimatedArc score={stats.hipaaScore} size={100} />
            <div className="text-right">
              <p className="text-4xl font-black" style={{ color: HC_ORANGE }}>{stats.hipaaScore}%</p>
              <p className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Compliance Rate</p>
            </div>
          </div>
        </div>
      </Card>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_ORANGE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>HIPAA Score</p>
          <p className="text-3xl font-black" style={{ color: HC_ORANGE }}>{stats.hipaaScore}%</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Failing Controls</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.failingControls}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_ORANGE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Policies Under Review</p>
          <p className="text-3xl font-black" style={{ color: HC_ORANGE }}>{stats.underReview}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>HHS Notifications Pending</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.hhsNotificationsPending}</p>
        </Card>
      </div>

      {/* POLICIES TABLE */}
      <Card className="p-5" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: HC_TEAL }} />
            Healthcare Policies
          </h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{policies.length} policies</span>
        </div>

        {isLoading ? <Skeleton lines={10} /> : policies.length === 0 ? (
          <EmptyState icon={FileText} title="No Policies" description="No healthcare policies registered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Policy Type</th>
                  <th className="pb-3">Mandatory</th>
                  <th className="pb-3">Compliance Rate</th>
                  <th className="pb-3">Next Review</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {policies.slice(0, 50).map(p => (
                  <tr key={p.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-bold text-white">{p.title}</td>
                    <td className="py-3"><HCBadge color={HC_TEAL}>{p.policy_type}</HCBadge></td>
                    <td className="py-3">{p.is_mandatory ? <Lock className="w-4 h-4" style={{ color: HC_RED }} /> : "—"}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${p.compliance_rate_pct || 0}%`, background: (p.compliance_rate_pct || 0) < 60 ? HC_RED : (p.compliance_rate_pct || 0) < 80 ? HC_ORANGE : HC_GREEN }} />
                        </div>
                        <span className="text-[9px]" style={{ color: MUTED }}>{p.compliance_rate_pct || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3" style={{ color: MUTED }}>{p.next_review_date ? new Date(p.next_review_date).toLocaleDateString() : "—"}</td>
                    <td className="py-3"><HCBadge color={p.status === "active" ? HC_GREEN : HC_ORANGE}>{p.status}</HCBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}