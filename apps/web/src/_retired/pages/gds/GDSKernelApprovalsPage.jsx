import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, ShieldCheck, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const APPROVAL_TYPE_COLOR = { single: CYAN, dual: MEDIUM, quorum: "#8b5cf6" };
const RISK_COLOR = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

function ApprovalTypeBadge({ type }) {
  const color = APPROVAL_TYPE_COLOR[type] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {type}
    </span>
  );
}

function RiskBadge({ level }) {
  const color = RISK_COLOR[level] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {level}
    </span>
  );
}

export default function GDSKernelApprovalsPage() {
  const qc = useQueryClient();
  const [actingOn, setActingOn] = useState(null);
  const [user, setUser] = useState(null);

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: statusData } = useQuery({
    queryKey: ["kernel-status-approvals"],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", { action: "status" }).then(r => r.data),
  });

  const { data: approvals = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["kernel-approvals"],
    queryFn: () => base44.entities.KernelApprovalRequest.filter({ status: "pending" }).catch(() => []),
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ session_id, approval_action }) =>
      base44.functions.invoke("gdsKernelGateway", {
        action: "approve", session_id, approval_action, approver_id: user?.email || "unknown"
      }),
    onSuccess: () => {
      qc.invalidateQueries(["kernel-approvals"]);
      qc.invalidateQueries(["kernel-status-approvals"]);
      setActingOn(null);
    },
  });

  const pending = statusData?.pending_approval ?? approvals.length;

  return (
    <div style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "AI Kernel", path: "/kernel" }, { label: "Approval Queue" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Approval Queue</h1>
          {pending > 0 && (
            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full"
              style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
              {pending} pending
            </span>
          )}
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Info panel */}
      <div className="flex items-center gap-3 p-4 rounded-xl mb-4"
        style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}20` }}>
        <Clock className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
        <p className="text-xs" style={{ color: MUTED }}>
          Approval requests are generated when kernel sessions invoke tools that require human authorization.
          Approvals expire automatically if not actioned before the deadline.
        </p>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={5} /> : approvals.length === 0
          ? <EmptyState icon={ShieldCheck} title="No pending approvals" description="All kernel actions have been authorized or no sessions are awaiting approval" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Session ID","Type","Risk","Requested Action","Tool","Expires","Progress","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a, i) => {
                    const isActing = actingOn === a.id;
                    return (
                      <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? "#050e1f" : "transparent" }}>
                        <td className="px-4 py-3 font-mono text-[11px] text-white">
                          {(a.session_id || "").slice(0, 18)}…
                        </td>
                        <td className="px-4 py-3"><ApprovalTypeBadge type={a.approval_type} /></td>
                        <td className="px-4 py-3"><RiskBadge level={a.risk_level} /></td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <p className="truncate text-white">{a.requested_action || "—"}</p>
                        </td>
                        <td className="px-4 py-3" style={{ color: CYAN }}>{a.tool_name || "—"}</td>
                        <td className="px-4 py-3 text-[10px]" style={{ color: a.expires_at && new Date(a.expires_at) < new Date() ? DANGER : MUTED }}>
                          {timeAgo(a.expires_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px]" style={{ color: CYAN }}>
                            {a.approvals_received ?? 0}/{a.approvers_required ?? 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { setActingOn(a.id); approveMutation.mutate({ session_id: a.session_id, approval_action: "approve" }); }}
                              disabled={isActing && approveMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
                              style={{ background: `${LOW}15`, border: `1px solid ${LOW}30`, color: LOW }}>
                              <CheckCircle className="w-3 h-3" />Approve
                            </button>
                            <button
                              onClick={() => { setActingOn(a.id); approveMutation.mutate({ session_id: a.session_id, approval_action: "reject" }); }}
                              disabled={isActing && approveMutation.isPending}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
                              style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}30`, color: DANGER }}>
                              <XCircle className="w-3 h-3" />Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>
    </div>
  );
}