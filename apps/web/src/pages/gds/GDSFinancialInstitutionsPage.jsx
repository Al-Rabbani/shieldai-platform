import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle } from "lucide-react";
import { FINBreadcrumb, FINBanner, FINBadge, RiskGauge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, BORDER, MUTED, INSTITUTION_TYPE_COLORS } from "@/components/gds/FinancialSecurityShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n}`;
};

export default function GDSFinancialInstitutionsPage() {
  const { data: institutions = [] } = useQuery({ queryKey: ["fin-institutions"], queryFn: () => base44.entities.FinancialInstitution.list().catch(() => []) });

  const stats = {
    total: institutions.length,
    totalAUM: institutions.reduce((s, i) => s + (i.aum_usd || 0), 0),
    totalDaily: institutions.reduce((s, i) => s + (i.daily_txn_value_usd || 0), 0),
    pciLevel1: institutions.filter(i => i.pci_dss_level === "level_1").length,
  };

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "Institutions" }]} />
      <FINBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">FINANCIAL INSTITUTION PORTFOLIO</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · Portfolio Overview</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={FIN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Institutions</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GOLD}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total AUM</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{formatCurrency(stats.totalAUM)}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GREEN}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Daily Value</p><p className="text-3xl font-black" style={{ color: FIN_GREEN }}>{formatCurrency(stats.totalDaily)}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GOLD}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>PCI Level 1</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.pciLevel1}</p></Card>
      </div>

      <Card className="p-5" style={FIN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Name</th>
              <th className="pb-3">Short</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Country</th>
              <th className="pb-3">AUM</th>
              <th className="pb-3">Daily TXN</th>
              <th className="pb-3">Daily Value</th>
              <th className="pb-3">Fraud Rate</th>
              <th className="pb-3">Risk</th>
              <th className="pb-3">Compliance</th>
              <th className="pb-3">PCI DSS</th>
              <th className="pb-3">SWIFT</th>
              <th className="pb-3">Fraud</th>
              <th className="pb-3">AML</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {institutions.map(i => (
              <tr key={i.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-bold text-white">{i.institution_name}</td>
                <td className="py-3"><span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: `${FIN_GOLD}15`, color: FIN_GOLD }}>{i.short_name || "—"}</span></td>
                <td className="py-3"><FINBadge color={INSTITUTION_TYPE_COLORS[i.institution_type] || MUTED}>{i.institution_type || "bank"}</FINBadge></td>
                <td className="py-3" style={{ color: MUTED }}>{i.country || "—"}</td>
                <td className="py-3 font-bold" style={{ color: FIN_GOLD }}>{formatCurrency(i.aum_usd)}</td>
                <td className="py-3 text-white">{(i.daily_txn_volume || 0) / 1e6}M</td>
                <td className="py-3" style={{ color: FIN_GREEN }}>{formatCurrency(i.daily_txn_value_usd)}</td>
                <td className={`py-3 ${(i.fraud_rate_bps || 0) > 5 ? 'text-amber-400 font-bold' : (i.fraud_rate_bps || 0) > 10 ? 'text-red-400 font-bold' : 'text-white'}`}>{i.fraud_rate_bps || 0} bps</td>
                <td className="py-3"><RiskGauge value={i.risk_score} size={32} /></td>
                <td className="py-3"><RiskGauge value={i.compliance_score} size={32} /></td>
                <td className="py-3"><FINBadge color={i.pci_dss_level === "level_1" ? FIN_GOLD : i.pci_dss_level === "level_2" ? FIN_GREEN : "#f59e0b"}>{i.pci_dss_level || "—"}</FINBadge></td>
                <td className="py-3">{i.swift_csp_compliant ? <CheckCircle className="w-4 h-4 text-green-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3"><span className={i.active_fraud_cases > 0 ? "text-red-400 font-bold" : MUTED}>{i.active_fraud_cases || 0}</span></td>
                <td className="py-3"><span className={i.active_aml_alerts > 0 ? "text-amber-400 font-bold" : MUTED}>{i.active_aml_alerts || 0}</span></td>
                <td className="py-3"><FINBadge color={i.status === "active" ? FIN_GREEN : MUTED}>{i.status || "active"}</FINBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}