import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Clock, CheckCircle, AlertTriangle, Play, Pause, RotateCcw, Zap, TrendingUp, Filter, Search } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

export default function GDSToolsLivePage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [searchTool, setSearchTool] = useState("");

  const { data: metrics } = useQuery({
    queryKey: ["tool-metrics"],
    queryFn: () => base44.functions.invoke("gdsToolExecutionEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: autoRefresh ? 5000 : 30000,
  });

  const { data: activeExecutions } = useQuery({
    queryKey: ["tool-active-executions"],
    queryFn: () => base44.entities.ToolAuditRecord.filter({ status: "running" }, "-created_date", 20).catch(() => []),
    refetchInterval: autoRefresh ? 3000 : 15000,
  });

  const { data: recentExecutions } = useQuery({
    queryKey: ["tool-recent-executions-live"],
    queryFn: () => base44.entities.ToolAuditRecord.list("-created_date", 50).catch(() => []),
    refetchInterval: autoRefresh ? 5000 : 30000,
  });

  const { data: telemetry } = useQuery({
    queryKey: ["tool-telemetry-live"],
    queryFn: () => base44.entities.ToolTelemetry.list("-period_start", 30).catch(() => []),
    refetchInterval: autoRefresh ? 10000 : 60000,
  });

  const m = metrics || {};
  const execution = m.execution || {};

  // Calculate real-time success rate
  const completedRuns = (recentExecutions || []).filter(r => r.status === "completed" || r.status === "failed");
  const successRate = completedRuns.length > 0
    ? Math.round((completedRuns.filter(r => r.status === "completed").length / completedRuns.length) * 100)
    : 0;

  // Generate live trend data
  const trendData = (telemetry || []).slice(0, 20).map(t => ({
    time: new Date(t.period_start).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" }),
    success_count: t.success_count || 0,
    failure_count: t.failure_count || 0,
    avg_duration: t.p50_ms ? Math.round(t.p50_ms / 1000) : 0
  })).reverse();

  // Filter active executions
  const filteredActive = (activeExecutions || []).filter(exec => {
    const matchStatus = filterStatus === "all" || exec.status === filterStatus;
    const matchRisk = filterRisk === "all" || exec.risk_level === filterRisk;
    const matchSearch = !searchTool || exec.tool_name?.toLowerCase().includes(searchTool.toLowerCase());
    return matchStatus && matchRisk && matchSearch;
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Live Execution Dashboard" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Activity className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Live Execution Dashboard</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-009 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: autoRefresh ? `${LOW}15` : "rgba(255,255,255,0.04)", border: `1px solid ${autoRefresh ? LOW : BORDER}`, color: autoRefresh ? LOW : MUTED }}>
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {autoRefresh ? "Auto-Refresh ON" : "Auto-Refresh OFF"}
          </button>
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>Real-time tool performance monitoring</span>
        </div>
      </div>

      {/* Live Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Runs</p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CYAN }} />
            <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{activeExecutions?.length || 0}</p>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Success Rate</p>
          <p className="text-2xl font-black font-mono" style={{ color: successRate >= 90 ? LOW : successRate >= 70 ? MEDIUM : DANGER }}>{successRate}%</p>
          <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${successRate}%`, background: successRate >= 90 ? LOW : successRate >= 70 ? MEDIUM : DANGER }} />
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Executions</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{execution.total ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Duration</p>
          <p className="text-2xl font-black font-mono" style={{ color: "#60a5fa" }}>{formatDuration(execution.avg_duration_ms)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Successes</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{execution.successful ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Failures</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{execution.failed ?? 0}</p>
        </Card>
      </div>

      {/* Success Rate Trend */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Success Rate Trend</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time execution success/failure rates</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
              <CheckCircle className="w-3 h-3" style={{ color: LOW }} />
              <span className="text-[10px] font-bold" style={{ color: LOW }}>Success</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
              <AlertTriangle className="w-3 h-3" style={{ color: DANGER }} />
              <span className="text-[10px] font-bold" style={{ color: DANGER }}>Failure</span>
            </div>
          </div>
        </div>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={LOW} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={LOW} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DANGER} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={DANGER} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="time" stroke={MUTED} fontSize={9} />
              <YAxis stroke={MUTED} fontSize={9} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Area type="monotone" dataKey="success_count" stroke={LOW} fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />
              <Area type="monotone" dataKey="failure_count" stroke={DANGER} fillOpacity={1} fill="url(#colorFailure)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={TrendingUp} title="No trend data" description="Telemetry data will appear here after executions" />
        )}
      </Card>

      {/* Active Executions */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Active Tool Executions</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Currently running tool executions in real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
              <input
                value={searchTool}
                onChange={e => setSearchTool(e.target.value)}
                placeholder="Search tools..."
                className="pl-9 pr-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, width: "200px" }}
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="all">All Risk</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        {filteredActive.length > 0 ? (
          <div className="space-y-3">
            {filteredActive.map((exec, idx) => (
              <div
                key={exec.id || idx}
                className="p-4 rounded-lg border-l-4"
                style={{
                  background: "rgba(0,212,255,0.04)",
                  borderLeftColor: exec.risk_level === "critical" ? DANGER : exec.risk_level === "high" ? HIGH : exec.risk_level === "medium" ? MEDIUM : LOW
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
                      <Zap className="w-4 h-4" style={{ color: CYAN }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold font-mono text-white">{exec.tool_name || "Unknown Tool"}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{exec.tool_action || "Executing..."}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-1 rounded capitalize animate-pulse" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>RUNNING</span>
                    <span className="text-[10px] px-2 py-1 rounded capitalize" style={{ color: RISK_COLORS[exec.risk_level] || MUTED, background: "rgba(255,255,255,0.04)" }}>{exec.risk_level}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1" style={{ color: MUTED }}><Clock className="w-3 h-3" />Started: {exec.created_date ? new Date(exec.created_date).toLocaleTimeString("en-IE") : "—"}</span>
                    <span className="flex items-center gap-1" style={{ color: MUTED }}><Activity className="w-3 h-3" />Duration: {formatDuration(exec.duration_ms)}</span>
                    {exec.approval_required && <span className="flex items-center gap-1" style={{ color: HIGH }}><CheckCircle className="w-3 h-3" />Approval Required</span>}
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: MUTED }}>Actor: {exec.actor_id || "system"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Activity} title="No active executions" description="Tool executions will appear here in real-time" />
        )}
      </Card>

      {/* Real-time Execution Log */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Real-time Execution Log</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Live feed of all tool execution events</p>
        </div>
        {(recentExecutions || []).slice(0, 15).map((exec, idx) => (
          <div
            key={exec.id || idx}
            className="flex gap-3 py-2"
            style={{ borderBottom: idx < 14 ? `1px solid ${BORDER}` : "none" }}>
            <div className="flex-shrink-0">
              {exec.status === "completed" ? (
                <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
              ) : exec.status === "failed" ? (
                <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
              ) : (
                <RotateCcw className="w-4 h-4" style={{ color: CYAN }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold font-mono text-white">{exec.tool_name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{exec.tool_action}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${exec.status === "completed" ? "text-green-400" : exec.status === "failed" ? "text-red-400" : "text-cyan-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{exec.status}</span>
              </div>
              <div className="flex items-center gap-4 text-[10px]" style={{ color: MUTED }}>
                <span>{exec.created_date ? new Date(exec.created_date).toLocaleString("en-IE") : "—"}</span>
                <span>Duration: {formatDuration(exec.duration_ms)}</span>
                {exec.output_validated && <span className="flex items-center gap-1" style={{ color: LOW }}><CheckCircle className="w-3 h-3" />Validated</span>}
                {exec.secret_leaks > 0 && <span className="flex items-center gap-1" style={{ color: DANGER }}><AlertTriangle className="w-3 h-3" />Secret Leak Detected</span>}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function formatDuration(ms) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}

const RISK_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };