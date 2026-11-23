import React, { useState } from "react";
import { Bell, AlertTriangle, Check, X, Plus, Clock, Filter, ChevronDown, Mail, Slack, Zap, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const GOLD = "#C9A84C";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#6b7280" };

const MOCK_ALERTS = [
  { id: 1, sev: "critical", type: "Finding", title: "SQL Injection — CVE-2024-1234", desc: "Exploitable SQL injection in /api/users endpoint", source: "SAST Scanner", asset: "api-service", time: "3 minutes ago", status: "new" },
  { id: 2, sev: "critical", type: "SLA Breach", title: "SLA Breached: auth-service XSS", desc: "Critical finding exceeded 24-hour SLA without remediation", source: "SLA Monitor", asset: "auth-service", time: "18 minutes ago", status: "new" },
  { id: 3, sev: "high", type: "Threat Intel", title: "New Ransomware IOC: 185.220.101.47", desc: "IP flagged by 8 threat intel sources — Ryuk affiliate", source: "IOC Radar", asset: "Network", time: "1 hour ago", status: "acknowledged" },
  { id: 4, sev: "high", type: "Cloud", title: "S3 Bucket Publicly Exposed", desc: "prod-data-backup is publicly readable — contains PII", source: "CSPM Scanner", asset: "AWS prod", time: "2 hours ago", status: "in_progress" },
  { id: 5, sev: "medium", type: "Pentest", title: "DAST Scan Completed — 4 findings", desc: "New DAST scan on api.company.com found 4 issues", source: "DAST Scanner", asset: "api.company.com", time: "3 hours ago", status: "acknowledged" },
  { id: 6, sev: "high", type: "Dark Web", title: "Credential Leak Detected", desc: "14 employee email/password combos found in paste dump", source: "Dark Web Monitor", asset: "corporate emails", time: "5 hours ago", status: "new" },
  { id: 7, sev: "medium", type: "Container", title: "Critical CVE in base image", desc: "CVE-2024-9999 in node:18 base image — CVSS 9.1", source: "Container Scanner", asset: "api-service:latest", time: "6 hours ago", status: "new" },
  { id: 8, sev: "low", type: "AutoFix", title: "AutoFix PR Merged", desc: "lodash 4.17.20 → 4.17.21 PR merged by bot", source: "AutoFix Engine", asset: "frontend-app", time: "8 hours ago", status: "resolved" },
];

const ALERT_RULES = [
  { name: "Critical Finding Alert", trigger: "Severity = Critical", channels: ["email", "slack"], cooldown: "15 min", active: true },
  { name: "SLA Breach Alert", trigger: "SLA Breached = true", channels: ["email", "slack", "pagerduty"], cooldown: "60 min", active: true },
  { name: "New Ransomware IOC", trigger: "Feed Type = ransomware", channels: ["slack", "pagerduty"], cooldown: "5 min", active: true },
  { name: "Dark Web Credential Leak", trigger: "Event Type = credentials_leaked", channels: ["email", "slack"], cooldown: "30 min", active: true },
  { name: "Pentest Completed", trigger: "Pentest Status = completed", channels: ["email"], cooldown: "0 min", active: false },
];

const TREND_DATA = Array.from({ length: 14 }, (_, i) => ({
  day: `Jun ${i + 3}`,
  critical: Math.floor(Math.random() * 5 + 1),
  high: Math.floor(Math.random() * 8 + 2),
  medium: Math.floor(Math.random() * 12 + 3),
}));

function AlertCard({ alert, onAck }) {
  const color = SEV_COLOR[alert.sev] || "#6b7280";
  return (
    <div className="rounded-xl border transition-all hover:scale-[1.005]" style={{ background: "#111827", borderColor: "#1F2937", borderLeft: `3px solid ${color}` }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-0.5">
              {alert.status === "new" ? (
                <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: color }} />
              ) : (
                <span className="inline-block w-2.5 h-2.5 rounded-full opacity-40" style={{ background: color }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>{alert.sev.toUpperCase()}</span>
                <span className="text-[10px] text-slate-500 font-semibold">{alert.type}</span>
                <span className="text-[10px] text-slate-600">via {alert.source}</span>
              </div>
              <p className="text-sm font-semibold text-white mb-0.5">{alert.title}</p>
              <p className="text-xs text-slate-400">{alert.desc}</p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-600">
                <span>Asset: <span className="text-slate-400">{alert.asset}</span></span>
                <span title={new Date().toISOString()}>{alert.time}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {alert.status === "new" && (
              <button onClick={() => onAck(alert.id)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white border border-slate-700 hover:bg-white/5 transition-colors">
                Ack
              </button>
            )}
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
              alert.status === "new" ? "bg-red-500/10 text-red-400" :
              alert.status === "acknowledged" ? "bg-yellow-500/10 text-yellow-400" :
              alert.status === "in_progress" ? "bg-blue-500/10 text-blue-400" :
              "bg-green-500/10 text-green-400"
            }`}>{alert.status.replace("_", " ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("feed");
  const [showCreateRule, setShowCreateRule] = useState(false);

  const ack = (id) => setAlerts(a => a.map(x => x.id === id ? { ...x, status: "acknowledged" } : x));
  const ackAll = () => setAlerts(a => a.map(x => x.status === "new" ? { ...x, status: "acknowledged" } : x));

  const todayAlerts = alerts.length;
  const criticalCount = alerts.filter(a => a.sev === "critical").length;
  const ackedCount = alerts.filter(a => a.status === "acknowledged").length;
  const newCount = alerts.filter(a => a.status === "new").length;

  const filtered = alerts.filter(a => {
    if (activeFilter === "critical") return a.sev === "critical";
    if (activeFilter === "high") return a.sev === "high";
    if (activeFilter === "unacknowledged") return a.status === "new";
    return true;
  });

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      {/* Header */}
      <div className="fu flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Bell className="w-3.5 h-3.5" /><span>Platform</span><span>/</span><span style={{ color: GOLD }}>Alert Center</span>
          </div>
          <h1 className="text-2xl font-black text-white">Alert Center</h1>
          <p className="text-slate-400 text-sm">Real-time notifications for every critical security event</p>
        </div>
        <button onClick={() => setShowCreateRule(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-black hover:scale-105 transition-all" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
          <Plus className="w-4 h-4" /> Create Alert Rule
        </button>
      </div>

      {/* KPI Cards */}
      <div className="fu grid grid-cols-2 md:grid-cols-5 gap-3" style={{ animationDelay: "60ms" }}>
        {[
          { label: "Alerts Today", value: todayAlerts, color: "#6366f1" },
          { label: "Critical", value: criticalCount, color: "#ef4444" },
          { label: "New / Unacked", value: newCount, color: "#f97316" },
          { label: "Acknowledged", value: ackedCount, color: "#22c55e" },
          { label: "MTTA", value: "8 min", color: GOLD },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: k.color + "33" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{k.label}</div>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="fu flex items-center gap-1 p-1 rounded-xl border w-fit" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "100ms" }}>
        {[["feed", "Alert Feed"], ["rules", "Alert Rules"], ["preferences", "Preferences"], ["analytics", "Analytics"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === id ? { background: GOLD, color: "#000" } : { color: "#6b7280" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Alert Feed */}
      {activeTab === "feed" && (
        <div className="fu space-y-4" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {[["all", "All"], ["critical", "Critical"], ["high", "High"], ["unacknowledged", "Unacknowledged"]].map(([id, label]) => (
                <button key={id} onClick={() => setActiveFilter(id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={activeFilter === id ? { background: GOLD + "20", color: GOLD, border: `1px solid ${GOLD}40` } : { color: "#6b7280", border: "1px solid #1F2937" }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={ackAll} className="text-xs text-slate-400 hover:text-white transition-colors">Mark All Read</button>
          </div>
          <div className="space-y-3">
            {filtered.map(a => <AlertCard key={a.id} alert={a} onAck={ack} />)}
          </div>
        </div>
      )}

      {/* Alert Rules */}
      {activeTab === "rules" && (
        <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "120ms" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#0d1220" }}>
                {["Rule Name", "Trigger", "Channels", "Cooldown", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALERT_RULES.map(rule => (
                <tr key={rule.name} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: "#1F2937" }}>
                  <td className="px-4 py-3 text-white font-medium text-xs">{rule.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{rule.trigger}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {rule.channels.map(c => (
                        <span key={c} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "#1F2937", color: "#9CA3AF" }}>{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{rule.cooldown}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.active ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-500"}`}>
                      {rule.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-slate-400 hover:text-white">Edit</button>
                      <button className="text-xs text-slate-400 hover:text-white">Test</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preferences */}
      {activeTab === "preferences" && (
        <div className="fu max-w-lg space-y-6" style={{ animationDelay: "120ms" }}>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-white font-bold mb-4">Quiet Hours</h3>
            <p className="text-sm text-slate-400 mb-3">Don't alert between 10pm – 7am, except for Critical severity.</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-5 rounded-full relative" style={{ background: "#22c55e" }}>
                <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 right-0.5" />
              </div>
              <span className="text-sm text-white">Quiet hours enabled</span>
            </label>
          </div>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-white font-bold mb-4">Daily Digest</h3>
            <p className="text-sm text-slate-400 mb-3">Send daily summary at 9am instead of real-time for Medium findings.</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-5 rounded-full relative" style={{ background: "#374151" }}>
                <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 left-0.5" />
              </div>
              <span className="text-sm text-slate-400">Daily digest disabled</span>
            </label>
          </div>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-white font-bold mb-4">Severity Threshold</h3>
            <div className="space-y-2">
              {["Critical only", "High+", "Medium+"].map(t => (
                <label key={t} className="flex items-center gap-3 cursor-pointer">
                  <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: t === "High+" ? GOLD : "#374151" }}>
                    {t === "High+" && <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />}
                  </div>
                  <span className="text-sm text-slate-300">{t}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics */}
      {activeTab === "analytics" && (
        <div className="fu space-y-6" style={{ animationDelay: "120ms" }}>
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white mb-4">Alerts Per Day (Last 14 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={TREND_DATA}>
                <XAxis dataKey="day" tick={{ fill: "#6B7280", fontSize: 9 }} interval={2} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8, color: "#F9FAFB", fontSize: 12 }} />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" />
                <Bar dataKey="high" stackId="a" fill="#f97316" />
                <Bar dataKey="medium" stackId="a" fill="#eab308" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Alert Fatigue Score", value: "23/100", sub: "Healthy — no tuning needed", color: "#22c55e" },
              { label: "MTTA Trend", value: "↓ 8 min", sub: "Improving vs last week (12 min)", color: GOLD },
              { label: "Top Source", value: "SAST Scanner", sub: "42% of all alerts this month", color: "#6366f1" },
            ].map(m => (
              <div key={m.label} className="rounded-xl border p-4" style={{ background: "#0d1220", borderColor: "#1F2937" }}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{m.label}</div>
                <div className="text-xl font-black mb-0.5" style={{ color: m.color }}>{m.value}</div>
                <div className="text-xs text-slate-500">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-md rounded-2xl border" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#1F2937" }}>
              <h3 className="font-bold text-white">Create Alert Rule</h3>
              <button onClick={() => setShowCreateRule(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Rule Name</label>
                <input placeholder="e.g. Critical Finding Alert" className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none" style={{ background: "#0d1220", border: "1px solid #1F2937" }} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Trigger Event</label>
                <select className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
                  <option>Finding Created</option>
                  <option>Scan Completed</option>
                  <option>SLA Breached</option>
                  <option>Breach Detected</option>
                  <option>Agent Action</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Severity Threshold</label>
                <select className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
                  <option>Critical only</option>
                  <option>High and above</option>
                  <option>Medium and above</option>
                  <option>All severities</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-2">Notification Channels</label>
                <div className="grid grid-cols-2 gap-2">
                  {[["Email", Mail], ["Slack", Slack], ["PagerDuty", Zap], ["Webhook", Globe]].map(([name, Icon]) => (
                    <label key={name} className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-white/5 transition-colors" style={{ borderColor: "#1F2937" }}>
                      <input type="checkbox" className="w-3 h-3" />
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-300">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Cooldown</label>
                <select className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
                  <option>No cooldown</option>
                  <option>5 minutes</option>
                  <option>15 minutes</option>
                  <option>1 hour</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black" style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>Create Rule</button>
                <button onClick={() => setShowCreateRule(false)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 border" style={{ borderColor: "#374151" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}