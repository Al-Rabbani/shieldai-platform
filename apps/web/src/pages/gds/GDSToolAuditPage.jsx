import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock3, FileText, Search, Filter, Download, Eye, User, Shield, AlertTriangle, CheckCircle, XCircle, ChevronRight, ChevronDown } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function GDSToolAuditPage() {
  const [searchTool, setSearchTool] = useState("");
  const [searchActor, setSearchActor] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [dateRange, setDateRange] = useState("7d");
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: auditRecords } = useQuery({
    queryKey: ["tool-audit-records", dateRange],
    queryFn: () => base44.entities.ToolAuditRecord.list("-created_date", 200).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["tool-audit-metrics"],
    queryFn: () => base44.functions.invoke("gdsToolExecutionEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const m = metrics || {};
  const execution = m.execution || {};

  // Filter records
  const filteredRecords = (auditRecords || []).filter(record => {
    const matchTool = !searchTool || record.tool_name?.toLowerCase().includes(searchTool.toLowerCase());
    const matchActor = !searchActor || record.actor_id?.toLowerCase().includes(searchActor.toLowerCase());
    const matchStatus = filterStatus === "all" || record.status === filterStatus;
    const matchRisk = filterRisk === "all" || record.risk_level === filterRisk;
    
    if (dateRange === "24h") {
      const now = new Date();
      const recordDate = record.created_date ? new Date(record.created_date) : null;
      if (!recordDate || (now - recordDate) > (24 * 60 * 60 * 1000)) return false;
    } else if (dateRange === "7d") {
      const now = new Date();
      const recordDate = record.created_date ? new Date(record.created_date) : null;
      if (!recordDate || (now - recordDate) > (7 * 24 * 60 * 60 * 1000)) return false;
    }
    
    return matchTool && matchActor && matchStatus && matchRisk;
  });

  // Calculate stats
  const totalExecutions = filteredRecords.length;
  const successfulExecutions = filteredRecords.filter(r => r.status === "completed").length;
  const failedExecutions = filteredRecords.filter(r => r.status === "failed").length;
  const approvalRequired = filteredRecords.filter(r => r.approval_required).length;

  // Activity by day
  const activityByDay = {};
  filteredRecords.forEach(record => {
    if (!record.created_date) return;
    const date = new Date(record.created_date).toLocaleDateString("en-IE");
    activityByDay[date] = (activityByDay[date] || 0) + 1;
  });
  const activityData = Object.entries(activityByDay).slice(-7).map(([date, count]) => ({
    date,
    executions: count
  }));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tool Audit Log" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Clock3 className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Tool Audit Log</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-009 v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => exportAuditLog(filteredRecords)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Executions</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalExecutions}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Successful</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{successfulExecutions}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Failed</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{failedExecutions}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Approval Required</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{approvalRequired}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Success Rate</p>
          <p className="text-2xl font-black font-mono" style={{ color: totalExecutions > 0 ? (successfulExecutions / totalExecutions * 100 >= 90 ? LOW : successfulExecutions / totalExecutions * 100 >= 70 ? MEDIUM : DANGER) : MUTED }}>
            {totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0}%
          </p>
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
                placeholder="Search tool..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
              <input
                value={searchActor}
                onChange={e => setSearchActor(e.target.value)}
                placeholder="Search user..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              />
            </div>
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="rolled_back">Rolled Back</option>
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Risk</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </Card>

      {/* Activity Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Execution Activity</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Tool executions over time</p>
        </div>
        {activityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" stroke={MUTED} fontSize={9} />
              <YAxis stroke={MUTED} fontSize={9} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Bar dataKey="executions" fill={CYAN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={FileText} title="No activity data" description="Tool executions will appear here" />
        )}
      </Card>

      {/* Audit Log Table */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Audit Log</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Detailed execution records with inputs and outputs</p>
        </div>
        {filteredRecords.length > 0 ? (
          <div className="space-y-2">
            {filteredRecords.map((record, idx) => (
              <div key={record.id || idx}>
                <div
                  className="p-4 rounded-lg cursor-pointer transition-all hover:bg-white/[0.02]"
                  style={{ background: "rgba(0,212,255,0.02)", border: `1px solid ${BORDER}` }}
                  onClick={() => setExpandedRow(expandedRow === record.id ? null : record.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
                        {record.status === "completed" ? (
                          <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                        ) : record.status === "failed" ? (
                          <XCircle className="w-4 h-4" style={{ color: DANGER }} />
                        ) : (
                          <Clock3 className="w-4 h-4" style={{ color: CYAN }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold font-mono text-white">{record.tool_name || "Unknown Tool"}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{record.tool_action}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${record.status === "completed" ? "text-green-400" : record.status === "failed" ? "text-red-400" : "text-cyan-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{record.status}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px]" style={{ color: MUTED }}>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {record.actor_id || "system"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock3 className="w-3 h-3" />
                            {record.created_date ? new Date(record.created_date).toLocaleString("en-IE") : "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Risk: <span className={record.risk_level === "critical" ? "text-red-400" : record.risk_level === "high" ? "text-orange-400" : record.risk_level === "medium" ? "text-yellow-400" : "text-green-400"}>{record.risk_level}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.approval_required && (
                        <span className="text-[10px] px-2 py-1 rounded" style={{ color: HIGH, background: `${HIGH}10`, border: `1px solid ${HIGH}30` }}>Approval Required</span>
                      )}
                      {record.output_validated && (
                        <span className="text-[10px] px-2 py-1 rounded" style={{ color: LOW, background: `${LOW}10`, border: `1px solid ${LOW}30` }}>Validated</span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedRow === record.id ? "rotate-180" : ""}`} style={{ color: MUTED }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px]" style={{ color: MUTED }}>Duration: {formatDuration(record.duration_ms)}</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>Execution ID: {record.execution_id || record.id}</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRow === record.id && (
                  <div className="p-4 rounded-lg mt-2 space-y-4" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}` }}>
                    {/* Input Parameters */}
                    <div>
                      <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: CYAN }}>
                        <FileText className="w-3.5 h-3.5" />
                        Input Parameters
                      </h4>
                      <div className="p-3 rounded font-mono text-xs overflow-x-auto" style={{ background: "rgba(0,0,0,0.4)", color: TEXT }}>
                        <pre>{JSON.stringify(record.input_parameters || {}, null, 2)}</pre>
                      </div>
                    </div>

                    {/* Output Results */}
                    {record.output_result && (
                      <div>
                        <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: LOW }}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          Output Results
                        </h4>
                        <div className="p-3 rounded font-mono text-xs overflow-x-auto" style={{ background: "rgba(0,0,0,0.4)", color: TEXT }}>
                          <pre>{JSON.stringify(record.output_result, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {/* Error Details */}
                    {record.error_message && (
                      <div>
                        <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: DANGER }}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Error Details
                        </h4>
                        <div className="p-3 rounded font-mono text-xs overflow-x-auto" style={{ background: "rgba(255,59,59,0.1)", color: DANGER, border: `1px solid ${DANGER}30` }}>
                          <pre>{record.error_message}</pre>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Secret Leaks</p>
                        <p className={`font-mono ${record.secret_leaks > 0 ? "text-red-400" : "text-green-400"}`}>{record.secret_leaks || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Policy Violations</p>
                        <p className={`font-mono ${record.policy_violations > 0 ? "text-red-400" : "text-green-400"}`}>{record.policy_violations || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Retries</p>
                        <p className="font-mono" style={{ color: TEXT }}>{record.retry_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Rollback Ready</p>
                        <p className={`font-mono ${record.rollback_ready ? "text-green-400" : "text-slate-400"}`}>{record.rollback_ready ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title="No audit records" description="Tool executions will be logged here" />
        )}
      </Card>
    </div>
  );
}

function formatDuration(ms) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}

function exportAuditLog(filteredRecords) {
  const report = {
    export_date: new Date().toISOString(),
    export_type: "tools_audit_log",
    total_records: filteredRecords.length,
    records: filteredRecords.map(record => ({
      execution_id: record.execution_id || record.id,
      tool_name: record.tool_name,
      tool_action: record.tool_action,
      status: record.status,
      risk_level: record.risk_level,
      actor_id: record.actor_id,
      created_date: record.created_date,
      duration_ms: record.duration_ms,
      input_parameters: record.input_parameters,
      output_result: record.output_result,
      error_message: record.error_message,
      approval_required: record.approval_required,
      output_validated: record.output_validated,
      secret_leaks: record.secret_leaks,
      policy_violations: record.policy_violations,
      retry_count: record.retry_count,
      rollback_ready: record.rollback_ready
    }))
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tools-audit-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}