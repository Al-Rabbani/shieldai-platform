import React from "react";
import { format } from "date-fns";

/* This banner offered a "Reset" button that called ScanJob.update(id, {status: "failed"}). With ScanJob mapped at
 * the missions table that wrote a failed status onto an agent mission, and it could never fire anyway: it waited for
 * status === 'running', which missions never store.
 *
 * It is now driven by the route's derived state: a schedule past its own next_run_at is overdue, and that is what a
 * stopped scan looks like on this platform. There is no button, because scans are started by cron and by the scanner
 * scripts - nothing on this page can restart one, and a control that writes a status it cannot change is a lie.
 */
export default function ScanJobStuckBanner({ schedule }) {
  if (!schedule) return null;

  return (
    <div className="w-full flex items-start justify-between gap-3 rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/40">
      <div>
        <p className="text-sm font-medium text-amber-400">
          ⚠️ Scan overdue — {schedule.name} was due {schedule.next_run_at ? format(new Date(schedule.next_run_at), "MMM d, HH:mm") : "unknown"}
          {schedule.minutes_overdue ? ` (${Math.round(schedule.minutes_overdue / 60)}h ago)` : ""}.
        </p>
        <p className="text-[11px] text-amber-400/80 mt-1">
          Last completed run {schedule.last_run_at ? format(new Date(schedule.last_run_at), "MMM d, HH:mm") : "never"}
          {schedule.last_error ? ` · last error: ${schedule.last_error}` : ""}. Schedules are run by cron on the host;
          they cannot be restarted from this page.
        </p>
      </div>
      <span className="text-[10px] font-bold uppercase text-amber-400 flex-shrink-0 mt-1">overdue</span>
    </div>
  );
}
