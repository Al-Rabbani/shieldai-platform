import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarClock, Pause, Play, RefreshCw, Info, Cpu, ShieldAlert } from "lucide-react";
import { CopilotBreadcrumb, COPILOT_PAGE_BG, COPILOT_CARD, BORDER, MUTED, TEXT, timeAgo } from "@/components/gds/CopilotShared";

/**
 * The autonomous loop, as it really is.
 *
 * A cron job on the host (/opt/gds-os/apps/api/run_autonomous_missions.py, every 30 minutes under flock) has been
 * launching real missions since October. Nothing in this app could see it: its history lived in a log file and a state
 * file it overwrites, and its registry is a file on the host. This page reads GET /copilot/scheduler, which reports that
 * file, the run log, the budget position and the bridge limiter, and it can pause or resume an entry by rewriting the
 * registry atomically.
 *
 * What it cannot do: create a new schedule (the registry is a host file), cancel a mission already running, or raise the
 * daily cap from here.
 */
const STATUS_COLOR = {
  completed: "#4ade80",
  failed: "#f87171",
  skipped: "#fbbf24",
  running: "#93c5fd",
  paused: "#fbbf24",
  resumed: "#4ade80",
};

export default function GDSCoPilotSchedulerPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await base44.platform.scheduler());
    } catch (err) {
      setError(err.message || "The scheduler could not be read.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(entry) {
    setBusy(entry.name);
    setNotice(null);
    setError(null);
    try {
      const result = entry.paused
        ? await base44.platform.resumeSchedule(entry.name)
        : await base44.platform.pauseSchedule(entry.name);
      setNotice(
        result.already
          ? `${entry.name} was already ${result.paused ? "paused" : "running"}.`
          : result.paused
            ? `${entry.name} paused. The next cron tick skips it; a mission already running is not cancelled.`
            : `${entry.name} resumed, due at its next tick after ${Math.round(result.interval_seconds / 60)} minutes.`
      );
      await load();
    } catch (err) {
      setError(err.message || "That control could not be applied.");
    } finally {
      setBusy(null);
    }
  }

  const budget = data?.budget;
  const limiter = data?.bridge_limiter;
  const runs = data?.runs || [];

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Autonomous Scheduler" }]} />

      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: TEXT }}>Autonomous Scheduler</h1>
          <p className="text-[12px] mt-1" style={{ color: MUTED }}>
            The cron loop that launches missions without anyone pressing a button, and the controls over it.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-[11px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
          style={{ background: "#141d35", border: `1px solid ${BORDER}`, color: TEXT, cursor: loading ? "wait" : "pointer" }}
        >
          <RefreshCw size={12} /> {loading ? "Reading…" : "Re-read"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-3 mb-4 text-[11px]" style={{ background: "#2a1215", border: "1px solid #7f1d1d", color: "#fca5a5" }}>
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl p-3 mb-4 text-[11px]" style={{ background: "#0f2a1a", border: "1px solid #166534", color: "#86efac" }}>
          {notice}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-4" style={COPILOT_CARD}>
          <div className="text-[10px] font-semibold tracking-wider flex items-center gap-1.5" style={{ color: MUTED }}>
            <Cpu size={11} /> SCHEDULER
          </div>
          <div className="text-[13px] font-bold mt-1" style={{ color: TEXT }}>
            {data ? (data.scheduler.in_process ? "In-process" : "Host cron") : "—"}
          </div>
          <div className="text-[10px] mt-1 leading-relaxed" style={{ color: MUTED }}>
            {data?.scheduler.how || "reading the registry"}
          </div>
        </div>
        <div className="rounded-xl p-4" style={COPILOT_CARD}>
          <div className="text-[10px] font-semibold tracking-wider" style={{ color: MUTED }}>SPEND TODAY</div>
          <div className="text-2xl font-bold mt-1" style={{ color: budget?.held ? "#f87171" : TEXT }}>
            {budget ? `$${budget.spent_today_usd.toFixed(4)}` : "—"}
          </div>
          <div className="text-[10px] mt-1" style={{ color: MUTED }}>
            {budget ? `of $${budget.daily_cap_usd.toFixed(2)} daily cap${budget.held ? " — held" : ""}` : "cap unknown"}
          </div>
        </div>
        <div className="rounded-xl p-4" style={COPILOT_CARD}>
          <div className="text-[10px] font-semibold tracking-wider flex items-center gap-1.5" style={{ color: MUTED }}>
            <ShieldAlert size={11} /> BRIDGE LAUNCHES
          </div>
          <div className="text-2xl font-bold mt-1" style={{ color: limiter?.exhausted ? "#f87171" : TEXT }}>
            {limiter?.measured ? `${limiter.count}/${limiter.limit}` : "—"}
          </div>
          <div className="text-[10px] mt-1" style={{ color: MUTED }}>
            {limiter?.measured
              ? `this hour per host; resets in ${Math.round(limiter.reset_in_seconds / 60)} min`
              : "limiter not readable"}
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden mb-5" style={COPILOT_CARD}>
        <div className="px-4 py-3 text-[11px] font-semibold flex items-center gap-1.5" style={{ borderBottom: `1px solid ${BORDER}`, color: TEXT }}>
          <CalendarClock size={13} /> Scheduled missions
        </div>
        {!loading && data && data.entries.length === 0 && (
          <div className="px-4 py-6 text-[12px]" style={{ color: MUTED }}>
            The registry holds no entries, so nothing is scheduled.
          </div>
        )}
        {(data?.entries || []).map(entry => (
          <div key={entry.name} className="px-4 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-bold" style={{ color: TEXT }}>{entry.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#141d35", border: `1px solid ${BORDER}`, color: entry.paused ? "#fbbf24" : "#93c5fd" }}>
                    {entry.paused ? "PAUSED" : entry.interval_human}
                  </span>
                  {entry.due_now && !entry.paused && (
                    <span className="text-[10px]" style={{ color: "#fbbf24" }}>due at the next tick</span>
                  )}
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: MUTED }}>{entry.goal_preview}…</p>
                <p className="text-[10px] mt-1" style={{ color: MUTED }}>
                  agents {entry.agents.join(", ") || "auto-select"} · next due{" "}
                  {entry.next_due_at ? timeAgo(entry.next_due_at) : "unknown"} · last run{" "}
                  {entry.last_run ? `${entry.last_run.status} ${entry.last_run.started_at ? timeAgo(entry.last_run.started_at) : ""}` : "not in this log"}
                </p>
                {entry.last_run && (
                  <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                    {entry.last_run.agents_succeeded ?? "—"}/{entry.last_run.agents ?? "—"} agents ·{" "}
                    {entry.last_run.tool_calls ?? "—"} tool calls ·{" "}
                    {entry.last_run.duration_ms ? `${Math.round(entry.last_run.duration_ms / 1000)}s` : "—"} ·{" "}
                    {entry.last_run.cost_usd != null ? `$${entry.last_run.cost_usd.toFixed(5)}` : "cost not recorded"}
                  </p>
                )}
              </div>
              <button
                onClick={() => toggle(entry)}
                disabled={busy === entry.name}
                className="text-[11px] font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 flex-shrink-0"
                style={{
                  background: entry.paused ? "#0f2a1a" : "#2a1215",
                  border: `1px solid ${entry.paused ? "#166534" : "#7f1d1d"}`,
                  color: entry.paused ? "#86efac" : "#fca5a5",
                  cursor: busy === entry.name ? "wait" : "pointer",
                }}
              >
                {entry.paused ? <Play size={11} /> : <Pause size={11} />}
                {busy === entry.name ? "Working…" : entry.paused ? "Resume" : "Pause"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden mb-5" style={COPILOT_CARD}>
        <div className="px-4 py-3 text-[11px] font-semibold" style={{ borderBottom: `1px solid ${BORDER}`, color: TEXT }}>
          Run log
        </div>
        {!loading && runs.length === 0 && (
          <div className="px-4 py-6 text-[12px]" style={{ color: MUTED }}>
            No run has been recorded yet. Before this page existed, runs were only in /var/log/gds-autonomous.log.
          </div>
        )}
        {runs.map((run, index) => (
          <div key={`${run.schedule_name}-${run.started_at}-${index}`} className="px-4 py-2 flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "#141d35", border: `1px solid ${BORDER}`, color: STATUS_COLOR[run.status] || MUTED }}>
                {run.status.toUpperCase()}
              </span>
              <span className="text-[11px]" style={{ color: TEXT }}>{run.schedule_name}</span>
              {run.kind === "control" && <span className="text-[10px]" style={{ color: MUTED }}>control{run.actor_email ? ` by ${run.actor_email}` : ""}</span>}
              {run.mission_id && <span className="text-[10px]" style={{ color: MUTED }}>{run.mission_id}</span>}
              {run.detail && <span className="text-[10px]" style={{ color: MUTED }}>{run.detail.slice(0, 120)}</span>}
            </div>
            <span className="text-[10px]" style={{ color: MUTED }}>
              {run.started_at ? timeAgo(run.started_at) : "unknown"}
              {run.cost_usd != null ? ` · $${run.cost_usd.toFixed(5)}` : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4" style={COPILOT_CARD}>
        <div className="text-[11px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: TEXT }}>
          <Info size={12} /> What this is, and what it is not
        </div>
        <ul className="space-y-1.5">
          {(data?.limits || []).map(limit => (
            <li key={limit} className="text-[11px] leading-relaxed" style={{ color: MUTED }}>· {limit}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
