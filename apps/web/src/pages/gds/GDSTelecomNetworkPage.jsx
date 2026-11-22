import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { 
  TelBreadcrumb, TelBadge, TelGauge, TEL_PAGE_BG, BORDER, MUTED, NODE_TYPE_COLORS,
  formatThroughput, timeAgo, TEL_BLUE, TEL_RED, TEL_AMBER, TEL_GREEN
} from "@/components/gds/TelecomSecurityShared";
import { RadioTower, Globe, AlertTriangle } from "lucide-react";

export default function GDSTelecomNetworkPage() {
  const [activeTab, setActiveTab] = useState("nodes");
  const { data: nodes, isLoading: nodesLoading } = useQuery({ queryKey: ["networkNodes"], queryFn: () => base44.entities.NetworkNode.list("-risk_score", 50) });
  const { data: regions, isLoading: regionsLoading } = useQuery({ queryKey: ["networkRegions"], queryFn: () => base44.entities.NetworkRegion.list() });

  return (
    <div style={TEL_PAGE_BG}>
      <TelBreadcrumb items={[{ label: "Carrier Network Operations" }]} />
      
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("nodes")} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === "nodes" ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400"}`}>Network Nodes</button>
        <button onClick={() => setActiveTab("regions")} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeTab === "regions" ? "bg-blue-600 text-white" : "bg-white/5 text-slate-400"}`}>Network Regions</button>
      </div>

      {activeTab === "nodes" ? (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Network Nodes</h2>
          {nodesLoading ? <Skeleton lines={6} /> : nodes?.length === 0 ? (
            <EmptyState icon={RadioTower} title="No nodes" description="Add network nodes to monitor" />
          ) : (
            <div className="space-y-2">
              {nodes?.map(n => (
                <Card key={n.id} className="p-3" glow>
                  <div className="flex items-center gap-3">
                    <TelBadge color={NODE_TYPE_COLORS[n.node_type] || MUTED}>{n.node_type}</TelBadge>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white">{n.name}</h3>
                      <p className="text-[10px] font-mono" style={{ color: MUTED }}>{n.vendor} | {n.software_version}</p>
                    </div>
                    <div className="flex gap-1">{n.protocols?.slice(0, 3).map((p, i) => <TelBadge key={i} color={MUTED}>{p}</TelBadge>)}</div>
                    <div className="text-right">
                      <div className="text-xs text-white">{formatThroughput(n.throughput_gbps)}</div>
                      <div className="text-[9px]" style={{ color: MUTED }}>Throughput</div>
                    </div>
                    <div className="w-20"><TelGauge score={n.risk_score} size={40} /></div>
                    {n.internet_facing && <TelBadge color={TEL_AMBER}>Internet</TelBadge>}
                    {n.anomaly_detected && <div className="text-red-400 animate-pulse">⚠️</div>}
                    <div className="text-right w-24">
                      <div className="text-[9px]" style={{ color: MUTED }}>Last Patched</div>
                      <div className={`text-xs ${timeAgo(n.last_patched).includes("month") ? "text-amber-400" : "text-white"}`}>{timeAgo(n.last_patched)}</div>
                    </div>
                    <TelBadge color={n.status === "operational" ? TEL_GREEN : TEL_RED}>{n.status}</TelBadge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Network Regions</h2>
          {regionsLoading ? <Skeleton lines={6} /> : regions?.length === 0 ? (
            <EmptyState icon={Globe} title="No regions" description="Add network regions" />
          ) : (
            <div className="space-y-2">
              {regions?.map(r => (
                <Card key={r.id} className="p-3" glow>
                  <div className="flex items-center gap-3">
                    <TelBadge color={r.region_type === "core" ? TEL_RED : r.region_type === "metro" ? TEL_BLUE : TEL_GREEN}>{r.region_type}</TelBadge>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white">{r.name}</h3>
                      <p className="text-[10px]" style={{ color: MUTED }}>{r.country}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white">{r.node_count} nodes</div>
                      <div className="text-xs text-white">{r.base_stations} BS</div>
                      <div className="text-xs text-white">{r.fiber_km} km fiber</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white">{formatThroughput(r.daily_traffic_tb * 100)}</div>
                      <div className="text-[9px]" style={{ color: MUTED }}>Traffic</div>
                    </div>
                    <div className="w-32">
                      <div className="text-[9px] mb-1" style={{ color: MUTED }}>Availability {r.availability_pct}%</div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full ${r.availability_pct < 99.9 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${r.availability_pct}%` }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white">{r.latency_ms} ms</div>
                      <div className="text-[9px]" style={{ color: MUTED }}>Latency</div>
                    </div>
                    {r.anomalies > 0 && <div className="text-red-400">⚠️ {r.anomalies}</div>}
                    <TelBadge color={r.status === "operational" ? TEL_GREEN : TEL_RED}>{r.status}</TelBadge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}