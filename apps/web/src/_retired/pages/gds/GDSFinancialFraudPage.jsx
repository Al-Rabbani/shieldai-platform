import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Shield } from "lucide-react";
import { FINBreadcrumb, FINBanner, FINBadge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, BORDER, MUTED, FRAUD_TYPE_COLORS } from "@/components/gds/FinancialSecurityShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;
const timeAgo = (d) => d ? new Date(d).toLocaleDateString() : "—";

export default function GDSFinancialFraudPage() {
  const [activeTab, setActiveTab] = useState("cases");
  const { data: fraudCases = [] } = useQuery({ queryKey: ["fin-fraud-cases"], queryFn: () => base44.entities.FraudCase.list("-detected_at", 200).catch(() => []) });
  const { data: fraudAlerts = [] } = useQuery({ queryKey: ["fin-fraud-alerts"], queryFn: () => base44.entities.FraudAlert.list("-detected_at", 200).catch(() => []) });

  const stats = {
    open: fraudCases.filter(c => c.status !== "closed" && c.status !== "resolved").length,
    critical: fraudCases.filter(c => c.severity === "critical").length,
    atRisk: fraudCases.filter(c => c.status !== "closed").reduce((s, c) => s + (c.amount_at_risk_usd || 0), 0),
    withSAR: fraudCases.filter(c => c.sar_filed).length,
  };

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "Fraud Operations" }]} />
      <FINBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">FRAUD OPERATIONS CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · Fraud Detection & Response</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${FIN_GOLD}20`, border: `1px solid ${FIN_GOLD}40`, color: FIN_GOLD }}>
          <FileText className="w-4 h-4" /> Create SAR
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={FIN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Cases</p><p className="text-3xl font-black text-white">{stats.open}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262640` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical</p><p className="text-3xl font-black text-red-400">{stats.critical}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262640` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Amount at Risk</p><p className="text-3xl font-black text-red-400">{formatCurrency(stats.atRisk)}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GOLD}40` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SARs Filed</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.withSAR}</p></Card>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab("cases")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "cases" ? 'text-white' : ''}`} style={{ background: activeTab === "cases" ? FIN_GOLD : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "cases" ? "#000" : MUTED }}>Cases</button>
        <button onClick={() => setActiveTab("alerts")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "alerts" ? 'text-white' : ''}`} style={{ background: activeTab === "alerts" ? FIN_GOLD : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "alerts" ? "#000" : MUTED }}>Alerts</button>
      </div>

      {activeTab === "cases" ? (
        <Card className="p-5" style={FIN_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Case Ref</th>
                <th className="pb-3">Fraud Type</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Amount Risk</th>
                <th className="pb-3">Amount Lost</th>
                <th className="pb-3">Recovered</th>
                <th className="pb-3">Detection</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">SAR</th>
                <th className="pb-3">Detected</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {fraudCases.map(c => (
                <tr key={c.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-mono" style={{ color: FIN_GOLD }}>{c.case_ref}</td>
                  <td className="py-3"><FINBadge color={FRAUD_TYPE_COLORS[c.fraud_type] || "#dc2626"}>{c.fraud_type || "unknown"}</FINBadge></td>
                  <td className="py-3"><FINBadge color={c.severity === "critical" ? "#dc2626" : c.severity === "high" ? "#ef4444" : "#f97316"}>{c.severity || "medium"}</FINBadge></td>
                  <td className="py-3 font-bold text-red-400">{formatCurrency(c.amount_at_risk_usd)}</td>
                  <td className="py-3 text-red-400">{formatCurrency(c.amount_lost_usd)}</td>
                  <td className="py-3 text-green-400">{formatCurrency(c.amount_recovered_usd)}</td>
                  <td className="py-3"><FINBadge color={c.detection_method === "ai_ml" ? "#3b82f6" : c.detection_method === "behavior_analytics" ? "#a855f7" : "#f97316"}>{c.detection_method || "manual"}</FINBadge></td>
                  <td className="py-3 text-white">{c.customer_id || "—"}</td>
                  <td className="py-3">{c.sar_filed ? <FileText className="w-4 h-4 text-green-400" /> : <span style={{ color: MUTED }}>—</span>}</td>
                  <td className="py-3" style={{ color: MUTED }}>{timeAgo(c.detected_at)}</td>
                  <td className="py-3"><FINBadge color={c.status === "closed" ? FIN_GREEN : c.status === "investigating" ? "#f97316" : MUTED}>{c.status || "open"}</FINBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-5" style={FIN_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Alert Ref</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Confidence</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Explanation</th>
                <th className="pb-3">Detected</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {fraudAlerts.map(a => (
                <tr key={a.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-mono" style={{ color: FIN_GOLD }}>{a.alert_ref}</td>
                  <td className="py-3"><FINBadge color={FRAUD_TYPE_COLORS[a.fraud_type] || "#dc2626"}>{a.fraud_type || "unknown"}</FINBadge></td>
                  <td className="py-3"><FINBadge color={a.severity === "critical" ? "#dc2626" : "#ef4444"}>{a.severity || "high"}</FINBadge></td>
                  <td className="py-3 font-bold text-red-400">{formatCurrency(a.amount_usd)}</td>
                  <td className="py-3"><div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${a.confidence_pct || 0}%`, background: (a.confidence_pct || 0) > 80 ? FIN_GREEN : "#f97316" }} /></div></td>
                  <td className="py-3"><FINBadge color={MUTED}>{a.recommended_action || "review"}</FINBadge></td>
                  <td className="py-3 truncate max-w-xs" style={{ color: MUTED }}>{a.explanation || "—"}</td>
                  <td className="py-3" style={{ color: MUTED }}>{timeAgo(a.detected_at)}</td>
                  <td className="py-3"><FINBadge color={a.status === "false_positive" ? FIN_GREEN : a.status === "closed" ? MUTED : "#f97316"}>{a.status || "new"}</FINBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}