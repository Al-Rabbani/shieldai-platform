import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { FINBreadcrumb, FINBanner, FINBadge, RiskGauge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, BORDER, MUTED, LIKELIHOOD_COLORS, IMPACT_COLORS } from "@/components/gds/FinancialSecurityShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n}`;
};

export default function GDSFinancialRiskPage() {
  const { data: risks = [] } = useQuery({ queryKey: ["fin-risks"], queryFn: () => base44.entities.FinancialRisk.list("-risk_score", 200).catch(() => []) });

  const stats = {
    total: risks.length,
    criticalExposure: risks.reduce((s, r) => s + (r.financial_exposure_usd || 0), 0),
    regulatoryExposure: risks.reduce((s, r) => s + (r.regulatory_fine_exposure_usd || 0), 0),
    avgControl: risks.length > 0 ? Math.round(risks.reduce((s, r) => s + (r.control_effectiveness_pct || 0), 0) / risks.length) : 0,
  };

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "Risk Register" }]} />
      <FINBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">FINANCIAL RISK REGISTER</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · Enterprise Risk Management</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={FIN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Risks</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Financial Exposure</p><p className="text-3xl font-black text-red-400">{formatCurrency(stats.criticalExposure)}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Regulatory Exposure</p><p className="text-3xl font-black text-red-400">{formatCurrency(stats.regulatoryExposure)}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${stats.avgControl >= 60 ? FIN_GREEN + "60" : "#dc262660"}` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Control</p><p className={`text-3xl font-black ${stats.avgControl >= 60 ? 'text-green-400' : 'text-red-400'}`}>{stats.avgControl}%</p></Card>
      </div>

      <Card className="p-5" style={FIN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Title</th>
              <th className="pb-3">Category</th>
              <th className="pb-3">Likelihood</th>
              <th className="pb-3">Impact</th>
              <th className="pb-3">Risk Score</th>
              <th className="pb-3">Financial Exp</th>
              <th className="pb-3">Regulatory Exp</th>
              <th className="pb-3">Control Eff</th>
              <th className="pb-3">Residual</th>
              <th className="pb-3">Regulations</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {risks.map(r => (
              <tr key={r.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-bold text-white">{r.risk_title}</td>
                <td className="py-3"><FINBadge color={MUTED}>{r.risk_category || "operational"}</FINBadge></td>
                <td className="py-3"><FINBadge color={LIKELIHOOD_COLORS[r.likelihood] || MUTED}>{r.likelihood || "possible"}</FINBadge></td>
                <td className="py-3"><FINBadge color={IMPACT_COLORS[r.impact] || MUTED}>{r.impact || "moderate"}</FINBadge></td>
                <td className="py-3"><RiskGauge value={r.risk_score} size={32} /></td>
                <td className={`py-3 font-bold ${(r.financial_exposure_usd || 0) > 1e8 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(r.financial_exposure_usd)}</td>
                <td className={`py-3 font-bold ${(r.regulatory_fine_exposure_usd || 0) > 1e7 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(r.regulatory_fine_exposure_usd)}</td>
                <td className="py-3"><div className="w-20 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${r.control_effectiveness_pct || 0}%`, background: (r.control_effectiveness_pct || 0) >= 60 ? FIN_GREEN : "#dc2626" }} /></div></td>
                <td className="py-3"><RiskGauge value={r.residual_risk_score} size={32} /></td>
                <td className="py-3">{r.regulation_refs?.slice(0, 2).map((ref, i) => <FINBadge key={i} color={MUTED} className="mr-1">{ref}</FINBadge>)}</td>
                <td className="py-3"><FINBadge color={r.status === "mitigated" ? FIN_GREEN : r.status === "active" ? "#f97316" : MUTED}>{r.status || "active"}</FINBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}