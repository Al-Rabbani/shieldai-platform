import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckSquare, Clock, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const ACTION_TYPE_COLORS = {
  mfa_enforcement: LOW, patch_management: "#3b82f6", detection_rule: "#a855f7",
  architecture_change: DANGER, process_improvement: HIGH, training: "#eab308",
  policy_update: CYAN, tool_deployment: "#10b981", access_review: "#f97316", other: MUTED
};

const PRIORITY_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };
const STATUS_COLORS = { open: MUTED, in_progress: HIGH, completed: LOW, cancelled: MUTED };

export default function GDSDFIRCorrectivePage() {
  const qc = useQueryClient();
  const [filterType, setFilterType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["dfir-corrective", filterType, filterPriority, filterStatus],
    queryFn: () => base44.entities.CorrectiveAction.list("-due_date", 500).then(r => r.filter(a => {
      if (filterType && a.action_type !== filterType) return false;
      if (filterPriority && a.priority !== filterPriority) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      return true;
    })).catch(() => []),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => base44.entities.CorrectiveAction.update(id, { status: "completed", completed_at: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries(["dfir-corrective"]),
  });

  const stats = {
    total: actions.length,
    openCritical: actions.filter(a => a.priority === "critical" && a.status === "open").length,
    overdue: actions.filter(a => a.due_date && new Date(a.due_date) < new Date() && a.status !== "completed").length,
    completed: actions.filter(a => a.status === "completed").length
  };

  const actionTypes = [...new Set(actions.map(a => a.action_type).filter(Boolean))];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Corrective Actions" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Corrective Action Tracker</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Track preventive measures</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Actions</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.openCritical}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Overdue</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.overdue}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.completed}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Types</option>
            {actionTypes.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      {/* Actions Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : actions.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No corrective actions" description="Corrective actions will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Title", "Type", "Priority", "Owner", "Due Date", "Effort", "Risk Reduction", "Prevents Recurrence", "Control", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => {
                  const typeColor = ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other;
                  const priorityColor = PRIORITY_COLORS[action.priority] || PRIORITY_COLORS.medium;
                  const statusColor = STATUS_COLORS[action.status] || STATUS_COLORS.open;
                  const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== "completed";
                  return (
                    <tr key={action.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5">
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs truncate">{action.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{action.action_type?.replace(/_/g, " ") || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ background: `${priorityColor}15`, color: priorityColor }}>{action.priority || "medium"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.owner_name || action.owner || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className={`text-xs font-bold ${isOverdue ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                          {action.due_date ? new Date(action.due_date).toLocaleDateString() : "—"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.effort_hours || 0}h</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${action.risk_reduction_percent || 0}%`, background: LOW }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: TEXT }}>{action.risk_reduction_percent || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {action.prevents_recurrence ? <CheckSquare className="w-4 h-4" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.framework_control || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: statusColor, background: `${statusColor}15` }}>{action.status || "open"}</span>
                      </td>
                      <td className="py-3 px-4">
                        {action.status !== "completed" && (
                          <button onClick={() => completeMutation.mutate(action.id)} disabled={completeMutation.isPending} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>Mark Complete</button>
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