import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle, TrendingUp, Users, FileText, ChevronRight, Timer, Plus, Download } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb, AnimatedArc } from "@/components/gds/GDSOSShared";
import { useNavigate } from "react-router-dom";

export default function GDSApprovalsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pendingRequests, setPendingRequests] = useState([]);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["approvals-metrics"],
    queryFn: () => base44.functions.invoke("gdsApprovalEngine2", { action: "metrics" }).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: pendingData } = useQuery({
    queryKey: ["approvals-pending"],
    queryFn: () => base44.functions.invoke("gdsApprovalEngine2", { action: "pending", limit: 5 }).then(r => r.data),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (pendingData?.requests) {
      setPendingRequests(pendingData.requests);
    }
  }, [pendingData]);

  const m = metrics || {};
  const requests = m.requests || {};
  const decisions = m.decisions || {};
  const sla = m.sla || {};

  const byRisk = requests.by_risk || {};

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Human Approval Center" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Human Approval Center</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-010 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>18-stage pipeline · 7 approval types · Digital Signature · Zero Trust Human Governance</span>
          <button
            onClick={() => navigate("/approvals/queue")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" />
            New Request
          </button>
          <button
            onClick={() => exportApprovalsHistory(m)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <Download className="w-4 h-4" />
            Export History
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Requests</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{requests.total ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Pending</p>
          <p className="text-2xl font-black font-mono" style={{ color: (requests.pending ?? 0) > 0 ? HIGH : MUTED }}>{requests.pending ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Approved</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{requests.approved ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Rejected</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{requests.rejected ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Escalated</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{requests.escalated ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>SLA Breaches</p>
          <p className="text-2xl font-black font-mono" style={{ color: (sla.breached ?? 0) > 0 ? DANGER : MUTED }}>{sla.breached ?? 0}</p>
        </Card>
      </div>

      {/* Risk Distribution */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center" style={{ border: `1px solid ${DANGER}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{byRisk.critical ?? 0}</p>
        </Card>
        <Card className="p-4 text-center" style={{ border: `1px solid ${HIGH}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{byRisk.high ?? 0}</p>
        </Card>
        <Card className="p-4 text-center" style={{ border: `1px solid ${MEDIUM}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Medium Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{byRisk.medium ?? 0}</p>
        </Card>
        <Card className="p-4 text-center" style={{ border: `1px solid ${LOW}30` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Low Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{byRisk.low ?? 0}</p>
        </Card>
      </div>

      {/* Approval Rate Gauge */}
      <Card className="p-6">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <AnimatedArc score={decisions.approval_rate ?? 0} size={120} strokeWidth={10} />
            <p className="text-sm font-bold mt-3" style={{ color: MUTED }}>Approval Rate</p>
            <p className="text-[10px]" style={{ color: decisions.approval_rate >= 80 ? LOW : decisions.approval_rate >= 50 ? MEDIUM : DANGER }}>
              {decisions.approval_rate >= 80 ? "Excellent" : decisions.approval_rate >= 50 ? "Moderate" : "Critical"}
            </p>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white mb-2">Approval Performance</h3>
            <p className="text-[10px] mb-4" style={{ color: MUTED }}>Real-time approval rate across all request types</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: MUTED }}>Target: 80%</span>
                <span style={{ color: decisions.approval_rate >= 80 ? LOW : DANGER }}>{decisions.approval_rate ?? 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${decisions.approval_rate ?? 0}%`, background: decisions.approval_rate >= 80 ? LOW : decisions.approval_rate >= 50 ? MEDIUM : DANGER }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded" style={{ background: `${LOW}10` }}>
                  <p className="text-[9px] font-bold" style={{ color: MUTED }}>Approved</p>
                  <p className="text-lg font-black" style={{ color: LOW }}>{decisions.approved ?? 0}</p>
                </div>
                <div className="p-2 rounded" style={{ background: `${DANGER}10` }}>
                  <p className="text-[9px] font-bold" style={{ color: MUTED }}>Rejected</p>
                  <p className="text-lg font-black" style={{ color: DANGER }}>{decisions.rejected ?? 0}</p>
                </div>
                <div className="p-2 rounded" style={{ background: `${CYAN}10` }}>
                  <p className="text-[9px] font-bold" style={{ color: MUTED }}>Pending</p>
                  <p className="text-lg font-black" style={{ color: CYAN }}>{requests.pending ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Pending Queue Preview */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Pending Approval Queue</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Top 5 priority requests awaiting review</p>
          </div>
          <button
            onClick={() => navigate("/approvals/queue")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            View All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {isLoading ? (
          <EmptyState icon={Clock} title="Loading..." description="Fetching pending requests" />
        ) : pendingRequests.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No pending requests" description="All approval requests have been processed" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Title", "Source", "Type", "Level", "Risk", "Priority", "Required Roles", "SLA Deadline", "Action"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((req, i) => {
                  const slaDeadline = req.sla_deadline ? new Date(req.sla_deadline) : null;
                  const timeLeft = slaDeadline ? Math.floor((slaDeadline - new Date()) / 60000) : null;
                  const isUrgent = timeLeft !== null && timeLeft < 5;
                  return (
                    <tr key={req.request_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 max-w-[200px]">
                        <p className="truncate text-white font-bold">{req.title || "Untitled"}</p>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{req.source_type || "manual"}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{req.approval_type || "single"}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{req.approval_level || "standard"}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${req.risk_level === "critical" ? "text-red-400" : req.risk_level === "high" ? "text-orange-400" : req.risk_level === "medium" ? "text-yellow-400" : "text-green-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{req.risk_level || "medium"}</span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${req.priority === "P0" ? "text-red-400" : req.priority === "P1" ? "text-orange-400" : "text-blue-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{req.priority || "P2"}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1 flex-wrap">
                          {(req.required_roles || []).slice(0, 3).map((role, idx) => (
                            <span key={idx} className="text-[9px] px-1 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>{role}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className={`flex items-center gap-1 ${isUrgent ? "text-red-400 animate-pulse" : ""}`} style={{ color: isUrgent ? DANGER : MUTED }}>
                          <Timer className="w-3 h-3" />
                          <span className="text-[10px] font-mono">{timeLeft !== null ? `${timeLeft}m` : "—"}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => navigate("/approvals/queue")}
                          className="text-[10px] px-2 py-1 rounded font-bold transition-all"
                          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Performance Trends Preview */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Approval Performance Trends</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>30-day approval speeds and bottleneck patterns</p>
          </div>
          <button
            onClick={() => navigate("/approvals/evidence")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${CYAN}30` }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Avg Approval Time</p>
            <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{(m.performance?.avg_approval_time) ? `${Math.round(m.performance.avg_approval_time / 60)}m` : "—"}</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "rgba(0,255,136,0.04)", border: `1px solid ${LOW}30` }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Fastest Workflow</p>
            <p className="text-sm font-bold text-white">{(m.performance?.fastest_workflow) || "—"}</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: "rgba(255,59,59,0.04)", border: `1px solid ${DANGER}30` }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Slowest Workflow</p>
            <p className="text-sm font-bold text-white">{(m.performance?.slowest_workflow) || "—"}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function exportApprovalsHistory(metrics) {
  const m = metrics || {};
  const report = {
    export_date: new Date().toISOString(),
    export_type: "approvals_compliance_report",
    summary: {
      total_requests: m.requests?.total || 0,
      approved: m.requests?.approved || 0,
      rejected: m.requests?.rejected || 0,
      pending: m.requests?.pending || 0,
      escalated: m.requests?.escalated || 0,
      sla_breaches: m.sla?.breached || 0
    },
    note: "Full approval history with digital signatures available via /approvals/audit export"
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `approvals-history-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}