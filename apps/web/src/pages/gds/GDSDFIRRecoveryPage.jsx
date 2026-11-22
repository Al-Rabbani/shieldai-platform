import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const ACTION_TYPE_COLORS = {
  restore_from_backup: "#3b82f6", rebuild_system: "#a855f7", restore_service: "#10b981",
  failover: "#f97316", data_restoration: CYAN, service_restart: HIGH,
  configuration_restore: MEDIUM, other: MUTED
};

const STATUS_COLORS = { planned: MUTED, in_progress: HIGH, completed: LOW, failed: DANGER };

export default function GDSDFIRRecoveryPage() {
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["dfir-recovery-actions"],
    queryFn: () => base44.entities.RecoveryAction.list("-executed_at", 200).catch(() => []),
  });

  const { data: businessImpacts = [] } = useQuery({
    queryKey: ["dfir-business-impact"],
    queryFn: () => base44.entities.BusinessImpact.list("", 50).catch(() => []),
  });

  const stats = {
    total: actions.length,
    completed: actions.filter(a => a.status === "completed").length,
    rtoMet: actions.filter(a => a.actual_recovery_minutes <= a.rto_target_minutes).length,
    integrityVerified: actions.filter(a => a.integrity_verified).length,
    inProgress: actions.filter(a => a.status === "in_progress").length
  };

  const rtoMetPercent = stats.total > 0 ? Math.round((stats.rtoMet / stats.total) * 100) : 0;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Recovery Console" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6" style={{ color: LOW }} />
          <div>
            <h1 className="text-2xl font-black text-white">Recovery Console</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Service recovery and restoration</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Actions</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Services Restored</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.completed}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>RTO Met</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{rtoMetPercent}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Integrity Verified</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.integrityVerified}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>In Progress</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{stats.inProgress}</p>
        </Card>
      </div>

      {/* Actions Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : actions.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No recovery actions" description="Recovery actions will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Type", "Target", "Business Service", "RTO Target", "Actual Recovery", "Integrity", "Executed By", "Status"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => {
                  const typeColor = ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other;
                  const isUnderRTO = action.actual_recovery_minutes <= action.rto_target_minutes;
                  return (
                    <tr key={action.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5">
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{action.action_type?.replace(/_/g, " ") || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs truncate">{action.target}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.business_service || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-mono" style={{ color: TEXT }}>{action.rto_target_minutes || 0}m</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className={`text-xs font-mono font-bold ${isUnderRTO ? 'text-green-400' : 'text-red-400'}`}>
                          {action.actual_recovery_minutes || 0}m {isUnderRTO ? '✓' : '✗'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        {action.integrity_verified ? (
                          <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>No</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.executed_by_name || action.executed_by || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: STATUS_COLORS[action.status], background: `${STATUS_COLORS[action.status]}15` }}>{action.status || "planned"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Business Impact Summary */}
      {businessImpacts.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
            <h3 className="text-sm font-bold text-white">Business Impact Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {businessImpacts.slice(0, 4).map((impact, i) => (
              <div key={impact.id || i} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Incident</p>
                <p className="text-xs font-semibold text-white mb-2 truncate">{impact.incident_id?.slice(-8)}</p>
                <div className="space-y-1 text-[10px]">
                  <p style={{ color: MUTED }}>Financial: <span style={{ color: DANGER }}>${impact.financial_loss_usd?.toLocaleString() || 0}</span></p>
                  <p style={{ color: MUTED }}>Downtime: <span style={{ color: HIGH }}>{impact.downtime_minutes || 0}m</span></p>
                  {impact.pii_affected && <p style={{ color: DANGER }}>⚠️ PII Affected</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}