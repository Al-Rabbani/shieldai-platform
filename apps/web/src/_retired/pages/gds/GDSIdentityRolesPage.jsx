import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Key, Plus, Edit, Lock, CheckCircle, XCircle, Users, FileText } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const ROLE_TYPE_COLORS = { system: "#a855f7", custom: "#3b82f6", service: MUTED, emergency: DANGER, org: "#14b8a6" };
const RISK_LEVEL_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GDSIdentityRolesPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("roles");
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showCreatePermModal, setShowCreatePermModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [newRole, setNewRole] = useState({ name: '', display_name: '', description: '', role_type: 'custom', scope: 'global', requires_mfa: false, requires_approval: false, max_session_hours: 8, permissions: '' });
  const [newPerm, setNewPerm] = useState({ name: '', resource: '', perm_action: 'read', scope: 'global', service: '', risk_level: 'medium', requires_mfa: false });

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["identity-roles"],
    queryFn: () => base44.entities.Role.list().catch(() => []),
  });

  const { data: permissions, isLoading: permLoading } = useQuery({
    queryKey: ["identity-permissions"],
    queryFn: () => base44.entities.Permission.list().catch(() => []),
  });

  const { data: rolePermissions } = useQuery({
    queryKey: ["identity-role-permissions"],
    queryFn: () => base44.entities.RolePermission.list().catch(() => []),
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsIdentityPlatform", { action: "create_role", ...data }),
    onSuccess: () => { qc.invalidateQueries(["identity-roles"]); setShowCreateRoleModal(false); setNewRole({ name: '', display_name: '', description: '', role_type: 'custom', scope: 'global', requires_mfa: false, requires_approval: false, max_session_hours: 8, permissions: '' }); }
  });

  const createPermMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsIdentityPlatform", { action: "create_permission", ...data }),
    onSuccess: () => { qc.invalidateQueries(["identity-permissions"]); setShowCreatePermModal(false); setNewPerm({ name: '', resource: '', perm_action: 'read', scope: 'global', service: '', risk_level: 'medium', requires_mfa: false }); }
  });

  const roleCount = roles?.length || 0;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Role & Permission Management" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Role & Permission Management</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>RBAC configuration and access control</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: TEXT, background: "rgba(255,255,255,0.08)", border: `1px solid ${BORDER}` }}>{roleCount} roles</span>
        </div>
        <button onClick={() => activeTab === "roles" ? setShowCreateRoleModal(true) : setShowCreatePermModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" /> {activeTab === "roles" ? "Create Role" : "Create Permission"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: BORDER }}>
        <button onClick={() => setActiveTab("roles")} className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px" style={{ color: activeTab === "roles" ? CYAN : MUTED, borderBottomColor: activeTab === "roles" ? CYAN : "transparent", background: activeTab === "roles" ? `${CYAN}06` : "transparent" }}>
          <Shield className="w-3.5 h-3.5" /> Roles
        </button>
        <button onClick={() => setActiveTab("permissions")} className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px" style={{ color: activeTab === "permissions" ? CYAN : MUTED, borderBottomColor: activeTab === "permissions" ? CYAN : "transparent", background: activeTab === "permissions" ? `${CYAN}06` : "transparent" }}>
          <Key className="w-3.5 h-3.5" /> Permissions
        </button>
      </div>

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <>
          {rolesLoading ? <Skeleton lines={6} /> : roles?.length === 0 ? (
            <EmptyState icon={Shield} title="No roles" description="Create your first role" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role, i) => {
                const typeColor = ROLE_TYPE_COLORS[role.role_type] || MUTED;
                const permCount = rolePermissions?.filter(rp => rp.role_id === role.role_id).length || 0;
                return (
                  <Card key={role.role_id || i} className="p-5" glow>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-mono font-bold" style={{ color: CYAN }}>{role.name}</p>
                        <p className="text-sm font-black text-white mt-0.5">{role.display_name}</p>
                      </div>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30` }}>{role.role_type || 'custom'}</span>
                    </div>
                    <p className="text-[10px] mb-3" style={{ color: MUTED }}>{role.description || 'No description'}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div><span style={{ color: MUTED }}>Scope:</span> <span style={{ color: TEXT }}>{role.scope || 'global'}</span></div>
                      <div><span style={{ color: MUTED }}>Permissions:</span> <span style={{ color: CYAN }}>{permCount}</span></div>
                      <div><span style={{ color: MUTED }}>MFA Required:</span> {role.requires_mfa ? <CheckCircle className="w-3 h-3 inline" style={{ color: LOW }} /> : <XCircle className="w-3 h-3 inline" style={{ color: DANGER }} />}</div>
                      <div><span style={{ color: MUTED }}>Approval:</span> {role.requires_approval ? <Lock className="w-3 h-3 inline" style={{ color: HIGH }} /> : <span style={{ color: MUTED }}>No</span>}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: role.is_system_role ? HIGH : MUTED, background: "rgba(255,255,255,0.04)" }}>{role.is_system_role ? 'SYSTEM' : 'CUSTOM'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: role.status === 'active' ? LOW : MUTED, background: "rgba(255,255,255,0.04)" }}>{role.status || 'active'}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* System Roles Panel */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">System Roles</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Built-in GDS OS roles with predefined permissions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Role", "Display Name", "Type", "Key Permissions"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'gds_admin', display: 'GDS Administrator', type: 'system', perms: ['*'] },
                    { name: 'gds_analyst', display: 'Security Analyst', type: 'system', perms: ['read:*', 'execute:scanner', 'approve:medium'] },
                    { name: 'gds_viewer', display: 'Viewer', type: 'system', perms: ['read:findings', 'read:reports'] },
                    { name: 'gds_approver', display: 'Approval Manager', type: 'system', perms: ['read:*', 'approve:high', 'approve:critical'] },
                    { name: 'gds_operator', display: 'Platform Operator', type: 'system', perms: ['read:*', 'execute:*', 'manage:agents'] },
                    { name: 'gds_auditor', display: 'Compliance Auditor', type: 'system', perms: ['read:*', 'read:audit_logs', 'export:*'] },
                    { name: 'gds_manager', display: 'Security Manager', type: 'system', perms: ['read:*', 'approve:*', 'manage:workflows'] },
                  ].map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3"><span className="text-[10px] font-mono font-bold" style={{ color: CYAN }}>{r.name}</span></td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{r.display}</td>
                      <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: "#a855f7", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>{r.type}</span></td>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{r.perms.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <>
          {permLoading ? <Skeleton lines={6} /> : permissions?.length === 0 ? (
            <EmptyState icon={Key} title="No permissions" description="Create your first permission" />
          ) : (
            <Card className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Name", "Resource", "Action", "Scope", "Service", "Risk Level", "MFA Required", "System", "Status"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((p, i) => {
                      const riskColor = RISK_LEVEL_COLORS[p.risk_level] || MUTED;
                      return (
                        <tr key={p.permission_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                          <td className="py-2 px-3"><span className="text-[10px] font-mono font-bold" style={{ color: TEXT }}>{p.name}</span></td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: CYAN }}>{p.resource}</td>
                          <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: TEXT, background: "rgba(255,255,255,0.04)" }}>{p.action}</span></td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{p.scope || 'global'}</td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{p.service || '—'}</td>
                          <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: riskColor, background: `${riskColor}15`, border: `1px solid ${riskColor}30` }}>{p.risk_level || 'medium'}</span></td>
                          <td className="py-2 px-3">{p.requires_mfa ? <CheckCircle className="w-3 h-3" style={{ color: LOW }} /> : <span style={{ color: MUTED }}>No</span>}</td>
                          <td className="py-2 px-3">{p.is_system_permission ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: HIGH, background: "rgba(255,140,0,0.15)" }}>SYSTEM</span> : <span style={{ color: MUTED }}>Custom</span>}</td>
                          <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: p.status === 'active' ? LOW : MUTED, background: "rgba(255,255,255,0.04)" }}>{p.status || 'active'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Create Role Modal */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Create Role</h2>
              <button onClick={() => setShowCreateRoleModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}><XCircle className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} placeholder="Role Name (e.g., security_analyst)" className="px-3 py-2 rounded-lg text-sm outline-none font-mono" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newRole.display_name} onChange={e => setNewRole({ ...newRole, display_name: e.target.value })} placeholder="Display Name" className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} placeholder="Description" className="px-3 py-2 rounded-lg text-sm outline-none col-span-2" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <select value={newRole.role_type} onChange={e => setNewRole({ ...newRole, role_type: e.target.value })} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                {['system', 'custom', 'service', 'emergency', 'org'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={newRole.scope} onChange={e => setNewRole({ ...newRole, scope: e.target.value })} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                {['global', 'org', 'tenant', 'dept'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={newRole.requires_mfa} onChange={e => setNewRole({ ...newRole, requires_mfa: e.target.checked })} id="role-mfa" />
                <label htmlFor="role-mfa" className="text-sm" style={{ color: TEXT }}>Requires MFA</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={newRole.requires_approval} onChange={e => setNewRole({ ...newRole, requires_approval: e.target.checked })} id="role-approval" />
                <label htmlFor="role-approval" className="text-sm" style={{ color: TEXT }}>Requires Approval</label>
              </div>
              <input type="number" value={newRole.max_session_hours} onChange={e => setNewRole({ ...newRole, max_session_hours: parseInt(e.target.value) })} placeholder="Max Session Hours" className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              <input value={newRole.permissions} onChange={e => setNewRole({ ...newRole, permissions: e.target.value })} placeholder="Permissions (comma-separated)" className="px-3 py-2 rounded-lg text-sm outline-none col-span-2" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
            </div>
            <button onClick={() => createRoleMutation.mutate(newRole)} disabled={createRoleMutation.isPending} className="w-full py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {createRoleMutation.isPending ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}