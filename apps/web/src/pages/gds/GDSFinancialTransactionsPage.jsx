import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Globe, AlertTriangle, Brain } from "lucide-react";
import { FINBreadcrumb, FINBanner, FINBadge, RiskGauge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, BORDER, MUTED, TRANSACTION_TYPE_COLORS, CHANNEL_COLORS } from "@/components/gds/FinancialSecurityShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;

export default function GDSFinancialTransactionsPage() {
  const { data: transactions = [] } = useQuery({ queryKey: ["fin-txn"], queryFn: () => base44.entities.Transaction.list("-processed_at", 200).catch(() => []) });

  const stats = {
    total: transactions.length,
    blocked: transactions.filter(t => t.decision === "declined").length,
    highRisk: transactions.filter(t => t.risk_score > 75).length,
    sanctions: transactions.filter(t => t.sanctions_hit).length,
  };

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "Transactions" }]} />
      <FINBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">TRANSACTION INTELLIGENCE CENTER</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · Live Transaction Monitoring</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={FIN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Transactions</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Blocked</p><p className="text-3xl font-black text-red-400">{stats.blocked}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #f9731660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>High Risk</p><p className="text-3xl font-black text-amber-400">{stats.highRisk}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Sanctions Hits</p><p className={`text-3xl font-black ${stats.sanctions > 0 ? 'animate-pulse text-red-400' : 'text-white'}`}>{stats.sanctions}</p></Card>
      </div>

      <Card className="p-5" style={FIN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">TXN Ref</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Channel</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Route</th>
              <th className="pb-3">Risk</th>
              <th className="pb-3">Fraud</th>
              <th className="pb-3">AML</th>
              <th className="pb-3">Cross Border</th>
              <th className="pb-3">Sanctions</th>
              <th className="pb-3">Decision</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {transactions.map(t => (
              <tr key={t.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-mono" style={{ color: FIN_GOLD }}>{t.txn_ref}</td>
                <td className="py-3"><FINBadge color={TRANSACTION_TYPE_COLORS[t.txn_type] || MUTED}>{t.txn_type || "wire"}</FINBadge></td>
                <td className="py-3"><FINBadge color={CHANNEL_COLORS[t.channel] || MUTED}>{t.channel || "swift"}</FINBadge></td>
                <td className="py-3 font-bold text-white">{formatCurrency(t.amount_usd)} {t.currency}</td>
                <td className="py-3" style={{ color: MUTED }}>{t.sender_country} → {t.receiver_country}</td>
                <td className="py-3"><RiskGauge value={t.risk_score} size={32} /></td>
                <td className="py-3"><span className={t.fraud_score > 75 ? "text-red-400 font-bold" : MUTED}>{t.fraud_score || 0}</span></td>
                <td className="py-3"><span className={t.aml_score > 75 ? "text-amber-400 font-bold" : MUTED}>{t.aml_score || 0}</span></td>
                <td className="py-3">{t.is_cross_border ? <Globe className="w-4 h-4 text-blue-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3">{t.sanctions_hit ? <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3"><FINBadge color={t.decision === "approved" ? FIN_GREEN : t.decision === "declined" ? "#dc2626" : t.decision === "held_for_review" ? "#f97316" : "#dc2626"}>{t.decision || "pending"}</FINBadge></td>
                <td className="py-3"><FINBadge color={FIN_GREEN}>{t.status || "completed"}</FINBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}