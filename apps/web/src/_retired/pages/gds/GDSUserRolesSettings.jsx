import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Shield, Plus, Edit, Trash2, CheckCircle, XCircle, Key, Lock, Eye, Zap, FileText, Settings } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState } from "@/components/gds/GDSOSShared";

const PERMISSION_LABELS = {
  tool_execution: "Execute Tools",
  tool_execution_manual: "Manual Tool Execution",
  approval_high_risk: "Approve High-Risk Changes",
  approval_critical: "Approve Critical Changes",
  workflow_create: "Create Workflows",
  workflow_execute: "Execute Workflows",
  escalation_override: "Override Escalations",
  view_audit_logs: "View Audit Logs",
  manage_users: "Manage Users",
  manage_escalation_rules: "Manage Escalation Rules"
};

const DEFAULT_ROLES = [
  { role_id: "admin", role_name: "Administrator", is_system_role: true },
  { role_id: "security_engineer", role_name: "Security Engineer", is_system_role: true },
  { role_id: "analyst", role_name: "Security Analyst", is_system_role: true },
  { role_id: "viewer", role_name: "Viewer", is_system_role: true }
];

export default function GDSUserRolesSettings() {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRole, setNewRole] = useState({ role_name: "", description: "" });

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles"],
    queryFn: () => base44.entities.UserRole.list().catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: async (roleData) => {
      return await base44.entities.UserRole.create(roleData);
    },
    onSuccess: () => {
      qc.invalidateQueries(["user-roles"]);
      setShowCreateModal(false);
      setNewRole({ role_name: "", description: "" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      return await base44.entities.UserRole.update(id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries(["user-roles"]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.UserRole.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries(["user-roles"]);
      setSelectedRole(null);
    }
  });

  const allRoles = [...DEFAULT_ROLES, ...(roles || [])].filter((r, i, arr) => 
    arr.findIndex(x => x.role_id === r.role_id) === i
  );

  const handlePermissionToggle = (roleId, permission) => {
    const role = allRoles.find(r => r.id === roleId || r.role_id === roleId);
    if (!role) return;
    
    const currentPerms = role.permissions || {};
    updateMutation.mutate({
      id: role.id,
      updates: {
        permissions: {
          ...currentPerms,
          [permission]: !currentPerms[permission]
        }
      }
    });
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">User Roles & Permissions</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Define granular access control for security operations</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <Card className="p-5 lg:col-span-1">
          <h3 className="text-sm font-bold text-white mb-4">Defined Roles</h3>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
              ))}
            </div>
          ) : allRoles.length === 0 ? (
            <EmptyState icon={Users} title="No roles" description="Create your first role" />
          ) : (
            <div className="space-y-2">
              {allRoles.map(role => (
                <button
                  key={role.id || role.role_id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full p-3 rounded-lg text-left transition-all border ${selectedRole?.role_id === role.role_id ? "bg-cyan-500/10 border-cyan-400/40" : "bg-white/0 border-transparent hover:bg-white/5"}`}
                  style={{ border: selectedRole?.role_id === role.role_id ? `1px solid ${CYAN}40` : `1px solid ${BORDER}` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{role.role_name}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{role.role_id}</p>
                    </div>
                    {role.is_system_role && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>System</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Permissions Editor */}
        <Card className="p-5 lg:col-span-2">
          {selectedRole ? (
            <>
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedRole.role_name}</h3>
                  <p className="text-[10px]" style={{ color: MUTED }}>{selectedRole.description || "No description"}</p>
                </div>
                {!selectedRole.is_system_role && (
                  <button
                    onClick={() => deleteMutation.mutate(selectedRole.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-all"
                    style={{ color: DANGER }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <h4 className="text-xs font-bold mb-3" style={{ color: MUTED }}>Permissions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                  const hasPermission = selectedRole.permissions?.[key] || false;
                  return (
                    <button
                      key={key}
                      onClick={() => !selectedRole.is_system_role && handlePermissionToggle(selectedRole.role_id, key)}
                      disabled={selectedRole.is_system_role}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all border ${hasPermission ? "bg-green-500/10 border-green-400/40" : "bg-white/5 border-transparent"} ${selectedRole.is_system_role ? "opacity-50 cursor-not-allowed" : "hover:bg-white/10"}`}
                      style={{ border: hasPermission ? `1px solid ${LOW}40` : `1px solid ${BORDER}` }}
                    >
                      <div className="flex items-center gap-3">
                        {key.includes("approval") ? (
                          <Shield className="w-4 h-4" style={{ color: hasPermission ? LOW : MUTED }} />
                        ) : key.includes("tool") ? (
                          <Zap className="w-4 h-4" style={{ color: hasPermission ? CYAN : MUTED }} />
                        ) : key.includes("audit") ? (
                          <Eye className="w-4 h-4" style={{ color: hasPermission ? "#8b5cf6" : MUTED }} />
                        ) : key.includes("manage") ? (
                          <Settings className="w-4 h-4" style={{ color: hasPermission ? HIGH : MUTED }} />
                        ) : (
                          <Key className="w-4 h-4" style={{ color: hasPermission ? CYAN : MUTED }} />
                        )}
                        <span className="text-xs font-bold" style={{ color: hasPermission ? TEXT : MUTED }}>{label}</span>
                      </div>
                      {hasPermission ? (
                        <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
                      ) : (
                        <XCircle className="w-4 h-4" style={{ color: MUTED }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState icon={Users} title="Select a role" description="Choose a role to view and edit permissions" />
          )}
        </Card>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Create New Role</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Define a custom role with specific permissions</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Role Name</label>
                <input
                  value={newRole.role_name}
                  onChange={e => setNewRole({ ...newRole, role_name: e.target.value })}
                  placeholder="e.g., Senior Security Engineer"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Description</label>
                <textarea
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  rows={3}
                  placeholder="Describe this role's responsibilities..."
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>
              <button
                onClick={() => {
                  createMutation.mutate({
                    role_id: `custom_role_${Date.now()}`,
                    role_name: newRole.role_name,
                    description: newRole.description,
                    permissions: {},
                    is_system_role: false,
                    assigned_users: []
                  });
                }}
                disabled={createMutation.isPending || !newRole.role_name}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
              >
                {createMutation.isPending ? "Creating..." : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}