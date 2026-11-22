import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle } from "lucide-react";
import { FINBreadcrumb, FINBanner, FINBadge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, BORDER, MUTED, KYC_LEVEL_COLORS, RISK_RATING_COLORS } from "@/components/gds/FinancialSecurityShared";
import { Card } from "@/components/gds/GDSOSShared";

export default function GDSFinancialKYCPage() {
  const [activeTab, setActiveTab] = useState("kyc");
  const { data: kycProfiles = [] } = useQuery({ queryKey: ["fin-kyc"], queryFn: () => base44.entities.KYCProfile.list().catch(() => []) });
  const { data: cddRecords = [] } = useQuery({ queryKey: ["fin-cdd"], queryFn: () => base44.entities.CDDRecord.list().catch(() => []) });
  const { data: eddRecords = [] } = useQuery({ queryKey: ["fin-edd"], queryFn: () => base44.entities.EDDRecord.list().catch(() => []) });

  const stats = {
    total: kycProfiles.length,
    enhanced: kycProfiles.filter(k => k.kyc_level === "enhanced").length,
    pep: kycProfiles.filter(k => k.pep_match).length,
    expiring: kycProfiles.filter(k => k.expires_at && new Date(k.expires_at) < new Date(Date.now() + 30*24*60*60*1000)).length,
  };

  const daysToExpiry = (d) => {
    if (!d) return null;
    return Math.ceil((new Date(d) - new Date()) / (1000*60*60*24));
  };

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "KYC & CDD" }]} />
      <FINBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">KYC & CUSTOMER DUE DILIGENCE</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · Customer Verification</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={FIN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total KYC</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GOLD}40` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Enhanced KYC</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.enhanced}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GOLD}40` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>PEP Profiles</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.pep}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #f9731660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Expiring Soon</p><p className="text-3xl font-black text-amber-400">{stats.expiring}</p></Card>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab("kyc")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "kyc" ? 'text-white' : ''}`} style={{ background: activeTab === "kyc" ? FIN_GOLD : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "kyc" ? "#000" : MUTED }}>KYC Profiles</button>
        <button onClick={() => setActiveTab("cdd")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "cdd" ? 'text-white' : ''}`} style={{ background: activeTab === "cdd" ? FIN_GOLD : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "cdd" ? "#000" : MUTED }}>CDD Records</button>
        <button onClick={() => setActiveTab("edd")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "edd" ? 'text-white' : ''}`} style={{ background: activeTab === "edd" ? FIN_GOLD : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "edd" ? "#000" : MUTED }}>EDD Records</button>
      </div>

      {activeTab === "kyc" && (
        <Card className="p-5" style={FIN_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Customer</th>
                <th className="pb-3">KYC Level</th>
                <th className="pb-3">Verifications</th>
                <th className="pb-3">PEP</th>
                <th className="pb-3">Sanctions</th>
                <th className="pb-3">Adverse Media</th>
                <th className="pb-3">Risk Rating</th>
                <th className="pb-3">Expires</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {kycProfiles.map(k => {
                const expDays = daysToExpiry(k.expires_at);
                return (
                  <tr key={k.id} className="border-t" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-semibold text-white">{k.customer_name || k.customer_id}</td>
                    <td className="py-3"><FINBadge color={KYC_LEVEL_COLORS[k.kyc_level] || MUTED}>{k.kyc_level || "standard"}</FINBadge></td>
                    <td className="py-3 flex gap-1">
                      {k.verifications?.id_verified && <CheckCircle className="w-3 h-3 text-green-400" />}
                      {k.verifications?.biometric_verified && <CheckCircle className="w-3 h-3 text-green-400" />}
                      {k.verifications?.address_verified && <CheckCircle className="w-3 h-3 text-green-400" />}
                      {k.verifications?.source_of_funds_verified && <CheckCircle className="w-3 h-3 text-green-400" />}
                    </td>
                    <td className="py-3">{k.pep_match ? <Shield className="w-4 h-4 text-amber-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                    <td className="py-3">{k.sanctions_match ? <Shield className="w-4 h-4 text-red-400 animate-pulse" /> : <span style={{ color: MUTED }}>—</span>}</td>
                    <td className="py-3">{k.adverse_media_hit ? <span className="text-red-400 font-bold">YES</span> : <span style={{ color: MUTED }}>—</span>}</td>
                    <td className="py-3"><FINBadge color={RISK_RATING_COLORS[k.risk_rating] || MUTED}>{k.risk_rating || "medium"}</FINBadge></td>
                    <td className={`py-3 ${expDays !== null && expDays < 7 ? 'text-red-400 font-bold' : expDays !== null && expDays < 30 ? 'text-amber-400' : MUTED}`}>{expDays !== null ? `${expDays}d` : "—"}</td>
                    <td className="py-3"><FINBadge color={k.status === "active" ? FIN_GREEN : MUTED}>{k.status || "active"}</FINBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "cdd" && (
        <Card className="p-5" style={FIN_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Customer</th>
                <th className="pb-3">CDD Type</th>
                <th className="pb-3">Source of Funds</th>
                <th className="pb-3">Source of Wealth</th>
                <th className="pb-3">Beneficial Owners</th>
                <th className="pb-3">Business Verified</th>
                <th className="pb-3">Risk</th>
                <th className="pb-3">Next Review</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {cddRecords.map(c => (
                <tr key={c.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 text-white">{c.customer_name || c.customer_id}</td>
                  <td className="py-3"><FINBadge color={FIN_GOLD}>{c.cdd_type || "standard"}</FINBadge></td>
                  <td className="py-3" style={{ color: MUTED }}>{c.source_of_funds || "—"}</td>
                  <td className="py-3" style={{ color: MUTED }}>{c.source_of_wealth || "—"}</td>
                  <td className="py-3 text-white">{c.beneficial_owners_verified}/{c.beneficial_owners_identified}</td>
                  <td className="py-3">{c.business_activity_verified ? <CheckCircle className="w-4 h-4 text-green-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3"><FINBadge color={RISK_RATING_COLORS[c.risk_classification] || MUTED}>{c.risk_classification || "medium"}</FINBadge></td>
                  <td className="py-3" style={{ color: MUTED }}>{c.next_review_date ? new Date(c.next_review_date).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {activeTab === "edd" && (
        <Card className="p-5" style={FIN_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Customer</th>
                <th className="pb-3">EDD Trigger</th>
                <th className="pb-3">Senior Approved</th>
                <th className="pb-3">Monitoring</th>
                <th className="pb-3">Measures</th>
                <th className="pb-3">Review Date</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {eddRecords.map(e => (
                <tr key={e.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 text-white">{e.customer_name || e.customer_id}</td>
                  <td className="py-3"><FINBadge color={e.edd_trigger === "pep_identified" ? FIN_GOLD : e.edd_trigger === "high_risk_country" ? "#dc2626" : "#f97316"}>{e.edd_trigger || "unknown"}</FINBadge></td>
                  <td className="py-3">{e.senior_management_approved ? <span className="text-amber-400">👑</span> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3" style={{ color: MUTED }}>{e.ongoing_monitoring_frequency || "—"}</td>
                  <td className="py-3" style={{ color: MUTED }}>{e.monitoring_measures?.slice(0, 2).join(", ") || "—"}</td>
                  <td className="py-3" style={{ color: MUTED }}>{e.review_date ? new Date(e.review_date).toLocaleDateString() : "—"}</td>
                  <td className="py-3"><FINBadge color={e.status === "active" ? FIN_GREEN : MUTED}>{e.status || "active"}</FINBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}