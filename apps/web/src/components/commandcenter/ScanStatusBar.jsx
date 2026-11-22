import React from "react";
import { formatDistanceToNow } from "date-fns";

/* What this bar used to say, and why it was wrong (measured 22 Nov 2026):
 *
 * It received ten agent missions (ScanJob was mapped at /missions) and labelled each one. It knew three statuses -
 * running, complete, failed - and everything else fell through to a "⏳ Queued" pill. Missions store 'completed' and
 * 'cancelled', neither of which matched, so nine finished missions were drawn as queued work, and the name was blank
 * because it read repo_name/scan_type while missions carry `goal`.
 *
 * It now reads GET /scans/activity: six cron-driven schedules with a derived state and their real last and next run.
 * The platform keeps no scan queue, so the bar says that in words rather than drawing an empty rail that reads as
 * "nothing is happening".
 */

const STATE_STYLE = {
  scheduled: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  overdue: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  never_run: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  disabled: "bg-slate-600/15 text-slate-500 border-slate-600/30",
};

const STATE_ICON = { scheduled: "✓", overdue: "⚠", never_run: "·", disabled: "⏸" };

function label(state, schedule) {
  if (state === "overdue") {
    return `overdue by ${schedule.minutes_overdue}m`;
  }
  if (state === "never_run") {
    return "never run";
  }
  if (state === "disabled") {
    return "disabled";
  }
  return schedule.last_run_at
    ? `ran ${formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}`
    : "scheduled";
}

export default function ScanStatusBar({ activity }) {
  const schedules = (activity && activity.schedules) || [];
  const counts = (activity && activity.counts) || {};
  const queue = (activity && activity.queue) || {};

  if (schedules.length === 0) {
    return (
      <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Scan Schedule</span>
        <p className="text-xs text-slate-500 mt-1">
          No scan schedules are registered, so nothing is being scanned on a cadence.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Scan Schedule</span>
        <span className="text-[10px] text-slate-500">
          {counts.total ?? schedules.length} schedules
          {counts.overdue ? ` · ${counts.overdue} overdue` : " · none overdue"}
          {queue.exists === false ? " · no scan queue on this platform" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        {schedules.map((schedule) => {
          const state = schedule.state || "scheduled";
          return (
            <span
              key={schedule.id}
              title={
                schedule.last_error
                  ? `Last error: ${schedule.last_error}`
                  : `Last run ${schedule.last_run_at || "never"} · next ${schedule.next_run_at || "unscheduled"}`
              }
              className={`flex-shrink-0 text-[11px] font-medium px-3 py-1 rounded-full border ${STATE_STYLE[state] || STATE_STYLE.scheduled}`}
            >
              {STATE_ICON[state] || "·"} {schedule.name} — {label(state, schedule)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
