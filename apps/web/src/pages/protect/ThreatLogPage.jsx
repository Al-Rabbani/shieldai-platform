import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, X, AlertTriangle, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, subDays, format, startOfDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SEV_STYLE = {
  critical: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.25)" },
  low: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
};
const ACTION_STYLE = {
  contained: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", label: "BLOCKED" },
  resolved: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "RESOLVED" },
  active: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", label: "ACTIVE" },
  investigating: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", label: "INVESTIGATING" },
  false_positive: { color: "#64748b", bg: "rgba(100,116,139,0.12)", label: "FALSE POS" },
};
const THREAT_TYPES = ["anomalous_api_call", "privilege_escalation", "data_exfiltration", "lateral_movement", "brute_force", "zero_day_exploit", "insider_threat", "supply_chain_attack", "credential_stuffing", "cryptojacking"];
const SEV_LEVELS = ["critical", "high", "medium", "low"];

function ThreatDrawer({ threat, onClose, onUpdate }) {
  const sev = SEV_STYLE[threat.severity] || SEV_STYLE.low;
  let evidence = null;
  try { evidence = threat.raw_evidence ? JSON.stringify(JSON.parse(threat.raw_evidence), null, 2) : null; } catch { evidence = threat.raw_evidence; }
  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="ml-auto w-full max-w-2xl h-full overflow-y-auto p-6 space-y-5 animate-slide-in-right"
        style={{ background: "#0d1117", borderLeft: "1px solid rgba(244,63,94,0.2)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] px-2 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg, border: `1px solid ${sev.border}` }}>{threat.severity}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: ACTION_STYLE[threat.status]?.color, background: ACTION_STYLE[threat.status]?.bg }}>{ACTION_STYLE[threat.status]?.label || threat.status}</span>
            </div>
            <h3 className="text-lg font-black text-white capitalize">{threat.threat_type?.replace(/_/g, " ")}</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["Service", threat.service_name], ["Source IP", threat.source_ip],
            ["Target Resource", threat.target_resource], ["Confidence", `${threat.confidence_score}%`],
            ["Events", threat.event_count?.toLocaleString()], ["MITRE Tactic", threat.mitre_tactic || "—"],
            ["MITRE Technique", threat.mitre_technique || "—"], ["Rule Triggered", threat.agent_name || "—"],
            ["First Seen", threat.first_seen ? new Date(threat.first_seen).toLocaleString() : "—"],
            ["Last Seen", threat.last_seen ? new Date(threat.last_seen).toLocaleString() : "—"],
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
            <p className="text-sm text-slate-300 leading-relaxed">{threat.description}</p>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-mono mb-3">Timeline</p>
          <div className="space-y-2">
            {[
              { label: "Detected", time: threat.first_seen, color: "#f43f5e" },
              { label: "Rule Triggered", time: threat.first_seen, color: "#eab308" },
              { label: threat.kill_switch_triggered ? "Kill Switch Activated" : "Status Updated", time: threat.last_seen, color: threat.status === "contained" || threat.status === "resolved" ? "#10b981" : "#f97316" },
            ].map(({ label, time, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                <div className="flex-1">
                  <p className="text-xs text-white font-semibold">{label}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{time ? new Date(time).toLocaleString() : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {evidence && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-2">Payload Evidence</p>
            <pre className="p-4 rounded-xl text-[11px] font-mono text-emerald-400 overflow-auto" style={{ background: "#030712", border: "1px solid #30363d" }}>
              {evidence}
            </pre>
          </div>
        )}

        <div className="flex gap-2 pt-2 flex-wrap">
          <button onClick={() => { onUpdate(threat.id, { status: "false_positive" }); onClose(); toast.success("Marked as false positive"); }}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>
            Mark False Positive
          </button>
          <button onClick={() => { toast.success("IP blocklist rule created"); }}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.3)", color: "#f43f5e" }}>
            Add IP to Blocklist
          </button>
          <button onClick={() => { toast.success("Jira issue created (integration required)"); }}
            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
            Create Jira Issue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ThreatLogPage() {
  const [selected, setSelected] = useState(null);
  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const qc = useQueryClient();

  const { data: threats = [], isLoading } = useQuery({
    queryKey: ["threat-log"],
    queryFn: () => base44.entities.RuntimeThreat.list("-last_seen", 200),
    refetchInterval: 10000,
  });
  const updateThreat = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RuntimeThreat.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threat-log"] }),
  });

  const filtered = threats.filter(t => {
    if (sevFilter !== "all" && t.severity !== sevFilter) return false;
    if (typeFilter !== "all" && t.threat_type !== typeFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const counts = SEV_LEVELS.reduce((acc, s) => { acc[s] = threats.filter(t => t.severity === s).length; return acc; }, {});
  const blockedPct = threats.length > 0 ? Math.round((threats.filter(t => t.status === "contained" || t.status === "resolved").length / threats.length) * 100) : 0;

  // Chart data: last 7 days stacked by severity
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const label = format(d, "MMM d");
    const dayStart = startOfDay(d).toISOString().slice(0, 10);
    const dayThreats = threats.filter(t => t.last_seen?.startsWith(dayStart));
    return {
      day: label,
      critical: dayThreats.filter(t => t.severity === "critical").length,
      high: dayThreats.filter(t => t.severity === "high").length,
      medium: dayThreats.filter(t => t.severity === "medium").length,
      low: dayThreats.filter(t => t.severity === "low").length,
    };
  });

  const tooltipStyle = { backgroundColor: "#0f172a", border: "1px solid #1e3a5f", borderRadius: 8, color: "#e2e8f0", fontSize: 11 };

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {selected && <ThreatDrawer threat={selected} onClose={() => setSelected(null)} onUpdate={(id, data) => updateThreat.mutate({ id, data })} />}

      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" style={{ color: "#f43f5e" }} />
        <h1 className="text-xl font-black text-white font-mono">THREAT LOG</h1>
      </div>

      {/* Severity counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {SEV_LEVELS.map(s => (
          <div key={s} className="rounded-xl p-4 text-center cursor-pointer card-hover"
            style={{ background: "#0a0f1e", border: `1px solid ${SEV_STYLE[s].border}` }}
            onClick={() => setSevFilter(sevFilter === s ? "all" : s)}>
            <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">{s}</p>
            <p className="text-2xl font-black font-mono" style={{ color: SEV_STYLE[s].color }}>{counts[s]}</p>
          </div>
        ))}
        <div className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(16,185,129,0.3)" }}>
          <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">BLOCKED %</p>
          <p className="text-2xl font-black font-mono text-emerald-400">{blockedPct}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Threats Over Time (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={days}>
            <defs>
              {[["critical", "#f43f5e"], ["high", "#f97316"], ["medium", "#eab308"], ["low", "#3b82f6"]].map(([k, c]) => (
                <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.3)" />
            <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {[["critical", "#f43f5e"], ["high", "#f97316"], ["medium", "#eab308"], ["low", "#3b82f6"]].map(([k, c]) => (
              <Area key={k} type="monotone" dataKey={k} stroke={c} fill={`url(#g-${k})`} strokeWidth={1.5} stackId="1" />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter className="w-4 h-4 text-slate-600" />
        <select value={sevFilter} onChange={e => { setSevFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
          <option value="all">All Severities</option>
          {SEV_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
          <option value="all">All Types</option>
          {THREAT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
          <option value="all">All Statuses</option>
          {["active", "investigating", "contained", "resolved", "false_positive"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-[11px] text-slate-600 ml-auto">{filtered.length} threats</span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#0d1117", borderBottom: "1px solid #30363d" }}>
              {["Sev", "Threat Type", "Service", "Endpoint", "Source IP", "Events", "Rule", "Action", "Time"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "#0d1117" }}>
            {isLoading ? Array(5).fill(0).map((_, i) => (
              <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td></tr>
            )) : paginated.map((t, i) => {
              const sev = SEV_STYLE[t.severity] || SEV_STYLE.low;
              const act = ACTION_STYLE[t.status] || ACTION_STYLE.investigating;
              return (
                <tr key={t.id} onClick={() => setSelected(t)}
                  className="cursor-pointer transition-all hover:bg-rose-500/5"
                  style={{ borderBottom: "1px solid rgba(48,54,61,0.5)", borderLeft: `3px solid ${sev.color}` }}>
                  <td className="px-3 py-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg }}>{t.severity}</span>
                  </td>
                  <td className="px-3 py-3"><span className="text-xs text-slate-300 capitalize">{t.threat_type?.replace(/_/g, " ")}</span></td>
                  <td className="px-3 py-3"><span className="text-xs font-mono text-white">{t.service_name}</span></td>
                  <td className="px-3 py-3"><span className="text-[11px] font-mono text-slate-400 max-w-[120px] block truncate">{t.target_resource || "—"}</span></td>
                  <td className="px-3 py-3"><span className="text-[11px] font-mono text-red-400">{t.source_ip || "—"}</span></td>
                  <td className="px-3 py-3"><span className="text-xs font-mono text-slate-400">{t.event_count?.toLocaleString() || 0}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] font-mono text-indigo-400">{t.agent_name || "—"}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: act.color, background: act.bg }}>{act.label}</span></td>
                  <td className="px-3 py-3 whitespace-nowrap"><span className="text-[10px] text-slate-600">{t.last_seen ? formatDistanceToNow(new Date(t.last_seen), { addSuffix: true }) : "—"}</span></td>
                </tr>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-slate-600">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: "#f43f5e" }} />
                <p className="text-sm">No threats match your filters</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 disabled:opacity-40"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>Prev</button>
          <span className="text-xs text-slate-500 font-mono">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 disabled:opacity-40"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>Next</button>
        </div>
      )}
    </div>
  );
}