import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, BarChart2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  BORDER, CYAN, DANGER, LOW, MEDIUM, MUTED, TEXT,
  Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";

const EVENT_COLORS = [
  CYAN, "#8b5cf6", LOW, DANGER, MEDIUM, "#60a5fa",
  "#f97316", "#ec4899", "#14b8a6", "#eab308", "#a78bfa", "#6ee7b7"
];

function StageBar({ avg_ms, max }) {
  const pct = max > 0 ? (avg_ms / max) * 100 : 0;
  const color = avg_ms > 5000 ? DANGER : avg_ms > 1000 ? MEDIUM : LOW;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-black font-mono w-16 text-right" style={{ color }}>{avg_ms}ms</span>
    </div>
  );
}

export default function GDSKernelMetricsPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["kernel-metrics"],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", { action: "metrics" }).then(r => r.data),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const d = data || {};
  const stageMetrics = d.stage_metrics || [];
  const eventCounts = d.event_counts || [];
  const maxAvgMs = stageMetrics.length > 0 ? Math.max(...stageMetrics.map(s => s.avg_ms)) : 1;

  return (
    <div style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "AI Kernel", path: "/kernel" }, { label: "Metrics" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Kernel Metrics</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded"
            style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            EDP-002
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setAutoRefresh(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: autoRefresh ? `${LOW}15` : "rgba(255,255,255,0.04)", border: `1px solid ${autoRefresh ? LOW : BORDER}40`, color: autoRefresh ? LOW : MUTED }}>
            {autoRefresh ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </button>
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total Sessions", value: d.total_sessions ?? 0, color: CYAN },
          { label: "Total Events", value: d.total_events ?? 0, color: "#8b5cf6" },
          { label: "Total Metrics", value: d.total_metrics ?? 0, color: "#60a5fa" },
          { label: "Completed", value: d.completed ?? 0, color: LOW },
          { label: "Failed", value: d.failed ?? 0, color: DANGER },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stage Performance */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-sm font-bold text-white">Stage Performance</h3>
          </div>
          {isLoading ? <Skeleton lines={6} /> : stageMetrics.length === 0
            ? <EmptyState icon={BarChart2} title="No stage data" description="Sessions will populate stage metrics" />
            : (
              <div className="p-4 space-y-3">
                {stageMetrics.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white capitalize">{(s.stage || "").replace(/_/g, " ")}</span>
                      <span className="text-[10px] font-mono" style={{ color: MUTED }}>{s.executions} exec</span>
                    </div>
                    <StageBar avg_ms={s.avg_ms || 0} max={maxAvgMs} />
                  </div>
                ))}
              </div>
            )}
        </Card>

        {/* Event Counts */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-sm font-bold text-white">Event Type Counts</h3>
          </div>
          {isLoading ? <Skeleton lines={6} /> : eventCounts.length === 0
            ? <EmptyState icon={BarChart2} title="No event data" description="Events will appear as sessions run" />
            : (
              <div className="p-4 grid grid-cols-2 gap-2">
                {eventCounts.map((e, i) => {
                  const color = EVENT_COLORS[i % EVENT_COLORS.length];
                  const label = (e.type || "").replace("kernel.", "").replace(/_/g, " ");
                  return (
                    <div key={i} className="p-3 rounded-xl"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                      <p className="text-[9px] font-bold uppercase tracking-wide mb-1 truncate" style={{ color }}>{label}</p>
                      <p className="text-xl font-black font-mono" style={{ color }}>{e.count}</p>
                    </div>
                  );
                })}
              </div>
            )}
        </Card>
      </div>
    </div>
  );
}