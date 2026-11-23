import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { TelBreadcrumb, TelBadge, TelGauge, TEL_PAGE_BG, MUTED, CORE_FUNCTION_COLORS, SLICE_TYPE_COLORS, TEL_BLUE, TEL_RED, TEL_GREEN, TEL_GOLD, TEL_CRITICAL, timeAgo } from "@/components/gds/TelecomSecurityShared";
import { RadioTower, Shield, AlertTriangle } from "lucide-react";

export default function GDSTelecom5GPage() {
  const { data: coreFunctions, isLoading: coreLoading } = useQuery({ queryKey: ["coreFunctions"], queryFn: () => base44.entities.CoreFunction.list() });
  const { data: slices, isLoading: slicesLoading } = useQuery({ queryKey: ["networkSlices"], queryFn: () => base44.entities.NetworkSlice.list() });
  const isolationBreaches = slices?.filter(s => s.isolation_breach).length || 0;

  return (
    <div style={TEL_PAGE_BG}>
      <TelBreadcrumb items={[{ label: "5G/6G Security Center" }]} />
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4" glow><div className="text-[9px] text-slate-400 mb-1">Core Functions</div><div className="text-2xl font-bold text-white">{coreFunctions?.length || 0}</div></Card>
        <Card className="p-4" glow><div className="text-[9px] text-slate-400 mb-1">5G Operators</div><div className="text-2xl font-bold text-blue-400">{coreFunctions?.length || 0}</div></Card>
        <Card className="p-4" glow><div className="text-[9px] text-slate-400 mb-1">Network Slices</div><div className="text-2xl font-bold text-green-400">{slices?.length || 0}</div></Card>
        <Card className="p-4" glow><div className="text-[9px] text-slate-400 mb-1">Isolation Breaches</div><div className={`text-2xl font-bold ${isolationBreaches > 0 ? "text-red-500 animate-pulse" : "text-white"}`}>{isolationBreaches}</div></Card>
      </div>

      {/* Core Functions */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">5G Core Network Functions</h2>
        {coreLoading ? <Skeleton lines={4} /> : coreFunctions?.length === 0 ? (
          <EmptyState icon={RadioTower} title="No core functions" description="Add 5G core network functions" />
        ) : (
          <div className="space-y-2">
            {coreFunctions?.map(f => (
              <Card key={f.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <TelBadge color={CORE_FUNCTION_COLORS[f.function_type] || MUTED}>{f.function_type}</TelBadge>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{f.name}</h3>
                    <p className="text-[10px]" style={{ color: MUTED }}>{f.vendor} | {f.deployment_model}</p>
                  </div>
                  <div className="w-32">
                    <div className="text-[9px] mb-1" style={{ color: MUTED }}>Availability {f.availability_pct}%</div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full ${f.availability_pct < 99.9 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${f.availability_pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right"><div className="text-xs text-white">{f.tps >= 1000 ? `${(f.tps/1000).toFixed(1)}K` : f.tps} TPS</div><div className="text-[9px]" style={{ color: MUTED }}>Throughput</div></div>
                  {f.vulnerabilities > 0 && <div className="text-red-400">⚠️ {f.vulnerabilities}</div>}
                  {f.anomaly_detected && <div className="text-amber-400 animate-pulse">⚠️ Anomaly</div>}
                  {f.signaling_storm && <TelBadge color={TEL_CRITICAL}>Storm</TelBadge>}
                  <div className="w-16"><TelGauge score={f.risk_score} size={40} /></div>
                  <div className="text-right w-24"><div className="text-[9px]" style={{ color: MUTED }}>Patched</div><div className="text-xs text-white">{timeAgo(f.last_patched)}</div></div>
                  <TelBadge color={f.status === "operational" ? TEL_GREEN : TEL_RED}>{f.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Network Slices */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Network Slices</h2>
        {slicesLoading ? <Skeleton lines={4} /> : slices?.length === 0 ? (
          <EmptyState icon={Shield} title="No slices" description="Add network slices" />
        ) : (
          <div className="space-y-2">
            {slices?.map(s => (
              <Card key={s.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <TelBadge color={SLICE_TYPE_COLORS[s.slice_type] || MUTED}>{s.slice_type}</TelBadge>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{s.slice_name}</h3>
                    <p className="text-[10px]" style={{ color: MUTED }}>SST-{s.sst} | {s.isolation_level} | {s.customer}</p>
                  </div>
                  <div className="text-right"><div className="text-xs text-white">{s.current_subscribers}/{s.max_subscribers}</div><div className="text-[9px]" style={{ color: MUTED }}>Subscribers</div></div>
                  <div className="text-right"><div className="text-xs text-white">{s.bandwidth_gbps} Gbps</div><div className="text-[9px]" style={{ color: MUTED }}>Bandwidth</div></div>
                  <div className="text-right"><div className={`text-xs ${s.slice_type === "urllc" && s.latency_target_ms > 20 ? "text-red-500" : "text-white"}`}>{s.latency_target_ms} ms</div><div className="text-[9px]" style={{ color: MUTED }}>Latency</div></div>
                  {s.anomaly_detected && <div className="text-amber-400 animate-pulse">⚠️</div>}
                  {s.isolation_breach && <TelBadge color={TEL_CRITICAL}>Breach</TelBadge>}
                  <div className="w-16"><TelGauge score={s.risk_score} size={40} /></div>
                  <TelBadge color={s.status === "active" ? TEL_GREEN : TEL_RED}>{s.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}