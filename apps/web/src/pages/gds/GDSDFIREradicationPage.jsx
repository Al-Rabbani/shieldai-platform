import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Shield, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const ACTION_TYPE_COLORS = {
  malware_removal: DANGER, credential_rotation: HIGH, patch_vulnerability: "#f97316",
  reimaging: "#a855f7", config_hardening: CYAN, backdoor_removal: DANGER,
  persistence_removal: DANGER, lateral_movement_cleanup: HIGH, other: MUTED
};

export default function GDSDFIREradicationPage() {
  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["dfir-eradication-actions"],
    queryFn: () => base44.entities.EradicationAction.list("-verified_at", 200).catch(() => []),
  });

  const stats = {
    total: actions.length,
    verifiedClean: actions.filter(a => a.verified_clean).length,
    inProgress: actions.filter(a => a.status === "in_progress").length,
    failed: actions.filter(a => a.status === "failed").length
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Eradication Workspace" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Eradication Workspace</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Threat eradication tracking</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Actions</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${LOW}08`, border: `1px solid ${LOW}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Verified Clean</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.verifiedClean}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>In Progress</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.inProgress}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Failed</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.failed}</p>
        </Card>
      </div>

      {/* Actions Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : actions.length === 0 ? (
          <EmptyState icon={Shield} title="No eradication actions" description="Eradication actions will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Type", "Target", "Tool Used", "Verified Clean", "Verification Method", "Residual Risk", "Executed By", "Verified At", "Status"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => {
                  const typeColor = ACTION_TYPE_COLORS[action.action_type] || ACTION_TYPE_COLORS.other;
                  return (
                    <tr key={action.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5">
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${typeColor}15`, color: typeColor }}>{action.action_type?.replace(/_/g, " ") || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs truncate">{action.target}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.tool_used || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        {action.verified_clean ? (
                          <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                        ) : (
                          <span className="text-[10px]" style={{ color: MUTED }}>No</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.verification_method || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: action.residual_risk_level === "critical" ? DANGER : action.residual_risk_level === "high" ? HIGH : MUTED }}>{action.residual_risk || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{action.executed_by_name || action.executed_by || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: MUTED }}>{timeAgo(action.verified_at)}</p>
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
    </div>
  );
}

const STATUS_COLORS = { planned: MUTED, in_progress: HIGH, completed: LOW, failed: DANGER };