import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, TrendingUp, Flame, AlertTriangle, CheckCircle, Database, Users, Bot, Cpu } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

export default function GDSEntitlementsPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["rbac-metrics"],
    queryFn: () => base44.functions.invoke("gdsRBACEngine", { action: "metrics" }).then(r => r.data),
  });

  const { data: entitlements } = useQuery({
    queryKey: ["rbac-entitlements"],
    queryFn: () => base44.entities.EntitlementRecord.filter({}, '-calculated_at', 20).catch(() => []),
  });

  const { data: conflicts } = useQuery({
    queryKey: ["rbac-conflicts"],
    queryFn: () => base44.entities.PrivilegeConflict.filter({ status: 'active' }).catch(() => []),
  });

  const { data: agentRoles } = useQuery({
    queryKey: ["rbac-agent-roles"],
    queryFn: () => base44.entities.AgentRole.filter({ status: 'active' }).catch(() => []),
  });

  const { data: serviceRoles } = useQuery({
    queryKey: ["rbac-service-roles"],
    queryFn: () => base44.entities.ServiceRole.filter({ status: 'active' }).catch(() => []),
  });

  const m = metrics || {};

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Entitlement Intelligence" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Database className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Entitlement Analytics & Privilege Intelligence</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Effective access, SOD detection, privilege drift</p>
          </div>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Entitlements</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{entitlements?.length ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Excessive</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{entitlements?.filter(e => e.is_excessive).length ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>With Conflicts</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{conflicts?.length ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>ABAC Rules Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{m.roles?.total ?? 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>SOD Violations</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{conflicts?.filter(c => c.conflict_type === 'sod_violation').length ?? 0}</p>
        </Card>
      </div>

      {/* Entitlement Records */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Entitlement Records</h3>
        {isLoading ? <Skeleton lines={6} /> : entitlements?.length === 0 ? (
          <EmptyState icon={Database} title="No entitlements" description="Entitlement records will appear here" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entitlements?.map(ent => (
              <Card key={ent.entitlement_id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono font-bold text-white">{ent.subject_id}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{ent.subject_type}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ent.status === 'current' ? 'bg-green-400/15 text-green-400' : 'bg-red-400/15 text-red-400'}`}>
                    {ent.status}
                  </span>
                </div>
                <div className="space-y-2 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Total Permissions</span>
                    <span className="font-bold" style={{ color: TEXT }}>{ent.total_permissions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>High Risk</span>
                    <span className="font-bold" style={{ color: HIGH }}>{ent.high_risk_permissions?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Critical</span>
                    <span className="font-bold" style={{ color: DANGER }}>{ent.critical_permissions?.length || 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ent.is_excessive && <Flame className="w-3.5 h-3.5" style={{ color: HIGH }} />}
                  {ent.has_conflicts && <AlertTriangle className="w-3.5 h-3.5" style={{ color: DANGER }} />}
                  {ent.drift_detected && <TrendingUp className="w-3.5 h-3.5" style={{ color: CYAN }} />}
                  {ent.dormant_days > 30 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{ent.dormant_days}d dormant</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Privilege Conflicts */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Privilege Conflicts</h3>
        {conflicts?.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No conflicts" description="No privilege conflicts detected" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Subject", "Type", "Severity", "Description", "Auto-Remediable", "Detected", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conflicts?.map(conflict => (
                  <tr key={conflict.conflict_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{conflict.subject_id}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{conflict.conflict_type?.replace(/_/g, ' ')}</span></td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${conflict.severity === 'critical' ? 'bg-red-400/15 text-red-400' : conflict.severity === 'high' ? 'bg-orange-400/15 text-orange-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{conflict.severity}</span></td>
                    <td className="py-2 px-3 text-[10px] max-w-[200px] truncate" style={{ color: TEXT }}>{conflict.description}</td>
                    <td className="py-2 px-3">{conflict.auto_remediable ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(conflict.detected_at)}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${conflict.status === 'active' ? 'bg-red-400/15 text-red-400' : conflict.status === 'resolved' ? 'bg-green-400/15 text-green-400' : 'bg-gray-400/15 text-gray-400'}`}>{conflict.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Agent Roles */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Agent Role Assignments</h3>
        {agentRoles?.length === 0 ? (
          <EmptyState icon={Bot} title="No agent roles" description="Agent role assignments will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Agent", "Role", "Max Risk", "Approval Above", "Tools", "Workflows", "Expires", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentRoles?.map(ar => (
                  <tr key={ar.assignment_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-bold" style={{ color: TEXT }}>{ar.agent_name}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{ar.role_id}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ar.max_risk_level === 'critical' ? 'bg-red-400/15 text-red-400' : ar.max_risk_level === 'high' ? 'bg-orange-400/15 text-orange-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{ar.max_risk_level}</span></td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{ar.requires_approval_above}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{ar.allowed_tools?.length || 0}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{ar.allowed_workflows?.length || 0}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{ar.expires_at ? timeAgo(ar.expires_at) : 'Never'}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ar.status === 'active' ? 'bg-green-400/15 text-green-400' : ar.status === 'expired' ? 'bg-red-400/15 text-red-400' : 'bg-gray-400/15 text-gray-400'}`}>{ar.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}