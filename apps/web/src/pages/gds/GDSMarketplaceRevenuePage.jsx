import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, BarChart2 } from "lucide-react";
import { ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveBadge, EXECUTIVE_PAGE_BG, GOLD, CARD_BG, BORDER, MUTED } from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

export default function GDSMarketplaceRevenuePage() {
  const { data: revenue = [] } = useQuery({ queryKey: ["revenue-share"], queryFn: () => base44.entities.RevenueShare.list("-period_end", 100).catch(() => []) });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.MarketplaceInvoice.list("-due_date", 100).catch(() => []) });
  
  const totalRevenue = revenue.reduce((s, r) => s + (r.gross_revenue_usd || 0), 0);
  const totalPayout = revenue.reduce((s, r) => s + (r.publisher_payout_usd || 0), 0);
  const platformFees = revenue.reduce((s, r) => s + (r.platform_fee_usd || 0), 0);
  const outstandingInvoices = invoices.filter(i => i.status !== "paid").length;

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "Revenue & Analytics" }]} />
      <BoardConfidentialBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Revenue & Analytics</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>Financial Performance & Payouts</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #10B98130` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Gross Revenue</p><p className="text-3xl font-black text-green-400">${(totalRevenue/1000).toFixed(1)}K</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Platform Fees</p><p className="text-3xl font-black" style={{ color: GOLD }}>${(platformFees/1000).toFixed(1)}K</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #0EA5E930` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Publisher Payouts</p><p className="text-3xl font-black text-sky-400">${(totalPayout/1000).toFixed(1)}K</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #EF444430` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Outstanding</p><p className="text-3xl font-black text-red-400">{outstandingInvoices}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" style={{ color: GOLD }} />Revenue Share by Publisher</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Publisher</th>
                <th className="pb-3">Period</th>
                <th className="pb-3">Gross</th>
                <th className="pb-3">Platform Fee</th>
                <th className="pb-3">Payout</th>
                <th className="pb-3">Installs</th>
                <th className="pb-3">Top Item</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {revenue.map(r => (
                <tr key={r.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-semibold text-white">{r.publisher_name}</td>
                  <td className="py-3" style={{ color: MUTED }}>{r.period_start ? new Date(r.period_start).toLocaleDateString() : "N/A"}</td>
                  <td className="py-3 text-green-400">${(r.gross_revenue_usd || 0).toLocaleString()}</td>
                  <td className="py-3" style={{ color: GOLD }}>${(r.platform_fee_usd || 0).toLocaleString()}</td>
                  <td className="py-3 text-sky-400">${(r.publisher_payout_usd || 0).toLocaleString()}</td>
                  <td className="py-3 text-white">{r.installs_period || 0}</td>
                  <td className="py-3" style={{ color: MUTED }}>{r.top_item || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4" style={{ color: GOLD }} />Invoices</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Invoice #</th>
                <th className="pb-3">Subscriber</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Due Date</th>
                <th className="pb-3">Paid</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-semibold text-white">{inv.invoice_number}</td>
                  <td className="py-3" style={{ color: MUTED }}>{inv.subscriber_tenant}</td>
                  <td className="py-3 text-white">${(inv.total_usd || 0).toLocaleString()}</td>
                  <td className="py-3" style={{ color: inv.due_date && new Date(inv.due_date) < new Date() ? "#EF4444" : MUTED }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "N/A"}</td>
                  <td className="py-3" style={{ color: inv.paid_at ? "#10B981" : MUTED }}>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "Unpaid"}</td>
                  <td className="py-3"><ExecutiveBadge color={inv.status === "paid" ? "#10B981" : inv.status === "overdue" ? "#EF4444" : "#F59E0B"}>{inv.status}</ExecutiveBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}