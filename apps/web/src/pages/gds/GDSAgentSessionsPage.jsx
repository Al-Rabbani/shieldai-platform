import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock3, Filter, X, Inbox, Play } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, EmptyState, Skeleton, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";
import GDSPageShell from "@/components/gds/GDSPageShell";

function StatusBadge({ status }) {
  const map = {
    completed: [LOW, "Completed"],
    failed: [DANGER, "Failed"],
    running: [HIGH, "Running"],
    executing: [HIGH, "Executing"],
    queued: [MEDIUM, "Queued"],
    pending: [MEDIUM, "Pending"],
  };
  const [color, label] = map[status?.toLowerCase()] || [MUTED, status];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

export default function GDSAgentSessionsPage() {
  const [filterAgent, setFilterAgent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTrigger, setFilterTrigger] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["agent-sessions"],
    queryFn: () => base44.functions.invoke("gdsAgentRuntime", { action: "telemetry" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const sessions = data?.sessions || [];
  const queuedJobs = data?.queued_jobs || [];

  const filteredSessions = useMemo(() => {
    let result = sessions;
    if (filterAgent) result = result.filter(s => (s.agent_id || "").includes(filterAgent));
    if (filterStatus) result = result.filter(s => s.status === filterStatus);
    if (filterTrigger) result = result.filter(s => s.trigger_type === filterTrigger);
    return result;
  }, [sessions, filterAgent, filterStatus, filterTrigger]);

  const hasFilters = filterAgent || filterStatus || filterTrigger;

  return (
    <GDSPageShell
      title="Agent Sessions"
      breadcrumbs={[{ label: "Agent Runtime", path: "/agents" }, { label: "Sessions" }]}
      version="EDP-003 v1.0"
      live
    >
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Sessions", value: data?.total_sessions ?? 0, color: CYAN },
          { label: "Completed", value: data?.completed ?? 0, color: LOW },
          { label: "Failed", value: data?.failed ?? 0, color: DANGER },
          { label: "Avg Duration ms", value: data?.avg_duration_ms ?? 0, color: "#60a5fa" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Session Log Table */}
      <Card className="mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Session Log</h3>
        </div>

        {/* Filter Bar */}
        <div className="px-4 pt-2.5 pb-2 border-b space-y-2" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={filterAgent}
              onChange={e => setFilterAgent(e.target.value)}
              placeholder="Filter by agent_id…"
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterStatus ? CYAN : MUTED }}>
              <option value="">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
              <option value="queued">Queued</option>
            </select>
            <select value={filterTrigger} onChange={e => setFilterTrigger(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterTrigger ? CYAN : MUTED }}>
              <option value="">All Triggers</option>
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="event">Event</option>
              <option value="api">API</option>
            </select>
            {hasFilters && (
              <button onClick={() => { setFilterAgent(""); setFilterStatus(""); setFilterTrigger(""); }}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                style={{ color: DANGER, background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}>
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            <span className="text-[10px] ml-auto" style={{ color: MUTED }}>
              {filteredSessions.length}{hasFilters ? ` of ${sessions.length}` : ""} sessions
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
          </div>
        ) : filteredSessions.length === 0 ? (
          <EmptyState icon={Clock3} title={hasFilters ? "No matching sessions" : "No sessions yet"} description={hasFilters ? "Try adjusting filters" : "Agent sessions will appear here"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Session ID", "Agent", "Trigger", "Status", "Intent", "Stage", "Duration", "Started"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s, i) => (
                  <tr key={s.session_id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: TEXT }}>{(s.session_id || "").slice(0, 20)}…</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: MUTED }}>{(s.agent_id || "").slice(0, 16)}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] capitalize px-2 py-0.5 rounded"
                        style={{ color: CYAN, background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}>
                        {s.trigger_type || "manual"}
                      </span>
                    </td>
                    <td className="py-2 px-3"><StatusBadge status={s.status} /></td>
                    <td className="py-2 px-3 max-w-[160px] truncate" style={{ color: TEXT }}>{s.intent || "—"}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: CYAN }}>Stage {s.pipeline_stage || 1}</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: CYAN }}>{s.duration_ms || 0}ms</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(s.started_at || s.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Agent Queue Panel */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Agent Queue</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{queuedJobs.length} queued</span>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
          </div>
        ) : queuedJobs.length === 0 ? (
          <EmptyState icon={Inbox} title="Queue is empty" description="No pending jobs" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Queue ID", "Agent", "Task", "Priority", "Status", "Scheduled", "Attempts"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                  <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {queuedJobs.map((job, i) => (
                  <tr key={job.queue_id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: TEXT }}>{(job.queue_id || "").slice(0, 20)}…</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: MUTED }}>{job.agent_id}</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: TEXT }}>{job.task_name || "—"}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                        job.priority === "critical" ? "text-red-400 bg-red-500/15" :
                        job.priority === "high" ? "text-orange-400 bg-orange-500/15" :
                        "text-gray-400 bg-gray-500/15"
                      }`}>
                        {job.priority}
                      </span>
                    </td>
                    <td className="py-2 px-3"><StatusBadge status={job.status} /></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(job.scheduled_at)}</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: MUTED }}>{job.attempts || 0}/{job.max_attempts || 3}</td>
                    <td className="py-2 px-3">
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                        style={{ color: DANGER, background: `${DANGER}10`, border: `1px solid ${DANGER}25` }}>
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </GDSPageShell>
  );
}