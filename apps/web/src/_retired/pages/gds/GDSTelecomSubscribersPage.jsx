import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { TelBreadcrumb, TelBadge, TelStat, TelGauge, TEL_PAGE_BG, MUTED, TEL_BLUE, TEL_RED, TEL_CRITICAL, TEL_AMBER, TEL_ORANGE, TEL_GREEN, formatDataGB, timeAgo } from "@/components/gds/TelecomSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { Users, Shield, AlertTriangle, Radio } from "lucide-react";

export default function GDSTelecomSubscribersPage() {
  const { data: subscribers, isLoading: subLoading } = useQuery({ queryKey: ["subscribers"], queryFn: () => base44.entities.Subscriber.filter({}, "-fraud_risk_score", 50) });
  const { data: profiles, isLoading: profLoading } = useQuery({ queryKey: ["subscriberProfiles"], queryFn: () => base44.entities.SubscriberProfile.list() });
  const { data: simCards, isLoading: simLoading } = useQuery({ queryKey: ["simCards"], queryFn: () => base44.entities.SIMCard.filter({ status: "cloned_suspected" }) });
  const flagged = subscribers?.filter(s => s.status === "flagged").length || 0;
  const simSwapRisk = subscribers?.filter(s => s.sim_swap_risk).length || 0;
  const atoRisk = subscribers?.filter(s => s.account_takeover_risk).length || 0;

  return (
    <div style={TEL_PAGE_BG}>
      <TelBreadcrumb items={[{ label: "Subscriber Risk" }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-white">👥 Subscriber Risk Intelligence</h1>
        <LiveDataBadge />
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <TelStat label="Flagged Subscribers" value={flagged} color={TEL_AMBER} />
        <TelStat label="SIM Swap Risk" value={simSwapRisk} color={TEL_RED} pulse={simSwapRisk > 0} />
        <TelStat label="Account Takeover Risk" value={atoRisk} color={TEL_CRITICAL} pulse={atoRisk > 0} />
        <TelStat label="Cloned SIMs Suspected" value={simCards?.length || 0} color={TEL_RED} pulse={simCards?.length > 0} />
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">High-Risk Subscribers</h2>
        {subLoading ? <Skeleton lines={6} /> : subscribers?.length === 0 ? (
          <EmptyState icon={Users} title="No subscribers" description="Add subscribers" />
        ) : (
          <div className="space-y-2">
            {subscribers?.map(s => (
              <Card key={s.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs text-white w-24">{s.subscriber_id?.slice(0, 12)}</div>
                  <TelBadge color={TEL_BLUE}>{s.subscriber_type}</TelBadge>
                  {s.is_roaming && <span className="text-xs">🌍 {s.roaming_country}</span>}
                  <div className="text-xs">{formatDataGB(s.data_usage_30d_gb)}</div>
                  <div className="w-16"><TelGauge score={s.fraud_risk_score} size={40} /></div>
                  {s.sim_swap_risk && <TelBadge color={TEL_RED}>SIM Swap</TelBadge>}
                  {s.account_takeover_risk && <TelBadge color={TEL_CRITICAL}>ATO</TelBadge>}
                  {s.anomalous_behavior && <span className="text-amber-400 animate-pulse">⚠️</span>}
                  {s.location_anomaly && <span>📍</span>}
                  <div className="text-xs text-slate-400">{timeAgo(s.last_activity)}</div>
                  <TelBadge color={s.status === "blocked" ? TEL_RED : s.status === "flagged" ? TEL_AMBER : TEL_GREEN}>{s.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-base font-bold text-white mb-3">Subscriber Profiles</h3>
          {profLoading ? <Skeleton lines={4} /> : profiles?.slice(0, 5).map(p => (
            <Card key={p.id} className="p-3 mb-2" glow>
              <div className="flex items-center gap-2">
                <TelBadge color={TEL_BLUE}>{p.plan_type}</TelBadge>
                {p.kyc_verified ? <span className="text-green-400">✓ KYC</span> : <span className="text-red-400">✗ KYC</span>}
                {p.fraud_history > 0 && <span className="text-red-400">{p.fraud_history} prior</span>}
                {p.sim_swaps_90d > 1 && <span className="text-amber-400">{p.sim_swaps_90d} swaps</span>}
                {p.high_value_target && <span>🎯</span>}
                {p.mfa_enrolled && <span>🔐</span>}
                <TelBadge color={p.risk_tier === "critical" ? TEL_RED : TEL_ORANGE}>{p.risk_tier}</TelBadge>
              </div>
            </Card>
          ))}
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-3">Cloned SIMs</h3>
          {simLoading ? <Skeleton lines={4} /> : simCards?.slice(0, 5).map(sim => (
            <Card key={sim.id} className="p-3 mb-2" glow>
              <div className="flex items-center gap-2">
                <div className="font-mono text-xs text-white">{sim.iccid}</div>
                <TelBadge color={TEL_BLUE}>{sim.sim_type}</TelBadge>
                {sim.swap_count > 2 && <span className="text-red-400">{sim.swap_count} swaps</span>}
                {sim.device_changes_30d > 2 && <span className="text-amber-400">{sim.device_changes_30d} devices</span>}
                {sim.cloning_risk && <TelBadge color={TEL_CRITICAL}>Clone</TelBadge>}
                <div className="w-12"><TelGauge score={sim.fraud_score} size={40} /></div>
                <TelBadge color={TEL_RED}>{sim.status}</TelBadge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}