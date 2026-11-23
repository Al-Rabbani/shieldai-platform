import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, Users, FileText, ChevronDown, Timer, Plus, X, Send, UserX, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSApprovalQueuePage() {
  const qc = useQueryClient();
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [approveReason, setApproveReason] = useState("");
  const [rollbackRequired, setRollbackRequired] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [delegateData, setDelegateData] = useState({ delegate_to_id: "", delegate_to_role: "", reason: "", valid_hours: 24 });
  const [escalateData, setEscalateData] = useState({ escalate_to_role: "", reason: "manual" });
  const [createData, setCreateData] = useState({
    title: "", description: "", source_type: "manual", risk_level: "medium", approval_type: "single",
    affected_resource: "", related_workflow_id: "", related_tool_execution_id: "", priority: "P2",
    rollback_required: false, evidence: []
  });

  const { data: pendingData, isLoading } = useQuery({
    queryKey: ["approvals-pending-queue"],
    queryFn: () => base44.functions.invoke("gdsApprovalEngine2", { action: "pending", limit: 50 }).then(r => r.data),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsApprovalEngine2", payload),
    onSuccess: () => {
      qc.invalidateQueries(["approvals-pending-queue"]);
      setShowCreatePanel(false);
      setCreateData({ title: "", description: "", source_type: "manual", risk_level: "medium", approval_type: "single", affected_resource: "", related_workflow_id: "", related_tool_execution_id: "", priority: "P2", rollback_required: false, evidence: [] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsApprovalEngine2", payload),
    onSuccess: () => {
      qc.invalidateQueries(["approvals-pending-queue"]);
      setShowApproveModal(false);
      setSelectedRequest(null);
      setApproveReason("");
      setRollbackRequired(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsApprovalEngine2", payload),
    onSuccess: () => {
      qc.invalidateQueries(["approvals-pending-queue"]);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason("");
    },
  });

  const delegateMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsApprovalEngine2", payload),
    onSuccess: () => {
      qc.invalidateQueries(["approvals-pending-queue"]);
      setShowDelegateModal(false);
      setSelectedRequest(null);
      setDelegateData({ delegate_to_id: "", delegate_to_role: "", reason: "", valid_hours: 24 });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsApprovalEngine2", payload),
    onSuccess: () => {
      qc.invalidateQueries(["approvals-pending-queue"]);
      setShowEscalateModal(false);
      setSelectedRequest(null);
      setEscalateData({ escalate_to_role: "", reason: "manual" });
    },
  });

  const requests = pendingData?.requests || [];

  const filteredRequests = requests.filter(req => {
    const matchLevel = filterLevel === "all" || req.approval_level === filterLevel;
    const matchRisk = filterRisk === "all" || req.risk_level === filterRisk;
    const matchSource = filterSource === "all" || req.source_type === filterSource;
    const matchPriority = filterPriority === "all" || req.priority === filterPriority;
    return matchLevel && matchRisk && matchSource && matchPriority;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
    const slaA = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Infinity;
    const slaB = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Infinity;
    return slaA - slaB;
  });

  function SLACountdown({ deadline }) {
    const [timeLeft, setTimeLeft] = useState(null);
    useEffect(() => {
      if (!deadline) return;
      const update = () => {
        const diff = Math.floor((new Date(deadline) - new Date()) / 60000);
        setTimeLeft(diff);
      };
      update();
      const interval = setInterval(update, 60000);
      return () => clearInterval(interval);
    }, [deadline]);
    if (timeLeft === null) return <span style={{ color: MUTED }}>—</span>;
    const isCritical = timeLeft < 5;
    const isWarning = timeLeft < 30;
    return (
      <span className={`text-[10px] font-mono font-bold ${isCritical ? "text-red-400 animate-pulse" : isWarning ? "text-orange-400" : "text-green-400"}`}>
        {timeLeft > 0 ? `${timeLeft}m` : "EXPIRED"}
      </span>
    );
  }

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Approval Queue" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Pending Approval Queue</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: HIGH, background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>
            {requests.length} Pending
          </span>
        </div>
        <button
          onClick={() => setShowCreatePanel(!showCreatePanel)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          Create Request
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Levels</option>
            <option value="standard">Standard</option>
            <option value="elevated">Elevated</option>
            <option value="critical">Critical</option>
          </select>
          <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Risk</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Sources</option>
            <option value="manual">Manual</option>
            <option value="workflow">Workflow</option>
            <option value="tool">Tool</option>
            <option value="policy">Policy</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Priorities</option>
            <option value="P0">P0 - Critical</option>
            <option value="P1">P1 - High</option>
            <option value="P2">P2 - Normal</option>
          </select>
        </div>
      </Card>

      {/* Queue Cards */}
      {isLoading ? (
        <EmptyState icon={Clock} title="Loading..." description="Fetching approval requests" />
      ) : sortedRequests.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No pending requests" description="All approval requests have been processed" />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedRequests.map((req, idx) => (
            <Card key={req.request_id || idx} className="p-5" glow>
              <div className="flex items-start gap-4">
                <div className={`w-1.5 h-full rounded-full flex-shrink-0`} style={{ background: req.risk_level === "critical" ? DANGER : req.risk_level === "high" ? HIGH : req.risk_level === "medium" ? MEDIUM : LOW }} />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-base font-bold text-white">{req.title || "Untitled Request"}</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{req.source_type}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{req.approval_type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="flex items-center gap-1" style={{ color: MUTED }}>
                          <FileText className="w-3 h-3" />
                          <span className="font-mono">{req.affected_resource || "N/A"}</span>
                        </span>
                        {req.related_tool_execution_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)", fontFamily: "monospace" }}>
                            Tool: {req.related_tool_execution_id.slice(0, 12)}...
                          </span>
                        )}
                        {req.related_workflow_id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)", fontFamily: "monospace" }}>
                            Workflow: {req.related_workflow_id.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <Timer className={`w-4 h-4 ${req.sla_deadline && Math.floor((new Date(req.sla_deadline) - new Date()) / 60000) < 5 ? "text-red-400 animate-pulse" : ""}`} />
                        <SLACountdown deadline={req.sla_deadline} />
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${req.priority === "P0" ? "text-red-400" : req.priority === "P1" ? "text-orange-400" : "text-blue-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{req.priority}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="text-[10px] font-bold" style={{ color: MUTED }}>Required Roles:</span>
                    {(req.required_roles || []).map((role, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{role}</span>
                    ))}
                    {req.quorum_count && (
                      <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>Quorum: {req.quorum_approvals || 0}/{req.quorum_count}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedRequest(req); setShowApproveModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: `${LOW}15`, border: `1px solid ${LOW}30`, color: LOW }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => { setSelectedRequest(req); setShowRejectModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER }}>
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button onClick={() => { setSelectedRequest(req); setShowDelegateModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
                      <UserX className="w-3.5 h-3.5" /> Delegate
                    </button>
                    <button onClick={() => { setSelectedRequest(req); setShowEscalateModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}30`, color: HIGH }}>
                      <TrendingUp className="w-3.5 h-3.5" /> Escalate
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Request Panel */}
      {showCreatePanel && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Create Approval Request</h3>
            <button onClick={() => setShowCreatePanel(false)} style={{ color: MUTED }}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input value={createData.title} onChange={e => setCreateData({...createData, title: e.target.value})} placeholder="Title" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            <select value={createData.source_type} onChange={e => setCreateData({...createData, source_type: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="manual">Manual</option>
              <option value="workflow">Workflow</option>
              <option value="tool">Tool</option>
            </select>
            <select value={createData.risk_level} onChange={e => setCreateData({...createData, risk_level: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select value={createData.approval_type} onChange={e => setCreateData({...createData, approval_type: e.target.value})} className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="single">Single</option>
              <option value="dual">Dual</option>
              <option value="quorum">Quorum</option>
            </select>
            <input value={createData.affected_resource} onChange={e => setCreateData({...createData, affected_resource: e.target.value})} placeholder="Affected Resource" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            <input value={createData.priority} onChange={e => setCreateData({...createData, priority: e.target.value})} placeholder="Priority" className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          </div>
          <textarea value={createData.description} onChange={e => setCreateData({...createData, description: e.target.value})} placeholder="Description" className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-4" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, minHeight: "80px" }} />
          <button onClick={() => createMutation.mutate({ action: "create", ...createData })} disabled={createMutation.isPending || !createData.title} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Send className="w-4 h-4" /> {createMutation.isPending ? "Creating..." : "Create Request"}
          </button>
        </Card>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Approve Request</h3>
              <button onClick={() => { setShowApproveModal(false); setSelectedRequest(null); }} style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm" style={{ color: TEXT }}>{selectedRequest.title}</p>
            <textarea value={approveReason} onChange={e => setApproveReason(e.target.value)} placeholder="Approval reason (optional)" className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, minHeight: "80px" }} />
            <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
              <input type="checkbox" checked={rollbackRequired} onChange={e => setRollbackRequired(e.target.checked)} /> Rollback Required
            </label>
            <button onClick={() => approveMutation.mutate({ action: "approve", request_id: selectedRequest.request_id, reason: approveReason, rollback_required: rollbackRequired })} disabled={approveMutation.isPending} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ background: `${LOW}15`, border: `1px solid ${LOW}30`, color: LOW }}>
              <CheckCircle className="w-4 h-4" /> {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Reject Request</h3>
              <button onClick={() => { setShowRejectModal(false); setSelectedRequest(null); }} style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm" style={{ color: TEXT }}>{selectedRequest.title}</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason (required)" className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, minHeight: "80px" }} />
            <button onClick={() => rejectMutation.mutate({ action: "reject", request_id: selectedRequest.request_id, reason: rejectReason })} disabled={rejectMutation.isPending || !rejectReason} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER }}>
              <XCircle className="w-4 h-4" /> {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegateModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Delegate Approval</h3>
              <button onClick={() => { setShowDelegateModal(false); setSelectedRequest(null); }} style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
            <input value={delegateData.delegate_to_id} onChange={e => setDelegateData({...delegateData, delegate_to_id: e.target.value})} placeholder="Delegate To (User ID)" className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            <input value={delegateData.delegate_to_role} onChange={e => setDelegateData({...delegateData, delegate_to_role: e.target.value})} placeholder="Delegate To Role" className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            <input type="number" value={delegateData.valid_hours} onChange={e => setDelegateData({...delegateData, valid_hours: parseInt(e.target.value)})} placeholder="Valid Hours" className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            <textarea value={delegateData.reason} onChange={e => setDelegateData({...delegateData, reason: e.target.value})} placeholder="Reason" className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, minHeight: "60px" }} />
            <button onClick={() => delegateMutation.mutate({ action: "delegate", request_id: selectedRequest.request_id, ...delegateData })} disabled={delegateMutation.isPending} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <UserX className="w-4 h-4" /> {delegateMutation.isPending ? "Delegating..." : "Confirm Delegation"}
            </button>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalateModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Escalate Request</h3>
              <button onClick={() => { setShowEscalateModal(false); setSelectedRequest(null); }} style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
            <select value={escalateData.escalate_to_role} onChange={e => setEscalateData({...escalateData, escalate_to_role: e.target.value})} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="">Select Role...</option>
              <option value="admin">Admin</option>
              <option value="security_lead">Security Lead</option>
              <option value="ciso">CISO</option>
            </select>
            <select value={escalateData.reason} onChange={e => setEscalateData({...escalateData, reason: e.target.value})} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="manual">Manual Escalation</option>
              <option value="sla_breach">SLA Breach</option>
              <option value="policy">Policy Requirement</option>
            </select>
            <button onClick={() => escalateMutation.mutate({ action: "escalate", request_id: selectedRequest.request_id, ...escalateData })} disabled={escalateMutation.isPending} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}30`, color: HIGH }}>
              <TrendingUp className="w-4 h-4" /> {escalateMutation.isPending ? "Escalating..." : "Confirm Escalation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}