import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Clock, CheckCircle, AlertTriangle, Download, Filter, Zap } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from "recharts";

export default function GDSToolsPerformancePage() {
  const [timeRange, setTimeRange] = useState("30d");
  const [filterTool, setFilterTool] = useState("all");

  const { data: metrics } = useQuery({
    queryKey: ["tool-performance-metrics", timeRange],
    queryFn: () => base44.functions.invoke("gdsToolExecutionEngine", { action: "metrics", time_range: timeRange }).then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: telemetry } = useQuery({
    queryKey: ["tool-telemetry-trends", timeRange],
    queryFn: () => base44.entities.ToolTelemetry.list("-period_start", 100).catch(() => []),
    refetchInterval: 60000,
  });

  const { data: auditRecords } = useQuery({
    queryKey: ["tool-audit-performance", timeRange],
    queryFn: () => base44.entities.ToolAuditRecord.list("-created_date", 500).catch(() => []),
    refetchInterval: 60000,
  });

  const m = metrics || {};
  const execution = m.execution || {};

  // Process telemetry for trends
  const trendData = (telemetry || []).slice(0, 30).map(t => ({
    date: new Date(t.period_start).toLocaleDateString("en-IE", { day: "numeric", month: "short" }),
    avg_duration: t.p50_ms ? Math.round(t.p50_ms / 1000) : 0,
    p95_duration: t.p95_ms ? Math.round(t.p95_ms / 1000) : 0,
    success_rate: t.success_count && t.total_count ? Math.round((t.success_count / t.total_count) * 100) : 100,
    total_executions: t.total_count || 0
  })).reverse();

  // Identify bottlenecks (tools with high duration + low success rate)
  const toolPerformance = {};
  (auditRecords || []).forEach(record => {
    if (!record.tool_name) return;
    if (!toolPerformance[record.tool_name]) {
      toolPerformance[record.tool_name] = { total: 0, success: 0, total_duration: 0, count: 0 };
    }
    toolPerformance[record.tool_name].total++;
    if (record.status === "completed") toolPerformance[record.tool_name].success++;
    toolPerformance[record.tool_name].total_duration += (record.duration_ms || 0);
    toolPerformance[record.tool_name].count++;
  });

  const bottleneckData = Object.entries(toolPerformance).map(([tool, data]) => ({
    tool,
    avg_duration: Math.round(data.total_duration / data.count),
    success_rate: Math.round((data.success / data.total) * 100),
    total_executions: data.total,
    bottleneck_score: Math.round((100 - Math.round((data.success / data.total) * 100)) * 0.6 + (Math.min(data.avg_duration / 1000, 100) * 0.4))
  })).sort((a, b) => b.bottleneck_score - a.bottleneck_score).slice(0, 10);

  const avgDuration = trendData.length > 0 ? Math.round(trendData.reduce((sum, d) => sum + d.avg_duration, 0) / trendData.length) : 0;
  const avgSuccessRate = trendData.length > 0 ? Math.round(trendData.reduce((sum, d) => sum + d.success_rate, 0) / trendData.length) : 0;

  function exportPerformanceReport() {
    const report = {
      export_date: new Date().toISOString(),
      time_range: timeRange,
      summary: {
        total_executions: execution.total || 0,
        avg_duration_ms: avgDuration * 1000,
        avg_success_rate: avgSuccessRate,
        bottlenecks_identified: bottleneckData.filter(b => b.bottleneck_score > 50).length
      },
      daily_trends: trendData,
      tool_performance: Object.entries(toolPerformance).map(([tool, data]) => ({
        tool,
        total_executions: data.total,
        success_rate: Math.round((data.success / data.total) * 100),
        avg_duration_ms: Math.round(data.total_duration / data.count)
      })),
      top_bottlenecks: bottleneckData.slice(0, 5)
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tools-performance-report-${timeRange}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tools Performance Trends" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Tools Performance Trends</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-009 v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button onClick={exportPerformanceReport} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Execution Time</p>
          <p className="text-2xl font-black font-mono" style={{ color: avgDuration < 5000 ? LOW : avgDuration < 15000 ? MEDIUM : DANGER }}>{avgDuration}s</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Success Rate</p>
          <p className="text-2xl font-black font-mono" style={{ color: avgSuccessRate >= 90 ? LOW : avgSuccessRate >= 70 ? MEDIUM : DANGER }}>{avgSuccessRate}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Executions</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{execution.total ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Bottlenecks</p>
          <p className="text-2xl font-black font-mono" style={{ color: bottleneckData.filter(b => b.bottleneck_score > 50).length > 0 ? DANGER : LOW }}>{bottleneckData.filter(b => b.bottleneck_score > 50).length}</p>
        </Card>
      </div>

      {/* Execution Time Trend */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Execution Time Trend</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Average and P95 execution times over time</p>
        </div>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" stroke={MUTED} fontSize={9} />
              <YAxis stroke={MUTED} fontSize={9} label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 9 }} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Area type="monotone" dataKey="avg_duration" stroke={CYAN} fillOpacity={1} fill="url(#colorDuration)" strokeWidth={2} name="Avg Duration" />
              <Line type="monotone" dataKey="p95_duration" stroke={DANGER} strokeWidth={2} strokeDasharray="5 5" name="P95 Duration" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={Clock} title="No trend data" description="Telemetry data will appear here after executions" />
        )}
      </Card>

      {/* Success Rate Trend */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Success Rate Trend</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Daily success rate percentage</p>
        </div>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={LOW} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={LOW} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="date" stroke={MUTED} fontSize={9} />
            <YAxis stroke={MUTED} fontSize={9} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
            <Area type="monotone" dataKey="success_rate" stroke={LOW} fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        ) : (
          <EmptyState icon={CheckCircle} title="No trend data" description="Success rate data will appear here" />
        )}
      </Card>

      {/* Bottleneck Analysis */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Bottleneck Analysis</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Top 10 tools ranked by performance issues (high duration + low success rate)</p>
        </div>
        {bottleneckData.length > 0 ? (
          <div className="space-y-3">
            {bottleneckData.map((tool, idx) => (
              <div key={tool.tool} className="p-4 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${tool.bottleneck_score > 50 ? DANGER : tool.bottleneck_score > 30 ? HIGH : BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black" style={{ color: MUTED }}>#{idx + 1}</span>
                    <div>
                      <p className="text-sm font-bold font-mono text-white">{tool.tool}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{tool.total_executions} executions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Bottleneck Score</p>
                    <p className="text-xl font-black" style={{ color: tool.bottleneck_score > 50 ? DANGER : tool.bottleneck_score > 30 ? HIGH : LOW }}>{tool.bottleneck_score}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[9px] font-bold mb-0.5" style={{ color: MUTED }}>Avg Duration</p>
                    <p className="text-sm font-black font-mono" style={{ color: tool.avg_duration > 15000 ? DANGER : tool.avg_duration > 5000 ? MEDIUM : LOW }}>{tool.avg_duration}ms</p>
                  </div>
                  <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[9px] font-bold mb-0.5" style={{ color: MUTED }}>Success Rate</p>
                    <p className="text-sm font-black font-mono" style={{ color: tool.success_rate >= 90 ? LOW : tool.success_rate >= 70 ? MEDIUM : DANGER }}>{tool.success_rate}%</p>
                  </div>
                  <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[9px] font-bold mb-0.5" style={{ color: MUTED }}>Volume</p>
                    <p className="text-sm font-black font-mono" style={{ color: TEXT }}>{tool.total_executions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Zap} title="No bottlenecks detected" description="All tools are performing within acceptable thresholds" />
        )}
      </Card>
    </div>
  );
}