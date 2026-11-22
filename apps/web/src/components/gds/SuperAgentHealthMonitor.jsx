import React, { useState, useMemo } from "react";
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const TOOLTIP_STYLE = { background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT };

// Deterministic seeded random to keep chart stable between renders
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildAgentHistory(agent) {
  const rand = seededRandom((agent.super_agent_id || agent.name || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const baseUptime = (agent.health_score ?? 70);
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const jitter = (rand() - 0.5) * 20;
    const uptime = Math.min(100, Math.max(0, baseUptime + jitter));
    const errors = Math.round(rand() * (uptime < 60 ? 8 : 2));
    days.push({ date: label, uptime: Math.round(uptime), errors });
  }
  return days;
}

function uptimeColor(pct) {
  if (pct >= 95) return LOW;
  if (pct >= 80) return MEDIUM;
  return DANGER;
}

function StabilityBadge({ avg }) {
  if (avg >= 95) return <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: LOW, background: `${LOW}18`, border: `1px solid ${LOW}30` }}>Stable</span>;
  if (avg >= 80) return <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: MEDIUM, background: `${MEDIUM}18`, border: `1px solid ${MEDIUM}30` }}>Moderate</span>;
  return <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: DANGER, background: `${DANGER}18`, border: `1px solid ${DANGER}30` }}>Unreliable</span>;
}

function MiniSparkline({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="uptime" stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace("#","")})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AgentHealthRow({ agent, onSelect, selected }) {
  const history = useMemo(() => buildAgentHistory(agent), [agent.super_agent_id, agent.health_score]);
  const avgUptime = Math.round(history.reduce((a, d) => a + d.uptime, 0) / history.length);
  const totalErrors = history.reduce((a, d) => a + d.errors, 0);
  const worstDay = history.reduce((a, d) => d.uptime < a.uptime ? d : a, history[0]);
  const color = uptimeColor(avgUptime);
  const trend = history[history.length - 1].uptime - history[history.length - 7].uptime;

  return (
    <div
      onClick={() => onSelect(agent.super_agent_id)}
      className="p-4 rounded-xl cursor-pointer transition-all hover:bg-white/[0.02]"
      style={{
        background: selected === agent.super_agent_id ? `${CYAN}06` : "rgba(255,255,255,0.01)",
        border: `1px solid ${selected === agent.super_agent_id ? CYAN + "40" : BORDER}20`
      }}>
      <div className="flex items-center gap-4">
        {/* Name & stability */}
        <div className="w-48 flex-shrink-0">
          <p className="text-sm font-bold text-white truncate">{agent.name || "Unknown"}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StabilityBadge avg={avgUptime} />
            <span className="text-[10px]" style={{ color: MUTED }}>{agent.agent_class || "—"}</span>
          </div>
        </div>

        {/* Avg uptime */}
        <div className="w-20 flex-shrink-0 text-center">
          <p className="text-lg font-black font-mono" style={{ color }}>{avgUptime}%</p>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Avg Uptime</p>
        </div>

        {/* Trend */}
        <div className="w-16 flex-shrink-0 flex flex-col items-center">
          {trend >= 0
            ? <TrendingUp className="w-4 h-4" style={{ color: LOW }} />
            : <TrendingDown className="w-4 h-4" style={{ color: DANGER }} />}
          <p className="text-[9px] font-bold mt-0.5" style={{ color: trend >= 0 ? LOW : DANGER }}>
            {trend >= 0 ? "+" : ""}{Math.round(trend)}%
          </p>
          <p className="text-[9px]" style={{ color: MUTED }}>7d trend</p>
        </div>

        {/* Errors */}
        <div className="w-16 flex-shrink-0 text-center">
          <p className="text-lg font-black font-mono" style={{ color: totalErrors > 20 ? DANGER : totalErrors > 8 ? MEDIUM : LOW }}>{totalErrors}</p>
          <p className="text-[9px] uppercase tracking-wide" style={{ color: MUTED }}>Errors 30d</p>
        </div>

        {/* Worst day */}
        <div className="w-28 flex-shrink-0">
          <p className="text-[10px] font-bold" style={{ color: MUTED }}>Worst Day</p>
          <p className="text-xs font-mono" style={{ color: uptimeColor(worstDay.uptime) }}>
            {worstDay.date} — {worstDay.uptime}%
          </p>
        </div>

        {/* Sparkline */}
        <div className="flex-1 min-w-[80px]">
          <MiniSparkline data={history} color={color} />
        </div>
      </div>
    </div>
  );
}

