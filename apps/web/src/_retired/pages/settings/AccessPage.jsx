import React, { useState } from "react";
import { Shield, Plus, X, Check, Key, Users, Lock, Settings, Copy, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const ROLES = [
  { value: "admin", label: "Admin", color: GOLD, bg: "rgba(201,168,76,0.15)", border: "rgba(201,168,76,0.3)" },
  { value: "analyst", label: "Security Analyst", color: "#3b82f6", bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)" },
  { value: "viewer", label: "Viewer", color: "#9CA3AF", bg: "rgba(156,163,175,0.15)", border: "rgba(156,163,175,0.2)" },
  { value: "mssp", label: "MSSP Manager", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.3)" },
  { value: "auditor", label: "Auditor", color: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.3)" },
];

const PERMISSIONS = [
  { key: "view_findings", label: "View Findings" },
  { key: "resolve_findings", label: "Resolve Findings" },
  { key: "run_scans", label: "Run Scans" },
  { key: "manage_integrations", label: "Manage Integrations" },
  { key: "export_reports", label: "Export Reports" },
  { key: "manage_users", label: "Manage Users" },
  { key: "view_audit_log", label: "View Audit Log" },
];

const ROLE_PERMISSIONS = {
  admin: { view_findings: true, resolve_findings: true, run_scans: true, manage_integrations: true, export_reports: true, manage_users: true, view_audit_log: true },
  analyst: { view_findings: true, resolve_findings: true, run_scans: true, manage_integrations: false, export_reports: true, manage_users: false, view_audit_log: true },
  viewer: { view_findings: true, resolve_findings: false, run_scans: false, manage_integrations: false, export_reports: false, manage_users: false, view_audit_log: false },
  mssp: { view_findings: true, resolve_findings: true, run_scans: true, manage_integrations: true, export_reports: true, manage_users: true, view_audit_log: true },
  auditor: { view_findings: true, resolve_findings: false, run_scans: false, manage_integrations: false, export_reports: true, manage_users: false, view_audit_log: true },
};

const SAMPLE_USERS = [
  { id: 1, name: "Sarah Al-Rabbani", email: "sarah@al-rabbani.io", role: "admin", lastLogin: "2 min ago", status: "active", avatar: "S" },
  { id: 2, name: "Marcus Chen", email: "m.chen@al-rabbani.io", role: "analyst", lastLogin: "1h ago", status: "active", avatar: "M" },
  { id: 3, name: "Priya Patel", email: "p.patel@al-rabbani.io", role: "viewer", lastLogin: "3d ago", status: "active", avatar: "P" },
  { id: 4, name: "James Wilson", email: "j.wilson@al-rabbani.io", role: "auditor", lastLogin: "1w ago", status: "active", avatar: "J" },
  { id: 5, name: "Elena Kovacs", email: "e.kovacs@al-rabbani.io", role: "analyst", lastLogin: "12h ago", status: "suspended", avatar: "E" },
];

const SAMPLE_API_KEYS = [
  { id: 1, name: "CI/CD Pipeline", key: "sk-shield-****a8f3", created: "2026-01-10", lastUsed: "2 min ago", permissions: "Read+Write", active: true },
  { id: 2, name: "Monitoring Dashboard", key: "sk-shield-****c2d9", created: "2026-03-22", lastUsed: "1h ago", permissions: "Read Only", active: true },
  { id: 3, name: "Legacy Integration", key: "sk-shield-****9b12", created: "2025-11-05", lastUsed: "45d ago", permissions: "Read Only", active: false },
];

const SSO_PROVIDERS = [
  { value: "okta", label: "Okta" },
  { value: "azure", label: "Azure AD" },
  { value: "google", label: "Google Workspace" },
  { value: "onelogin", label: "OneLogin" },
  { value: "saml", label: "Custom SAML" },
];

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role) || ROLES[2];
  return <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold" style={{ color: r.color, background: r.bg, borderColor: r.border }}>{r.label}</span>;
}

