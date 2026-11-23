import React, { useState } from "react";
import { Shield, Building, Bell, Webhook, ScanLine, Palette, AlertTriangle, Copy, Upload } from "lucide-react";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const TABS = [
  { key: "org", label: "Organization", icon: Building },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "webhooks", label: "Webhooks", icon: Webhook },
  { key: "scanners", label: "Scanners", icon: ScanLine },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "danger", label: "Danger Zone", icon: AlertTriangle },
];

const NOTIF_CHANNELS = ["Email", "Slack", "Microsoft Teams", "PagerDuty", "Webhook"];
const ALERT_RULES = ["New Critical Finding", "SLA Breach", "Breach Detected", "Scan Complete", "Compliance Failure", "Agent Action"];
const WEBHOOK_EVENTS = ["finding.created", "scan.completed", "breach.detected", "sla.breached", "agent.action"];

const SAMPLE_WEBHOOKS = [
  { id: 1, url: "https://hooks.slack.com/services/T01/B01/xxx", events: "finding.created, scan.completed", status: "active", lastTriggered: "2 min ago" },
  { id: 2, url: "https://pagerduty.com/generic/2010-04-15/create_event.json", events: "sla.breached", status: "active", lastTriggered: "1h ago" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("org");
  const [org, setOrg] = useState({ name: "Al-Rabbani Security Org", domain: "al-rabbani.io", industry: "FinTech", country: "GB", plan: "Sovereign Enterprise", accountId: "shield-org-7f3a9b2c" });
  const [webhooks, setWebhooks] = useState(SAMPLE_WEBHOOKS);
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ url: "", events: [], active: true });
  const [scanConfig, setScanConfig] = useState({ autoCloseAfter: 30, autofixEnabled: true, frequency: "daily", excludePaths: "" });
  const [appearance, setAppearance] = useState({ sidebar: "expanded", dateFormat: "DD/MM/YYYY", timezone: "Europe/London", dashboardLayout: "grid" });
  const [dangerInput, setDangerInput] = useState({ reset: "", deleteHistory: "", deleteOrg: "" });

  const handleDangerAction = (action, confirmValue, inputValue) => {
    if (inputValue !== confirmValue) return toast.error(`Type "${confirmValue}" to confirm`);
    toast.success(`${action} completed`);
    setDangerInput(p => ({ ...p }));
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span style={{ color: GOLD }}>Settings</span>
        </div>
        <h1 className="text-2xl font-black text-white">Platform Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your organization configuration and platform preferences</p>
      </div>

      <div className="fu flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background: "#111827", border: "1px solid #1F2937", animationDelay: "60ms" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tab === t.key ? (t.key === "danger" ? "#ef444420" : GOLD) : "transparent", color: tab === t.key ? (t.key === "danger" ? "#ef4444" : "#0A0E1A") : "#9CA3AF", border: tab === t.key && t.key === "danger" ? "1px solid rgba(239,68,68,0.4)" : "none" }}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ORG */}
      {tab === "org" && (
        <div className="fu max-w-2xl space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl border p-5 space-y-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="font-bold text-white">Organization Profile</div>
            {[["Organization Name", "name"], ["Primary Domain", "domain"]].map(([label, field]) => (
              <div key={field}>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">{label}</label>
                <input value={org[field]} onChange={e => setOrg(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }} />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Industry</label>
                <select value={org.industry} onChange={e => setOrg(p => ({ ...p, industry: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }}>
                  {["FinTech", "Healthcare", "SaaS", "Manufacturing", "Government", "Retail", "Energy"].map(i => <option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">HQ Country</label>
                <select value={org.country} onChange={e => setOrg(p => ({ ...p, country: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none"
                  style={{ background: "#1F2937", borderColor: "#374151" }}>
                  {["GB", "US", "DE", "FR", "SG", "AE", "IN"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-white">Plan</div>
                <div className="text-2xl font-black mt-1" style={{ color: GOLD }}>{org.plan}</div>
              </div>
              <button className="px-4 py-2 rounded-xl text-sm font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Upgrade</button>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#1F2937" }}>
              <span className="text-xs text-slate-400">Account ID:</span>
              <code className="text-xs font-mono text-white flex-1">{org.accountId}</code>
              <button onClick={() => { navigator.clipboard.writeText(org.accountId); toast.success("Copied"); }} className="p-1"><Copy className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>
          </div>
          <button onClick={() => toast.success("Settings saved")} className="px-5 py-2.5 rounded-xl font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Save Changes</button>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div className="fu max-w-3xl space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}><div className="font-bold text-white">Notification Channels</div></div>
            <div className="divide-y" style={{ divideColor: "#1F2937" }}>
              {NOTIF_CHANNELS.map(ch => (
                <div key={ch} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-300">{ch}</span>
                  <div className="flex items-center gap-2">
                    <button className="relative w-10 h-5 rounded-full" style={{ background: ch === "Email" || ch === "Slack" ? "#22c55e" : "#374151" }}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${ch === "Email" || ch === "Slack" ? "left-5" : "left-0.5"}`} />
                    </button>
                    <button className="text-xs px-3 py-1 rounded-lg border" style={{ color: "#9CA3AF", borderColor: "#374151", background: "#1F2937" }}>Configure</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}><div className="font-bold text-white">Alert Rules</div></div>
            <table className="w-full">
              <thead><tr style={{ background: "#0d1220" }}>{["Event", "Channel", "Min Severity"].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {ALERT_RULES.map(rule => (
                  <tr key={rule} className="border-t" style={{ borderColor: "#1F2937" }}>
                    <td className="px-4 py-2.5 text-sm text-slate-300">{rule}</td>
                    <td className="px-4 py-2.5"><select className="px-2 py-1 rounded-lg text-xs border" style={{ background: "#1F2937", borderColor: "#374151", color: "#9CA3AF" }}>{NOTIF_CHANNELS.map(c => <option key={c}>{c}</option>)}</select></td>
                    <td className="px-4 py-2.5"><select className="px-2 py-1 rounded-lg text-xs border" style={{ background: "#1F2937", borderColor: "#374151", color: "#9CA3AF" }}>{["Critical", "High+", "Medium+", "All"].map(s => <option key={s}>{s}</option>)}</select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => toast.success("Notification settings saved")} className="px-5 py-2.5 rounded-xl font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Save</button>
        </div>
      )}

      {/* WEBHOOKS */}
      {tab === "webhooks" && (
        <div className="fu max-w-3xl space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="flex justify-end">
            <button onClick={() => setShowAddWebhook(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>+ Add Webhook</button>
          </div>
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <table className="w-full">
              <thead><tr style={{ background: "#0d1220" }}>{["URL", "Events", "Status", "Last Triggered", "Actions"].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase">{h}</th>)}</tr></thead>
              <tbody>
                {webhooks.map(wh => (
                  <tr key={wh.id} className="border-t hover:bg-white/5" style={{ borderColor: "#1F2937" }}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 max-w-[200px] truncate">{wh.url}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[150px] truncate">{wh.events}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-bold text-emerald-400">{wh.status}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{wh.lastTriggered}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => toast.success("Test payload sent")} className="text-xs px-2 py-1 rounded border" style={{ color: "#3b82f6", borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)" }}>Test</button>
                        <button onClick={() => { setWebhooks(p => p.filter(x => x.id !== wh.id)); toast.success("Webhook removed"); }} className="text-xs px-2 py-1 rounded border" style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showAddWebhook && (
            <div className="rounded-xl border p-5 space-y-3" style={{ background: "#111827", borderColor: `${GOLD}44` }}>
              <div className="font-bold text-white">New Webhook</div>
              <input value={newWebhook.url} onChange={e => setNewWebhook(p => ({ ...p, url: e.target.value }))} placeholder="https://your-endpoint.com/webhook"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none" style={{ background: "#1F2937", borderColor: "#374151" }} />
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-2">Events</div>
                <div className="flex flex-wrap gap-2">
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" onChange={e => setNewWebhook(p => ({ ...p, events: e.target.checked ? [...p.events, ev] : p.events.filter(x => x !== ev) }))} />
                      <span className="text-xs font-mono text-slate-300">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setWebhooks(p => [...p, { id: Date.now(), ...newWebhook, events: newWebhook.events.join(", "), status: "active", lastTriggered: "Never" }]); setShowAddWebhook(false); setNewWebhook({ url: "", events: [], active: true }); toast.success("Webhook added"); }}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Save</button>
                <button onClick={() => setShowAddWebhook(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 border" style={{ borderColor: "#374151" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCANNERS */}
      {tab === "scanners" && (
        <div className="fu max-w-2xl space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl border p-5 space-y-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="font-bold text-white">Scan Configuration</div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Default Scan Frequency</label>
              <div className="flex gap-2">
                {["real-time", "hourly", "daily", "weekly"].map(f => (
                  <button key={f} onClick={() => setScanConfig(p => ({ ...p, frequency: f }))}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all capitalize"
                    style={{ background: scanConfig.frequency === f ? `${GOLD}20` : "#1F2937", color: scanConfig.frequency === f ? GOLD : "#9CA3AF", borderColor: scanConfig.frequency === f ? GOLD : "#374151" }}>{f}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Auto-close resolved findings after {scanConfig.autoCloseAfter} days</label>
              <input type="range" min="7" max="90" value={scanConfig.autoCloseAfter}
                onChange={e => setScanConfig(p => ({ ...p, autoCloseAfter: Number(e.target.value) }))}
                className="w-full" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1"><span>7d</span><span>90d</span></div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Excluded Paths / Repos</label>
              <textarea value={scanConfig.excludePaths} onChange={e => setScanConfig(p => ({ ...p, excludePaths: e.target.value }))}
                placeholder="node_modules&#10;*.test.js&#10;vendor/" rows={4}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-600 border outline-none font-mono"
                style={{ background: "#1F2937", borderColor: "#374151" }} />
            </div>
            <div className="flex items-center justify-between">
              <div><div className="font-semibold text-white text-sm">Enable AutoFix</div><div className="text-xs text-slate-400">Automatically open PRs for fixable vulnerabilities</div></div>
              <button onClick={() => setScanConfig(p => ({ ...p, autofixEnabled: !p.autofixEnabled }))}
                className="relative w-12 h-6 rounded-full transition-all" style={{ background: scanConfig.autofixEnabled ? "#22c55e" : "#374151" }}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${scanConfig.autofixEnabled ? "left-7" : "left-1"}`} />
              </button>
            </div>
          </div>
          <button onClick={() => toast.success("Scanner config saved")} className="px-5 py-2.5 rounded-xl font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Save</button>
        </div>
      )}

      {/* APPEARANCE */}
      {tab === "appearance" && (
        <div className="fu max-w-2xl space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl border p-5 space-y-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Theme</label>
              <div className="p-3 rounded-xl border flex items-center gap-3" style={{ background: "#1F2937", borderColor: "#374151" }}>
                <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-600" />
                <span className="text-sm text-slate-300">Sovereign Dark</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${GOLD}20`, color: GOLD }}>Only Theme</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-2">Date Format</label>
              <div className="flex gap-2">
                {["DD/MM/YYYY", "MM/DD/YYYY", "ISO 8601"].map(f => (
                  <button key={f} onClick={() => setAppearance(p => ({ ...p, dateFormat: f }))}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={{ background: appearance.dateFormat === f ? `${GOLD}20` : "#1F2937", color: appearance.dateFormat === f ? GOLD : "#9CA3AF", borderColor: appearance.dateFormat === f ? GOLD : "#374151" }}>{f}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Timezone</label>
              <select value={appearance.timezone} onChange={e => setAppearance(p => ({ ...p, timezone: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white border outline-none" style={{ background: "#1F2937", borderColor: "#374151" }}>
                {["Europe/London", "America/New_York", "America/Los_Angeles", "Europe/Berlin", "Asia/Singapore", "Asia/Tokyo", "UTC"].map(tz => <option key={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => toast.success("Appearance settings saved")} className="px-5 py-2.5 rounded-xl font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Save</button>
        </div>
      )}

      {/* DANGER ZONE */}
      {tab === "danger" && (
        <div className="fu max-w-2xl space-y-4" style={{ animationDelay: "80ms" }}>
          <div className="rounded-xl border p-1" style={{ borderColor: "rgba(239,68,68,0.5)" }}>
            <div className="p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.04)" }}>
              <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-red-400" /><span className="font-bold text-red-400">Danger Zone — Irreversible Actions</span></div>
              <div className="space-y-4">
                {[
                  { label: "Reset All Findings", desc: "Permanently delete all findings data. This cannot be undone.", confirm: "CONFIRM", field: "reset", action: "Findings reset" },
                  { label: "Delete All Scan History", desc: "Remove all historical scan data and results.", confirm: "CONFIRM", field: "deleteHistory", action: "Scan history deleted" },
                  { label: "Delete Organization", desc: "Permanently delete this organization and ALL data. Type your org name to confirm.", confirm: org.name, field: "deleteOrg", action: "Organization deletion scheduled" },
                ].map(item => (
                  <div key={item.field} className="p-4 rounded-xl border" style={{ background: "#111827", borderColor: "rgba(239,68,68,0.2)" }}>
                    <div className="font-semibold text-white mb-1">{item.label}</div>
                    <div className="text-xs text-slate-400 mb-3">{item.desc}</div>
                    <div className="flex items-center gap-2">
                      <input value={dangerInput[item.field]} onChange={e => setDangerInput(p => ({ ...p, [item.field]: e.target.value }))}
                        placeholder={`Type "${item.confirm}" to confirm`}
                        className="flex-1 px-3 py-2 rounded-xl text-sm text-white placeholder-slate-600 border outline-none"
                        style={{ background: "#1F2937", borderColor: "#374151" }} />
                      <button onClick={() => handleDangerAction(item.action, item.confirm, dangerInput[item.field])}
                        disabled={dangerInput[item.field] !== item.confirm}
                        className="px-4 py-2 rounded-xl text-sm font-bold border transition-all disabled:opacity-30"
                        style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)" }}>{item.label}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}