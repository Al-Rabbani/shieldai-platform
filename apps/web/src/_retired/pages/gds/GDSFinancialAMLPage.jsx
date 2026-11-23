import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, AlertTriangle } from "lucide-react";
import { FINBreadcrumb, FINBanner, FINBadge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, BORDER, MUTED, AML_TYPE_COLORS, SAR_TYPE_COLORS } from "@/components/gds/FinancialSecurityShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;

export default function GDSFinancialAMLPage() {
  const [activeTab, setActiveTab] = useState("alerts");
  const { data: amlAlerts = [] } = useQuery({ queryKey: ["fin-aml-alerts"], queryFn: () => base44.entities.AMLAlert.list("-severity", 200).catch(() => []) });
  const { data: sars = [] } = useQuery({ queryKey: ["fin-sars"], queryFn: () => base44.entities.SAR.list("-created_at", 200).catch(() => []) });

  const stats = {
    open: amlAlerts.filter(a => a.status !== "closed" && a.status !== "resolved").length,
    sarPending: sars.filter(s => ["draft", "under_review"].includes(s.status)).length,
    critical: amlAlerts.filter(a => a.regulatory_deadline && new Date(a.regulatory_deadline) < new Date(Date.now() + 24*60*60*1000)).length,
    totalAmount: amlAlerts.reduce((s, a) => s + (a.total_amount_usd || 0), 0),
  };

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "AML Intelligence" }]} />
      <FINBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">AML INTELLIGENCE CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · Anti-Money Laundering</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${FIN_GOLD}20`, border: `1px solid ${FIN_GOLD}40`, color: FIN_GOLD }}>
          <FileText className="w-4 h-4" /> Generate SAR Narrative
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={FIN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Alerts</p><p className="text-3xl font-black text-white">{stats.open}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GOLD}40` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SARs Pending</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.sarPending}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262640` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical Deadline</p><p className={`text-3xl font-black ${stats.critical > 0 ? 'animate-pulse text-red-400' : 'text-white'}`}>{stats.critical}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262640` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Suspicious Amount</p><p className="text-3xl font-black text-red-400">{formatCurrency(stats.totalAmount)}</p></Card>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab("alerts")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "alerts" ? 'text-white' : ''}`} style={{ background: activeTab === "alerts" ? FIN_GOLD : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "alerts" ? "#000" : MUTED }}>Alerts</button>
        <button onClick={() => setActiveTab("sars")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "sars" ? 'text-white' : ''}`} style={{ background: activeTab === "sars" ? FIN_GOLD : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "sars" ? "#000" : MUTED }}>SARs</button>
      </div>

      {activeTab === "alerts" ? (
        <Card className="p-5" style={FIN_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Alert Ref</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Countries</th>
                <th className="pb-3">ML Confidence</th>
                <th className="pb-3">SAR Required</th>
                <th className="pb-3">Deadline</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {amlAlerts.map(a => {
                const hoursLeft = a.regulatory_deadline ? Math.ceil((new Date(a.regulatory_deadline) - new Date()) / (1000*60*60)) : null;
                return (
                  <tr key={a.id} className="border-t" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-mono" style={{ color: FIN_GOLD }}>{a.alert_ref}</td>
                    <td className="py-3"><FINBadge color={AML_TYPE_COLORS[a.alert_type] || "#f97316"}>{a.alert_type || "unknown"}</FINBadge></td>
                    <td className="py-3"><FINBadge color={a.severity === "critical" ? "#dc2626" : a.severity === "high" ? "#ef4444" : "#f97316"}>{a.severity || "medium"}</FINBadge></td>
                    <td className="py-3 text-white">{a.customer_id || "—"}</td>
                    <td className="py-3 font-bold text-red-400">{formatCurrency(a.total_amount_usd)}</td>
                    <td className="py-3">{a.countries_involved?.slice(0, 3).join(", ") || "—"}</td>
                    <td className="py-3"><div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${a.ml_confidence_pct || 0}%`, background: (a.ml_confidence_pct || 0) > 80 ? FIN_GREEN : "#f97316" }} /></div></td>
                    <td className="py-3">{a.sar_required ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                    <td className={`py-3 ${hoursLeft !== null && hoursLeft < 24 ? 'text-red-400 font-bold animate-pulse' : hoursLeft !== null && hoursLeft < 72 ? 'text-amber-400' : MUTED}`}>{hoursLeft !== null ? `${hoursLeft}h` : "—"}</td>
                    <td className="py-3"><FINBadge color={a.status === "closed" ? FIN_GREEN : a.status === "investigating" ? "#f97316" : MUTED}>{a.status || "new"}</FINBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-5" style={FIN_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">SAR Ref</th>
                <th className="pb-3">SAR Type</th>
                <th className="pb-3">Subject</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Countries</th>
                <th className="pb-3">Deadline</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {sars.map(s => {
                const hoursLeft = s.submission_deadline ? Math.ceil((new Date(s.submission_deadline) - new Date()) / (1000*60*60)) : null;
                return (
                  <tr key={s.id} className="border-t" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-mono" style={{ color: FIN_GOLD }}>{s.sar_ref}</td>
                    <td className="py-3"><FINBadge color={SAR_TYPE_COLORS[s.sar_type] || "#dc2626"}>{s.sar_type || "unknown"}</FINBadge></td>
                    <td className="py-3 text-white">{s.subject_name || "—"}</td>
                    <td className="py-3 font-bold text-red-400">{formatCurrency(s.total_suspicious_amount_usd)}</td>
                    <td className="py-3">{s.countries_involved?.join(", ") || "—"}</td>
                    <td className={`py-3 ${hoursLeft !== null && hoursLeft < 24 ? 'text-red-400 font-bold animate-pulse' : hoursLeft !== null && hoursLeft < 72 ? 'text-amber-400' : MUTED}`}>{hoursLeft !== null ? `${hoursLeft}h` : "—"}</td>
                    <td className="py-3"><FINBadge color={s.status === "submitted" ? FIN_GREEN : s.status === "acknowledged" ? FIN_GREEN : s.status === "approved" ? "#3b82f6" : s.status === "under_review" ? "#f97316" : MUTED}>{s.status || "draft"}</FINBadge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}