export default function AccessPage() {
  const [tab, setTab] = useState("users");
  const [showInvite, setShowInvite] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoProvider, setSsoProvider] = useState("");
  const [enforceSso, setEnforceSso] = useState(false);
  const [mfaEnforced, setMfaEnforced] = useState(true);
  const [permExpanded, setPermExpanded] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyPerm, setKeyPerm] = useState("Read Only");
  const [users, setUsers] = useState(SAMPLE_USERS);
  const [keys, setKeys] = useState(SAMPLE_API_KEYS);
  const [ssoConfig, setSsoConfig] = useState({ entityId: "", ssoUrl: "", cert: "", emailAttr: "email", nameAttr: "displayName", roleAttr: "role" });

  const handleInvite = () => {
    if (!inviteEmail) return toast.error("Enter an email address");
    toast.success(`Invite sent to ${inviteEmail}`);
    setInviteEmail(""); setShowInvite(false);
  };

  const handleGenerateKey = () => {
    if (!keyName) return toast.error("Enter a key name");
    const generated = `sk-shield-live-${Math.random().toString(36).slice(2, 18)}`;
    const newK = { id: Date.now(), name: keyName, key: `sk-shield-****${generated.slice(-4)}`, created: new Date().toISOString().slice(0, 10), lastUsed: "Never", permissions: keyPerm, active: true, fullKey: generated };
    setKeys(prev => [newK, ...prev]);
    setNewKey(newK);
    setKeyName(""); setShowKeyModal(false);
    toast.success("API key generated");
  };

  const handleRevokeKey = (id) => { setKeys(prev => prev.filter(k => k.id !== id)); toast.success("Key revoked"); };

  const handleSuspend = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u));
    toast.success("User status updated");
  };

  const TABS = [
    { key: "users", label: "Users & Roles", icon: Users },
    { key: "sso", label: "SSO Config", icon: Lock },
    { key: "apikeys", label: "API Keys", icon: Key },
    { key: "mfa", label: "MFA Settings", icon: Shield },
  ];

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>Settings</span><span>/</span>
          <span style={{ color: GOLD }}>Access Control</span>
        </div>
        <h1 className="text-2xl font-black text-white">Access Control & Identity</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage users, roles, SSO, API keys, and MFA</p>
      </div>

      {/* Tabs */}
      <div className="fu flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#111827", border: "1px solid #1F2937", animationDelay: "60ms" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tab === t.key ? GOLD : "transparent", color: tab === t.key ? "#0A0E1A" : "#9CA3AF" }}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="fu space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{users.length} users</span>
            <button onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
              style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              <Plus className="w-4 h-4" /> Invite User
            </button>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                  {["User", "Role", "Last Login", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid #1F2937" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black flex-shrink-0"
                          style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>{u.avatar}</div>
                        <div>
                          <div className="text-sm font-semibold text-white">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{u.lastLogin}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold"
                        style={{ color: u.status === "active" ? "#22c55e" : "#ef4444", background: u.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", borderColor: u.status === "active" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)" }}>
                        {u.status === "active" ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleSuspend(u.id)} className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:scale-105"
                          style={{ color: "#9CA3AF", borderColor: "#374151", background: "#1F2937" }}>
                          {u.status === "active" ? "Suspend" : "Activate"}
                        </button>
                        {u.role !== "admin" && (
                          <button onClick={() => { setUsers(prev => prev.filter(x => x.id !== u.id)); toast.success("User removed"); }}
                            className="text-xs px-2.5 py-1 rounded-lg border transition-all hover:scale-105"
                            style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}>Remove</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Permission Matrix */}
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <button onClick={() => setPermExpanded(!permExpanded)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-white hover:bg-white/5 transition-colors">
              <span>Role Permissions Matrix</span>
              {permExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {permExpanded && (
              <div className="overflow-x-auto border-t" style={{ borderColor: "#1F2937" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Permission</th>
                      {ROLES.map(r => <th key={r.value} className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: r.color }}>{r.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map(p => (
                      <tr key={p.key} className="hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid #1F2937" }}>
                        <td className="px-4 py-3 text-xs text-slate-300">{p.label}</td>
                        {ROLES.map(r => (
                          <td key={r.value} className="px-4 py-3 text-center">
                            {ROLE_PERMISSIONS[r.value]?.[p.key]
                              ? <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                              : <X className="w-4 h-4 text-red-500 mx-auto opacity-60" />}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SSO TAB */}
      {tab === "sso" && (
        <div className="fu space-y-4 max-w-2xl" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-white mb-0.5">SSO Status</div>
                <div className="text-xs text-slate-400">Enable SAML-based single sign-on for your organization</div>
              </div>
              <button onClick={() => { setSsoEnabled(!ssoEnabled); toast.success(`SSO ${!ssoEnabled ? "enabled" : "disabled"}`); }}
                className="relative w-12 h-6 rounded-full transition-all flex-shrink-0"
                style={{ background: ssoEnabled ? "#22c55e" : "#374151" }}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${ssoEnabled ? "left-7" : "left-1"}`} />
              </button>
            </div>
            {ssoEnabled && <div className="text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)" }}><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />SSO Active</div>}
          </div>

          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="font-bold text-white mb-3">SSO Provider</div>
            <div className="grid grid-cols-3 gap-3">
              {SSO_PROVIDERS.map(p => (
                <button key={p.value} onClick={() => setSsoProvider(p.value)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all border"
                  style={{ background: ssoProvider === p.value ? `${GOLD}20` : "#1F2937", color: ssoProvider === p.value ? GOLD : "#9CA3AF", borderColor: ssoProvider === p.value ? GOLD : "#374151" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {ssoProvider && (
            <div className="rounded-xl border p-5 space-y-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="font-bold text-white">Configuration</div>
              {[["Entity ID", "entityId", "https://app.shieldai.io/saml/metadata"], ["SSO URL", "ssoUrl", "https://your-idp.com/sso/saml"]].map(([label, field, ph]) => (
                <div key={field}>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">{label}</label>
                  <input value={ssoConfig[field]} onChange={e => setSsoConfig(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={ph} className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none"
                    style={{ background: "#1F2937", borderColor: "#374151" }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">X.509 Certificate</label>
                <textarea value={ssoConfig.cert} onChange={e => setSsoConfig(p => ({ ...p, cert: e.target.value }))}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  rows={4} className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none font-mono"
                  style={{ background: "#1F2937", borderColor: "#374151" }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[["Email Attr", "emailAttr"], ["Name Attr", "nameAttr"], ["Role Attr", "roleAttr"]].map(([label, field]) => (
                  <div key={field}>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">{label}</label>
                    <input value={ssoConfig[field]} onChange={e => setSsoConfig(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl text-sm text-white border outline-none"
                      style={{ background: "#1F2937", borderColor: "#374151" }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "#1F2937" }}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toast.success("SSO connection test passed ✅")}
                    className="px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:scale-105"
                    style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)" }}>Test Connection</button>
                  <button className="px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:scale-105"
                    style={{ color: "#9CA3AF", borderColor: "#374151", background: "#1F2937" }}>Download SP Metadata XML</button>
                </div>
                <button onClick={() => toast.success("SSO configuration saved")}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-black"
                  style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Save Config</button>
              </div>
            </div>
          )}

          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white mb-0.5">Enforce SSO</div>
                <div className="text-xs text-slate-400">Disable password login for all non-admin users</div>
              </div>
              <button onClick={() => { setEnforceSso(!enforceSso); toast.success(`Enforce SSO ${!enforceSso ? "enabled" : "disabled"}`); }}
                className="relative w-12 h-6 rounded-full transition-all"
                style={{ background: enforceSso ? "#22c55e" : "#374151" }}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enforceSso ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API KEYS TAB */}
      {tab === "apikeys" && (
        <div className="fu space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{keys.length} keys</span>
            <button onClick={() => setShowKeyModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black"
              style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
              <Plus className="w-4 h-4" /> Generate New Key
            </button>
          </div>
          {newKey && (
            <div className="rounded-xl border p-4" style={{ background: "rgba(201,168,76,0.08)", borderColor: `${GOLD}44` }}>
              <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-sm font-bold" style={{ color: GOLD }}>New key created — store this securely, it won't be shown again</span></div>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#0d1220" }}>
                <code className="text-emerald-400 font-mono text-sm flex-1">{newKey.fullKey}</code>
                <button onClick={() => { navigator.clipboard.writeText(newKey.fullKey); toast.success("Copied!"); }}
                  className="p-1.5 rounded-lg" style={{ background: "#1F2937" }}><Copy className="w-4 h-4 text-slate-400" /></button>
              </div>
              <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-slate-500 hover:text-slate-300">Dismiss</button>
            </div>
          )}
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                  {["Name", "Key", "Created", "Last Used", "Permissions", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map(k => (
                  <tr key={k.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid #1F2937" }}>
                    <td className="px-4 py-3 text-sm font-semibold text-white">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{k.key}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{k.created}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{k.lastUsed}</td>
                    <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}>{k.permissions}</span></td>
                    <td className="px-4 py-3"><span className="text-[10px] font-bold" style={{ color: k.active ? "#22c55e" : "#6B7280" }}>{k.active ? "Active" : "Inactive"}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(k.key); toast.success("Key copied"); }}
                          className="p-1.5 rounded-lg" style={{ background: "#1F2937" }}><Copy className="w-3.5 h-3.5 text-slate-400" /></button>
                        <button onClick={() => handleRevokeKey(k.id)} className="text-xs px-2.5 py-1 rounded-lg border"
                          style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}>Revoke</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MFA TAB */}
      {tab === "mfa" && (
        <div className="fu space-y-4 max-w-2xl" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-bold text-white mb-0.5">Enforce MFA Org-Wide</div>
                <div className="text-xs text-slate-400">Require all users to enroll in MFA</div>
              </div>
              <button onClick={() => { setMfaEnforced(!mfaEnforced); toast.success(`MFA enforcement ${!mfaEnforced ? "enabled" : "disabled"}`); }}
                className="relative w-12 h-6 rounded-full transition-all"
                style={{ background: mfaEnforced ? "#22c55e" : "#374151" }}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${mfaEnforced ? "left-7" : "left-1"}`} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl text-center" style={{ background: "#1F2937" }}>
                <div className="text-2xl font-black text-white mb-1">4</div>
                <div className="text-xs text-slate-500">Enrolled</div>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ background: "#1F2937" }}>
                <div className="text-2xl font-black text-red-400 mb-1">1</div>
                <div className="text-xs text-slate-500">Not Enrolled</div>
              </div>
              <div className="p-4 rounded-xl text-center" style={{ background: "#1F2937" }}>
                <div className="text-2xl font-black mb-1" style={{ color: "#22c55e" }}>80%</div>
                <div className="text-xs text-slate-500">Coverage</div>
              </div>
            </div>
          </div>
          {[{ name: "TOTP (Authenticator App)", desc: "Google Authenticator, Authy, 1Password" }, { name: "SMS OTP", desc: "Phone number-based one-time password" }, { name: "Hardware Key (FIDO2)", desc: "YubiKey, WebAuthn security keys" }].map((m, i) => (
            <div key={m.name} className="rounded-xl border p-4 flex items-center justify-between" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div>
                <div className="font-semibold text-white text-sm">{m.name}</div>
                <div className="text-xs text-slate-400">{m.desc}</div>
              </div>
              <button className="relative w-12 h-6 rounded-full" style={{ background: i === 0 ? "#22c55e" : "#374151" }}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${i === 0 ? "left-7" : "left-1"}`} />
              </button>
            </div>
          ))}
          <button onClick={() => toast.success("MFA reset required at next login for 1 user")}
            className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:scale-105"
            style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" }}>
            Require MFA at Next Login (1 non-enrolled user)
          </button>
        </div>
      )}

      {/* Invite Drawer */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowInvite(false)}>
          <div className="w-full max-w-sm rounded-2xl border p-6 space-y-4" style={{ background: "#111827", borderColor: "#374151" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-bold text-white">Invite User</h3><button onClick={() => setShowInvite(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email address"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }} />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <button onClick={handleInvite} className="w-full py-2.5 rounded-xl text-sm font-bold text-black"
              style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Send Invite</button>
          </div>
        </div>
      )}

      {/* Generate Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-4" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between"><h3 className="font-bold text-white">Generate API Key</h3><button onClick={() => setShowKeyModal(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <input value={keyName} onChange={e => setKeyName(e.target.value)} placeholder="Key name (e.g. CI Pipeline)"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none"
              style={{ background: "#1F2937", borderColor: "#374151" }} />
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">Permissions</div>
              <div className="flex gap-2">
                {["Read Only", "Read+Write", "Admin"].map(p => (
                  <button key={p} onClick={() => setKeyPerm(p)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={{ background: keyPerm === p ? `${GOLD}20` : "#1F2937", color: keyPerm === p ? GOLD : "#9CA3AF", borderColor: keyPerm === p ? GOLD : "#374151" }}>{p}</button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerateKey} className="w-full py-2.5 rounded-xl text-sm font-bold text-black"
              style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Generate Key</button>
          </div>
        </div>
      )}
    </div>
  );
}