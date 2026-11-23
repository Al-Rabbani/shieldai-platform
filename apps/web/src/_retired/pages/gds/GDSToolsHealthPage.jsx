import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock, TrendingUp, Heart, Filter, Search } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BUILT_IN_TOOLS = [
  "gdsCloudNativeScanner", "gdsRuntimeProtection", "gdsZeroTrust", "gdsComplianceAutomation",
  "gdsThreatIntelligenceHub", "gdsAutoTriage", "gdsAutoFix", "gdsDASTScan",
  "gdsSASTScan", "gdsSecretScan", "gdsContainerScan", "gdsIaCScan",
  "gdsCISBenchmark", "gdsPenTest", "gdsRedTeam", "gdsVulnScan",
  "gdsAssetDiscovery", "gdsRiskCalc", "gdsNotify", "gdsTicketCreate",
  "gdsReportGen", "gdsDataQuery", "gdsAIPentest", "gdsMLAnomaly",
  "gdsThreatHunt", "gdsIncidentResponse", "gdsForensics", "gdsBackup",
  "gdsRestore", "gdsPatch", "gdsHarden", "gdsAudit"
];

export default function GDSToolsHealthPage() {
  const [searchTool, setSearchTool] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, healthy, degraded, critical
  const [sortBy, setSortBy] = useState("health"); // health, success_rate, errors, duration

  const { data: metrics } = useQuery({
    queryKey: ["tool-metrics"],
    queryFn: () => base44.functions.invoke("gdsToolExecutionEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: telemetry } = useQuery({
    queryKey: ["tool-telemetry-health"],
    queryFn: () => base44.entities.ToolTelemetry.list("-period_start", 100).catch(() => []),
  });

  const { data: auditRecords } = useQuery({
    queryKey: ["tool-audit-health"],
    queryFn: () => base44.entities.ToolAuditRecord.list("-created_date", 200).catch(() => []),
  });

  const m = metrics || {};
  const execution = m.execution || {};

  // Calculate health metrics per tool
  const toolHealthData = calculateToolHealth(BUILT_IN_TOOLS, telemetry, auditRecords);

  // Filter and sort
  const filteredTools = toolHealthData.filter(tool => {
    const matchSearch = !searchTool || tool.name.toLowerCase().includes(searchTool.toLowerCase());
    const matchStatus = filterStatus === "all" || tool.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const sortedTools = [...filteredTools].sort((a, b) => {
    if (sortBy === "health") return a.health_score - b.health_score;
    if (sortBy === "success_rate") return b.success_rate - a.success_rate;
    if (sortBy === "errors") return b.error_count - a.error_count;
    if (sortBy === "duration") return b.avg_duration_ms - a.avg_duration_ms;
    return 0;
  });

  // Overall stats
  const healthyCount = toolHealthData.filter(t => t.status === "healthy").length;
  const degradedCount = toolHealthData.filter(t => t.status === "degraded").length;
  const criticalCount = toolHealthData.filter(t => t.status === "critical").length;
  const avgSuccessRate = toolHealthData.length > 0
    ? Math.round(toolHealthData.reduce((sum, t) => sum + t.success_rate, 0) / toolHealthData.length)
    : 0;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tool Health Overview" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Heart className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Tool Health Overview</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-009 v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>34 built-in tools · Real-time health monitoring</span>
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tools</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{toolHealthData.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ border: `1px solid ${LOW}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Healthy</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{healthyCount}</p>
          <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${(healthyCount / toolHealthData.length) * 100}%`, background: LOW }} />
          </div>
        </Card>
        <Card className="p-4 text-center" style={{ border: `1px solid ${MEDIUM}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Degraded</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{degradedCount}</p>
          <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${(degradedCount / toolHealthData.length) * 100}%`, background: MEDIUM }} />
          </div>
        </Card>
        <Card className="p-4 text-center" style={{ border: `1px solid ${DANGER}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{criticalCount}</p>
          <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${(criticalCount / toolHealthData.length) * 100}%`, background: DANGER }} />
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Success Rate</p>
          <p className="text-2xl font-black font-mono" style={{ color: avgSuccessRate >= 90 ? LOW : avgSuccessRate >= 70 ? MEDIUM : DANGER }}>{avgSuccessRate}%</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
              <input
                value={searchTool}
                onChange={e => setSearchTool(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="critical">Critical</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="health">Sort: Health Score</option>
            <option value="success_rate">Sort: Success Rate</option>
            <option value="errors">Sort: Error Count</option>
            <option value="duration">Sort: Response Time</option>
          </select>
        </div>
      </Card>

      {/* Tool Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedTools.map((tool, idx) => (
          <Card key={tool.name} className="p-4" glow>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${tool.status === "healthy" ? "bg-green-500" : tool.status === "degraded" ? "bg-yellow-500" : "bg-red-500"} animate-pulse`} />
                  <p className="text-sm font-bold font-mono text-white truncate">{tool.name}</p>
                </div>
                <p className="text-[10px]" style={{ color: MUTED }}>Health Score: <span style={{ color: tool.health_score >= 80 ? LOW : tool.health_score >= 50 ? MEDIUM : DANGER }}>{tool.health_score}%</span></p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[9px] font-bold mb-0.5" style={{ color: MUTED }}>Success Rate</p>
                <p className="text-lg font-black font-mono" style={{ color: tool.success_rate >= 90 ? LOW : tool.success_rate >= 70 ? MEDIUM : DANGER }}>{tool.success_rate}%</p>
              </div>
              <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[9px] font-bold mb-0.5" style={{ color: MUTED }}>Errors</p>
                <p className="text-lg font-black font-mono" style={{ color: tool.error_count > 10 ? DANGER : tool.error_count > 5 ? HIGH : MUTED }}>{tool.error_count}</p>
              </div>
              <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[9px] font-bold mb-0.5" style={{ color: MUTED }}>Avg Response</p>
                <p className="text-lg font-black font-mono" style={{ color: CYAN }}>{formatDuration(tool.avg_duration_ms)}</p>
              </div>
              <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[9px] font-bold mb-0.5" style={{ color: MUTED }}>Total Runs</p>
                <p className="text-lg font-black font-mono" style={{ color: TEXT }}>{tool.total_runs}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1" style={{ color: tool.last_error ? DANGER : MUTED }}>
                <AlertTriangle className="w-3 h-3" />
                Last Error: {tool.last_error ? "Yes" : "None"}
              </span>
              <span className="flex items-center gap-1" style={{ color: tool.executions_24h > 0 ? LOW : MUTED }}>
                <Activity className="w-3 h-3" />
                24h: {tool.executions_24h} runs
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Success Rate Comparison Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Success Rate by Tool</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Compare success rates across all tools</p>
        </div>
        {sortedTools.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedTools.slice(0, 15)}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" stroke={MUTED} fontSize={8} angle={-45} textAnchor="end" height={80} />
              <YAxis stroke={MUTED} fontSize={9} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Bar dataKey="success_rate" radius={[4, 4, 0, 0]}>
                {sortedTools.slice(0, 15).map((tool, i) => (
                  <Cell key={i} fill={tool.success_rate >= 90 ? LOW : tool.success_rate >= 70 ? MEDIUM : DANGER} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={TrendingUp} title="No data available" description="Tool health data will appear here after executions" />
        )}
      </Card>
    </div>
  );
}

function calculateToolHealth(tools, telemetry, auditRecords) {
  return tools.map(toolName => {
    const toolTelemetry = (telemetry || []).filter(t => t.tool_name === toolName);
    const toolAudits = (auditRecords || []).filter(a => a.tool_name === toolName);
    
    const totalRuns = toolAudits.length;
    const successfulRuns = toolAudits.filter(a => a.status === "completed").length;
    const failedRuns = toolAudits.filter(a => a.status === "failed").length;
    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 100;
    
    const totalDuration = toolAudits.reduce((sum, a) => sum + (a.duration_ms || 0), 0);
    const avgDuration = totalRuns > 0 ? Math.round(totalDuration / totalRuns) : 0;
    
    const lastError = toolAudits.find(a => a.status === "failed");
    const executions24h = toolAudits.filter(a => {
      if (!a.created_date) return false;
      const now = new Date();
      const created = new Date(a.created_date);
      return (now - created) < (24 * 60 * 60 * 1000);
    }).length;

    // Calculate health score (0-100)
    let healthScore = 100;
    healthScore -= (100 - successRate) * 0.5; // Success rate impact
    healthScore -= Math.min(failedRuns * 2, 30); // Error count impact
    healthScore -= avgDuration > 30000 ? 10 : avgDuration > 10000 ? 5 : 0; // Slow response impact
    
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Determine status
    let status = "healthy";
    if (healthScore < 50 || successRate < 70) status = "critical";
    else if (healthScore < 80 || successRate < 90) status = "degraded";

    return {
      name: toolName,
      health_score: healthScore,
      success_rate: successRate,
      error_count: failedRuns,
      avg_duration_ms: avgDuration,
      total_runs: totalRuns,
      last_error: !!lastError,
      executions_24h: executions24h,
      status
    };
  });
}

function formatDuration(ms) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}