import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Wrench, CheckCircle, Lock, AlertTriangle, Calendar, Code, Shield } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

function PriorityBadge({ priority }) {
  const colors = {
    critical: { bg: DANGER, text: DANGER },
    high: { bg: HIGH, text: HIGH },
    medium: { bg: MEDIUM, text: MEDIUM },
    low: { bg: LOW, text: LOW },
  };
  const color = colors[priority] || { bg: MUTED, text: MUTED };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${color.bg}15`, color: color.text, border: `1px solid ${color.bg}30` }}>
      {priority?.toUpperCase() || "UNKNOWN"}
    </span>
  );
}

function EffortBadge({ effort }) {
  const colors = {
    low: { bg: LOW, text: LOW },
    medium: { bg: MEDIUM, text: MEDIUM },
    high: { bg: HIGH, text: HIGH },
  };
  const color = colors[effort] || { bg: MUTED, text: MUTED };
  return (
    <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${color.bg}15`, color: color.text, border: `1px solid ${color.bg}30` }}>
      {effort || "—"}
    </span>
  );
}

function RemediationTypeBadge({ type }) {
  const colors = {
    disable_account: { bg: DANGER, text: DANGER },
    rotate_krbtgt: { bg: "#a855f7", text: "#a855f7" },
    remove_spn: { bg: HIGH, text: HIGH },
    enable_smb_signing: { bg: CYAN, text: CYAN },
    enable_ldaps: { bg: MEDIUM, text: MEDIUM },
    reset_password: { bg: LOW, text: LOW },
    remove_admin: { bg: "#ec4899", text: "#ec4899" },
  };
  const color = colors[type] || { bg: MUTED, text: MUTED };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${color.bg}15`, color: color.text, border: `1px solid ${color.bg}30` }}>
      {type?.replace(/_/g, " ").toUpperCase() || "UNKNOWN"}
    </span>
  );
}

export default function GDSIdentityRemediationPage() {
  const qc = useQueryClient();
  const [expandedRows, setExpandedRows] = useState({});

  const { data: remediations = [] } = useQuery({
    queryKey: ["identity-remediation"],
    queryFn: () => base44.entities.IdentityRemediation?.list("-created_date", 500).catch(() => []),
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.IdentityRemediation.update(id, {
        status: "approved",
        approved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["identity-remediation"]);
    },
  });

  const toggleExpand = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleApprove = async (id) => {
    await approveMutation.mutateAsync(id);
  };

  // Group by status
  const byStatus = {
    pending: remediations.filter(r => r.status === "pending").length,
    approved: remediations.filter(r => r.status === "approved").length,
    executing: remediations.filter(r => r.status === "executing").length,
    completed: remediations.filter(r => r.status === "completed").length,
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Identity Remediation Center" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Identity Remediation Center</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Track and approve identity security remediation actions</p>
        </div>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Pending</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{byStatus.pending}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Approved</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{byStatus.approved}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Executing</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{byStatus.executing}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{byStatus.completed}</p>
        </Card>
      </div>

      {/* Remediation Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Remediation Tasks</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Title", "Type", "Priority", "Effort", "Requires", "Assigned To", "Due Date", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {remediations.map((rem, i) => {
                const isExpanded = expandedRows[rem.id];
                const isOverdue = rem.due_date && new Date(rem.due_date) < new Date();
                return (
                  <React.Fragment key={rem.id || i}>
                    <tr className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3">
                        <p className="text-sm font-semibold text-white">{rem.title}</p>
                      </td>
                      <td className="py-3 px-3">
                        <RemediationTypeBadge type={rem.remediation_type} />
                      </td>
                      <td className="py-3 px-3">
                        <PriorityBadge priority={rem.priority} />
                      </td>
                      <td className="py-3 px-3">
                        <EffortBadge effort={rem.effort} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {rem.requires_approval && (
                            <div className="flex items-center gap-1" title="Requires Approval">
                              <Lock className="w-3 h-3" style={{ color: HIGH }} />
                            </div>
                          )}
                          {rem.requires_dc_restart && (
                            <div className="flex items-center gap-1" title="Requires DC Restart">
                              <AlertTriangle className="w-3 h-3" style={{ color: MEDIUM }} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3" style={{ color: TEXT }}>{rem.assigned_to || "—"}</td>
                      <td className="py-3 px-3">
                        {rem.due_date ? (
                          <span className={isOverdue ? "text-red-400 font-bold" : "text-green-400"}>
                            {new Date(rem.due_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ color: MUTED }}>—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                          rem.status === "pending" ? "bg-orange-400/15 text-orange-400" :
                          rem.status === "approved" ? "bg-cyan-400/15 text-cyan-400" :
                          rem.status === "executing" ? "bg-yellow-400/15 text-yellow-400" :
                          "bg-green-400/15 text-green-400"
                        }`}>
                          {rem.status || "pending"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpand(rem.id)}
                            className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all"
                            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
                          >
                            Details
                          </button>
                          {rem.status === "pending" && (
                            <button
                              onClick={() => handleApprove(rem.id)}
                              disabled={approveMutation.isPending}
                              className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                              style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}
                            >
                              <CheckCircle className="w-3 h-3" />
                              Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-4" style={{ background: "rgba(0,212,255,0.03)" }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Remediation Steps</p>
                              <ol className="space-y-2">
                                {(rem.steps || []).map((step, j) => (
                                  <li key={j} className="text-xs p-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                                    <span className="text-[9px] font-bold" style={{ color: CYAN }}>{j + 1}.</span>
                                    <span className="ml-2" style={{ color: TEXT }}>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>PowerShell Command</p>
                              <div className="p-3 rounded-lg font-mono text-xs" style={{ background: "#0a0e1a", border: `1px solid ${BORDER}`, color: CYAN }}>
                                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                                  {rem.powershell_command || "No command available"}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}