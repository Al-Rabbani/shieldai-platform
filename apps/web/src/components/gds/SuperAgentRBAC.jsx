import React, { useState } from "react";
import { Shield, Plus, X, Check, Edit2, Trash2, User, Lock, Eye, Settings, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState } from "@/components/gds/GDSOSShared";

// Permission definitions
const PERMISSIONS = {
  registry: {
    label: "Agent Registry",
    icon: Settings,
    perms: [
      { id: "registry.view",    label: "View agents",           desc: "See agent list and details" },
      { id: "registry.create",  label: "Create agents",         desc: "Add new super agents" },
      { id: "registry.modify",  label: "Modify agents",         desc: "Edit config, class, priority" },
      { id: "registry.delete",  label: "Delete agents",         desc: "Remove agents permanently" },
      { id: "registry.bulk",    label: "Bulk actions",          desc: "Start/stop/reconfigure many at once" },
    ],
  },
  workspace: {
    label: "Workspace",
    icon: User,
    perms: [
      { id: "workspace.view",         label: "View collaborations", desc: "See active collaborations" },
      { id: "workspace.create_collab",label: "Start collaborations",desc: "Initiate new multi-agent missions" },
      { id: "workspace.view_budget",  label: "View budget",         desc: "See cost and resource alerts" },
      { id: "workspace.edit_budget",  label: "Edit budget alerts",  desc: "Set thresholds and limits" },
    ],
  },
  governance: {
    label: "Governance",
    icon: Lock,
    perms: [
      { id: "governance.view",   label: "View policies",    desc: "Read governance policies" },
      { id: "governance.edit",   label: "Edit policies",    desc: "Modify or create policies" },
      { id: "governance.audit",  label: "View audit log",   desc: "Access full audit trail" },
      { id: "governance.rbac",   label: "Manage RBAC",      desc: "Edit roles and permissions" },
    ],
  },
  telemetry: {
    label: "Telemetry & Health",
    icon: Eye,
    perms: [
      { id: "telemetry.view",    label: "View telemetry",   desc: "See performance and health data" },
      { id: "telemetry.export",  label: "Export data",      desc: "Download reports and exports" },
    ],
  },
};

const ALL_PERM_IDS = Object.values(PERMISSIONS).flatMap(g => g.perms.map(p => p.id));

// Preset role templates
const ROLE_PRESETS = {
  Admin: ALL_PERM_IDS,
  Analyst: [
    "registry.view", "workspace.view", "workspace.create_collab",
    "workspace.view_budget", "governance.view", "governance.audit",
    "telemetry.view", "telemetry.export",
  ],
  Viewer: ["registry.view", "workspace.view", "workspace.view_budget", "governance.view", "telemetry.view"],
  DevSecOps: [
    "registry.view", "registry.create", "registry.modify", "registry.bulk",
    "workspace.view", "workspace.create_collab", "telemetry.view", "telemetry.export",
  ],
};

const ROLE_COLOR = {
  Admin: DANGER,
  Analyst: CYAN,
  Viewer: MUTED,
  DevSecOps: "#a855f7",
  Custom: HIGH,
};

const LS_KEY = "gds_super_agent_rbac";
function loadRoles() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
function saveRoles(roles) {
  localStorage.setItem(LS_KEY, JSON.stringify(roles));
}

const DEFAULT_ROLES = Object.entries(ROLE_PRESETS).map(([name, perms]) => ({
  id: name.toLowerCase(),
  name,
  description: name === "Admin" ? "Full access to all features"
    : name === "Analyst" ? "Investigate and collaborate, read-only governance"
    : name === "Viewer" ? "Read-only access across all sections"
    : "Create and manage agents, full telemetry",
  permissions: perms,
  isPreset: true,
  memberCount: 0,
}));

