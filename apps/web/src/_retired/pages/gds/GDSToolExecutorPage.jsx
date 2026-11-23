import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Play, Shield, CheckCircle, XCircle, AlertTriangle, Lock, Key, FileCheck, RotateCcw, Clock, Activity, Eye, X } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const BUILT_IN_TOOLS = [
  { name: "gdsCloudNativeScanner", risk: "medium" }, { name: "gdsRuntimeProtection", risk: "high" },
  { name: "gdsZeroTrust", risk: "high" }, { name: "gdsComplianceAutomation", risk: "medium" },
  { name: "gdsThreatIntelligenceHub", risk: "low" }, { name: "gdsAutoTriage", risk: "medium" },
  { name: "gdsAutoFix", risk: "high" }, { name: "gdsDASTScan", risk: "medium" },
  { name: "gdsSASTScan", risk: "low" }, { name: "gdsSecretScan", risk: "low" },
  { name: "gdsContainerScan", risk: "medium" }, { name: "gdsIaCScan", risk: "medium" },
  { name: "gdsCISBenchmark", risk: "low" }, { name: "gdsPenTest", risk: "critical" },
  { name: "gdsRedTeam", risk: "critical" }, { name: "gdsVulnScan", risk: "medium" },
  { name: "gdsAssetDiscovery", risk: "low" }, { name: "gdsRiskCalc", risk: "low" },
  { name: "gdsNotify", risk: "low" }, { name: "gdsTicketCreate", risk: "medium" },
  { name: "gdsReportGen", risk: "low" }, { name: "gdsDataQuery", risk: "medium" },
  { name: "gdsAIPentest", risk: "high" }, { name: "gdsMLAnomaly", risk: "medium" },
  { name: "gdsThreatHunt", risk: "high" }, { name: "gdsIncidentResponse", risk: "critical" },
  { name: "gdsForensics", risk: "high" }, { name: "gdsBackup", risk: "medium" },
  { name: "gdsRestore", risk: "high" }, { name: "gdsPatch", risk: "high" },
  { name: "gdsHarden", risk: "high" }, { name: "gdsAudit", risk: "low" }
];

const ACTIONS = ["scan", "remediate", "validate", "report", "notify", "query", "analyze", "deploy", "rollback", "approve"];

