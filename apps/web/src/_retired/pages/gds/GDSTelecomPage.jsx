import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { 
  TelBreadcrumb, TelBanner, TelBadge, TelStat, TelGauge, TEL_PAGE_BG, TEL_CARD, 
  BORDER, MUTED, TEXT, TEL_BLUE, TEL_CYAN, TEL_RED, TEL_GREEN, TEL_ORANGE, TEL_AMBER, TEL_PURPLE, TEL_CRITICAL, TEL_GOLD,
  OPERATOR_TYPE_COLORS, formatSubscribers, formatCurrencyUSD, formatDataTB, timeAgo
} from "@/components/gds/TelecomSecurityShared";
import { RadioTower, Crown, Shield, AlertTriangle, Activity, Globe, Radio, Zap } from "lucide-react";

export default function GDSTelecomPage() {
  const { data: operators, isLoading: operatorsLoading } = useQuery({
    queryKey: ["telecomOperators"],
    queryFn: () => base44.entities.TelecomOperator.list(),
  });
  const { data: threats, isLoading: threatsLoading } = useQuery({
    queryKey: ["telecomThreats"],
    queryFn: () => base44.entities.TelecomThreat.filter({ status: "active" }, "-probability_30d_pct", 6),
  });
  const { data: bgpRoutes } = useQuery({
    queryKey: ["bgpRoutes"],
    queryFn: () => base44.entities.CarrierRoute.filter({ is_hijacked: true }),
  });
  const { data: incidents } = useQuery({
    queryKey: ["telecomIncidents"],
    queryFn: () => base44.entities.TelecomIncident.filter({ status: "investigating" }),
  });

  const bgpHijackCount = bgpRoutes?.length || 0;
  const catastrophicCount = threats?.filter(t => t.severity === "carrier_catastrophic").length || 0;
  const totalSubscribers = operators?.reduce((sum, op) => sum + (op.subscribers || 0), 0) || 0;
  const totalFraudLoss = operators?.reduce((sum, op) => sum + (op.annual_fraud_loss_usd || 0), 0) || 0;
  const fiveEyesThreats = threats?.filter(t => t.five_eyes_shared).length || 0;

  return (
    <div style={TEL_PAGE_BG}>
      <Breadcrumb items={[{ label: "Telecom Security" }]} />
      <TelBanner bgpHijackCount={bgpHijackCount} catastrophicThreatCount={catastrophicCount} />
      
      {/* Hero Stats */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <TelStat label="Operators Protected" value={operators?.length || 0} color={TEL_BLUE} />
        <TelStat label="Total Subscribers" value={formatSubscribers(totalSubscribers)} color={TEL_CYAN} />
        <TelStat label="Revenue Protected" value={formatCurrencyUSD(12580000000)} color={TEL_GREEN} />
        <TelStat label="Annual Fraud Loss" value={formatCurrencyUSD(totalFraudLoss)} sub="/year" color={TEL_AMBER} pulse={totalFraudLoss > 0} />
        <TelStat label="BGP Hijacks" value={bgpHijackCount} color={TEL_RED} pulse={bgpHijackCount > 0} />
        <TelStat label="Five Eyes Threats" value={fiveEyesThreats} color={TEL_CRITICAL} />
      </div>

      {/* Operator Grid */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Carrier Operators</h2>
        {operatorsLoading ? <Skeleton lines={4} /> : operators?.length === 0 ? (
          <EmptyState icon={RadioTower} title="No operators" description="Add telecom operators to monitor" />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {operators?.map(op => (
              <Card key={op.id} className="p-4" glow>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">{op.name}</h3>
                    <p className="text-[10px] font-mono" style={{ color: MUTED }}>{op.short_name}</p>
                  </div>
                  <TelBadge color={OPERATOR_TYPE_COLORS[op.operator_type] || MUTED}>{op.operator_type}</TelBadge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span style={{ color: MUTED }}>Country</span><span className="text-white">{op.country}</span></div>
                  <div className="flex justify-between"><span style={{ color: MUTED }}>Subscribers</span><span className="text-white">{formatSubscribers(op.subscribers)}</span></div>
                  <div className="flex justify-between"><span style={{ color: MUTED }}>Base Stations</span><span className="text-white">{op.base_stations >= 1000 ? `${(op.base_stations/1000).toFixed(1)}K` : op.base_stations}</span></div>
                  <div className="flex justify-between"><span style={{ color: MUTED }}>Daily Data</span><span className="text-white">{formatDataTB(op.daily_data_tb)}</span></div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1"><div className="text-[9px] mb-1" style={{ color: MUTED }}>Risk</div><TelGauge score={op.risk_score} size={40} /></div>
                    <div className="flex-1"><div className="text-[9px] mb-1" style={{ color: MUTED }}>Resilience</div><TelGauge score={op.resilience_score} size={40} /></div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {op.has_5g && <TelBadge color={TEL_CYAN}>5G</TelBadge>}
                    {op.has_6g_trials && <TelBadge color={TEL_GOLD}>6G</TelBadge>}
                    {op.gsma_member && <TelBadge color={TEL_BLUE}>GSMA</TelBadge>}
                  </div>
                  {op.active_incidents > 0 && <div className="text-[9px] text-red-400 mt-2">⚠️ {op.active_incidents} incidents</div>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Threat Row */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Active Telecom Threats</h2>
        {threatsLoading ? <Skeleton lines={3} /> : threats?.length === 0 ? (
          <EmptyState icon={Shield} title="No active threats" description="All threats mitigated" />
        ) : (
          <div className="space-y-2">
            {threats?.map(t => (
              <Card key={t.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <div className="w-12 text-center">
                    {t.severity === "carrier_catastrophic" ? <Crown className="w-6 h-6 mx-auto" style={{ color: TEL_CRITICAL }} /> : <TelBadge color={t.severity === "critical" ? TEL_RED : TEL_ORANGE}>{t.severity}</TelBadge>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <TelBadge color={TEL_RED}>{t.threat_type}</TelBadge>
                      <span className="text-xs text-white font-semibold">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: MUTED }}>
                      <span>Actor: {t.threat_actor}</span>
                      <span>•</span>
                      <span>Origin: {t.origin_country}</span>
                      <span>•</span>
                      <span>At risk: {formatSubscribers(t.subscribers_at_risk)}</span>
                      <span>•</span>
                      <span>Impact: {formatCurrencyUSD(t.financial_impact_usd)}</span>
                    </div>
                  </div>
                  <div className="w-24 text-right"><div className="text-[9px] mb-1" style={{ color: MUTED }}>Prob 30d</div><TelGauge score={t.probability_30d_pct} size={40} /></div>
                  <div className="w-32">
                    <div className="flex gap-1 flex-wrap">{t.targeted_operators?.slice(0, 2).map((op, i) => <TelBadge key={i} color={TEL_CYAN}>{op}</TelBadge>)}</div>
                    <div className="flex gap-1 flex-wrap mt-1">{t.targeted_protocols?.slice(0, 2).map((p, i) => <TelBadge key={i} color={MUTED}>{p}</TelBadge>)}</div>
                  </div>
                  <div className="text-right">
                    {t.gsma_ref && <TelBadge color={TEL_CYAN}>GSMA</TelBadge>}
                    {t.cisa_advisory_ref && <div className="text-[9px] text-amber-400 mt-1">CISA</div>}
                    {t.five_eyes_shared && <TelBadge color={TEL_CRITICAL}>Five Eyes</TelBadge>}
                    <div className="text-[9px] mt-1" style={{ color: t.status === "active" ? TEL_RED : MUTED }}>{t.status}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}