import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Search, Filter, X, Clock, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Skeleton, timeAgo } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts";

const TOOLTIP_STYLE = { background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT };

const ACTION_COLORS = {
  task_delegated: CYAN,
  task_started: "#60a5fa",
  task_progress: "#14b8a6",
  task_completed: LOW,
  task_failed: DANGER,
  task_cancelled: MEDIUM,
  collaboration_started: "#a855f7",
  collaboration_joined: "#fbbf24",
  collaboration_left: MUTED,
  config_changed: HIGH,
  status_changed: "#6366f1",
};

const ACTION_ICONS = {
  task_delegated: Activity,
  task_started: TrendingUp,
  task_progress: Activity,
  task_completed: CheckCircle,
  task_failed: AlertTriangle,
  task_cancelled: X,
  collaboration_started: Activity,
  collaboration_joined: Activity,
  collaboration_left: X,
  config_changed: FileText,
  status_changed: Activity,
};

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action] || MUTED;
  const Icon = ACTION_ICONS[action] || FileText;
  const label = action ? action.replace(/_/g, " ") : "—";
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function buildActivityTrend(events) {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayEvents = events.filter(e => {
      const t = new Date(e.created_date || e.timestamp || 0).getTime();
      return t >= d.getTime() && t < nextD.getTime();
    });
    const completed = dayEvents.filter(e => e.action_type === "task_completed").length;
    const failed = dayEvents.filter(e => e.action_type === "task_failed").length;
    days.push({ date: label, completed, failed, total: dayEvents.length });
  }
  return days.filter((_, i) => i % 3 === 0 || i === 29);
}

