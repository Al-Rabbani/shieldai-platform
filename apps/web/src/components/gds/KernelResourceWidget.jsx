import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, Cpu, GitCompare, AlertTriangle, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const STATUS_COLOR = {
  initializing: MUTED, planning: "#60a5fa", executing: MEDIUM,
  completed: LOW, failed: DANGER, awaiting_approval: HIGH,
};

const QUEUE_STATUSES = ["initializing", "planning", "executing", "awaiting_approval"];

export default function KernelResourceWidget({ sessions = [], events = [], isLoading }) {
  const active = useMemo(() => sessions.filter(s => QUEUE_STATUSES.includes(s.status)), [sessions]);
  const queued = useMemo(() => sessions.filter(s => s.status === "awaiting_approval"), [sessions]);
  const executing = useMemo(() => sessions.filter(s => s.status === "executing"), [sessions]);

  // Throughput: sessions per intent type (active only)
  const intentBreakdown = useMemo(() => {
    const counts = {};
    active.forEach(s => { counts[s.intent_type || "query"] = (counts[s.intent_type || "query"] || 0) + 1; });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [active]);

  // Avg duration of recently completed sessions as proxy for resource pressure
  const recentCompleted = useMemo(() => sessions.filter(s => s.status === "completed" && s.duration_ms > 0).slice(0, 10), [sessions]);
  const avgDurationMs = recentCompleted.length > 0
    ? Math.round(recentCompleted.reduce((a, s) => a + s.duration_ms, 0) / recentCompleted.length)
    : 0;

  // Queue depth over last 8 status snapshots (approximate from sessions list)
  const queueDepth = active.length;
  const MAX_CAPACITY = 10;
  const loadPct = Math.min((active.length / MAX_CAPACITY) * 100, 100);
  const loadColor = loadPct >= 80 ? DANGER : loadPct >= 50 ? MEDIUM : LOW;

  // Recent critical events count
  const recentErrors = useMemo(() =>
    events.filter(e => e.severity === "critical" || e.severity === "error").length
  , [events]);

  const tooltipStyle = {
    background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0"
  };

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Resource Consumption & Queue</h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ background: `${loadColor}15`, color: loadColor, border: `1px solid ${loadColor}30` }}>
            {loadPct >= 80 ? "⚠ BOTTLENECK RISK" : loadPct >= 50 ? "MODERATE LOAD" : "HEALTHY"}
          </span>
        </div>
        <Link to="/kernel/compare"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80 transition-all"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <GitCompare className="w-3.5 h-3.5" />
          Compare Sessions
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Queue Depth",    value: queueDepth,      color: loadColor,  sub: "active + pending" },
          { label: "Executing",      value: executing.length, color: MEDIUM,     sub: "running now" },
          { label: "Pending Approval", value: queued.length,  color: queued.length > 0 ? HIGH : MUTED, sub: "blocked on approval" },
          { label: "Avg Duration",   value: avgDurationMs > 0 ? `${(avgDurationMs / 1000).toFixed(1)}s` : "—", color: "#60a5fa", sub: "last 10 completed" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="p-3 rounded-xl text-center"
            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Capacity gauge */}
        <div className="p-4 rounded-xl flex flex-col items-center justify-center"
          style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${loadColor}25` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Capacity Used</p>
          <div className="relative w-16 h-16 mb-2">
            <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
              <circle cx="32" cy="32" r="26" fill="none" stroke={loadColor} strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26 * loadPct / 100} ${2 * Math.PI * 26}`}
                style={{ transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 4px ${loadColor}88)` }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black font-mono" style={{ color: loadColor }}>{loadPct.toFixed(0)}%</span>
            </div>
          </div>
          <p className="text-[10px] font-bold" style={{ color: loadColor }}>{active.length} / {MAX_CAPACITY} slots</p>
          {recentErrors > 0 && (
            <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded-lg"
              style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}25` }}>
              <AlertTriangle className="w-3 h-3" style={{ color: DANGER }} />
              <span className="text-[10px] font-bold" style={{ color: DANGER }}>{recentErrors} recent errors</span>
            </div>
          )}
        </div>

        {/* Queue status breakdown */}
        <div className="p-4 rounded-xl"
          style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Queue by Status</p>
          <div className="space-y-2.5">
            {[
              { label: "Initializing",   status: "initializing",    color: MUTED },
              { label: "Planning",       status: "planning",        color: "#60a5fa" },
              { label: "Executing",      status: "executing",       color: MEDIUM },
              { label: "Awaiting OK",    status: "awaiting_approval", color: HIGH },
            ].map(({ label, status, color }) => {
              const count = sessions.filter(s => s.status === status).length;
              const maxCount = Math.max(...QUEUE_STATUSES.map(st => sessions.filter(s => s.status === st).length), 1);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-[11px]" style={{ color: MUTED }}>{label}</span>
                    </div>
                    <span className="text-[11px] font-black font-mono" style={{ color: count > 0 ? color : MUTED }}>{count}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${count > 0 ? (count / maxCount) * 100 : 0}%`, background: color, boxShadow: count > 0 ? `0 0 4px ${color}55` : "none" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active sessions by intent type */}
        <div className="p-4 rounded-xl"
          style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Active by Intent</p>
          {intentBreakdown.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-24">
                <Zap className="w-6 h-6 mb-1" style={{ color: LOW }} />
                <p className="text-[11px] font-bold" style={{ color: LOW }}>Kernel idle</p>
              </div>
            )
            : (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={intentBreakdown} layout="vertical" margin={{ left: -10, right: 8 }}>
                  <XAxis type="number" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} width={70} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="count" name="Sessions" radius={[0, 3, 3, 0]} maxBarSize={14}>
                    {intentBreakdown.map((_, i) => (
                      <Cell key={i} fill={CYAN} opacity={0.7 - i * 0.07} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>
    </Card>
  );
}