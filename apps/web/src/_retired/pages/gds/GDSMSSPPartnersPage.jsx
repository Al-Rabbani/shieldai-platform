import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Handshake, CheckCircle } from "lucide-react";
import { MSSPBreadcrumb, MSSPBanner, MSSPBadge, MSSP_PAGE_BG, MSSP_CARD, MSSP_TEAL, MSSP_GREEN, BORDER, MUTED, PARTNER_TYPE_COLORS, PARTNER_TIER_COLORS } from "@/components/gds/MSSPShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;
const timeAgo = (d) => d ? new Date(d).toLocaleDateString() : "—";

export default function GDSMSSPPartnersPage() {
  const { data: partners = [] } = useQuery({ queryKey: ["mssp-partners"], queryFn: () => base44.entities.Partner.list().catch(() => []) });
  const { data: agreements = [] } = useQuery({ queryKey: ["mssp-agreements"], queryFn: () => base44.entities.PartnerAgreement.list().catch(() => []) });

  const stats = {
    active: partners.filter(p => p.status === "active").length,
    whiteLabel: partners.filter(p => p.white_label_enabled).length,
    totalARR: partners.reduce((s, p) => s + (p.mrr_attributed || 0), 0) * 12,
    ytdCommissions: partners.reduce((s, p) => s + (p.ytd_commission_usd || 0), 0),
  };

  return (
    <div style={MSSP_PAGE_BG}>
      <MSSPBreadcrumb items={[{ label: "Partner Ecosystem" }]} />
      <MSSPBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">PARTNER ECOSYSTEM</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-002 · Partner Management</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${MSSP_TEAL}20`, border: `1px solid ${MSSP_TEAL}40`, color: MSSP_TEAL }}>
          <Handshake className="w-4 h-4" /> Invite New Partner
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={MSSP_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Partners</p><p className="text-3xl font-black" style={{ color: MSSP_TEAL }}>{stats.active}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_TEAL}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>White Label</p><p className="text-3xl font-black" style={{ color: MSSP_TEAL }}>{stats.whiteLabel}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_GREEN}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>ARR Attributed</p><p className="text-3xl font-black" style={{ color: MSSP_GREEN }}>{formatCurrency(stats.totalARR)}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_TEAL}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>YTD Commissions</p><p className="text-3xl font-black" style={{ color: MSSP_TEAL }}>{formatCurrency(stats.ytdCommissions)}</p></Card>
      </div>

      <Card className="p-5" style={MSSP_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Partner Name</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Tier</th>
              <th className="pb-3">Country</th>
              <th className="pb-3">Customers</th>
              <th className="pb-3">MRR Attributed</th>
              <th className="pb-3">Commission</th>
              <th className="pb-3">YTD Commission</th>
              <th className="pb-3">White Label</th>
              <th className="pb-3">Contact</th>
              <th className="pb-3">Joined</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {partners.map(p => (
              <tr key={p.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-bold text-white">{p.partner_name}</td>
                <td className="py-3"><MSSPBadge color={PARTNER_TYPE_COLORS[p.partner_type] || MUTED}>{p.partner_type || "reseller"}</MSSPBadge></td>
                <td className="py-3"><MSSPBadge color={PARTNER_TIER_COLORS[p.tier] || MUTED}>{p.tier || "registered"}</MSSPBadge></td>
                <td className="py-3" style={{ color: MUTED }}>{p.country || "—"}</td>
                <td className="py-3 text-white">{p.customers_active || 0}/{p.customers_referred || 0}</td>
                <td className="py-3 text-white font-mono">{formatCurrency(p.mrr_attributed)}</td>
                <td className="py-3"><span className="text-white">{p.commission_pct || 0}%</span></td>
                <td className="py-3 text-green-400 font-bold">{formatCurrency(p.ytd_commission_usd)}</td>
                <td className="py-3">{p.white_label_enabled ? <CheckCircle className="w-4 h-4 text-green-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3" style={{ color: MUTED }}>{p.contact_email || "—"}</td>
                <td className="py-3" style={{ color: MUTED }}>{timeAgo(p.joined_at)}</td>
                <td className="py-3"><MSSPBadge color={p.status === "active" ? MSSP_GREEN : MUTED}>{p.status || "active"}</MSSPBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}