import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, ArrowRight, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const SEV_STYLE = {
  critical: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)", stripe: "#f43f5e" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", stripe: "#f97316" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.25)", stripe: "#eab308" },
  low: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)", stripe: "#3b82f6" },
};
const ACTION_STYLE = {
  blocked: { color: "#f43f5e", bg: "rgba(244,63,94,0.15)", label: "BLOCKED" },
  contained: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", label: "CONTAINED" },
  rate_limited: { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "RATE LIMITED" },
  logged: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "LOGGED" },
  investigating: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", label: "INVESTIGATING" },
  active: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", label: "ACTIVE" },
  resolved: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "RESOLVED" },
};
const THREAT_COLORS = ["#f43f5e", "#f97316", "#eab308", "#8b5cf6", "#06b6d4", "#10b981", "#3b82f6", "#ec4899"];
const COUNTRY_FLAGS = { RU: "🇷🇺", CN: "🇨🇳", US: "🇺🇸", DE: "🇩🇪", NL: "🇳🇱", IR: "🇮🇷", BR: "🇧🇷", GB: "🇬🇧", KR: "🇰🇷", IN: "🇮🇳" };

function ThreatDrawer({ threat, onClose }) {
  if (!threat) return null;
  const sev = SEV_STYLE[threat.severity] || SEV_STYLE.low;
  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="ml-auto w-full max-w-xl h-full overflow-y-auto p-6 space-y-5 animate-slide-in-right"
        style={{ background: "#0d1117", borderLeft: "1px solid rgba(244,63,94,0.2)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] px-2 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>{threat.severity}</span>
              <span className="text-[11px] px-2 py-0.5 rounded font-semibold capitalize" style={{ color: ACTION_STYLE[threat.status]?.color, background: ACTION_STYLE[threat.status]?.bg }}>{ACTION_STYLE[threat.status]?.label || threat.status}</span>
            </div>
            <h3 className="text-base font-bold text-white capitalize">{threat.threat_type?.replace(/_/g, " ")}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Service", threat.service_name],
            ["Source IP", threat.source_ip],
            ["Target", threat.target_resource],
            ["Confidence", `${threat.confidence_score}%`],
            ["Events", threat.event_count?.toLocaleString()],
            ["MITRE Tactic", threat.mitre_tactic || "—"],
            ["MITRE Technique", threat.mitre_technique || "—"],
            ["Rule Triggered", threat.agent_name || "—"],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">{k}</p>
              <p className="text-xs text-white font-mono truncate">{v}</p>
            </div>
          ))}
        </div>
        {threat.description && (
          <div className="p-4 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-2">Description</p>
            <p className="text-xs text-slate-300 leading-relaxed">{threat.description}</p>
          </div>
        )}
        {threat.raw_evidence && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-2">Raw Evidence</p>
            <pre className="p-4 rounded-xl text-[11px] font-mono text-emerald-400 overflow-auto" style={{ background: "#030712", border: "1px solid #30363d" }}>
              {JSON.stringify(JSON.parse(threat.raw_evidence), null, 2)}
            </pre>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <Link to="/protect/threats" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-all hover:opacity-90"
            style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)", color: "#f43f5e" }}>
            View Full Threat Log
          </Link>
          <Link to="/protect/firewall" className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-all hover:opacity-90"
            style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
            Manage Rules
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ProtectOverview() {
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [newIds, setNewIds] = useState(new Set());

  const { data: threats = [], isLoading: threatsLoading } = useQuery({
    queryKey: ["protect-threats"],
    queryFn: () => base44.entities.RuntimeThreat.list("-last_seen", 50),
    refetchInterval: 10000,
  });
  const { data: fwRules = [] } = useQuery({ queryKey: ["protect-fw"], queryFn: () => base44.entities.FirewallRule.list("-updated_date", 100) });
  const { data: scEvents = [] } = useQuery({ queryKey: ["protect-sc"], queryFn: () => base44.entities.SupplyChainEvent.list("-detected_at", 50) });
  const { data: botEvents = [] } = useQuery({ queryKey: ["protect-bots"], queryFn: () => base44.entities.BotEvent.list("-detected_at", 50) });

  // Track new rows
  useEffect(() => {
    if (threats.length > 0) {
      const ids = new Set(threats.slice(0, 3).map(t => t.id));
      setNewIds(ids);
      const t = setTimeout(() => setNewIds(new Set()), 3000);
      return () => clearTimeout(t);
    }
  }, [threats.length]);

  const today = new Date().toISOString().slice(0, 10);
  const blockedToday = threats.filter(t => (t.status === "contained" || t.status === "resolved") && t.last_seen?.startsWith(today)).length;
  const activeRules = fwRules.filter(r => r.enabled).length;
  const botBlocked = botEvents.filter(b => b.status === "blocked" || b.status === "rate_limited").length;
  const zeroDays = threats.filter(t => t.threat_type === "zero_day_exploit").length;

  // Donut chart data
  const threatTypeCounts = {};
  threats.forEach(t => { threatTypeCounts[t.threat_type?.replace(/_/g, " ")] = (threatTypeCounts[t.threat_type?.replace(/_/g, " ")] || 0) + 1; });
  const donutData = Object.entries(threatTypeCounts).map(([name, value]) => ({ name, value }));

  // Country bar chart
  const countryCounts = {};
  threats.forEach(t => {
    if (t.source_ip) {
      const key = t.source_ip.split(".").slice(0, 2).join(".");
      countryCounts[key] = (countryCounts[key] || 0) + (t.event_count || 1);
    }
  });
  botEvents.forEach(b => { if (b.country) countryCounts[b.country] = (countryCounts[b.country] || 0) + (b.total_requests || 1); });
  const countryData = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

  const tooltipStyle = { backgroundColor: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 8, color: "#e2e8f0", fontSize: 11 };

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {selectedThreat && <ThreatDrawer threat={selectedThreat} onClose={() => setSelectedThreat(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-5 h-5" style={{ color: "#f43f5e" }} />
            <h1 className="text-xl font-black text-white font-mono tracking-tight">RUNTIME PROTECTION</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#f43f5e" }} />
              <span className="text-[10px] font-mono font-bold" style={{ color: "#f43f5e" }}>◉ LIVE</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Firewall · Supply Chain · Bot Protection · 0-Day Blocking</p>
        </div>
        <div className="flex gap-2">
          {[
            { label: "Firewall", path: "/protect/firewall" },
            { label: "Threats", path: "/protect/threats" },
            { label: "Supply Chain", path: "/protect/supply-chain" },
            { label: "Bots", path: "/protect/bots" },
          ].map(l => (
            <Link key={l.path} to={l.path} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:text-white"
              style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.5)", color: "#64748b" }}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "THREATS BLOCKED TODAY", val: blockedToday, color: "#f43f5e", path: "/protect/threats" },
          { label: "ACTIVE RULES", val: activeRules, color: "#3b82f6", path: "/protect/firewall" },
          { label: "SUPPLY CHAIN EVENTS", val: scEvents.length, color: "#f97316", path: "/protect/supply-chain" },
          { label: "BOTS BLOCKED", val: botBlocked, color: "#eab308", path: "/protect/bots" },
          { label: "0-DAYS INTERCEPTED", val: zeroDays, color: "#be185d", path: "/protect/threats" },
        ].map(({ label, val, color, path }) => (
          <Link key={label} to={path} className="rounded-xl p-4 text-center card-hover" style={{ background: "#0a0f1e", border: `1px solid ${color}25` }}>
            <div className="flex items-center justify-center gap-1 mb-2">
              <Shield className="w-3 h-3" style={{ color }} />
              <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
          </Link>
        ))}
      </div>

      {/* Live Threat Feed */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid rgba(244,63,94,0.2)" }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(244,63,94,0.15)" }}>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white">Live Threat Feed</h3>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>
              <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#f43f5e" }} />
              <span className="text-[9px] font-mono font-bold" style={{ color: "#f43f5e" }}>AUTO-REFRESH 10s</span>
            </div>
          </div>
          <Link to="/protect/threats" className="text-[11px] font-mono text-slate-500 hover:text-white flex items-center gap-1">
            Full Log <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#030712", borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
                {["Severity", "Threat Type", "Service", "Endpoint", "Source IP", "Country", "Rule", "Action", "Time"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threats.slice(0, 25).map((t, i) => {
                const sev = SEV_STYLE[t.severity] || SEV_STYLE.low;
                const act = ACTION_STYLE[t.status] || ACTION_STYLE.logged;
                const isNew = newIds.has(t.id);
                return (
                  <tr key={t.id} onClick={() => setSelectedThreat(t)}
                    className="cursor-pointer transition-all hover:bg-rose-500/5 animate-slide-in-up"
                    style={{
                      borderBottom: "1px solid rgba(30,58,95,0.25)",
                      background: isNew ? "rgba(244,63,94,0.06)" : i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.3)",
                      borderLeft: isNew ? "3px solid #f43f5e" : `3px solid ${sev.stripe}`,
                      animationDelay: `${i * 20}ms`,
                    }}>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>{t.severity}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] text-slate-300 capitalize">{t.threat_type?.replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-4 py-2.5"><span className="text-[11px] font-mono text-white">{t.service_name}</span></td>
                    <td className="px-4 py-2.5"><span className="text-[11px] font-mono text-slate-400 max-w-[120px] block truncate">{t.target_resource || "—"}</span></td>
                    <td className="px-4 py-2.5"><span className="text-[11px] font-mono text-red-400">{t.source_ip || "—"}</span></td>
                    <td className="px-4 py-2.5"><span className="text-base">🌐</span></td>
                    <td className="px-4 py-2.5"><span className="text-[10px] font-mono text-indigo-400">{t.agent_name || "—"}</span></td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: act.color, background: act.bg }}>{act.label}</span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-[10px] text-slate-600 font-mono">
                        {t.last_seen ? formatDistanceToNow(new Date(t.last_seen), { addSuffix: true }) : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {threatsLoading && Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td></tr>
              ))}
              {!threatsLoading && threats.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-600">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "#f43f5e" }} />
                  <p className="text-sm">No threats detected — all clear</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Threat Breakdown by Type</h3>
          {donutData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={3}>
                  {donutData.map((_, i) => <Cell key={i} fill={THREAT_COLORS[i % THREAT_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-60 flex items-center justify-center text-slate-600 text-sm">No data yet</div>}
        </div>

        <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Top Attack Sources</h3>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={countryData} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.3)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#475569", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#f43f5e" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-60 flex items-center justify-center text-slate-600 text-sm">No data yet</div>}
        </div>
      </div>
    </div>
  );
}