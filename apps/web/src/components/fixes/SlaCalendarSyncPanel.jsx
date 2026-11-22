import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarCheck, RefreshCw, Loader2 } from "lucide-react";

export default function SlaCalendarSyncPanel() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    base44.entities.SlaCalendarEvent.list("-due_at", 100).then(setRows).catch(() => setRows([]));
  }, []);

  async function sync() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await base44.functions.invoke("gdsCriticalDeadlineSync", {});
      const data = response.data || {};
      setMessage({
        type: "ok",
        text: `${data.tracked || 0} critical deadline(s) tracked · ${data.created || 0} created, ${data.updated || 0} updated, ${data.removed || 0} removed.`,
      });
      const fresh = await base44.entities.SlaCalendarEvent.list("-due_at", 100).catch(() => []);
      setRows(fresh || []);
    } catch (error) {
      setMessage({ type: "err", text: error?.response?.data?.error || error.message });
    }
    setBusy(false);
  }

  const upcoming = rows.slice(0, 4);

  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center gap-2">
        <CalendarCheck size={14} className="text-emerald-400" />
        <p className="text-[11px] font-bold text-white">Google Calendar · critical SLA deadlines</p>
        <span className="text-[10px] text-slate-500">{rows.length} deadline event(s) synced</span>
        <button
          onClick={sync}
          disabled={busy}
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 disabled:opacity-40"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} {busy ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {message && (
        <p className={`text-[10px] mt-1.5 ${message.type === "err" ? "text-red-400" : "text-emerald-300"}`}>{message.text}</p>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {upcoming.map((row) => (
            <span key={row.id} className="px-1.5 py-0.5 rounded text-[10px] bg-[#0a0f1e] border border-slate-700 text-slate-300">
              {row.due_date} · {row.finding_title?.length > 28 ? `${row.finding_title.slice(0, 27)}…` : row.finding_title}
            </span>
          ))}
        </div>
      )}

      <p className="text-[9px] text-slate-600 mt-2">
        Open critical findings with an SLA deadline become all-day events on the app's Google Calendar, with a reminder the day before. Closed findings have their event removed. The daily 06:00 sync does this automatically.
      </p>
    </div>
  );
}