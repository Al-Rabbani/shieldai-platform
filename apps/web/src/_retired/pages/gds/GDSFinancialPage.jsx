import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { DollarSign, AlertTriangle, Shield, TrendingUp, Activity, Lock } from "lucide-react";
import { FINBreadcrumb, FINBanner, FINBadge, RiskGauge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, BORDER, MUTED, INSTITUTION_TYPE_COLORS, FRAUD_TYPE_COLORS, AML_TYPE_COLORS } from "@/components/gds/FinancialSecurityShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n || 0).toLocaleString()}`;
};

const timeAgo = (d) => d ? new Date(d).toLocaleString() : "—";

export default function GDSFinancialPage() {
  const { data: institutions = [] } = useQuery({ queryKey: ["fin-institutions"], queryFn: () => base44.entities.FinancialInstitution.list().catch(() => []) });
  const { data: transactions = [] } = useQuery({ queryKey: ["fin-txn"], queryFn: () => base44.entities.Transaction.list("-processed_at", 15).catch(() => []) });
  const { data: fraudCases = [] } = useQuery({ queryKey: ["fin-fraud"], queryFn: () => base44.entities.FraudCase.filter({ status: { $nin: ["closed", "resolved"] } }).catch(() => []) });
  const { data: fraudAlerts = [] } = useQuery({ queryKey: ["fin-fraud-alerts"], queryFn: () => base44.entities.FraudAlert.filter({ status: { $nin: ["closed", "false_positive"] } }, "-detected_at", 10).catch(() => []) });
  const { data: amlAlerts = [] } = useQuery({ queryKey: ["fin-aml"], queryFn: () => base44.entities.AMLAlert.filter({ status: { $nin: ["closed", "resolved"] } }, "-severity", 10).catch(() => []) });
  const { data: sars = [] } = useQuery({ queryKey: ["fin-sar"], queryFn: () => base44.entities.SAR.filter({ status: { $in: ["draft", "under_review"] } }).catch(() => []) });
  const { data: sanctions = [] } = useQuery({ queryKey: ["fin-sanctions"], queryFn: () => base44.entities.SanctionsMatch.filter({ status: { $in: ["blocked", "under_review", "confirmed"] } }).catch(() => []) });

  const totalAUM = institutions.reduce((s, i) => s + (i.aum_usd || 0), 0);
  const dailyTxnValue = institutions.reduce((s, i) => s + (i.daily_txn_value_usd || 0), 0);
  const pendingSARsUrgent = sars.filter(s => {
    if (!s.submission_deadline) return false;
    const hoursLeft = (new Date(s.submission_deadline) - new Date()) / (1000 * 60 * 60);
    return hoursLeft < 48;
  }).length;

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "FinSOC Command" }]} />
      <FINBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">FINANCIAL SECURITY OPERATIONS CENTER</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · FinSOC Command Center</p>
      </div>

      {/* HERO STATS */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GOLD}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>AUM Protected</p>
          <p className="text-2xl font-black" style={{ color: FIN_GOLD }}>{formatCurrency(totalAUM)}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GREEN}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Daily TXN Value</p>
          <p className="text-2xl font-black" style={{ color: FIN_GREEN }}>{formatCurrency(dailyTxnValue)}</p>
          <p className="text-[9px]" style={{ color: MUTED }}>/day</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${fraudCases.length > 3 ? "#dc262660" : FIN_GOLD + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Fraud</p>
          <p className={`text-2xl font-black ${fraudCases.length > 3 ? 'animate-pulse text-red-400' : 'text-white'}`}>{fraudCases.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${amlAlerts.length > 0 ? "#f9731660" : FIN_GOLD + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>AML Alerts</p>
          <p className={`text-2xl font-black ${amlAlerts.length > 0 ? 'text-amber-400' : 'text-white'}`}>{amlAlerts.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${pendingSARsUrgent > 0 ? "#dc262660" : FIN_GOLD + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SARs Pending</p>
          <p className={`text-2xl font-black ${pendingSARsUrgent > 0 ? 'animate-pulse text-red-400' : 'text-white'}`}>{pendingSARsUrgent}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${sanctions.length > 0 ? "#dc262660" : FIN_GOLD + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Sanctions</p>
          <p className={`text-2xl font-black ${sanctions.length > 0 ? 'animate-pulse text-red-400' : 'text-white'}`}>{sanctions.length}</p>
        </Card>
      </div>

      {/* THREAT ROW */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Fraud Alerts */}
        <Card className="p-4" style={FIN_CARD}>
          <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: "#dc2626" }} />Fraud Alerts</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {fraudAlerts.map(alert => (
              <div key={alert.id} className="p-2 rounded-lg" style={{ background: "rgba(220,38,38,0.08)", border: `1px solid ${alert.severity === "critical" ? "#dc262640" : "#ef444440"}` }}>
                <div className="flex items-center justify-between mb-1">
                  <FINBadge color={FRAUD_TYPE_COLORS[alert.fraud_type] || "#dc2626"}>{alert.fraud_type || "unknown"}</FINBadge>
                  {alert.severity === "critical" && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                </div>
                <p className="text-xs font-bold text-white">{formatCurrency(alert.amount_usd)}</p>
                <p className="text-[9px]" style={{ color: MUTED }}>{alert.recommended_action || "Manual review"}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* AML Alerts */}
        <Card className="p-4" style={FIN_CARD}>
          <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Lock className="w-4 h-4" style={{ color: "#f97316" }} />AML Alerts</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {amlAlerts.map(alert => (
              <div key={alert.id} className="p-2 rounded-lg" style={{ background: "rgba(249,115,22,0.08)", border: `1px solid ${alert.severity === "critical" ? "#dc262640" : "#f9731640"}` }}>
                <div className="flex items-center justify-between mb-1">
                  <FINBadge color={AML_TYPE_COLORS[alert.alert_type] || "#f97316"}>{alert.alert_type || "unknown"}</FINBadge>
                  {alert.sar_required && <AlertTriangle className="w-3 h-3 text-red-400" />}
                </div>
                <p className="text-xs font-bold text-white">{formatCurrency(alert.total_amount_usd)}</p>
                <p className="text-[9px]" style={{ color: MUTED }}>
                  {alert.countries_involved?.slice(0, 2).join(", ") || "—"}
                  {alert.regulatory_deadline && new Date(alert.regulatory_deadline) < new Date(Date.now() + 24*60*60*1000) && <span className="text-red-400 font-bold ml-1">⚠ {Math.ceil((new Date(alert.regulatory_deadline) - new Date()) / (1000*60*60))}h</span>}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Transaction Feed */}
        <Card className="p-4" style={FIN_CARD}>
          <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><Activity className="w-4 h-4" style={{ color: FIN_GOLD }} />Live Transactions</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {transactions.map(txn => (
              <div key={txn.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${txn.risk_score > 75 ? "#dc262640" : BORDER}` }}>
                <div>
                  <p className="text-xs font-bold text-white">{formatCurrency(txn.amount_usd)}</p>
                  <p className="text-[9px]" style={{ color: MUTED }}>{txn.txn_type} · {txn.channel}</p>
                </div>
                <div className="text-right">
                  <RiskGauge value={txn.risk_score} size={32} />
                  <FINBadge color={txn.decision === "approved" ? FIN_GREEN : txn.decision === "declined" ? "#dc2626" : txn.decision === "held_for_review" ? "#f97316" : "#dc2626"}>{txn.decision || "pending"}</FINBadge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* INSTITUTIONS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {institutions.slice(0, 8).map(inst => (
          <Card key={inst.id} className="p-4" style={FIN_CARD}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white truncate">{inst.institution_name}</p>
              <FINBadge color={INSTITUTION_TYPE_COLORS[inst.institution_type] || MUTED}>{inst.institution_type || "bank"}</FINBadge>
            </div>
            <div className="space-y-2 text-[10px]">
              <div className="flex items-center justify-between">
                <span style={{ color: MUTED }}>AUM</span>
                <span className="font-bold" style={{ color: FIN_GOLD }}>{formatCurrency(inst.aum_usd)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: MUTED }}>Daily TXN</span>
                <span className="font-bold text-white">{formatCurrency(inst.daily_txn_value_usd)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: MUTED }}>Fraud Rate</span>
                <span className={`font-bold ${(inst.fraud_rate_bps || 0) > 5 ? 'text-red-400' : 'text-white'}`}>{inst.fraud_rate_bps || 0} bps</span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: MUTED }}>Risk</span>
                <RiskGauge value={inst.risk_score} size={28} />
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: MUTED }}>Compliance</span>
                <RiskGauge value={inst.compliance_score} size={28} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}