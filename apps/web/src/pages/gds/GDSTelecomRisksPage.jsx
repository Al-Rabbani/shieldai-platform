import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { TelBreadcrumb, TelBadge, TelStat, TelGauge, TEL_PAGE_BG, MUTED, TEL_BLUE, TEL_RED, TEL_CRITICAL, TEL_AMBER, TEL_ORANGE, TEL_GREEN, formatCurrencyUSD, formatSubscribers, TELECOM_RISK_COLORS } from "@/components/gds/TelecomSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { Shield, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";

export default function GDSTelecomRisksPage() {
  const { data: risks, isLoading: riskLoading } = useQuery({ queryKey: ["telecomRisks"], queryFn: () => base44.entities.TelecomRisk.filter({}, "-risk_score") });
  const { data: operators, isLoading: opLoading } = useQuery({ queryKey: ["telecomOperators"], queryFn: () => base44.entities.TelecomOperator.list() });
  const { data: satelliteLinks } = useQuery({ queryKey: ["satelliteLinks"], queryFn: () => base44.entities.SatelliteLink.filter({}) });
  const totalRisks = risks?.length || 0;
  const nationalCommsRisk = risks?.filter(r => r.impact === "national_comms_failure").length || 0;
  const totalExposure = risks?.reduce((sum, r) => sum + (r.financial_exposure_usd || 0), 0) || 0;
  const lowResilience = operators?.filter(op => op.resilience_score < 75).length || 0;
  const interferenceLinks = satelliteLinks?.filter(s => s.interference_detected || s.spoofing_risk).length || 0;

  return (
    <div style={TEL_PAGE_BG}>
      <TelBreadcrumb items={[{ label: "Risk & Resilience" }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">📊 Telecom Risk & Resilience</h1>
        <LiveDataBadge />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <TelStat label="Total Risks" value={totalRisks} color={TEL_BLUE} />
        <TelStat label="National Comms Failure Risk" value={nationalCommsRisk} color={TEL_CRITICAL} pulse={nationalCommsRisk > 0} />
        <TelStat label="Total Financial Exposure" value={formatCurrencyUSD(totalExposure)} color={TEL_RED} />
        <TelStat label="Operators Below 75 Resilience" value={lowResilience} color={TEL_AMBER} pulse={lowResilience > 0} />
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Telecom Risks</h2>
        {riskLoading ? <Skeleton lines={6} /> : risks?.length === 0 ? (
          <EmptyState icon={Shield} title="No risks" description="All risks mitigated" />
        ) : (
          <div className="space-y-2">
            {risks?.map(r => (
              <Card key={r.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <div className="w-32">
                    <h3 className="text-sm font-bold text-white truncate">{r.title}</h3>
                    <TelBadge color={TELECOM_RISK_COLORS[r.risk_category] || TEL_RED}>{r.risk_category}</TelBadge>
                  </div>
                  <TelBadge color={r.likelihood === "very_likely" ? TEL_RED : TEL_ORANGE}>{r.likelihood}</TelBadge>
                  <TelBadge color={r.impact === "national_comms_failure" ? TEL_CRITICAL : TEL_RED}>{r.impact}</TelBadge>
                  <div className="w-16"><TelGauge score={r.risk_score} size={40} /></div>
                  <div className="text-xs">{formatSubscribers(r.subscribers_at_risk)} at risk</div>
                  <div className="text-red-400 font-bold">{formatCurrencyUSD(r.financial_exposure_usd)}</div>
                  <div className="w-32">
                    <div className="text-[9px] mb-1" style={{ color: MUTED }}>Control Eff {r.control_effectiveness_pct}%</div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full ${r.control_effectiveness_pct < 60 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${r.control_effectiveness_pct}%` }} />
                    </div>
                  </div>
                  <div className="w-16"><TelGauge score={r.residual_risk === "critical" ? 90 : r.residual_risk === "high" ? 70 : 40} size={40} /></div>
                  {r.gsma_ref && <TelBadge color={TEL_BLUE}>GSMA</TelBadge>}
                  <TelBadge color={r.status === "active" ? TEL_RED : TEL_GREEN}>{r.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-base font-bold text-white mb-3">Satellite Links</h3>
          {satelliteLinks?.slice(0, 6).map(s => (
            <Card key={s.id} className="p-3 mb-2" glow>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-white">{s.name}</div>
                <TelBadge color={TEL_BLUE}>{s.orbit_type}</TelBadge>
                <div className="text-xs">{s.satellite_name}</div>
                {s.interference_detected && <span className="text-amber-400">⚠️ Interference</span>}
                {s.spoofing_risk && <span className="text-red-400">🎭 Spoofing</span>}
                {s.jamming_detected && <span className="text-red-400">📡 Jamming</span>}
                <div className="w-12"><TelGauge score={s.cyber_risk_score} size={40} /></div>
                <TelBadge color={s.status === "operational" ? TEL_GREEN : TEL_RED}>{s.status}</TelBadge>
              </div>
            </Card>
          ))}
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-3">Operator Resilience</h3>
          {operators?.sort((a, b) => b.resilience_score - a.resilience_score).slice(0, 6).map(op => (
            <Card key={op.id} className="p-3 mb-2" glow>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-white">{op.name}</div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${op.resilience_score < 75 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${op.resilience_score}%` }} />
                  </div>
                </div>
                <div className="text-xs font-bold">{op.resilience_score}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}