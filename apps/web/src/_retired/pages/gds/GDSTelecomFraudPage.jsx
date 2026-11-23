import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { TelBreadcrumb, TelBadge, TelStat, TelGauge, TEL_PAGE_BG, MUTED, TEL_BLUE, TEL_RED, TEL_CRITICAL, TEL_AMBER, TEL_PURPLE, TEL_ORANGE, TEL_GREEN, formatCurrencyUSD, formatDataGB, timeAgo, FRAUD_TYPE_COLORS } from "@/components/gds/TelecomSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { AlertTriangle, Shield, DollarSign, Radio, Globe } from "lucide-react";

export default function GDSTelecomFraudPage() {
  const { data: fraudCases, isLoading: fraudLoading } = useQuery({ queryKey: ["fraudCases"], queryFn: () => base44.entities.FraudCase.list("-amount_usd") });
  const { data: roamingSessions, isLoading: roamingLoading } = useQuery({ queryKey: ["roamingSessions"], queryFn: () => base44.entities.RoamingSession.filter({ status: "active" }) });
  const openCases = fraudCases?.filter(f => f.status !== "closed").length || 0;
  const simSwapCases = fraudCases?.filter(f => f.fraud_type === "sim_swap").length || 0;
  const totalAtRisk = fraudCases?.reduce((sum, f) => sum + (f.amount_usd || 0), 0) || 0;
  const imsiCatcherSessions = roamingSessions?.filter(s => s.imsi_catcher_suspected).length || 0;

  return (
    <div style={TEL_PAGE_BG}>
      <TelBreadcrumb items={[{ label: "Fraud Intelligence" }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">🎭 Telecom Fraud Intelligence Center</h1>
        <LiveDataBadge />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <TelStat label="Open Cases" value={openCases} color={TEL_BLUE} />
        <TelStat label="SIM Swap Cases" value={simSwapCases} color={TEL_RED} pulse={simSwapCases > 0} />
        <TelStat label="Total At Risk" value={formatCurrencyUSD(totalAtRisk)} color={TEL_RED} />
        <TelStat label="IMSI Catcher Suspected" value={imsiCatcherSessions} color={TEL_CRITICAL} pulse={imsiCatcherSessions > 0} />
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Fraud Cases</h2>
        {fraudLoading ? <Skeleton lines={6} /> : fraudCases?.length === 0 ? (
          <EmptyState icon={Shield} title="No fraud cases" description="All cases resolved" />
        ) : (
          <div className="space-y-2">
            {fraudCases?.map(f => (
              <Card key={f.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <TelBadge color={FRAUD_TYPE_COLORS[f.fraud_type] || TEL_RED}>{f.fraud_type}</TelBadge>
                  <div className="text-sm font-semibold text-white">{f.case_ref}</div>
                  <TelBadge color={f.severity === "critical" ? TEL_RED : TEL_ORANGE}>{f.severity}</TelBadge>
                  <div className="text-xs text-slate-300">ID: {f.subscriber_id?.slice(0, 8)}...</div>
                  <div className="text-red-400 font-bold">{formatCurrencyUSD(f.amount_usd)}</div>
                  <TelBadge color={TEL_BLUE}>{f.detection_method}</TelBadge>
                  {f.sar_filed && <span>📄</span>}
                  {f.law_enforcement_notified && <span>👮</span>}
                  <div className="text-xs text-slate-400">{timeAgo(f.detected_at)}</div>
                  <TelBadge color={f.status === "open" ? TEL_RED : TEL_GREEN}>{f.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Roaming Sessions</h2>
        {roamingLoading ? <Skeleton lines={6} /> : roamingSessions?.length === 0 ? (
          <EmptyState icon={Globe} title="No active roaming" description="No sessions" />
        ) : (
          <div className="space-y-2">
            {roamingSessions?.map(s => (
              <Card key={s.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-white">{s.subscriber_id?.slice(0, 8)}</div>
                  <div className="text-xs text-slate-300">{s.home_operator} → {s.visited_operator}</div>
                  <div className="text-xs">{s.visited_country}</div>
                  <div className="text-xs">{s.duration_min} min</div>
                  <div className="text-xs">{formatDataGB(s.data_usage_gb)}</div>
                  {s.signaling_anomaly && <span className="text-amber-400">⚠️</span>}
                  {s.location_spoofing && <span className="text-red-400">📍</span>}
                  <div className="w-12"><TelGauge score={s.fraud_score} size={40} /></div>
                  {s.imsi_catcher_suspected && <TelBadge color={TEL_CRITICAL}>IMSI</TelBadge>}
                  {s.bilateral_agreement_valid && <span>✓</span>}
                  <TelBadge color={s.status === "fraudulent" ? TEL_RED : TEL_GREEN}>{s.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}