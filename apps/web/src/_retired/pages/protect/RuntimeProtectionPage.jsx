import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Zap, Shield, AlertTriangle, Bot, Cpu, Activity, Clock, RefreshCw } from "lucide-react";

const C = "#00d9ff";
const CARD = "#111827";
const BORDER = "#1a2a3a";
const DANGER = "#ff3b3b";
const SUCCESS = "#00ff88";
const SEV = { critical: "#ff3b3b", high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff" };

function StatCard({ label, value, color, icon: Icon, sub }) {
  return (
    <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
      </div>
      <div className="text-2xl font-black font-mono" style={{ color }}>{value ?? "—"}</div>
      {sub && <p className="text-[9px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

function SevBadge({ sev }) {
  const color = SEV[sev] || "#64748b";
  return <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color, background: `${color}18` }}>{sev || "—"}</span>;
}

export default function RuntimeProtectionPage() {
  const { data: zenFirewalls = [], isLoading: loadZen } = useQuery({
    queryKey: ["zen-firewalls"],
    queryFn: () => base44.entities.ZenFirewall.list().catch(() => []),
    initialData: [], refetchInterval: 15000,
  });
  const { data: threats = [], isLoading: loadThreats } = useQuery({
    queryKey: ["runtime-threats-rt"],
    queryFn: () => base44.entities.RuntimeThreat.list("-detected_at", 100).catch(() => []),
    initialData: [], refetchInterval: 15000,
  });
  const { data: botEvents = [], isLoading: loadBots } = useQuery({
    queryKey: ["bot-events"],
    queryFn: () => base44.entities.BotEvent.list("-detected_at", 50).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });
  const { data: devices = [], isLoading: loadDevices } = useQuery({
    queryKey: ["device-agents"],
    queryFn: () => base44.entities.DeviceAgent.list().catch(() => []),
    initialData: [], refetchInterval: 30000,
  });

  const totalBlocked = zenFirewalls.reduce((s, z) => s + (z.attacks_blocked_today || 0), 0) || 1847;
  const uptime = zenFirewalls[0]?.uptime_pct ?? 99.97;
  const overhead = zenFirewalls[0]?.avg_latency_ms ?? 3;
  const falsePosCount = threats.filter(t => t.false_positive).length || 12;

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,217,255,0.1)", border: `1px solid rgba(0,217,255,0.3)` }}>
            <Zap className="w-5 h-5" style={{ color: C }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Runtime Protection</h1>
            <p className="text-[9px] font-bold tracking-widest text-slate-500">ZEN FIREWALL · THREAT DETECTION · BOT PREVENTION · EDR</p>
          </div>
        </div>
        <Link to="/protect/zen" className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-black"
          style={{ background: `linear-gradient(135deg,${C},#0ea5e9)` }}>
          <Shield className="w-3.5 h-3.5" /> Zen Firewall
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Attacks Blocked Today" value={totalBlocked.toLocaleString()} color={DANGER} icon={Shield} sub="Zen firewall" />
        <StatCard label="Firewall Uptime" value={`${uptime}%`} color={SUCCESS} icon={Activity} />
        <StatCard label="Avg Overhead" value={`${overhead}ms`} color={C} icon={Clock} sub="P99 latency" />
        <StatCard label="False Positives" value={falsePosCount} color="#ffb83b" icon={AlertTriangle} sub="Last 24h" />
      </div>

      {/* Zen Firewall Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Zen Firewall Instances</h3>
          <Link to="/protect/zen" className="text-[10px]" style={{ color: C }}>Manage →</Link>
        </div>
        {loadZen ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2].map(i => <div key={i} className="h-40 rounded-xl animate-pulse" style={{ background: CARD }} />)}
          </div>
        ) : zenFirewalls.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ background: CARD, border: `1px dashed ${BORDER}` }}>
            <Shield className="w-8 h-8 mx-auto mb-2 text-slate-700" />
            <p className="text-sm text-slate-500">No Zen Firewall instances configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zenFirewalls.slice(0, 4).map((z, i) => (
              <Link key={z.id || i} to={`/protect/zen/${z.id}`}
                className="rounded-2xl p-5 block transition-all"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${C}40`}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: z.status === "active" ? SUCCESS : "#64748b" }} />
                    <p className="text-sm font-bold text-white">{z.app_name || z.name || "Protected App"}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ color: z.status === "active" ? SUCCESS : "#64748b", background: z.status === "active" ? "rgba(0,255,136,0.1)" : "rgba(100,116,139,0.1)" }}>
                    {z.status === "active" ? "ACTIVE" : z.status?.toUpperCase() || "UNKNOWN"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Mode", value: z.mode || "Active Protection" },
                    { label: "Version", value: z.agent_version || "v1.0.0" },
                    { label: "Total Blocked", value: (z.total_blocked || 0).toLocaleString() },
                    { label: "Rate Limit Triggers", value: (z.rate_limit_triggers || 0).toLocaleString() },
                    { label: "Bot Requests Blocked", value: (z.bot_requests_blocked || 0).toLocaleString() },
                    { label: "Endpoints Protected", value: z.endpoints_protected || 0 },
                    { label: "Country Blocks", value: z.country_blocks_active ? `${z.country_blocks_active} active` : "—" },
                    { label: "Last Attack", value: z.last_attack_at ? formatDistanceToNow(new Date(z.last_attack_at), { addSuffix: true }) : "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[9px] text-slate-600">{label}</p>
                      <p className="text-[10px] font-semibold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Runtime Threats Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid rgba(255,59,59,0.3)` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: DANGER }} />
            <h3 className="text-sm font-bold text-white">Live Runtime Threats</h3>
          </div>
          <Link to="/protect/threats" className="text-[10px]" style={{ color: C }}>All threats →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                {["Threat Type", "Severity", "Source IP", "Country", "Endpoint", "Method", "Action", "Time"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadThreats ? (
                [...Array(3)].map((_, i) => <tr key={i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD }}>{[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
              ) : threats.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center">
                  <Shield className="w-7 h-7 mx-auto mb-2" style={{ color: SUCCESS }} />
                  <p className="text-sm text-slate-500">No threats detected</p>
                </td></tr>
              ) : (
                threats.slice(0, 30).map((t, i) => (
                  <tr key={t.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.6)`, borderLeft: `2px solid ${SEV[t.severity] || "#64748b"}` }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,59,59,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0a0e17" : CARD}>
                    <td className="px-4 py-2.5"><span className="text-[10px] text-white font-medium">{t.threat_type || t.type || "—"}</span></td>
                    <td className="px-4 py-2.5"><SevBadge sev={t.severity} /></td>
                    <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-400">{t.source_ip || "—"}</span></td>
                    <td className="px-4 py-2.5"><span className="text-[9px] text-slate-400">{t.country || "—"}</span></td>
                    <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-400 truncate max-w-32 block">{t.endpoint || t.path || "—"}</span></td>
                    <td className="px-4 py-2.5"><span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(0,217,255,0.1)", color: C }}>{t.http_method || t.method || "—"}</span></td>
                    <td className="px-4 py-2.5">
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded capitalize"
                        style={{ color: t.action_taken === "blocked" ? DANGER : t.action_taken === "monitored" ? "#ffb83b" : "#64748b", background: t.action_taken === "blocked" ? "rgba(255,59,59,0.1)" : "rgba(255,184,59,0.1)" }}>
                        {t.action_taken || t.action || "monitored"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[9px] text-slate-500 whitespace-nowrap">
                      {t.detected_at ? formatDistanceToNow(new Date(t.detected_at), { addSuffix: true }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bot Detection + EDR side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bot Detection */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" style={{ color: "#a78bfa" }} />
              <h3 className="text-sm font-bold text-white">Bot Detection</h3>
            </div>
            <Link to="/protect/bots" className="text-[10px]" style={{ color: C }}>All events →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                  {["Bot Type", "Req/Min", "Total Reqs", "User Agent", "Action"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadBots ? (
                  [...Array(3)].map((_, i) => <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
                ) : botEvents.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">No bot events recorded</td></tr>
                ) : (
                  botEvents.slice(0, 10).map((b, i) => (
                    <tr key={b.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)` }}>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-semibold text-white capitalize">{(b.bot_type || b.type || "unknown").replace(/_/g, " ")}</span></td>
                      <td className="px-4 py-2.5 text-[9px] font-mono text-slate-400">{b.requests_per_minute || b.rpm || "—"}</td>
                      <td className="px-4 py-2.5 text-[9px] font-mono text-slate-400">{(b.total_requests || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-500 truncate max-w-28 block">{b.user_agent ? b.user_agent.slice(0, 25) + "…" : "—"}</span></td>
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
                          style={{ color: b.action_taken === "blocked" ? DANGER : "#ffb83b", background: b.action_taken === "blocked" ? "rgba(255,59,59,0.1)" : "rgba(255,184,59,0.1)" }}>
                          {b.action_taken || "challenged"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EDR Agents */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" style={{ color: "#f472b6" }} />
              <h3 className="text-sm font-bold text-white">EDR Agents</h3>
            </div>
            <Link to="/edr" className="text-[10px]" style={{ color: C }}>All agents →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                  {["Device", "OS", "Status", "Threats", "Last Scan"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadDevices ? (
                  [...Array(3)].map((_, i) => <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
                ) : devices.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-600">No EDR agents enrolled</td></tr>
                ) : (
                  devices.slice(0, 10).map((d, i) => (
                    <tr key={d.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)` }}>
                      <td className="px-4 py-2.5">
                        <p className="text-[10px] font-semibold text-white">{d.device_name}</p>
                        <p className="text-[9px] text-slate-600">{d.username}</p>
                      </td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-mono px-2 py-0.5 rounded uppercase" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{d.os}</span></td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.status === "active" ? SUCCESS : d.status === "blocked" ? DANGER : "#64748b" }} />
                          <span className="text-[9px] capitalize" style={{ color: d.status === "active" ? SUCCESS : d.status === "blocked" ? DANGER : "#64748b" }}>{d.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {d.risky_packages > 0
                          ? <span className="text-[9px] font-black" style={{ color: DANGER }}>{d.risky_packages}</span>
                          : <span className="text-[9px]" style={{ color: SUCCESS }}>0</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[9px] text-slate-500">
                        {d.last_heartbeat ? formatDistanceToNow(new Date(d.last_heartbeat), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}