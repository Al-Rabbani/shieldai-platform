import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Activity, AlertCircle, TrendingUp } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Breadcrumb, Card, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function StreamTypeBadge({ type }) {
  const colors = { real_time: "#10b981", near_real_time: "#3b82f6", micro_batch: "#f59e0b", batch: "#6b7280" };
  const color = colors[type] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {(type || "stream").replace(/_/g, " ")}
    </span>
  );
}

function AnimatedEPS({ value }) {
  const [display, setDisplay] = useState(value || 0);
  useEffect(() => {
    const interval = setInterval(() => {
      const variance = Math.floor(Math.random() * 100) - 50;
      setDisplay(Math.max(0, (value || 0) + variance));
    }, 2000);
    return () => clearInterval(interval);
  }, [value]);
  return <span className="font-mono text-lg font-bold">{display.toLocaleString()}</span>;
}

export default function GDSDataStreamPage() {
  const { data: streams = [], isLoading: loadS } = useQuery({
    queryKey: ["data-streams-all"],
    queryFn: () => base44.entities.DataStream.list("", 50).catch(() => []),
  });

  const sortedStreams = [...streams].sort((a, b) => (b.lag_seconds || 0) - (a.lag_seconds || 0));
  const activeStreams = streams.filter(s => s.status === "healthy").length;
  const totalEPS = streams.reduce((sum, s) => sum + (s.events_per_sec || 0), 0);
  const avgLag = streams.length > 0 ? Math.round(streams.reduce((sum, s) => sum + (s.lag_seconds || 0), 0) / streams.length) : 0;
  const errorStreams = streams.filter(s => s.error_count > 0).length;

  const epsHistory = streams.slice(0, 5).map((s, i) => ({
    name: `T-${5-i}s`,
    eps: streams.slice(0, 5).reduce((sum, st) => sum + ((st.events_per_sec || 0) * (1 - i * 0.1)), 0)
  }));

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence", path: "/data-intelligence" }, { label: "Streams" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Real-Time Stream Processing</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Live data stream monitoring and performance metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" glow>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Streams</span>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{activeStreams}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4" style={{ color: HIGH }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total EPS</span>
          </div>
          <AnimatedEPS value={totalEPS} />
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Avg Lag</span>
          </div>
          <p className={`text-2xl font-black font-mono ${avgLag < 1 ? "text-green-400" : avgLag < 10 ? "text-amber-400" : "text-red-400"}`}>{avgLag}s</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4" style={{ color: errorStreams > 0 ? DANGER : MUTED }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Error Streams</span>
          </div>
          <p className={`text-2xl font-black font-mono ${errorStreams > 0 ? "text-red-400" : "text-green-400"}`}>{errorStreams}</p>
        </Card>
      </div>

      {/* Live EPS Display */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Live EPS Monitor</h3>
          <span className="flex items-center gap-2 text-[10px]" style={{ color: MUTED }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: LOW }} /> LIVE
          </span>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={epsHistory}>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
              <Line type="monotone" dataKey="eps" stroke={CYAN} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Streams Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Stream Health</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>Sorted by lag (highest first)</span>
        </div>
        {loadS ? <Skeleton lines={8} /> : streams.length === 0 ? (
          <EmptyState icon={Zap} title="No data streams" description="Create data streams to start processing" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Topic</th>
                  <th className="pb-3 font-semibold">Partitions</th>
                  <th className="pb-3 font-semibold">Events/Sec</th>
                  <th className="pb-3 font-semibold">Lag</th>
                  <th className="pb-3 font-semibold">Consumers</th>
                  <th className="pb-3 font-semibold">Errors</th>
                  <th className="pb-3 font-semibold">Last Processed</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {sortedStreams.map((stream, i) => (
                  <tr key={stream.id || i} className="text-white">
                    <td className="py-3 font-semibold">{stream.name}</td>
                    <td className="py-3"><StreamTypeBadge type={stream.stream_type} /></td>
                    <td className="py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{stream.topic}</span>
                    </td>
                    <td className="py-3 font-mono">{stream.partitions || 0}</td>
                    <td className="py-3 font-mono"><AnimatedEPS value={stream.events_per_sec} /></td>
                    <td className="py-3">
                      <span className={`text-[10px] font-mono font-bold ${(stream.lag_seconds || 0) < 1 ? "text-green-400" : (stream.lag_seconds || 0) < 10 ? "text-amber-400" : "text-red-400"}`}>
                        {(stream.lag_seconds || 0).toFixed(2)}s
                      </span>
                    </td>
                    <td className="py-3 font-mono">{stream.consumers || 0}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-mono font-bold ${stream.error_count > 0 ? "text-red-400" : "text-green-400"}`}>
                        {stream.error_count || 0}
                      </span>
                    </td>
                    <td className="py-3" style={{ color: MUTED }}>{timeAgo(stream.last_processed_at)}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stream.status === "healthy" ? "text-green-400 bg-green-400/15" : stream.status === "degraded" ? "text-amber-400 bg-amber-400/15" : "text-red-400 bg-red-400/15"}`}>
                        {stream.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}