export default function SuperAgentAuditLog({ agents, collaborations, isLoading }) {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch audit logs from entity
  const { data: auditEvents = [], isLoading: loadAudit } = useQuery({
    queryKey: ["super-agent-audit"],
    queryFn: () => base44.entities.AuditLog.filter({
      actor_type: { $in: ["agent", "super_agent"] }
    }, "-created_date", 200).catch(() => []),
    refetchInterval: 15000,
  });

  // Enrich with agent names
  const agentMap = useMemo(() => {
    const map = {};
    (agents || []).forEach(a => { map[a.super_agent_id] = a.name; });
    return map;
  }, [agents]);

  const enrichedEvents = useMemo(() => {
    return (auditEvents || []).map(e => ({
      ...e,
      agent_name: agentMap[e.actor_id] || e.actor_id || "Unknown",
    }));
  }, [auditEvents, agentMap]);

  const filteredEvents = useMemo(() => {
    let result = enrichedEvents;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.action || e.action_type || "").toLowerCase().includes(q) ||
        (e.agent_name || "").toLowerCase().includes(q) ||
        (e.details || "").toLowerCase().includes(q)
      );
    }
    if (filterAction !== "all") {
      result = result.filter(e => (e.action_type || e.action) === filterAction);
    }
    if (filterAgent !== "all") {
      result = result.filter(e => e.actor_id === filterAgent);
    }
    return result;
  }, [enrichedEvents, search, filterAction, filterAgent]);

  const trendData = useMemo(() => buildActivityTrend(enrichedEvents), [enrichedEvents]);

  const actionCounts = useMemo(() => {
    const counts = {};
    enrichedEvents.forEach(e => {
      const key = e.action_type || e.action || "unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);
  }, [enrichedEvents]);

  const uniqueActions = useMemo(() => {
    const set = new Set(enrichedEvents.map(e => e.action_type || e.action));
    return [...set].filter(Boolean);
  }, [enrichedEvents]);

  const uniqueAgents = useMemo(() => {
    const set = new Set(enrichedEvents.map(e => e.actor_id));
    return [...set].filter(Boolean);
  }, [enrichedEvents]);

  const totalEvents = enrichedEvents.length;
  const completedCount = enrichedEvents.filter(e => e.action_type === "task_completed").length;
  const failedCount = enrichedEvents.filter(e => e.action_type === "task_failed").length;
  const successRate = totalEvents > 0 ? Math.round((completedCount / (completedCount + failedCount)) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: totalEvents, color: CYAN, desc: "Last 30 days" },
          { label: "Tasks Completed", value: completedCount, color: LOW, desc: "Success" },
          { label: "Tasks Failed", value: failedCount, color: DANGER, desc: "Requires review" },
          { label: "Success Rate", value: `${successRate}%`, color: successRate >= 80 ? LOW : successRate >= 50 ? MEDIUM : DANGER, desc: "Completion ratio" },
        ].map(({ label, value, color, desc }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-[9px] mt-1" style={{ color: MUTED }}>{desc}</p>
          </Card>
        ))}
      </div>

      {/* Trend chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Activity Trend — Last 30 Days</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Task completions and failures over time</p>
          </div>
          <div className="flex items-center gap-4 text-[10px]">
            {[["Completed", LOW], ["Failed", DANGER]].map(([label, color]) => (
              <span key={label} className="flex items-center gap-1">
                <span className="w-3 h-1.5 rounded-full" style={{ background: color }} />
                <span style={{ color: MUTED }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
        {loadAudit ? <Skeleton lines={4} /> : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ left: -20, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LOW} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={LOW} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DANGER} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={DANGER} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke={LOW} strokeWidth={2}
                fill="url(#gradCompleted)" dot={{ fill: LOW, r: 2 }} />
              <Area type="monotone" dataKey="failed" name="Failed" stroke={DANGER} strokeWidth={2}
                fill="url(#gradFailed)" dot={{ fill: DANGER, r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search events, agents, details…"
            className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterAction !== "all" ? CYAN : MUTED }}>
          <option value="all">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
        </select>
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterAgent !== "all" ? CYAN : MUTED }}>
          <option value="all">All Agents</option>
          {uniqueAgents.map(id => <option key={id} value={id}>{agentMap[id] || id}</option>)}
        </select>
        {(search || filterAction !== "all" || filterAgent !== "all") && (
          <button onClick={() => { setSearch(""); setFilterAction("all"); setFilterAgent("all"); }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
            style={{ color: DANGER, background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}>
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Event timeline */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
          <FileText className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Agent Task Audit Log</h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full ml-auto"
            style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
            {filteredEvents.length}{filteredEvents.length !== enrichedEvents.length ? ` / ${enrichedEvents.length}` : ""} events
          </span>
        </div>
        {loadAudit ? <Skeleton lines={6} /> : filteredEvents.length === 0 ? (
          <EmptyState icon={FileText} title={search || filterAction !== "all" || filterAgent !== "all" ? "No matching events" : "No audit events yet"}
            description={search || filterAction !== "all" || filterAgent !== "all" ? "Try adjusting your filters" : "Agent activity will appear here"} />
        ) : (
          <div className="divide-y" style={{ borderColor: `${BORDER}40` }}>
            {filteredEvents.slice(0, 50).map((e, i) => {
              const color = ACTION_COLORS[e.action_type] || MUTED;
              const Icon = ACTION_ICONS[e.action_type] || FileText;
              return (
                <div
                  key={e.id || i}
                  onClick={() => setSelectedEvent(selectedEvent?.id === e.id ? null : e)}
                  className="p-4 hover:bg-white/[0.02] transition-all cursor-pointer"
                  style={{ background: selectedEvent?.id === e.id ? `${CYAN}06` : "transparent" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <ActionBadge action={e.action_type} />
                        <span className="text-[10px] font-bold" style={{ color: MUTED }}>{e.agent_name}</span>
                        <span className="text-[9px]" style={{ color: MUTED }}>· {timeAgo(e.created_date)}</span>
                      </div>
                      <p className="text-xs text-white truncate">{e.action || e.action_type?.replace(/_/g, " ")}</p>
                      {e.details && (
                        <p className="text-[10px] mt-1 truncate" style={{ color: MUTED }}>{e.details}</p>
                      )}
                    </div>
                  </div>
                  {selectedEvent?.id === e.id && e.details && (
                    <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${CYAN}20` }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: CYAN }}>Full Details:</p>
                      <p className="text-[11px]" style={{ color: TEXT }}>{e.details}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}