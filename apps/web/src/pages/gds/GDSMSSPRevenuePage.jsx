import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { TrendingUp, DollarSign, CheckCircle } from "lucide-react";
import { MSSPBreadcrumb, MSSPBanner, MSSPBadge, MSSP_PAGE_BG, MSSP_CARD, MSSP_TEAL, MSSP_GREEN, BORDER, MUTED, PARTNER_TYPE_COLORS, PARTNER_TIER_COLORS } from "@/components/gds/MSSPShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;

export default function GDSMSSPRevenuePage() {
  const { data: revenueReports = [] } = useQuery({ queryKey: ["mssp-revenue"], queryFn: () => base44.entities.RevenueReport.list("-period_end", 1).catch(() => []) });
  const { data: invoices = [] } = useQuery({ queryKey: ["mssp-invoices"], queryFn: () => base44.entities.CustomerInvoice.list("-due_date", 200).catch(() => []) });
  const { data: partners = [] } = useQuery({ queryKey: ["mssp-partners"], queryFn: () => base44.entities.Partner.list().catch(() => []) });

  const latest = revenueReports[0];
  const mrr = latest?.mrr_usd || 0;
  const arr = mrr * 12;
  const nrr = latest?.nrr_pct || 100;

  const stats = {
    totalRevenue: invoices.reduce((s, i) => s + (i.total_usd || 0), 0),
    pending: invoices.filter(i => i.status === "issued").length,
    partnerMRR: partners.reduce((s, p) => s + (p.mrr_attributed || 0), 0),
    overdue: invoices.filter(i => i.status === "overdue").length,
  };

  return (
    <div style={MSSP_PAGE_BG}>
      <MSSPBreadcrumb items={[{ label: "Revenue & Billing" }]} />
      <MSSPBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">REVENUE & BILLING CENTER</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-002 · Financial Operations</p>
      </div>

      {/* REVENUE HERO */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-5" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_GREEN}40` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>MRR</p>
          <p className="text-4xl font-black font-mono" style={{ color: MSSP_GREEN }}>{formatCurrency(mrr)}</p>
        </Card>
        <Card className="p-5" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_TEAL}40` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>ARR</p>
          <p className="text-4xl font-black font-mono" style={{ color: MSSP_TEAL }}>{formatCurrency(arr)}</p>
        </Card>
        <Card className="p-5" style={{ ...MSSP_CARD, border: `2px solid ${nrr >= 100 ? MSSP_GREEN + "40" : "#dc262640"}` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>NRR</p>
          <p className={`text-4xl font-black font-mono ${nrr >= 100 ? 'text-green-400' : 'text-red-400'}`}>{nrr}%</p>
        </Card>
        <Card className="p-5" style={MSSP_CARD}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Net Growth</p>
          <p className={`text-4xl font-black font-mono ${(latest?.net_growth_usd || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(latest?.net_growth_usd || 0)}</p>
        </Card>
      </div>

      {/* INVOICES */}
      <Card className="p-5" style={MSSP_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Invoice #</th>
              <th className="pb-3">Period</th>
              <th className="pb-3">Base</th>
              <th className="pb-3">Overage</th>
              <th className="pb-3">Credits</th>
              <th className="pb-3">Total</th>
              <th className="pb-3">Due Date</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {invoices.map(i => {
              const daysUntilDue = i.due_date ? Math.ceil((new Date(i.due_date) - new Date()) / (1000*60*60*24)) : null;
              return (
                <tr key={i.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-bold text-white">{i.customer_name}</td>
                  <td className="py-3 font-mono" style={{ color: MSSP_TEAL }}>{i.invoice_number}</td>
                  <td className="py-3" style={{ color: MUTED }}>{i.billing_period_start ? new Date(i.billing_period_start).toLocaleDateString() : "—"} - {i.billing_period_end ? new Date(i.billing_period_end).toLocaleDateString() : "—"}</td>
                  <td className="py-3 text-white font-mono">{formatCurrency(i.base_subscription_usd)}</td>
                  <td className="py-3 text-white font-mono">{formatCurrency(i.overage_usd)}</td>
                  <td className="py-3 text-red-400 font-mono">-{formatCurrency(i.sla_credits_usd)}</td>
                  <td className="py-3 text-white font-bold font-mono">{formatCurrency(i.total_usd)}</td>
                  <td className={`py-3 ${daysUntilDue !== null && daysUntilDue < 0 ? 'text-red-400 font-bold' : daysUntilDue !== null && daysUntilDue < 7 ? 'text-amber-400' : MUTED}`}>{daysUntilDue !== null ? (daysUntilDue < 0 ? `OVERDUE ${Math.abs(daysUntilDue)}d` : `${daysUntilDue}d`) : "—"}</td>
                  <td className="py-3"><MSSPBadge color={i.status === "paid" ? MSSP_GREEN : i.status === "overdue" ? "#dc2626" : "#f97316"}>{i.status || "issued"}</MSSPBadge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}