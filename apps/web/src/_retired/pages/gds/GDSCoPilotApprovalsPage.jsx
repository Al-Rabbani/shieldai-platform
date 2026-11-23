import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, X, Clock, AlertTriangle, FileText, ThumbsUp, ThumbsDown, CheckSquare, Square, Zap, Download } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, COPILOT_ORANGE, BORDER, MUTED, TEXT } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import { Button } from "@/components/ui/button";

export default function GDSCoPilotApprovalsPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: approvals = [] } = useQuery({ 
    queryKey: ["copilot-approvals"], 
    queryFn: () => base44.entities.CopilotApproval.list("-requested_at", 100).catch(() => []) 
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids) => {
      const updates = ids.map(id => ({ id, decision: "approved", status: "approved", decided_at: new Date().toISOString() }));
      await base44.entities.CopilotApproval.bulkUpdate(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["copilot-approvals"]);
      setSelectedIds(new Set());
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: async (ids) => {
      const updates = ids.map(id => ({ id, decision: "rejected", status: "rejected", decided_at: new Date().toISOString() }));
      await base44.entities.CopilotApproval.bulkUpdate(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["copilot-approvals"]);
      setSelectedIds(new Set());
    },
  });

  const filteredApprovals = filterStatus === "all" ? approvals : approvals.filter(a => a.status === filterStatus);
  const stats = {
    pending: approvals.filter(a => a.status === "pending").length,
    approved: approvals.filter(a => a.status === "approved").length,
    rejected: approvals.filter(a => a.status === "rejected").length,
    expired: approvals.filter(a => a.status === "expired").length,
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApprovals.filter(a => a.status === "pending").length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApprovals.filter(a => a.status === "pending").map(a => a.id)));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.size > 0) bulkApproveMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkReject = () => {
    if (selectedIds.size > 0) bulkRejectMutation.mutate(Array.from(selectedIds));
  };

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Approval Queue" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">BULK APPROVAL CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v7.0 · MASS AUTHORIZATION INTERFACE</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CopilotStat label="Pending Review" value={stats.pending} sub="Awaiting decision" color={COPILOT_AMBER} pulse={stats.pending > 0} />
        <CopilotStat label="Approved" value={stats.approved} sub="Authorized actions" color={COPILOT_GREEN} />
        <CopilotStat label="Rejected" value={stats.rejected} sub="Blocked by user" color={COPILOT_RED} />
        <CopilotStat label="Expired" value={stats.expired} sub="SLA exceeded" color={MUTED} />
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-6 p-4 rounded-2xl flex items-center justify-between" style={{ background: `${COPILOT_ELECTRIC}15`, border: `2px solid ${COPILOT_ELECTRIC}` }}>
          <div className="flex items-center gap-3">
            <CheckSquare className="w-5 h-5" style={{ color: COPILOT_ELECTRIC }} />
            <span className="text-sm font-bold text-white">{selectedIds.size} approval(s) selected</span>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleBulkApprove} disabled={bulkApproveMutation.isPending} 
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: COPILOT_GREEN, color: "white" }}>
              <ThumbsUp className="w-4 h-4" /> Approve All
            </Button>
            <Button onClick={handleBulkReject} disabled={bulkRejectMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: COPILOT_RED, color: "white" }}>
              <ThumbsDown className="w-4 h-4" /> Reject All
            </Button>
            <Button onClick={() => setSelectedIds(new Set())} variant="outline"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED }}>
              <X className="w-4 h-4" /> Clear
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} 
          className="px-4 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
        <Button variant="outline" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED }}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> All Approval Requests
          </h3>
          {filteredApprovals.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>No approval requests found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                    <th className="pb-3 w-10">
                      <button onClick={toggleSelectAll} className="hover:opacity-80">
                        {selectedIds.size === filteredApprovals.filter(a => a.status === "pending").length && filteredApprovals.filter(a => a.status === "pending").length > 0 
                          ? <CheckSquare className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> 
                          : <Square className="w-4 h-4" style={{ color: MUTED }} />}
                      </button>
                    </th>
                    <th className="pb-3">Action</th>
                    <th className="pb-3">Risk Level</th>
                    <th className="pb-3">Business Impact</th>
                    <th className="pb-3">AI Recommendation</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Requested By</th>
                    <th className="pb-3">SLA</th>
                    <th className="pb-3">Decision</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  {filteredApprovals.slice(0, 50).map(approval => (
                    <tr key={approval.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                      <td className="py-3">
                        {approval.status === "pending" && (
                          <button onClick={() => toggleSelect(approval.id)} className="hover:opacity-80">
                            {selectedIds.has(approval.id) 
                              ? <CheckSquare className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> 
                              : <Square className="w-4 h-4" style={{ color: MUTED }} />}
                          </button>
                        )}
                      </td>
                      <td className="py-3 font-bold text-white max-w-[150px] truncate">{approval.action_title}</td>
                      <td className="py-3"><CopilotBadge color={approval.risk_level === "critical" ? COPILOT_RED : approval.risk_level === "high" ? COPILOT_ORANGE : approval.risk_level === "medium" ? COPILOT_AMBER : COPILOT_GREEN}>{approval.risk_level}</CopilotBadge></td>
                      <td className="py-3 max-w-[150px] truncate" style={{ color: MUTED }}>{approval.business_impact}</td>
                      <td className="py-3" style={{ color: MUTED }}>{approval.ai_recommendation}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className="h-full rounded-full" style={{ width: `${approval.ai_confidence_pct}%`, background: COPILOT_GRADIENT }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: COPILOT_ELECTRIC }}>{approval.ai_confidence_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3" style={{ color: MUTED }}>{approval.requested_by}</td>
                      <td className="py-3" style={{ color: MUTED }}>{approval.sla_minutes}m</td>
                      <td className="py-3">
                        {approval.decision === "approved" ? <ThumbsUp className="w-3.5 h-3.5" style={{ color: COPILOT_GREEN }} /> :
                         approval.decision === "rejected" ? <ThumbsDown className="w-3.5 h-3.5" style={{ color: COPILOT_RED }} /> :
                         <Clock className="w-3.5 h-3.5" style={{ color: MUTED }} />}
                      </td>
                      <td className="py-3"><CopilotBadge color={approval.status === "approved" ? COPILOT_GREEN : approval.status === "rejected" ? COPILOT_RED : approval.status === "expired" ? MUTED : COPILOT_AMBER}>{approval.status}</CopilotBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}