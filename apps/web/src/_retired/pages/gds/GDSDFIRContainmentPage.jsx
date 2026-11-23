import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Lock, CheckCircle, AlertTriangle, Clock, Zap } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const ACTION_TYPE_COLORS = {
  isolate_host: DANGER, block_ip: "#f97316", disable_account: "#eab308", kill_process: DANGER,
  quarantine_file: "#a855f7", block_domain: "#f97316", revoke_credentials: HIGH,
  network_segment: "#3b82f6", shutdown_service: DANGER, other: MUTED
};

const STATUS_COLORS = { verified: LOW, pending: MEDIUM, failed: DANGER };

export default function GDSDFIRContainmentPage() {
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["dfir-containment-actions"],
    queryFn: () => base44.entities.ContainmentAction.list("-executed_at", 200).catch(() => []),
  });

  const stats = {
    total: actions.length,
    automated: actions.filter(a => a.is_automated).length,
    completed: actions.filter(a => a.verification_status === "verified").length,
    pendingApproval: actions.filter(a => a.requires_approval && a.approval_status === "pending").length
  };

  const actionTypes = [...new Set(actions.map(a => a.action_type).filter(Boolean))];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Containment Console" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Containment Console</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Manage containment actions</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Actions</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Automated</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.automated}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.completed}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Pending Approval</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{stats.pendingApproval}</p>
        </Card>
      </div>

      {/* Actions Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : actions.length === 0 ? (
          <EmptyState icon={Shield} title="No containment actions" description="Containment actions will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Type", "Target", "Target Type", "Automated", "Approval", "Executed By", "Executed At", "Rollback", "Verification", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => {
                  const typeColor = ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other;
                  const statusColor = STATUS_COLORS[action.verification_status] || MUTED;
                  return (
                    <tr key={action.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5">
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{action.action_type?.replace(/_/g, " ") || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs truncate">{action.target}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] capitalize" style={{ color: TEXT }}>{action.target_type || "—"}</span>
                      </td>
                      <td className="py-3 px-4">
                        {action.is_automated ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>AUTO</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>Manual</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {action.requires_approval ? (
                          <div className="flex items-center gap-1">
                            <Lock className="w-3 h-3" style={{ color: action.approval_status === "approved" ? LOW : action.approval_status === "rejected" ? DANGER : MEDIUM }} />
                            <span className="text-[10px] capitalize" style={{ color: action.approval_status === "approved" ? LOW : action.approval_status === "rejected" ? DANGER : MEDIUM }}>{action.approval_status || "pending"}</span>
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.executed_by_name || action.executed_by || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: MUTED }}>{timeAgo(action.executed_at)}</p>
                      </td>
                      <td className="py-3 px-4">
                        {action.rollback_executed ? (
                          <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
                        ) : action.rollback_available ? (
                          <span className="text-[10px]" style={{ color: MUTED }}>Available</span>
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${action.verification_status === 'verified' ? 'animate-pulse' : ''}`} style={{ color: statusColor, background: `${statusColor}15` }}>{action.verification_status || "pending"}</span>
                      </td>
                      <td className="py-3 px-4">
                        {action.approval_status === "pending" && (
                          <button className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Approve</button>
                        )}
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