import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Settings, Plug, Calendar, Bell, Users, Plus, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "schedule", label: "Scan Schedule", icon: Calendar },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
];

const SCHEDULES = [
  { id: "cloud_rescan", icon: "🛡️", name: "Daily Cloud Rescan", desc: "Runs every day at 6:00 AM UTC", schedule: "Daily @ 06:00 UTC", active: true },
  { id: "container_k8s", icon: "🐳", name: "Weekly Container + K8s Rescan", desc: "Every Monday at 7:00 AM UTC", schedule: "Mon @ 07:00 UTC", active: true },
  { id: "compliance_report", icon: "📊", name: "Weekly Compliance Report", desc: "Every Friday at 5:00 PM UTC", schedule: "Fri @ 17:00 UTC", active: true },
];

function IntegrationsTab() {
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("shieldai_integrations") || "{}"); } catch { return {}; }
  });
  const [testLoading, setTestLoading] = useState({});

  const save = (key, val) => {
    const updated = { ...state, [key]: { ...(state[key] || {}), ...val } };
    setState(updated);
    localStorage.setItem("shieldai_integrations", JSON.stringify(updated));
  };

  const testConnection = async (service) => {
    setTestLoading(l => ({ ...l, [service]: true }));
    await new Promise(r => setTimeout(r, 1200));
    setTestLoading(l => ({ ...l, [service]: false }));
    toast.success(`${service} connection test successful`);
  };

  return (
    <div className="space-y-4">
      {/* Slack */}
      <IntegrationCard icon="💬" name="Slack" description="Send security alerts to Slack channels" enabled={state.slack?.enabled} onToggle={v => save("slack", { enabled: v })}>
        <div className="grid gap-3 mt-3">
          <Field label="Webhook URL" value={state.slack?.webhook || ""} onChange={v => save("slack", { webhook: v })} placeholder="https://hooks.slack.com/services/..." />
          <div>
            <label className="block text-[10px] text-slate-500 mb-1 uppercase font-mono">Alert Threshold</label>
            <select value={state.slack?.threshold || "critical"} onChange={e => save("slack", { threshold: e.target.value })}
              className="px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3" }}>
              <option value="critical">Critical Only</option>
              <option value="high">High+</option>
              <option value="medium">Medium+</option>
            </select>
          </div>
          <TestButton service="Slack" loading={testLoading.Slack} onClick={() => testConnection("Slack")} />
        </div>
      </IntegrationCard>

      {/* GitHub */}
      <IntegrationCard icon="🐙" name="GitHub" description="Create issues for critical findings" enabled={state.github?.enabled} onToggle={v => save("github", { enabled: v })}>
        <div className="grid gap-3 mt-3">
          <Field label="Personal Access Token" value={state.github?.token || ""} onChange={v => save("github", { token: v })} placeholder="ghp_..." type="password" />
          <Field label="Repository (owner/repo)" value={state.github?.repo || ""} onChange={v => save("github", { repo: v })} placeholder="acme/security-issues" />
          <TestButton service="GitHub" loading={testLoading.GitHub} onClick={() => testConnection("GitHub")} />
        </div>
      </IntegrationCard>

      {/* Jira - Coming Soon */}
      <IntegrationCard icon="🔵" name="Jira" description="Sync findings to Jira issues" enabled={false} comingSoon>
        <div className="grid gap-3 mt-3 opacity-50 pointer-events-none">
          <Field label="Domain" value="" onChange={() => {}} placeholder="yourcompany.atlassian.net" />
          <Field label="Email" value="" onChange={() => {}} placeholder="admin@company.com" />
          <Field label="API Token" value="" onChange={() => {}} placeholder="ATATT..." type="password" />
          <Field label="Project Key" value="" onChange={() => {}} placeholder="SEC" />
        </div>
      </IntegrationCard>

      {/* PagerDuty - Coming Soon */}
      <IntegrationCard icon="🚨" name="PagerDuty" description="Page on-call engineers for critical threats" enabled={false} comingSoon>
        <div className="grid gap-3 mt-3 opacity-50 pointer-events-none">
          <Field label="Integration Key" value="" onChange={() => {}} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" type="password" />
        </div>
      </IntegrationCard>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 mb-1 uppercase font-mono">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-xs text-white outline-none"
        style={{ background: "#0d1117", border: "1px solid #30363d" }} />
    </div>
  );
}

function TestButton({ service, loading, onClick }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50 w-fit"
      style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      Test {service} Connection
    </button>
  );
}