export default function GDSToolExecutorPage() {
  const qc = useQueryClient();
  const [selectedTool, setSelectedTool] = useState("");
  const [toolAction, setToolAction] = useState("");
  const [actorRole, setActorRole] = useState("analyst");
  const [payload, setPayload] = useState("{}");
  const [executionResult, setExecutionResult] = useState(null);
  const [validateResult, setValidateResult] = useState(null);

  const { data: approvalQueue } = useQuery({
    queryKey: ["tool-approval-queue"],
    queryFn: () => base44.entities.ToolApprovalRequirement.filter({ status: "pending" }, "-created_date", 20).catch(() => []),
    refetchInterval: 10000,
  });

  const executeMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsToolExecutionEngine", { action: "execute", ...data }),
    onSuccess: (res) => {
      setExecutionResult(res.data);
      qc.invalidateQueries(["tool-metrics"]);
    },
  });

  const validateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsToolExecutionEngine", { action: "validate", ...data }),
    onSuccess: (res) => setValidateResult(res.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ requirement_id, approved }) => base44.functions.invoke("gdsToolExecutionEngine", { action: "approve", requirement_id, approved }),
    onSuccess: () => qc.invalidateQueries(["tool-approval-queue"]),
  });

  const rollbackMutation = useMutation({
    mutationFn: (exec_id) => base44.functions.invoke("gdsToolExecutionEngine", { action: "rollback", exec_id }),
    onSuccess: () => {
      setExecutionResult(prev => ({ ...prev, rollback_executed: true }));
      qc.invalidateQueries(["tool-metrics"]);
    },
  });

  const handleExecute = () => {
    try {
      const parsedPayload = JSON.parse(payload);
      executeMutation.mutate({
        tool_name: selectedTool,
        tool_action: toolAction,
        actor_role: actorRole,
        payload: parsedPayload,
      });
    } catch (e) {
      alert("Invalid JSON payload");
    }
  };

  const handleValidate = () => {
    validateMutation.mutate({
      tool_name: selectedTool,
      tool_action: toolAction,
      actor_role: actorRole,
    });
  };

  const getStatusColor = (status) => {
    if (status === "completed") return LOW;
    if (status === "awaiting_approval") return HIGH;
    if (status === "rejected") return DANGER;
    if (status === "flagged") return HIGH;
    return MUTED;
  };

  const getStatusBadge = (status) => {
    const color = getStatusColor(status);
    return (
      <span className="text-[10px] font-bold px-2 py-1 rounded uppercase" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
        {status?.replace(/_/g, " ") || "pending"}
      </span>
    );
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tool Execution Console" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Play className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Tool Execution Console</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-009 v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>19-Stage Zero Trust Execution Pipeline</span>
        </div>
      </div>

      {/* Section 1: Execute a Tool */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white mb-1">Execute a Tool</h3>
          <p className="text-[10px]" style={{ color: MUTED }}>Select a tool and execute with Zero Trust validation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Tool Name</label>
            <select value={selectedTool} onChange={e => setSelectedTool(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="">Select a tool...</option>
              {BUILT_IN_TOOLS.map(tool => (
                <option key={tool.name} value={tool.name}>{tool.name} ({tool.risk})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Tool Action</label>
            <input value={toolAction} onChange={e => setToolAction(e.target.value)} placeholder="e.g., scan, remediate" className="w-full px-3 py-2 rounded-lg text-xs outline-none" list="actions-list" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            <datalist id="actions-list">
              {ACTIONS.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>
          <div>
            <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Actor Role</label>
            <select value={actorRole} onChange={e => setActorRole(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold mb-1.5 block" style={{ color: MUTED }}>Payload (JSON)</label>
            <textarea value={payload} onChange={e => setPayload(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-xs outline-none font-mono" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} placeholder='{"key": "value"}' />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={handleValidate}
            disabled={!selectedTool || !toolAction}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <Eye className="w-4 h-4" />
            Validate First
          </button>
          <button
            onClick={handleExecute}
            disabled={!selectedTool || !toolAction || executeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Play className="w-4 h-4" />
            {executeMutation.isPending ? "Executing..." : "Execute Tool"}
          </button>
        </div>

        {/* Validation Result */}
        {validateResult && (
          <Card className="p-4 mb-4" style={{ border: `1px solid ${validateResult.valid !== false ? LOW : DANGER}` }}>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" style={{ color: validateResult.valid !== false ? LOW : DANGER }} />
              <div>
                <p className="text-sm font-bold text-white">Permission Check</p>
                <p className="text-[10px]" style={{ color: MUTED }}>{JSON.stringify(validateResult, null, 2)}</p>
              </div>
              <button onClick={() => setValidateResult(null)} className="ml-auto hover:text-white" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
          </Card>
        )}

        {/* Execution Result */}
        {executionResult && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ background: `${getStatusColor(executionResult.status)}10`, border: `1px solid ${getStatusColor(executionResult.status)}30` }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white">Execution Result</h4>
                {getStatusBadge(executionResult.status)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                <div><p style={{ color: MUTED }}>Exec ID:</p><p className="font-mono text-white">{executionResult.exec_id || "N/A"}</p></div>
                <div><p style={{ color: MUTED }}>Pipeline:</p><p className="text-white">{executionResult.pipeline_stages_complete || 0}/19 stages</p></div>
                <div><p style={{ color: MUTED }}>Risk Level:</p><span className="px-1.5 py-0.5 rounded capitalize" style={{ color: RISK_COLORS[executionResult.risk_level] || MUTED, background: "rgba(255,255,255,0.04)" }}>{executionResult.risk_level || "unknown"}</span></div>
                <div><p style={{ color: MUTED }}>Duration:</p><p className="text-white">{formatDuration(executionResult.duration_ms)}</p></div>
              </div>
              <div className="flex items-center gap-4 text-xs mb-3">
                <div className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" style={{ color: executionResult.approval_required ? HIGH : MUTED }} /><span style={{ color: MUTED }}>Approval: <span style={{ color: TEXT }}>{executionResult.approval_required ? "Required" : "Not Required"}</span></span></div>
                <div className="flex items-center gap-1"><Key className="w-3.5 h-3.5" style={{ color: executionResult.secret_resolved ? LOW : MUTED }} /><span style={{ color: MUTED }}>Secrets: <span style={{ color: TEXT }}>{executionResult.secret_resolved ? "Resolved" : "None"}</span></span></div>
                <div className="flex items-center gap-1"><FileCheck className="w-3.5 h-3.5" style={{ color: executionResult.output_validated ? LOW : MUTED }} /><span style={{ color: MUTED }}>Output: <span style={{ color: TEXT }}>{executionResult.output_validated ? "Validated" : "Pending"}</span></span></div>
              </div>
              {executionResult.awaiting_approval && (
                <div className="p-3 rounded-lg" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}30` }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: HIGH }}>Awaiting Approval</p>
                  <p className="text-xs" style={{ color: TEXT }}>Approval ID: <span className="font-mono">{executionResult.approval_id}</span> · Level: {executionResult.approval_level || "single"}</p>
                </div>
              )}
              {executionResult.output && (
                <div className="p-3 rounded-lg font-mono text-xs overflow-auto max-h-48" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}` }}>
                  <pre style={{ color: executionResult.flagged ? MUTED : TEXT }}>{JSON.stringify(executionResult.output, null, 2)}</pre>
                </div>
              )}
              {executionResult.rollback_executed !== true && ["high", "critical"].includes(executionResult.risk_level) && (
                <button
                  onClick={() => rollbackMutation.mutate(executionResult.exec_id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER }}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Rollback Execution
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Section 2: Approval Queue */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white mb-1">Approval Queue</h3>
          <p className="text-[10px]" style={{ color: MUTED }}>Pending tool execution approvals</p>
        </div>
        {approvalQueue && approvalQueue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Requirement ID", "Tool", "Execution ID", "Level", "Risk", "SLA Deadline", "SLA Breached", "Actions"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvalQueue.map(req => (
                  <tr key={req.requirement_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{req.requirement_id}</td>
                    <td className="py-2 px-3 text-white">{req.tool_name}</td>
                    <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{req.tool_execution_id}</td>
                    <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded capitalize" style={{ color: CYAN, background: `${CYAN}10` }}>{req.approval_level || "single"}</span></td>
                    <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded capitalize" style={{ color: RISK_COLORS[req.triggered_by_risk] || MUTED, background: "rgba(255,255,255,0.04)" }}>{req.triggered_by_risk || "medium"}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{req.sla_deadline ? new Date(req.sla_deadline).toLocaleString() : "—"}</td>
                    <td className="py-2 px-3">{req.sla_breached && <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} />}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => approveMutation.mutate({ requirement_id: req.requirement_id, approved: true })} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: `${LOW}15`, border: `1px solid ${LOW}30`, color: LOW }}>Approve</button>
                        <button onClick={() => approveMutation.mutate({ requirement_id: req.requirement_id, approved: false })} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Shield} title="No pending approvals" description="All tool executions are approved or auto-approved" />
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

const RISK_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };