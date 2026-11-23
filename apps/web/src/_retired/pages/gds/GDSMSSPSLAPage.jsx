import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, AlertTriangle } from "lucide-react";
import { MSSPBreadcrumb, MSSPBanner, MSSPBadge, MSSP_PAGE_BG, MSSP_CARD, MSSP_TEAL, MSSP_GREEN, BORDER, MUTED } from "@/components/gds/MSSPShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;

export default function GDSMSSPSLAPage() {
  const { data: slas = [] } = useQuery({ queryKey: ["mssp-slas"], queryFn: () => base44.entities.SLA.list().catch(() => []) });

  const stats = {
    total: slas.length,
    met: slas.filter(s => s.met).length,
    atRisk: slas.filter(s => s.status === "at_risk").length,
    breached: slas.filter(s => s.status === "breached").length,
    creditsIssued: slas.reduce((s, sl) => s + (sl.credits_issued_usd || 0), 0),
  };
  const metPct = stats.total > 0 ? (stats.met / stats.total) * 100 : 100;

  return (
    <div style={MSSP_PAGE_BG}>
      <MSSPBreadcrumb items={[{ label: "SLA Management" }]} />
      <MSSPBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">SLA MANAGEMENT</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-002 · Service Level Agreements</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <Card className="p-4 text-center" style={MSSP_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total SLAs</p><p className="text-3xl font-black" style={{ color: MSSP_TEAL }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_GREEN}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Met</p><p className="text-3xl font-black" style={{ color: MSSP_GREEN }}>{Math.round(metPct)}%</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid #f9731660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>At Risk</p><p className="text-3xl font-black text-amber-400">{stats.atRisk}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid #dc262660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Breached</p><p className="text-3xl font-black text-red-400">{stats.breached}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid #f9731660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Credits Issued</p><p className="text-3xl font-black text-amber-400">{formatCurrency(stats.creditsIssued)}</p></Card>
      </div>

      <Card className="p-5" style={MSSP_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Plan Tier</th>
              <th className="pb-3">SLA Type</th>
              <th className="pb-3">Target</th>
              <th className="pb-3">Actual</th>
              <th className="pb-3">Met</th>
              <th className="pb-3">Breaches/30d</th>
              <th className="pb-3">Penalty</th>
              <th className="pb-3">Period</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {slas.map(s => (
              <tr key={s.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3"><MSSPBadge color={MUTED}>{s.customer_name}</MSSPBadge></td>
                <td className="py-3"><MSSPBadge color={MUTED}>{s.plan_tier || "professional"}</MSSPBadge></td>
                <td className="py-3"><MSSPBadge color={s.sla_type === "detection_response" ? MSSP_TEAL : s.sla_type === "incident_response" ? "#f97316" : "#10b981"}>{s.sla_type || "uptime"}</MSSPBadge></td>
                <td className="py-3 text-white">{s.target_value || 0}</td>
                <td className={`py-3 font-bold ${s.actual_value < s.target_value ? 'text-green-400' : 'text-red-400'}`}>{s.actual_value || 0}</td>
                <td className="py-3">{s.met ? <Clock className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}</td>
                <td className={`py-3 ${s.breach_count_30d > 0 ? 'text-red-400 font-bold' : MUTED}`}>{s.breach_count_30d || 0}</td>
                <td className={`py-3 ${s.breach_penalty_usd > 0 ? 'text-red-400 font-bold' : MUTED}`}>{formatCurrency(s.breach_penalty_usd)}</td>
                <td className="py-3" style={{ color: MUTED }}>{s.measurement_period || "monthly"}</td>
                <td className="py-3"><MSSPBadge color={s.status === "met" ? MSSP_GREEN : s.status === "at_risk" ? "#f97316" : "#dc2626"}>{s.status || "met"}</MSSPBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}