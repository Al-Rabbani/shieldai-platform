import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, TrendingUp, Server, Cpu, Database, Zap } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const UTIL_COLOR = (pct) => pct > 80 ? DANGER : pct > 50 ? HIGH : pct > 30 ? MEDIUM : LOW;

function HeatmapCell({ tenant, metric, value }) {
  const color = UTIL_COLOR(value);
  const isCritical = value > 80;
  return (
    <div className={`p-3 rounded-lg border transition-all hover:scale-105 ${isCritical ? 'animate-pulse' : ''}`}
      style={{ background: `${color}10`, borderColor: `${color}40`, borderWidth: isCritical ? 2 : 1 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold truncate" style={{ color: TEXT }}>{tenant.tenant_name}</span>
        {isCritical && <AlertTriangle className="w-3 h-3 flex-shrink-0 ml-1" style={{ color: DANGER }} />}
      </div>
      <div className="text-2xl font-black font-mono" style={{ color }}>{value}%</div>
      <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export default function GDSTenantResourceHeatmapPage() {
  const [selectedMetric, setSelectedMetric] = useState("compute_pct");
  const [showNoisyOnly, setShowNoisyOnly] = useState(false);

  const { data: heatmapData, isLoading } = useQuery({
    queryKey: ["tenant-resource-heatmap"],
    queryFn: () => base44.functions.invoke("gdsTenantAuditEngine", { action: "resource_heatmap" }).then(r => r.data.result),
    refetchInterval: 15000,
  });

  const { data: noisyDetection } = useQuery({
    queryKey: ["tenant-noisy-detection"],
    queryFn: () => base44.functions.invoke("gdsTenantAuditEngine", { action: "detect_noisy_neighbors" }).then(r => r.data.result),
    refetchInterval: 60000,
  });

  const heatmap = heatmapData?.heatmap || [];
  const noisyNeighbors = heatmapData?.noisy_neighbors || [];
  const avgCompute = heatmapData?.avg_compute_util || 0;

  const filteredHeatmap = showNoisyOnly ? noisyNeighbors : heatmap;

  const metrics = [
    { id: "compute_pct", label: "Compute", icon: Cpu, color: "#8b5cf6" },
    { id: "memory_pct", label: "Memory", icon: Server, color: "#3b82f6" },
    { id: "api_pct", label: "API Calls", icon: Zap, color: "#f59e0b" },
    { id: "storage_pct", label: "Storage", icon: Database, color: "#10b981" },
  ];

  const selectedMetricInfo = metrics.find(m => m.id === selectedMetric);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Resource Utilization Heatmap" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Activity className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Resource Utilization Heatmap</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time tenant resource consumption and noisy neighbor detection</p>
          </div>
          {noisyNeighbors.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
              <AlertTriangle className="w-3 h-3" style={{ color: DANGER }} />
              <span className="text-[10px] font-black" style={{ color: DANGER }}>{noisyNeighbors.length} Noisy Neighbors</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={showNoisyOnly} onChange={(e) => setShowNoisyOnly(e.target.checked)} className="rounded" />
            <span style={{ color: MUTED }}>Show Noisy Neighbors Only</span>
          </label>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tenants</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{heatmapData?.total_tenants || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Compute Util</p>
          <p className="text-2xl font-black font-mono" style={{ color: avgCompute > 50 ? HIGH : MUTED }}>{avgCompute}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Noisy Neighbors</p>
          <p className="text-2xl font-black font-mono" style={{ color: noisyNeighbors.length > 0 ? DANGER : MUTED }}>{noisyNeighbors.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Util</p>
          <p className="text-2xl font-black font-mono" style={{ color: heatmap.filter(t => t.status === 'critical').length > 0 ? DANGER : MUTED }}>{heatmap.filter(t => t.status === 'critical').length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Elevated Util</p>
          <p className="text-2xl font-black font-mono" style={{ color: heatmap.filter(t => t.status === 'elevated').length > 0 ? HIGH : MUTED }}>{heatmap.filter(t => t.status === 'elevated').length}</p>
        </Card>
      </div>

      {/* Metric Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {metrics.map(({ id, label, icon: Icon, color }) => (
          <button key={id} onClick={() => setSelectedMetric(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedMetric === id ? 'ring-2 ring-offset-2 ring-offset-[#020817]' : ''}`}
            style={{
              background: selectedMetric === id ? `${color}15` : "rgba(255,255,255,0.04)",
              borderColor: selectedMetric === id ? color : BORDER,
              color: selectedMetric === id ? color : MUTED,
              ringColor: color
            }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Heatmap Grid */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">
            {selectedMetricInfo?.label} Utilization by Tenant
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: LOW }} />
              <span style={{ color: MUTED }}>&lt;30%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: MEDIUM }} />
              <span style={{ color: MUTED }}>30-50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: HIGH }} />
              <span style={{ color: MUTED }}>50-80%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ background: DANGER }} />
              <span style={{ color: MUTED }}>&gt;80%</span>
            </div>
          </div>
        </div>

        {isLoading ? <Skeleton lines={8} /> : filteredHeatmap.length === 0 ? (
          <EmptyState icon={Activity} title="No resource data" description="Tenant resource utilization will appear here" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredHeatmap.map(tenant => (
              <HeatmapCell
                key={tenant.tenant_id}
                tenant={tenant}
                metric={selectedMetric}
                value={tenant[selectedMetric]}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Noisy Neighbors Alert */}
      {noisyNeighbors.length > 0 && (
        <Card className="p-5 border-2" style={{ borderColor: DANGER }}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
            <h3 className="text-sm font-bold text-white">Noisy Neighbors Detected</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {noisyNeighbors.map(tenant => (
              <div key={tenant.tenant_id} className="p-4 rounded-xl" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{tenant.tenant_name}</span>
                  <span className="text-[10px] font-mono" style={{ color: MUTED }}>{tenant.tenant_id}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: MUTED }}>Compute</span>
                    <span className="font-bold" style={{ color: DANGER }}>{tenant.compute_pct}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: MUTED }}>Memory</span>
                    <span className="font-bold" style={{ color: DANGER }}>{tenant.memory_pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-full rounded-full" style={{ width: `${tenant.avg_util}%`, background: DANGER }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}