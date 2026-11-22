import React from "react";
import { formatDistanceToNow } from "date-fns";

/* The "Active Scans" panel here read the same ten missions as the bar above and rendered `s.repo_name || s.scan_type`
 * (blank on a mission) beside a status badge keyed on running/complete/queued/failed. 'completed' and 'cancelled'
 * missed every key and fell back to the QUEUED colour, so finished work wore a queued badge in slate.
 *
 * It now reads GET /scans/activity. The heading is "Scan Schedule" because that is what the platform has: six
 * cron-driven schedules, no job queue. Each row shows the schedule, when it last ran and when it runs next, and the
 * derived state - so a schedule that has stopped running shows as overdue rather than as quiet green.
 */

const STATE_COLOR = {
  scheduled: "bg-emerald-500/20 text-emerald-400",
  overdue: "bg-amber-500/20 text-amber-400",
  never_run: "bg-slate-500/20 text-slate-400",
  disabled: "bg-slate-600/20 text-slate-500",
};

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

function when(value) {
  return value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "never";
}

export default function CloudAndScansColumn({ criticalCloud, activity }) {
  const schedules = (activity && activity.schedules) || [];
  const queue = (activity && activity.queue) || {};

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-3">☁️ Critical Cloud Findings</p>
        {criticalCloud.length === 0 ? <p className="text-xs text-slate-500">No critical cloud findings.</p> : (
          <div className="space-y-2">
            {criticalCloud.slice(0, 5).map((f, i) => (
              <div key={i} className="border-b border-slate-800 last:border-0 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white truncate flex-1">{f.title}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ml-2 ${SEV_COLOR[f.severity] || SEV_COLOR.low}`}>{f.severity}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{f.service} {f.cis_control ? `· CIS ${f.cis_control}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-3">🔍 Scan Schedule</p>
        {schedules.length === 0 ? (
          <p className="text-xs text-slate-500">No scan schedules are registered, so nothing is being scanned on a cadence.</p>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs gap-2">
                <span className="text-white truncate flex-1" title={s.name}>{s.name}</span>
                <span className="text-[10px] text-slate-500 flex-shrink-0">{when(s.last_run_at)}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${STATE_COLOR[s.state] || STATE_COLOR.never_run}`}>
                  {s.state}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-600 mt-2">
          {queue.exists === false
            ? "Scans run on a schedule; this platform keeps no job queue, so nothing is ever queued between runs."
            : "Next run times are the schedule's own."}
        </p>
      </div>
    </div>
  );
}
