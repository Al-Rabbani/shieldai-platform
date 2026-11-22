import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Heart, TrendingUp } from "lucide-react";
import { MSSPBreadcrumb, MSSPBanner, MSSPBadge, HealthScoreGauge, MSSP_PAGE_BG, MSSP_CARD, MSSP_TEAL, MSSP_GREEN, BORDER, MUTED, CHURN_COLORS } from "@/components/gds/MSSPShared";
import { Card } from "@/components/gds/GDSOSShared";

export default function GDSMSSPHealthPage() {
  const { data: healthScores = [] } = useQuery({ queryKey: ["mssp-health"], queryFn: () => base44.entities.CustomerHealthScore.list("-overall_score", 200).catch(() => []) });

  const sorted = [...healthScores].sort((a, b) => (a.overall_score || 0) - (b.overall_score || 0));
  const avgHealth = healthScores.length > 0 ? healthScores.reduce((s, h) => s + (h.overall_score || 0), 0) / healthScores.length : 0;
  const aGrade = healthScores.filter(h => h.grade === "A+" || h.grade === "A").length;
  const churnRisk = healthScores.filter(h => ["high", "critical"].includes(h.churn_risk)).length;
  const upsell = healthScores.filter(h => h.upsell_opportunity).length;

  return (
    <div style={MSSP_PAGE_BG}>
      <MSSPBreadcrumb items={[{ label: "Customer Health" }]} />
      <MSSPBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">CUSTOMER HEALTH & SUCCESS</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-002 · Customer Success Platform</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={MSSP_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Health Score</p><p className="text-3xl font-black" style={{ color: MSSP_GREEN }}>{Math.round(avgHealth)}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_GREEN}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>A-Grade Customers</p><p className="text-3xl font-black" style={{ color: MSSP_GREEN }}>{aGrade}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid #dc262660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Churn Risk High</p><p className="text-3xl font-black text-red-400">{churnRisk}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid #fbbf2460` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Upsell Opportunities</p><p className="text-3xl font-black" style={{ color: "#fbbf24" }}>{upsell}</p></Card>
      </div>

      <Card className="p-5" style={MSSP_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Overall Score</th>
              <th className="pb-3">Grade</th>
              <th className="pb-3">Trend</th>
              <th className="pb-3">Security</th>
              <th className="pb-3">Compliance</th>
              <th className="pb-3">SLA</th>
              <th className="pb-3">Churn Risk</th>
              <th className="pb-3">Upsell</th>
              <th className="pb-3">MTTD</th>
              <th className="pb-3">MTTR</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {sorted.map(h => (
              <tr key={h.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-bold text-white">{h.customer_name}</td>
                <td className="py-3"><HealthScoreGauge score={h.overall_score || 0} size={40} /></td>
                <td className="py-3"><MSSPBadge color={h.grade === "A+" || h.grade === "A" ? MSSP_GREEN : h.grade === "B" ? "#3b82f6" : h.grade === "C" ? "#f59e0b" : "#dc2626"}>{h.grade || "C"}</MSSPBadge></td>
                <td className="py-3">{h.trend === "up" ? <TrendingUp className="w-4 h-4 text-green-400" /> : h.trend === "down" ? <TrendingUp className="w-4 h-4 text-red-400 rotate-180" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3"><div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${h.security_score || 0}%`, background: (h.security_score || 0) > 80 ? MSSP_GREEN : "#f97316" }} /></div></td>
                <td className="py-3"><div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${h.compliance_score || 0}%`, background: (h.compliance_score || 0) > 80 ? MSSP_GREEN : "#f97316" }} /></div></td>
                <td className="py-3"><div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${h.sla_score || 0}%`, background: (h.sla_score || 0) > 80 ? MSSP_GREEN : "#f97316" }} /></div></td>
                <td className="py-3"><MSSPBadge color={CHURN_COLORS[h.churn_risk] || MUTED}>{h.churn_risk || "low"}</MSSPBadge></td>
                <td className="py-3">{h.upsell_opportunity ? <Heart className="w-4 h-4 text-amber-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3 text-white">{h.mttd_minutes || 0}m</td>
                <td className="py-3 text-white">{h.mttr_hours || 0}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}