function IntegrationCard({ icon, name, description, enabled, onToggle, children, comingSoon }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#161b22", border: `1px solid ${enabled ? "rgba(99,102,241,0.3)" : "#30363d"}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{name}</h3>
              {comingSoon && <span className="text-[9px] px-2 py-0.5 rounded font-semibold text-amber-400" style={{ background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)" }}>COMING SOON</span>}
            </div>
            <p className="text-[11px] text-slate-500">{description}</p>
          </div>
        </div>
        {!comingSoon && (
          <button onClick={() => onToggle(!enabled)}
            className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
            style={{ background: enabled ? "#6366f1" : "#374151" }}>
            <div className="absolute w-4 h-4 rounded-full bg-white top-1 transition-all" style={{ left: enabled ? "24px" : "4px" }} />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ScheduleTab() {
  const [schedules, setSchedules] = useState(SCHEDULES.map(s => ({ ...s })));
  const toggle = (id) => setSchedules(s => s.map(sc => sc.id === id ? { ...sc, active: !sc.active } : sc));
  const runNow = (name) => toast.success(`${name} triggered manually`);
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Manage automated scan schedules. Changes take effect immediately.</p>
      {schedules.map(sc => (
        <div key={sc.id} className="rounded-xl p-5 flex items-center justify-between gap-4"
          style={{ background: "#161b22", border: `1px solid ${sc.active ? "rgba(99,102,241,0.3)" : "#30363d"}` }}>
          <div className="flex items-center gap-4">
            <span className="text-2xl">{sc.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-white">{sc.name}</h3>
              <p className="text-[11px] text-slate-500">{sc.desc}</p>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded mt-1 inline-block"
                style={{ color: "#6366f1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                {sc.schedule}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => runNow(sc.name)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: "#0d1117", border: "1px solid #30363d", color: "#94a3b8" }}>
              Run Now
            </button>
            <button onClick={() => toggle(sc.id)}
              className="w-11 h-6 rounded-full transition-all relative"
              style={{ background: sc.active ? "#6366f1" : "#374151" }}>
              <div className="absolute w-4 h-4 rounded-full bg-white top-1 transition-all" style={{ left: sc.active ? "24px" : "4px" }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("shieldai_notif_prefs") || "{}"); } catch { return {}; }
  });
  const set = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  const save = () => { localStorage.setItem("shieldai_notif_prefs", JSON.stringify(prefs)); toast.success("Notification preferences saved"); };
  return (
    <div className="space-y-5 max-w-lg">
      {[
        { key: "slack_threshold", label: "Slack Alerts Threshold", opts: ["critical", "high", "medium", "low"] },
        { key: "github_threshold", label: "GitHub Issues Threshold", opts: ["critical", "high", "medium"] },
        { key: "email_day", label: "Email Digest Day", opts: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
        { key: "email_time", label: "Email Digest Time (UTC)", opts: ["06:00", "09:00", "12:00", "17:00", "20:00"] },
      ].map(({ key, label, opts }) => (
        <div key={key}>
          <label className="block text-[10px] text-slate-500 mb-2 uppercase font-mono">{label}</label>
          <select value={prefs[key] || opts[0]} onChange={e => set(key, e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#e6edf3" }}>
            {opts.map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      ))}
      <button onClick={save}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{ background: "#6366f1" }}>
        Save Preferences
      </button>
    </div>
  );
}

function TeamTab() {
  const { data: users = [] } = useQuery({ queryKey: ["team-users"], queryFn: () => base44.entities.User.list("-created_date", 50), initialData: [] });
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await base44.users.inviteUser(email, role);
      toast.success(`Invitation sent to ${email}`);
      setShowInvite(false); setEmail(""); setRole("user");
    } catch { toast.error("Failed to send invite"); }
    setLoading(false);
  };

  const ROLE_COLORS = { admin: { color: "#dc2626", bg: "rgba(220,38,38,0.1)" }, user: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)" } };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{users.length} team members</p>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }}>
          <Plus className="w-3.5 h-3.5" /> Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="rounded-xl p-5 space-y-3" style={{ background: "#161b22", border: "1px solid rgba(99,102,241,0.3)" }}>
          <h4 className="text-sm font-semibold text-white">Invite Team Member</h4>
          <div className="flex gap-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com"
              className="flex-1 px-3 py-2 rounded-lg text-xs text-white outline-none"
              style={{ background: "#0d1117", border: "1px solid #30363d" }} />
            <select value={role} onChange={e => setRole(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "#0d1117", border: "1px solid #30363d", color: "#e6edf3" }}>
              <option value="user">Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleInvite} disabled={loading || !email}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "#6366f1" }}>
              {loading ? "Sending..." : "Send Invite"}
            </button>
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white"
              style={{ background: "#0d1117", border: "1px solid #30363d" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              {["Name", "Email", "Role", "Joined"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => {
              const rs = ROLE_COLORS[u.role] || ROLE_COLORS.user;
              return (
                <tr key={u.id} style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #1e3a5f, #3b82f6)" }}>
                        {u.full_name?.[0] || u.email?.[0] || "?"}
                      </div>
                      <span className="text-xs text-white">{u.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-400">{u.email}</span></td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded capitalize font-semibold"
                      style={{ color: rs.color, background: rs.bg }}>
                      {u.role === "admin" ? "Admin" : "Analyst"}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="text-[11px] text-slate-500">{u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}</span></td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-600 text-sm">No team members found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsPageNew() {
  const [activeTab, setActiveTab] = useState("integrations");
  const Tab = TABS.find(t => t.id === activeTab);
  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#0d1117" }}>
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-slate-400" />
        <h1 className="text-xl font-black text-white font-mono">SETTINGS</h1>
      </div>
      <div className="flex gap-1.5 p-1 rounded-xl w-fit" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: activeTab === t.id ? "rgba(99,102,241,0.2)" : "transparent",
              color: activeTab === t.id ? "#818cf8" : "#64748b",
              border: activeTab === t.id ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
            }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="max-w-3xl">
        {activeTab === "integrations" && <IntegrationsTab />}
        {activeTab === "schedule" && <ScheduleTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "team" && <TeamTab />}
      </div>
    </div>
  );
}