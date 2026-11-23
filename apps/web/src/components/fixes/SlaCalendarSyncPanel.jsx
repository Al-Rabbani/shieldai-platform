import React from "react";
import { CalendarCheck, CalendarX } from "lucide-react";

/**
 * This panel claimed a Google Calendar sync that does not exist.
 *
 * Measured 23 Nov 2026 on this host: there is no SlaCalendarEvent store (no table matched calendar/event), the function
 * gdsCriticalDeadlineSync is refused by the adapter, the root crontab holds no calendar entry (certbot,
 * docker-builder-prune, e2scrub_all, gds-paging, gds-webhooks, root.crontab, sysstat), and there is no Google service
 * account - no /opt/*.json and no GOOGLE_APPLICATION_CREDENTIALS in /opt/.env. The panel nevertheless read
 * "0 deadline event(s) synced" beside a working Sync button and stated "The daily 06:00 sync does this automatically",
 * so an integration that does not exist looked like one sitting idle.
 */
export default function SlaCalendarSyncPanel() {
  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center gap-2">
        <CalendarX size={14} className="text-slate-500" />
        <p className="text-[11px] font-bold text-white">Google Calendar · critical SLA deadlines</p>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-300 border border-slate-600">
          not connected
        </span>
      </div>

      <p className="text-[10px] text-slate-400 mt-1.5">
        No deadline has been synced, and none can be: this host has no Google service account, no calendar sync job runs
        on any schedule, and there is no store recording a synced event. Nothing here is a count of zero events; it is
        the absence of the integration.
      </p>

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <CalendarCheck size={12} className="text-slate-600" />
        <p className="text-[9px] text-slate-600">
          To make this real it needs a Google service account with calendar scope in /opt/.env, a scheduled job, and a
          store for the event ids it creates. Until then no critical finding has an external calendar reminder.
        </p>
      </div>
    </div>
  );
}
