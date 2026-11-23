import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { TelBreadcrumb, TelBadge, TelGauge, TEL_PAGE_BG, MUTED, TEL_BLUE, TEL_RED, TEL_AMBER, TEL_GREEN, TEL_CRITICAL, formatThroughput, timeAgo } from "@/components/gds/TelecomSecurityShared";
import { RadioTower, Shield, AlertTriangle, Globe } from "lucide-react";

export default function GDSTelecomBgpDnsPage() {
  const { data: routes, isLoading: routesLoading } = useQuery({ queryKey: ["carrierRoutes"], queryFn: () => base44.entities.CarrierRoute.list("-is_hijacked", 50) });
  const { data: fibers, isLoading: fibersLoading } = useQuery({ queryKey: ["fiberSegments"], queryFn: () => base44.entities.FiberSegment.list() });
  const hijackCount = routes?.filter(r => r.is_hijacked).length || 0;
  const leakCount = routes?.filter(r => r.is_leaked).length || 0;
  const rpkiInvalid = routes?.filter(r => !r.rpki_valid).length || 0;
  const tapRiskCount = fibers?.filter(f => f.tap_risk).length || 0;

  return (
    <div style={TEL_PAGE_BG}>
      <TelBreadcrumb items={[{ label: "BGP & DNS Security Center" }]} />
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4" glow><div className="text-[9px] text-slate-400 mb-1">BGP Hijacks</div><div className={`text-2xl font-bold ${hijackCount > 0 ? "text-red-500 animate-pulse" : "text-white"}`}>{hijackCount}</div></Card>
        <Card className="p-4" glow><div className="text-[9px] text-slate-400 mb-1">Route Leaks</div><div className={`text-2xl font-bold ${leakCount > 0 ? "text-amber-500" : "text-white"}`}>{leakCount}</div></Card>
        <Card className="p-4" glow><div className="text-[9px] text-slate-400 mb-1">RPKI Invalid</div><div className="text-2xl font-bold text-amber-400">{rpkiInvalid}</div></Card>
        <Card className="p-4" glow><div className="text-[9px] text-slate-400 mb-1">Submarine Tap Risk</div><div className={`text-2xl font-bold ${tapRiskCount > 0 ? "text-red-500" : "text-white"}`}>{tapRiskCount}</div></Card>
      </div>

      {/* BGP Routes */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">BGP Routes</h2>
        {routesLoading ? <Skeleton lines={6} /> : routes?.length === 0 ? (
          <EmptyState icon={Globe} title="No routes" description="Add carrier routes" />
        ) : (
          <div className="space-y-2">
            {routes?.map(r => (
              <Card key={r.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-sm text-white w-32">{r.prefix}</div>
                  <TelBadge color={r.route_type === "hijacked" ? TEL_CRITICAL : r.route_type === "leaked" ? TEL_RED : TEL_AMBER}>{r.route_type}</TelBadge>
                  <div className="font-mono text-xs text-slate-300">AS{r.origin_asn}</div>
                  <div className="font-mono text-[10px] text-slate-400 flex-1 truncate">{r.as_path}</div>
                  {r.is_hijacked && <TelBadge color={TEL_CRITICAL}>HIJACKED</TelBadge>}
                  {r.is_leaked && <TelBadge color={TEL_RED}>LEAKED</TelBadge>}
                  <div className="text-right w-16">{r.rpki_valid ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}<div className="text-[9px]" style={{ color: MUTED }}>RPKI</div></div>
                  {r.bgpsec && <div className="text-green-400">🔐</div>}
                  {r.anomaly_detected && <div className="text-amber-400 animate-pulse">⚠️</div>}
                  <div className="w-20"><TelGauge score={r.hijack_confidence_pct || 0} size={40} /></div>
                  <div className="text-right"><div className="text-xs text-white">{r.affected_prefixes}</div><div className="text-[9px]" style={{ color: MUTED }}>Affected</div></div>
                  <div className="text-right"><div className="text-xs text-white">{formatThroughput(r.traffic_gbps)}</div><div className="text-[9px]" style={{ color: MUTED }}>Traffic</div></div>
                  <div className="text-right w-24"><div className="text-[9px]" style={{ color: MUTED }}>Detected</div><div className="text-xs text-white">{timeAgo(r.detected_at)}</div></div>
                  <TelBadge color={r.status === "valid" ? TEL_GREEN : r.status === "hijacked" ? TEL_CRITICAL : TEL_RED}>{r.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Fiber Segments */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Fiber Segments</h2>
        {fibersLoading ? <Skeleton lines={6} /> : fibers?.length === 0 ? (
          <EmptyState icon={RadioTower} title="No fiber segments" description="Add fiber segments" />
        ) : (
          <div className="space-y-2">
            {fibers?.map(f => (
              <Card key={f.id} className="p-3" glow>
                <div className="flex items-center gap-3">
                  <TelBadge color={f.segment_type === "submarine_cable" ? TEL_CRITICAL : f.segment_type === "terrestrial_backbone" ? TEL_AMBER : TEL_BLUE}>{f.segment_type}</TelBadge>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{f.name}</h3>
                    <p className="text-[10px]" style={{ color: MUTED }}>{f.from_location} → {f.to_location}</p>
                  </div>
                  <div className="text-right"><div className="text-xs text-white">{formatThroughput(f.capacity_gbps)}</div><div className="text-[9px]" style={{ color: MUTED }}>Capacity</div></div>
                  <div className="w-32">
                    <div className="text-[9px] mb-1" style={{ color: MUTED }}>Util {f.utilization_pct}%</div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full ${f.utilization_pct > 80 ? "bg-amber-500" : "bg-blue-500"}`} style={{ width: `${f.utilization_pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right"><div className="text-xs text-white">{f.length_km} km</div><div className="text-[9px]" style={{ color: MUTED }}>Length</div></div>
                  {f.is_critical && <div className="text-amber-400">🛡️</div>}
                  {f.is_redundant && <div className="text-green-400">🔗</div>}
                  {f.tap_risk && <div className="text-red-400 animate-pulse">⚠️ Tap</div>}
                  <div className="w-16"><TelGauge score={f.physical_risk_score} size={40} /></div>
                  <div className="w-16"><TelGauge score={f.cyber_risk_score} size={40} /></div>
                  <TelBadge color={f.status === "operational" ? TEL_GREEN : TEL_RED}>{f.status}</TelBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}