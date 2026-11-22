import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Clock, BarChart3, ArrowUp, ArrowDown, Minus, AlertTriangle, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";

export default function WorkflowPerformanceTrends() {
  const [timeRange, setTimeRange] = useState("30d"); // 7d, 14d, 30d, 90d
  const [selectedWorkflow, setSelectedWorkflow] = useState("all");
  const [viewMode, setViewMode] = useState("overview"); // overview, by_type, by_workflow

  const { data: metrics } = useQuery({
    queryKey: ["workflow-metrics"],
    queryFn: () => base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: recentRuns } = useQuery({
    queryKey: ["workflow-recent-runs-trends"],
    queryFn: () => base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "status", limit: 100 }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: workflows } = useQuery({
    queryKey: ["workflows-list"],
    queryFn: () => base44.entities.Workflow.list("-created_date", 50).catch(() => []),
  });

  const runs = recentRuns?.runs || [];
  const workflowList = workflows || [];

  // Generate trend data
  const trendData = generateTrendData(runs, timeRange, selectedWorkflow);
  const summaryStats = calculateSummaryStats(runs, timeRange);
  const bottleneckWorkflows = identifyBottlenecks(runs, workflowList);

  function generateTrendData(runs, range, workflowFilter) {
    const days = parseInt(range.replace("d", ""));
    const data = [];
    const now = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const daysRuns = runs.filter(r => {
        if (!r.created_date) return false;
        const runDate = new Date(r.created_date).toISOString().split("T")[0];
        const matchDate = runDate === dateStr;
        const matchWorkflow = workflowFilter === "all" || r.workflow_id === workflowFilter;
        return matchDate && matchWorkflow;
      });

      const completedRuns = daysRuns.filter(r => r.status === "completed");
      const avgDuration = completedRuns.length > 0
        ? Math.round(completedRuns.reduce((sum, r) => sum + (r.total_duration_ms || 0), 0) / completedRuns.length)
        : 0;
      
      const failedRuns = daysRuns.filter(r => r.status === "failed").length;
      const successRate = daysRuns.length > 0
        ? Math.round((completedRuns.length / daysRuns.length) * 100)
        : 0;

      data.push({
        date: dateStr,
        displayDate: date.toLocaleDateString("en-IE", { month: "short", day: "numeric" }),
        avg_duration: Math.round(avgDuration / 1000), // seconds
        total_runs: daysRuns.length,
        completed_runs: completedRuns.length,
        failed_runs: failedRuns,
        success_rate: successRate
      });
    }
    
    return data;
  }

  function calculateSummaryStats(runs, range) {
    const days = parseInt(range.replace("d", ""));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const filteredRuns = runs.filter(r => {
      if (!r.created_date) return false;
      return new Date(r.created_date) >= cutoff;
    });

    const completedRuns = filteredRuns.filter(r => r.status === "completed" && r.total_duration_ms);
    
    if (completedRuns.length === 0) {
      return {
        avg_duration: 0,
        median_duration: 0,
        p95_duration: 0,
        total_runs: 0,
        success_rate: 0,
        trend: "stable"
      };
    }

    const durations = completedRuns.map(r => r.total_duration_ms).sort((a, b) => a - b);
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    
    const successRate = Math.round((completedRuns.length / filteredRuns.length) * 100);
    
    // Calculate trend (compare first half vs second half of period)
    const midpoint = Math.floor(durations.length / 2);
    const firstHalfAvg = durations.slice(0, midpoint).reduce((sum, d) => sum + d, 0) / (midpoint || 1);
    const secondHalfAvg = durations.slice(midpoint).reduce((sum, d) => sum + d, 0) / (durations.length - midpoint || 1);
    const trendPct = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    const trend = trendPct < -10 ? "improving" : trendPct > 10 ? "degrading" : "stable";

    return {
      avg_duration: Math.round(avg / 1000), // seconds
      median_duration: Math.round(median / 1000),
      p95_duration: Math.round(p95 / 1000),
      total_runs: filteredRuns.length,
      success_rate: successRate,
      trend,
      trend_pct: Math.abs(Math.round(trendPct))
    };
  }

  function identifyBottlenecks(runs, workflowList) {
    const workflowStats = {};
    
    runs.filter(r => r.status === "completed" && r.total_duration_ms).forEach(r => {
      const wfId = r.workflow_id || "unknown";
      if (!workflowStats[wfId]) {
        workflowStats[wfId] = {
          workflow_id: wfId,
          workflow_name: r.workflow_name || "Unknown",
          durations: [],
          count: 0
        };
      }
      workflowStats[wfId].durations.push(r.total_duration_ms);
      workflowStats[wfId].count++;
    });

    const bottlenecks = Object.values(workflowStats)
      .filter(wf => wf.count >= 3) // Minimum 3 runs
      .map(wf => {
        const avg = wf.durations.reduce((sum, d) => sum + d, 0) / wf.durations.length;
        const max = Math.max(...wf.durations);
        return {
          workflow_id: wf.workflow_id,
          workflow_name: wf.workflow_name,
          avg_duration: Math.round(avg / 1000),
          max_duration: Math.round(max / 1000),
          run_count: wf.count,
          severity: avg > 300000 ? "critical" : avg > 120000 ? "high" : avg > 60000 ? "medium" : "low"
        };
      })
      .sort((a, b) => b.avg_duration - a.avg_duration)
      .slice(0, 5);

    return bottlenecks;
  }

  const formatDuration = (secs) => {
    if (!secs) return "—";
    if (secs < 60) return `${secs}s`;
    const m = Math.floor(secs / 60);
    return `${m}m ${secs % 60}s`;
  };

  const getTrendIcon = (trend) => {
    if (trend === "improving") return <ArrowDown className="w-4 h-4" style={{ color: LOW }} />;
    if (trend === "degrading") return <ArrowUp className="w-4 h-4" style={{ color: DANGER }} />;
    return <Minus className="w-4 h-4" style={{ color: MUTED }} />;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return DANGER;
      case "high": return HIGH;
      case "medium": return MEDIUM;
      default: return LOW;
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h3 className="text-sm font-bold text-white">Performance Trends</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Workflow completion times and bottleneck analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="7d">7 Days</option>
            <option value="14d">14 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </select>
          <select
            value={selectedWorkflow}
            onChange={e => setSelectedWorkflow(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Workflows</option>
            {workflowList.map(wf => (
              <option key={wf.workflow_id} value={wf.workflow_id}>{wf.name || "Untitled"}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Avg Duration</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{formatDuration(summaryStats.avg_duration)}</p>
            {getTrendIcon(summaryStats.trend)}
          </div>
          {summaryStats.trend !== "stable" && (
            <p className="text-[9px]" style={{ color: summaryStats.trend === "improving" ? LOW : DANGER }}>
              {summaryStats.trend === "improving" ? "↓" : "↑"} {summaryStats.trend_pct}%
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Median</p>
          <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{formatDuration(summaryStats.median_duration)}</p>
        </div>
        <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>P95</p>
          <p className="text-xl font-black font-mono" style={{ color: HIGH }}>{formatDuration(summaryStats.p95_duration)}</p>
        </div>
        <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Total Runs</p>
          <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{summaryStats.total_runs}</p>
        </div>
        <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Success Rate</p>
          <p className="text-xl font-black font-mono" style={{ color: summaryStats.success_rate >= 90 ? LOW : summaryStats.success_rate >= 70 ? MEDIUM : DANGER }}>{summaryStats.success_rate}%</p>
        </div>
      </div>

      {/* Duration Trend Chart */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-white">Average Duration Over Time</h4>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode("overview")}
              className={`px-2 py-1 rounded text-[10px] font-bold ${viewMode === "overview" ? "text-cyan-400" : "text-slate-500"}`}
              style={{ background: viewMode === "overview" ? `${CYAN}15` : "rgba(255,255,255,0.04)" }}>
              Duration
            </button>
            <button
              onClick={() => setViewMode("success")}
              className={`px-2 py-1 rounded text-[10px] font-bold ${viewMode === "success" ? "text-cyan-400" : "text-slate-500"}`}
              style={{ background: viewMode === "success" ? `${CYAN}15` : "rgba(255,255,255,0.04)" }}>
              Success Rate
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          {viewMode === "overview" ? (
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="displayDate" stroke={MUTED} fontSize={9} />
              <YAxis stroke={MUTED} fontSize={9} label={{ value: "seconds", angle: -90, position: "insideLeft", fill: MUTED, fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
                labelFormatter={(val) => `Date: ${val}`}
                formatter={(val, name) => [`${val}s`, name === "avg_duration" ? "Avg Duration" : name]}
              />
              <Area type="monotone" dataKey="avg_duration" stroke={CYAN} fillOpacity={1} fill="url(#colorDuration)" strokeWidth={2} />
            </AreaChart>
          ) : (
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="displayDate" stroke={MUTED} fontSize={9} />
              <YAxis stroke={MUTED} fontSize={9} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
              />
              <Line type="monotone" dataKey="success_rate" stroke={LOW} strokeWidth={2} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Bottleneck Analysis */}
      {bottleneckWorkflows.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} />
            <h4 className="text-xs font-bold text-white">Identified Bottlenecks</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bottleneckWorkflows.map((bottleneck, idx) => (
              <div
                key={bottleneck.workflow_id || idx}
                className="p-3 rounded-lg border-l-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderLeftColor: getSeverityColor(bottleneck.severity)
                }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white truncate flex-1">{bottleneck.workflow_name}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                    style={{ color: getSeverityColor(bottleneck.severity), background: `${getSeverityColor(bottleneck.severity)}15` }}>
                    {bottleneck.severity}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span style={{ color: MUTED }}>Avg: <span style={{ color: TEXT }}>{formatDuration(bottleneck.avg_duration)}</span></span>
                  <span style={{ color: MUTED }}>Max: <span style={{ color: HIGH }}>{formatDuration(bottleneck.max_duration)}</span></span>
                </div>
                <p className="text-[9px] mt-1" style={{ color: MUTED }}>{bottleneck.run_count} runs analyzed</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run Volume Chart */}
      <div className="mt-6">
        <h4 className="text-xs font-bold text-white mb-3">Run Volume Trend</h4>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="displayDate" stroke={MUTED} fontSize={9} />
            <YAxis stroke={MUTED} fontSize={9} />
            <Tooltip
              contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
            />
            <Bar dataKey="total_runs" radius={[4, 4, 0, 0]}>
              {trendData.map((entry, index) => (
                <rect key={index} fill={entry.failed_runs > 0 ? DANGER : CYAN} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}