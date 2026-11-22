import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, CheckCircle, XCircle, AlertTriangle, RotateCcw, Flame, Lock, Calendar, ChevronRight, Download, FileJson, FileText } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { useNavigate, useParams } from "react-router-dom";

const STEP_STATUS_COLORS = {
  pending: MUTED,
  running: CYAN,
  completed: LOW,
  failed: DANGER,
  skipped: "#6b7280",
  rolled_back: HIGH
};

export default function GDSWorkflowExecutionHistoryPage() {
  const navigate = useNavigate();
  const { runId } = useParams();
  const [selectedStep, setSelectedStep] = useState(null);
  const [viewMode, setViewMode] = useState("timeline"); // 'timeline' or 'details'

  const { data: runData } = useQuery({
    queryKey: ["workflow-run-detail", runId],
    queryFn: () => runId ? base44.entities.WorkflowRun.get(runId).catch(() => null) : Promise.resolve(null),
    enabled: !!runId,
  });

  const { data: stepsData } = useQuery({
    queryKey: ["workflow-run-steps", runId],
    queryFn: () => runId ? base44.entities.WorkflowRunStep.filter({ run_id: runId }, "step_number", 100).catch(() => []) : Promise.resolve([]),
    enabled: !!runId,
  });

  const { data: slaData } = useQuery({
    queryKey: ["workflow-run-sla", runId],
    queryFn: () => runId ? base44.entities.WorkflowSLA.filter({ run_id: runId }, "-created_date", 10).catch(() => []) : Promise.resolve([]),
    enabled: !!runId,
  });

  const run = runData || null;
  const steps = stepsData || [];
  const slas = slaData || [];

  const formatDuration = (ms) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IE", { 
      year: "numeric", 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit"
    });
  };

  const exportHistory = (format = "json") => {
    const exportData = {
      run_id: run?.run_id,
      workflow_name: run?.workflow_name,
      workflow_type: run?.workflow_type,
      exported_at: new Date().toISOString(),
      exported_by: "System",
      total_steps: steps.length,
      completed_steps: steps.filter(s => s.status === "completed").length,
      failed_steps: steps.filter(s => s.status === "failed").length,
      total_duration_ms: steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0),
      run_status: run.status,
      run_started: run.started_at,
      run_completed: run.completed_at,
      steps: steps.map(s => ({
        step_number: s.step_number,
        step_name: s.step_name,
        fn: s.fn,
        status: s.status,
        started_at: s.started_at,
        completed_at: s.completed_at,
        duration_ms: s.duration_ms,
        output_summary: s.output_summary,
        error_message: s.error_message,
        retry_count: s.retry_count,
        input_params: s.input_params,
        sla_seconds: s.sla_seconds
      })),
      sla_compliance: slas.map(sla => ({
        sla_id: sla.sla_id,
        sla_type: sla.sla_type,
        status: sla.status,
        breached: sla.breached,
        deadline: sla.deadline,
        completed_at: sla.completed_at,
        sla_seconds: sla.sla_seconds
      }))
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workflow-execution-${run?.run_id || "history"}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === "csv") {
      const headers = ["Step #", "Step Name", "Function", "Status", "Started At", "Completed At", "Duration (ms)", "Error Message", "Retry Count"];
      const csvRows = [headers.join(",")];
      
      steps.forEach(s => {
        const row = [
          s.step_number || "",
          `"${(s.step_name || "").replace(/"/g, '""')}"`,
          `"${(s.fn || "").replace(/"/g, '""')}"`,
          s.status || "",
          s.started_at || "",
          s.completed_at || "",
          s.duration_ms || 0,
          `"${(s.error_message || "").replace(/"/g, '""')}"`,
          s.retry_count || 0
        ];
        csvRows.push(row.join(","));
      });

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workflow-execution-${run?.run_id || "history"}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === "pdf") {
      // Generate a formatted text document for PDF conversion
      const content = `
WORKFLOW EXECUTION REPORT
========================

Run ID: ${run?.run_id || "N/A"}
Workflow: ${run?.workflow_name || "N/A"}
Type: ${run?.workflow_type || "N/A"}
Status: ${run?.status || "N/A"}
Exported: ${new Date().toISOString()}

EXECUTION SUMMARY
-----------------
Total Steps: ${steps.length}
Completed: ${steps.filter(s => s.status === "completed").length}
Failed: ${steps.filter(s => s.status === "failed").length}
Total Duration: ${formatDuration(steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0))}

STEP DETAILS
------------
${steps.map((s, idx) => `
Step ${idx + 1}: ${s.step_name || "Untitled"}
  Function: ${s.fn || "N/A"}
  Status: ${s.status}
  Started: ${formatTime(s.started_at)}
  Completed: ${formatTime(s.completed_at)}
  Duration: ${formatDuration(s.duration_ms)}
  Retries: ${s.retry_count || 0}
  ${s.error_message ? `Error: ${s.error_message}` : ""}
`).join("")}

SLA COMPLIANCE
--------------
${slas.map(sla => `
SLA: ${sla.sla_type || "Standard"}
Status: ${sla.status}
Breached: ${sla.breached ? "YES" : "NO"}
Deadline: ${formatTime(sla.deadline)}
`).join("")}
      `;

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workflow-execution-${run?.run_id || "history"}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!run) {
    return (
      <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
        <Breadcrumb items={[{ label: "Workflows", path: "/workflows" }, { label: "Execution History" }]} />
        <EmptyState icon={Clock} title="No run selected" description="Select a workflow run to view execution history" />
      </div>
    );
  }

  const completedSteps = steps.filter(s => s.status === "completed").length;
  const failedSteps = steps.filter(s => s.status === "failed").length;
  const totalDuration = steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[
        { label: "Workflows", path: "/workflows" },
        { label: "Run Dashboard", path: "/workflows/runs" },
        { label: "Execution History" }
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <Clock className="w-6 h-6" style={{ color: CYAN }} />
            <h1 className="text-2xl font-black text-white">Execution History</h1>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Run: <span className="font-mono text-white">{run.run_id}</span></p>
          <p className="text-sm font-bold text-white mt-1">{run.workflow_name || "Unknown Workflow"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <FileJson className="w-4 h-4" />
            <span>Export:</span>
            <button
              onClick={() => exportHistory("json")}
              className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              JSON
            </button>
            <button
              onClick={() => exportHistory("csv")}
              className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              CSV
            </button>
            <button
              onClick={() => exportHistory("pdf")}
              className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              Report
            </button>
          </div>
          <button
            onClick={() => navigate("/workflows/runs")}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
            Back to Runs
          </button>
        </div>
      </div>

      {/* Run Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: run.status === "completed" ? LOW : run.status === "failed" ? DANGER : CYAN }} />
            <p className="text-lg font-black capitalize" style={{ color: TEXT }}>{run.status}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Total Steps</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{steps.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{completedSteps}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Failed</p>
          <p className="text-2xl font-black font-mono" style={{ color: failedSteps > 0 ? DANGER : MUTED }}>{failedSteps}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Total Duration</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{formatDuration(totalDuration)}</p>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setViewMode("timeline")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${viewMode === "timeline" ? "text-cyan-400" : "text-slate-500"}`}
          style={{ background: viewMode === "timeline" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${viewMode === "timeline" ? CYAN + "40" : BORDER}` }}>
          <Clock className="w-3.5 h-3.5" />
          Timeline View
        </button>
        <button
          onClick={() => setViewMode("details")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${viewMode === "details" ? "text-cyan-400" : "text-slate-500"}`}
          style={{ background: viewMode === "details" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${viewMode === "details" ? CYAN + "40" : BORDER}` }}>
          <CheckCircle className="w-3.5 h-3.5" />
          Step Details
        </button>
      </div>

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Execution Timeline</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Chronological step-by-step execution flow</p>
          </div>
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const statusColor = STEP_STATUS_COLORS[step.status] || MUTED;
              const isLast = idx === steps.length - 1;
              return (
                <div key={step.id || idx} className="relative">
                  {!isLast && (
                    <div className="absolute left-6 top-12 w-0.5 h-8" style={{ background: step.status === "completed" ? LOW : step.status === "failed" ? DANGER : BORDER }} />
                  )}
                  <div
                    className="flex items-start gap-4 p-4 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                    style={{
                      background: selectedStep?.id === step.id ? `${statusColor}10` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${selectedStep?.id === step.id ? statusColor + "40" : BORDER}`
                    }}
                    onClick={() => setSelectedStep(selectedStep?.id === step.id ? null : step)}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${statusColor}20`, border: `1px solid ${statusColor}30` }}>
                      {step.status === "completed" ? <CheckCircle className="w-5 h-5" style={{ color: statusColor }} /> :
                       step.status === "failed" ? <XCircle className="w-5 h-5" style={{ color: statusColor }} /> :
                       step.status === "rolled_back" ? <RotateCcw className="w-5 h-5" style={{ color: statusColor }} /> :
                       <Clock className="w-5 h-5" style={{ color: statusColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">Step {step.step_number || idx + 1}: {step.step_name || "Untitled"}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded capitalize" style={{ color: statusColor, background: `${statusColor}15` }}>{step.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px]">
                        <span style={{ color: MUTED }}>Function: <span className="font-mono" style={{ color: TEXT }}>{step.fn || "—"}</span></span>
                        <span style={{ color: MUTED }}>Duration: <span style={{ color: TEXT }}>{formatDuration(step.duration_ms)}</span></span>
                        <span style={{ color: MUTED }}>Started: <span style={{ color: TEXT }}>{formatTime(step.started_at)}</span></span>
                      </div>
                      {step.error_message && (
                        <p className="text-[10px] mt-2 truncate" style={{ color: DANGER }}>Error: {step.error_message}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: MUTED }} />
                  </div>

                  {/* Expanded Step Details */}
                  {selectedStep?.id === step.id && (
                    <div className="mt-3 ml-16 p-4 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}` }}>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Started At</p>
                          <p style={{ color: TEXT }}>{formatTime(step.started_at)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Completed At</p>
                          <p style={{ color: TEXT }}>{formatTime(step.completed_at)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Input Parameters</p>
                          <pre className="text-[10px] font-mono p-2 rounded" style={{ background: "rgba(0,0,0,0.3)", color: TEXT, overflow: "auto", maxHeight: "100px" }}>
                            {step.input_params ? JSON.stringify(step.input_params, null, 2) : "—"}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Output Summary</p>
                          <p style={{ color: TEXT }}>{step.output_summary || "—"}</p>
                        </div>
                        {step.retry_count > 0 && (
                          <div>
                            <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Retry Count</p>
                            <p style={{ color: HIGH }}>{step.retry_count}</p>
                          </div>
                        )}
                        {step.sla_seconds && (
                          <div>
                            <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>SLA Limit</p>
                            <p style={{ color: TEXT }}>{formatDuration(step.sla_seconds * 1000)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* SLA Compliance Panel */}
      {slas.length > 0 && (
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
            <h3 className="text-sm font-bold text-white">SLA Compliance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["SLA ID", "Type", "Duration Limit", "Deadline", "Status", "Breached", "Completed"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slas.map((sla, idx) => (
                  <tr key={sla.sla_id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{sla.sla_id?.slice(0, 16)}...</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{sla.sla_type || "standard"}</span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{formatDuration(sla.sla_seconds * 1000)}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: sla.deadline && new Date(sla.deadline) < new Date() ? DANGER : MUTED }}>{formatTime(sla.deadline)}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                        sla.status === "met" ? "text-emerald-400" : sla.status === "breached" ? "text-red-400" : "text-amber-400"
                      }`} style={{ background: "rgba(255,255,255,0.04)" }}>{sla.status || "active"}</span>
                    </td>
                    <td className="py-2 px-3">
                      {sla.breached ? <Flame className="w-3.5 h-3.5" style={{ color: DANGER }} /> : <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} />}
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{formatTime(sla.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}