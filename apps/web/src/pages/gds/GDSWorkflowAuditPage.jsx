import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, RotateCcw, Clock, CheckCircle, XCircle, AlertTriangle, Flame, Shield, Activity, Check, X } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const STATUS_COLORS = {
  pending: HIGH,
  approved: LOW,
  rejected: DANGER,
  escalated: HIGH
};

export default function GDSWorkflowAuditPage() {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState("approvals");

  const { data: approvalsData } = useQuery({
    queryKey: ["workflow-approvals"],
    queryFn: () => base44.entities.WorkflowApproval.list("-created_date", 50).catch(() => []),
  });

  const { data: rollbacksData } = useQuery({
    queryKey: ["workflow-rollbacks"],
    queryFn: () => base44.entities.WorkflowRollback.list("-created_date", 50).catch(() => []),
  });

  const { data: slaData } = useQuery({
    queryKey: ["workflow-sla"],
    queryFn: () => base44.entities.WorkflowSLA.list("-created_date", 50).catch(() => []),
  });

  const { data: eventsData } = useQuery({
    queryKey: ["kernel-events-workflow"],
    queryFn: () => base44.entities.KernelEvent.filter({ event_type: { $regex: "^workflow\\." } }, "-created_date", 20).catch(() => []),
  });

  const approveMutation = useMutation({
    mutationFn: async (approvalId) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "approve", approval_id: approvalId });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-approvals"]);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (approvalId) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "reject", approval_id: approvalId });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-approvals"]);
    }
  });

  const approvals = approvalsData || [];
  const rollbacks = rollbacksData || [];
  const slas = slaData || [];
  const events = eventsData || [];

  const formatDuration = (secs) => {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m ${secs % 60}s`;
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Workflows", path: "/workflows" }, { label: "Audit & Operations" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Workflow Audit & Operations</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Approvals · Rollbacks · Retries · SLA Events</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: BORDER }}>
        {[
          { id: "approvals", label: "Approvals", icon: CheckCircle, count: approvals.filter(a => a.status === "pending").length },
          { id: "rollbacks", label: "Rollbacks", icon: RotateCcw, count: rollbacks.length },
          { id: "sla", label: "SLA Tracker", icon: Clock, count: slas.filter(s => !s.breached).length },
          { id: "events", label: "Workflow Events", icon: Activity, count: events.length }
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap"
            style={{
              color: activeSection === id ? CYAN : MUTED,
              borderBottomColor: activeSection === id ? CYAN : "transparent",
              background: activeSection === id ? `${CYAN}06` : "transparent"
            }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${activeSection === id ? "text-cyan-400" : "text-slate-500"}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Approvals Section */}
      {activeSection === "approvals" && (
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Approval Requests</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{approvals.length} total approvals</p>
          </div>
          {approvals.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No approvals" description="Approval requests will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Approval ID", "Workflow", "Run ID", "Step", "Requested By", "Role Required", "Status", "SLA Deadline", "Responded", "Actions"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((approval, idx) => (
                    <tr key={approval.approval_id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{approval.approval_id?.slice(0, 16)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{approval.workflow_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{approval.run_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3 text-white">#{approval.step_number || "—"}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{approval.requested_by || "System"}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                          {approval.approval_role_required || "admin"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                          approval.status === "approved" ? "text-emerald-400" :
                          approval.status === "rejected" ? "text-red-400" :
                          approval.status === "escalated" ? "text-orange-400" : "text-amber-400"
                        }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {approval.status || "pending"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: approval.sla_deadline && new Date(approval.sla_deadline) < new Date() ? DANGER : MUTED }}>
                        {approval.sla_deadline ? new Date(approval.sla_deadline).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>
                        {approval.responded_at ? new Date(approval.responded_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3">
                        {approval.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => approveMutation.mutate(approval.approval_id)}
                              disabled={approveMutation.isPending}
                              className="p-1.5 rounded hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                              style={{ color: LOW }}>
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(approval.approval_id)}
                              disabled={rejectMutation.isPending}
                              className="p-1.5 rounded hover:bg-red-500/20 transition-all disabled:opacity-50"
                              style={{ color: DANGER }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>{approval.approver_id?.slice(0, 12)}...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Rollbacks Section */}
      {activeSection === "rollbacks" && (
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Rollback History</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{rollbacks.length} rollbacks executed</p>
          </div>
          {rollbacks.length === 0 ? (
            <EmptyState icon={RotateCcw} title="No rollbacks" description="Rollback events will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Rollback ID", "Workflow", "Run ID", "Triggered By", "Trigger Step", "Steps Reversed", "Executed By", "Status", "Started", "Result"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rollbacks.map((rollback, idx) => (
                    <tr key={rollback.rollback_id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{rollback.rollback_id?.slice(0, 16)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{rollback.workflow_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{rollback.run_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          rollback.triggered_by === "manual" ? "text-blue-400" :
                          rollback.triggered_by === "auto" ? "text-purple-400" : "text-slate-400"
                        }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {rollback.triggered_by || "system"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-white">#{rollback.trigger_step || "—"}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rollback.steps_reversed || 0}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rollback.executed_by?.slice(0, 12) || "System"}...</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                          rollback.status === "completed" ? "text-emerald-400" :
                          rollback.status === "failed" ? "text-red-400" : "text-amber-400"
                        }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {rollback.status || "pending"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>
                        {rollback.started_at ? new Date(rollback.started_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3 text-[10px] truncate max-w-[200px]" style={{ color: TEXT }}>
                        {rollback.result_summary || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* SLA Tracker Section */}
      {activeSection === "sla" && (
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">SLA Tracker</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{slas.length} SLA records</p>
          </div>
          {slas.length === 0 ? (
            <EmptyState icon={Clock} title="No SLA records" description="SLA tracking data will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["SLA ID", "Workflow", "Run ID", "Type", "Duration", "Deadline", "Status", "Breached", "Breach Duration", "Escalated"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slas.map((sla, idx) => (
                    <tr key={sla.sla_id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{sla.sla_id?.slice(0, 16)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{sla.workflow_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{sla.run_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                          {sla.sla_type || "standard"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{formatDuration(sla.sla_seconds)}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: sla.deadline && new Date(sla.deadline) < new Date() ? DANGER : MUTED }}>
                        {sla.deadline ? new Date(sla.deadline).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                          sla.status === "met" ? "text-emerald-400" :
                          sla.status === "breached" ? "text-red-400" : "text-amber-400"
                        }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {sla.status || "active"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {sla.breached && <Flame className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: sla.breach_duration_seconds ? DANGER : MUTED }}>
                        {sla.breach_duration_seconds ? formatDuration(sla.breach_duration_seconds) : "—"}
                      </td>
                      <td className="py-2 px-3 text-[10px]">
                        {sla.escalated ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: HIGH }} /> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Workflow Events Section */}
      {activeSection === "events" && (
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Workflow Events</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Kernel events correlated with workflows</p>
          </div>
          {events.length === 0 ? (
            <EmptyState icon={Activity} title="No workflow events" description="Workflow events will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Event Type", "Severity", "Correlation ID", "Workflow ID", "Run ID", "Created"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, idx) => {
                    const payload = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload || {};
                    return (
                      <tr key={event.id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ color: CYAN, background: `${CYAN}15` }}>
                            {event.event_type}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                            event.severity === "critical" ? "text-red-400" :
                            event.severity === "error" ? "text-orange-400" :
                            event.severity === "warning" ? "text-amber-400" : "text-blue-400"
                          }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                            {event.severity || "info"}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{event.correlation_id || "—"}</td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{payload.workflow_id?.slice(0, 12) || "—"}</td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{payload.run_id?.slice(0, 12) || "—"}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>
                          {event.occurred_at ? new Date(event.occurred_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* SLA Tracker Section */}
      {activeSection === "sla" && (
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">SLA Tracker</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>{slas.length} SLA records</p>
          </div>
          {slas.length === 0 ? (
            <EmptyState icon={Clock} title="No SLA records" description="SLA tracking data will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["SLA ID", "Workflow", "Run ID", "Type", "Duration", "Deadline", "Status", "Breached", "Breach Duration", "Escalated"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slas.map((sla, idx) => (
                    <tr key={sla.sla_id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{sla.sla_id?.slice(0, 16)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{sla.workflow_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{sla.run_id?.slice(0, 12)}...</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                          {sla.sla_type || "standard"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{formatDuration(sla.sla_seconds)}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: sla.deadline && new Date(sla.deadline) < new Date() ? DANGER : MUTED }}>
                        {sla.deadline ? new Date(sla.deadline).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                          sla.status === "met" ? "text-emerald-400" :
                          sla.status === "breached" ? "text-red-400" : "text-amber-400"
                        }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {sla.status || "active"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {sla.breached && <Flame className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: sla.breach_duration_seconds ? DANGER : MUTED }}>
                        {sla.breach_duration_seconds ? formatDuration(sla.breach_duration_seconds) : "—"}
                      </td>
                      <td className="py-2 px-3 text-[10px]">
                        {sla.escalated ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: HIGH }} /> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Workflow Events Section */}
      {activeSection === "events" && (
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Workflow Events</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Kernel events correlated with workflows</p>
          </div>
          {events.length === 0 ? (
            <EmptyState icon={Activity} title="No workflow events" description="Workflow events will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Event Type", "Severity", "Correlation ID", "Workflow ID", "Run ID", "Created"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, idx) => {
                    const payload = typeof event.payload === "string" ? JSON.parse(event.payload) : event.payload || {};
                    return (
                      <tr key={event.id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ color: CYAN, background: `${CYAN}15` }}>
                            {event.event_type}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                            event.severity === "critical" ? "text-red-400" :
                            event.severity === "error" ? "text-orange-400" :
                            event.severity === "warning" ? "text-amber-400" : "text-blue-400"
                          }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                            {event.severity || "info"}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{event.correlation_id || "—"}</td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{payload.workflow_id?.slice(0, 12) || "—"}</td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{payload.run_id?.slice(0, 12) || "—"}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>
                          {event.occurred_at ? new Date(event.occurred_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}