function PermToggle({ permId, checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(permId)}
      disabled={disabled}
      className="w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0"
      style={{
        background: checked ? `${CYAN}20` : "rgba(255,255,255,0.04)",
        border: `1px solid ${checked ? CYAN + "50" : BORDER}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}>
      {checked && <Check className="w-3 h-3" style={{ color: CYAN }} />}
    </button>
  );
}

function RoleEditor({ role, onSave, onCancel }) {
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [perms, setPerms] = useState(new Set(role?.permissions || []));

  const toggle = (id) => setPerms(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleGroup = (groupPerms) => {
    const ids = groupPerms.map(p => p.id);
    const allOn = ids.every(id => perms.has(id));
    setPerms(prev => {
      const next = new Set(prev);
      if (allOn) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none"
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Role Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., SecurityEngineer" style={inputStyle} />
        </div>
        <div>
          <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Description</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description…" style={inputStyle} />
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(PERMISSIONS).map(([groupKey, group]) => {
          const Icon = group.icon;
          const groupIds = group.perms.map(p => p.id);
          const allOn = groupIds.every(id => perms.has(id));
          const someOn = groupIds.some(id => perms.has(id));
          return (
            <div key={groupKey} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
              {/* Group header */}
              <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02]"
                onClick={() => toggleGroup(group.perms)}
                style={{ background: "rgba(0,212,255,0.03)" }}>
                <PermToggle permId={groupKey} checked={allOn} onChange={() => toggleGroup(group.perms)} />
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: someOn ? CYAN : MUTED }} />
                <span className="text-xs font-bold" style={{ color: someOn ? CYAN : MUTED }}>{group.label}</span>
                {someOn && !allOn && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: HIGH, background: `${HIGH}15` }}>Partial</span>}
              </div>
              {/* Perms */}
              <div className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {group.perms.map(perm => (
                  <div key={perm.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.01] transition-all">
                    <PermToggle permId={perm.id} checked={perms.has(perm.id)} onChange={toggle} />
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-white">{perm.label}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{perm.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
        <button onClick={() => onSave({ name: name.trim(), description: description.trim(), permissions: [...perms] })}
          disabled={!name.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          Save Role
        </button>
      </div>
    </div>
  );
}

function RoleCard({ role, onEdit, onDelete, onDuplicate }) {
  const color = ROLE_COLOR[role.name] || HIGH;
  const pct = Math.round((role.permissions.length / ALL_PERM_IDS.length) * 100);

  return (
    <Card className="p-5" glow>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white">{role.name}</span>
            {role.isPreset && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: MUTED, background: "rgba(255,255,255,0.06)" }}>Preset</span>
            )}
          </div>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: MUTED }}>{role.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => onDuplicate(role)}
            title="Duplicate" className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: MUTED }}>
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEdit(role)}
            title="Edit" className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: CYAN }}>
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {!role.isPreset && (
            <button onClick={() => onDelete(role.id)}
              title="Delete" className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: DANGER }}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Permission coverage */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: MUTED }}>Permission coverage</span>
          <span className="text-[10px] font-bold font-mono" style={{ color }}>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}55` }} />
        </div>
      </div>

      {/* Permission chips grouped */}
      <div className="space-y-1.5">
        {Object.entries(PERMISSIONS).map(([key, group]) => {
          const active = group.perms.filter(p => role.permissions.includes(p.id));
          if (active.length === 0) return null;
          return (
            <div key={key} className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-wide w-20 flex-shrink-0" style={{ color: MUTED }}>{group.label}</span>
              {active.map(p => (
                <span key={p.id} className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}>
                  {p.label}
                </span>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
        <span className="text-[10px]" style={{ color: MUTED }}>{role.permissions.length} / {ALL_PERM_IDS.length} permissions</span>
        {role.memberCount > 0 && (
          <span className="text-[10px] font-bold" style={{ color: CYAN }}>{role.memberCount} member{role.memberCount > 1 ? "s" : ""}</span>
        )}
      </div>
    </Card>
  );
}

export default function SuperAgentRBAC() {
  const [roles, setRoles] = useState(() => loadRoles() || DEFAULT_ROLES);
  const [editing, setEditing] = useState(null);  // null | "new" | role object
  const [saved, setSaved] = useState(false);

  const persist = (updated) => {
    setRoles(updated);
    saveRoles(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = ({ name, description, permissions }) => {
    if (editing === "new") {
      const newRole = {
        id: `custom_${Date.now()}`,
        name, description, permissions, isPreset: false, memberCount: 0,
      };
      persist([...roles, newRole]);
    } else {
      persist(roles.map(r => r.id === editing.id ? { ...r, name, description, permissions } : r));
    }
    setEditing(null);
  };

  const handleDelete = (id) => {
    persist(roles.filter(r => r.id !== id));
  };

  const handleDuplicate = (role) => {
    const copy = {
      ...role,
      id: `custom_${Date.now()}`,
      name: `${role.name} (Copy)`,
      isPreset: false,
      memberCount: 0,
    };
    persist([...roles, copy]);
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Role-Based Access Control</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            {roles.length} roles
          </span>
          {saved && (
            <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: LOW }}>
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-3.5 h-3.5" /> New Role
        </button>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${CYAN}20` }}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
        <p className="text-[11px]" style={{ color: MUTED }}>
          Define what each role can view or modify across the Super Agent registry, workspace, governance, and telemetry.
          Preset roles are templates — duplicate them to create customized variants.
        </p>
      </div>

      {/* Editor panel */}
      {editing && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Edit2 className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">
              {editing === "new" ? "Create New Role" : `Editing: ${editing.name}`}
            </h3>
          </div>
          <RoleEditor
            role={editing === "new" ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        </Card>
      )}

      {/* Role cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map(role => (
          <RoleCard
            key={role.id}
            role={role}
            onEdit={setEditing}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>
    </div>
  );
}