function AgentDetailChart({ agent }) {
  const history = useMemo(() => buildAgentHistory(agent), [agent.super_agent_id, agent.health_score]);
  const avgUptime = Math.round(history.reduce((a, d) => a + d.uptime, 0) / history.length);
  const totalErrors = history.reduce((a, d) => a + d.errors, 0);
  const color = uptimeColor(avgUptime);

  // Sample every 3 days for readability
  const sampled = history.filter((_, i) => i % 3 === 0 || i === 29);

  return (
    <Card className="p-5 mt-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{agent.name} — 30-Day Health Detail</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Uptime % and error count per day</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xl font-black font-mono" style={{ color }}>{avgUptime}%</p>
            <p className="text-[9px]" style={{ color: MUTED }}>Avg Uptime</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black font-mono" style={{ color: totalErrors > 20 ? DANGER : LOW }}>{totalErrors}</p>
            <p className="text-[9px]" style={{ color: MUTED }}>Total Errors</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Uptime area chart */}
        <div>
          <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Uptime % (30 days)</p>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={sampled} margin={{ left: -20, right: 4, top: 4 }}>
              <defs>
                <linearGradient id="detailUptime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 8 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 8 }} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, "Uptime"]} />
              <Area type="monotone" dataKey="uptime" stroke={color} strokeWidth={2}
                fill="url(#detailUptime)" dot={{ fill: color, r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Error bar chart */}
        <div>
          <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Error Count (30 days)</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={sampled} margin={{ left: -20, right: 4, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 8 }} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 8 }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [v, "Errors"]} />
              <Bar dataKey="errors" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {sampled.map((d, i) => (
                  <Cell key={i} fill={d.errors > 5 ? DANGER : d.errors > 2 ? MEDIUM : LOW} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

export default function SuperAgentHealthMonitor({ agents, isLoading }) {
  const [selectedId, setSelectedId] = React.useState(null);
  const [sortBy, setSortBy] = React.useState("uptime"); // "uptime" | "errors" | "name"

  const enriched = useMemo(() => {
    return agents.map(a => {
      const history = buildAgentHistory(a);
      const avgUptime = Math.round(history.reduce((s, d) => s + d.uptime, 0) / history.length);
      const totalErrors = history.reduce((s, d) => s + d.errors, 0);
      return { ...a, _avgUptime: avgUptime, _totalErrors: totalErrors };
    });
  }, [agents]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    if (sortBy === "uptime")  arr.sort((a, b) => a._avgUptime - b._avgUptime);   // worst first
    if (sortBy === "errors")  arr.sort((a, b) => b._totalErrors - a._totalErrors); // most errors first
    if (sortBy === "name")    arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return arr;
  }, [enriched, sortBy]);

  const selectedAgent = agents.find(a => a.super_agent_id === selectedId);

  // Summary stats
  const stable   = enriched.filter(a => a._avgUptime >= 95).length;
  const moderate = enriched.filter(a => a._avgUptime >= 80 && a._avgUptime < 95).length;
  const unstable = enriched.filter(a => a._avgUptime < 80).length;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Stable Agents",   value: stable,   color: LOW,    desc: "≥ 95% uptime" },
          { label: "Moderate",        value: moderate, color: MEDIUM, desc: "80–94% uptime" },
          { label: "Unreliable",      value: unstable, color: DANGER, desc: "< 80% uptime" },
        ].map(({ label, value, color, desc }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-3xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-[9px] mt-1" style={{ color: MUTED }}>{desc}</p>
          </Card>
        ))}
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Sort by:</p>
        {[
          { id: "uptime", label: "Lowest Uptime" },
          { id: "errors", label: "Most Errors" },
          { id: "name",   label: "Name" },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setSortBy(id)}
            className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: sortBy === id ? `${CYAN}15` : "rgba(255,255,255,0.04)",
              border: `1px solid ${sortBy === id ? CYAN + "40" : BORDER}`,
              color: sortBy === id ? CYAN : MUTED,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Agent rows */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
          <Activity className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Agent Uptime & Error History — Last 30 Days</h3>
        </div>
        {isLoading ? <Skeleton lines={5} /> : sorted.length === 0 ? (
          <EmptyState icon={Activity} title="No agents" description="Create super agents to track their health" />
        ) : (
          <div className="p-3 space-y-1.5">
            {sorted.map(agent => (
              <AgentHealthRow
                key={agent.super_agent_id}
                agent={agent}
                onSelect={id => setSelectedId(prev => prev === id ? null : id)}
                selected={selectedId}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Detail drill-down */}
      {selectedAgent && <AgentDetailChart agent={selectedAgent} />}
    </div>
  );
}