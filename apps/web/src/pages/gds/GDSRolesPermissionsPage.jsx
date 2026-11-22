import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Key, Layers, Plus, User, CheckCircle, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { toast } from "sonner";

export default function GDSRolesPermissionsPage() {
  const [activeTab, setActiveTab] = useState("roles");
  const [showModal, setShowModal] = useState(null);

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["rbac-roles"],
    queryFn: () => base44.entities.Role.list().catch(() => []),
  });

  const { data: permissions } = useQuery({
    queryKey: ["rbac-permissions"],
    queryFn: () => base44.entities.Permission.list().catch(() => []),
  });

  const { data: bundles } = useQuery({
    queryKey: ["rbac-bundles"],
    queryFn: () => base44.entities.PermissionBundle.list().catch(() => []),
  });

  const { data: abacRules } = useQuery({
    queryKey: ["rbac-abac-rules"],
    queryFn: () => base44.entities.AttributeRule.filter({ status: 'active' }).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Role & Permission Manager" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Key className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Roles, Permissions & Bundles</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>RBAC definitions and ABAC policy rules</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>{roles?.length || 0} Roles</span>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}30`, color: HIGH }}>{permissions?.length || 0} Permissions</span>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${MEDIUM}15`, border: `1px solid ${MEDIUM}30`, color: MEDIUM }}>{abacRules?.length || 0} ABAC Rules</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["roles", "permissions", "bundles", "abac"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'ring-2' : ''}`}
              style={{ 
                background: activeTab === tab ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                color: activeTab === tab ? CYAN : MUTED
              }}>
              {tab === 'abac' ? 'ABAC Rules' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rolesLoading ? <Skeleton lines={6} /> : roles?.map(role => (
            <Card key={role.role_id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-mono font-bold text-white">{role.name}</h3>
                  <p className="text-[10px]" style={{ color: MUTED }}>{role.display_name}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${role.is_system_role ? 'bg-cyan-400/15 text-cyan-400' : 'bg-purple-400/15 text-purple-400'}`}>
                  {role.is_system_role ? 'SYSTEM' : 'CUSTOM'}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Type</span>
                  <span className="font-bold" style={{ color: TEXT }}>{role.role_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Permissions</span>
                  <span className="font-bold" style={{ color: CYAN }}>{role.permission_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Requires MFA</span>
                  <span className={`font-bold ${role.requires_mfa ? 'text-green-400' : 'text-red-400'}`}>{role.requires_mfa ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'permissions' && (
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Resource", "Action", "Risk Level", "Requires MFA"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions?.map(perm => (
                  <tr key={perm.permission_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{perm.name}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{perm.resource}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15` }}>{perm.action}</span></td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${perm.risk_level === 'critical' ? 'bg-red-400/15 text-red-400' : perm.risk_level === 'high' ? 'bg-orange-400/15 text-orange-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{perm.risk_level}</span></td>
                    <td className="py-2 px-3">{perm.requires_mfa ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'bundles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bundles?.map(bundle => (
            <Card key={bundle.bundle_id} className="p-4">
              <h3 className="text-sm font-bold text-white mb-2">{bundle.name}</h3>
              <p className="text-[10px] mb-3" style={{ color: MUTED }}>{bundle.display_name}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: TEXT }}>{bundle.permission_count} permissions</span>
                <span className={`px-2 py-1 rounded font-bold ${bundle.status === 'active' ? 'bg-green-400/15 text-green-400' : 'bg-gray-400/15 text-gray-400'}`}>{bundle.status}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'abac' && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">ABAC Rules</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Type", "Resource Type", "Effect", "Priority", "Conditions", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {abacRules?.map(rule => (
                  <tr key={rule.rule_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-bold" style={{ color: TEXT }}>{rule.name}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{rule.rule_type}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rule.applies_to_resource_type || '*'}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${rule.effect === 'allow' ? 'bg-green-400/15 text-green-400' : rule.effect === 'deny' ? 'bg-red-400/15 text-red-400' : 'bg-yellow-400/15 text-yellow-400'}`}>{rule.effect}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rule.priority}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rule.conditions_count}</td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${rule.status === 'active' ? 'bg-green-400/15 text-green-400' : 'bg-gray-400/15 text-gray-400'}`}>{rule.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}