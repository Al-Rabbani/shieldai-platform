import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { History, RefreshCw, Cloud, FileText, ExternalLink, ShieldCheck, FolderLock } from "lucide-react";
import AbsentStore from "@/components/platform/AbsentStore";

const EVENT_STYLE = {
  evidence_created: { label: "Evidence collected", color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/40" },
  evidence_updated: { label: "Evidence updated", color: "text-blue-300 bg-blue-500/15 border-blue-500/40" },
  evidence_synced: { label: "Synced to Drive", color: "text-purple-300 bg-purple-500/15 border-purple-500/40" },
  bundle_exported: { label: "Bundle exported", color: "text-amber-300 bg-amber-500/15 border-amber-500/40" },
};

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

function formatStamp(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function relative(iso) {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function ComplianceAuditLogPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState("all");
  const [framework, setFramework] = useState("all");
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await base44.entities.ComplianceEvidenceAudit.list("-occurred_at", 400).catch(() => []);
    setEvents(rows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const frameworks = useMemo(
    () => [...new Set(events.map((event) => event.framework).filter(Boolean))].sort(),
    [events]
  );

  const inRange = useMemo(() => {
    const cutoff = Date.now() - days * 86400000;
    return events.filter((event) => new Date(event.occurred_at || 0).getTime() >= cutoff);
  }, [events, days]);

  const visible = useMemo(
    () => inRange
      .filter((event) => eventType === "all" || event.event_type === eventType)
      .filter((event) => framework === "all" || event.framework === framework)
      .sort((a, b) => new Date(b.occurred_at || 0) - new Date(a.occurred_at || 0)),
    [inRange, eventType, framework]
  );

  const syncs = inRange.filter((event) => event.event_type === "evidence_synced");
  const updates = inRange.filter((event) => ["evidence_created", "evidence_updated"].includes(event.event_type));
  const lastSync = [...syncs].sort((a, b) => new Date(b.occurred_at || 0) - new Date(a.occurred_at || 0))[0];

  const lastSyncByFramework = useMemo(() => {
    const map = new Map();
    syncs.forEach((event) => {
      const key = event.framework || "—";
      const current = map.get(key);
      if (!current || new Date(event.occurred_at || 0) > new Date(current.occurred_at || 0)) map.set(key, event);
    });
    return [...map.entries()].sort();
  }, [syncs]);

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <History size={22} className="text-purple-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">CMP-024 | AUDIT LOG</span>
            <h1 className="text-xl font-bold text-white mt-1">Compliance evidence audit log</h1>
            <p className="text-xs text-slate-500">Every evidence update and auditor-portal sync, timestamped and attributed for reviews.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/compliance/evidence-vault" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
            <FolderLock size={13} /> Evidence vault
          </Link>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Evidence updates", value: updates.length, color: "#3b82f6" },
          { label: "Portal syncs", value: syncs.length, color: "#a855f7" },
          { label: "Last sync", value: lastSync ? relative(lastSync.occurred_at) : "never", color: "#22c55e" },
          { label: "Events logged", value: inRange.length, color: "#f59e0b" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${tile.color}` }}>
            <p className="text-lg font-bold text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 flex flex-wrap items-center gap-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="px-2 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
          <option value="all">All events</option>
          <option value="evidence_created">Evidence collected</option>
          <option value="evidence_updated">Evidence updated</option>
          <option value="evidence_synced">Synced to Drive</option>
          <option value="bundle_exported">Bundle exported</option>
        </select>
        <select value={framework} onChange={(e) => setFramework(e.target.value)} className="px-2 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none">
          <option value="all">All frameworks</option>
          {frameworks.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="flex items-center gap-1 ml-auto rounded-lg p-0.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          {RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${days === range.days ? "bg-blue-500/25 text-blue-300" : "text-slate-400 hover:text-slate-200"}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {lastSyncByFramework.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">Last sync by framework</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {lastSyncByFramework.map(([label, event]) => (
              <div key={label} className="rounded-lg px-2.5 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <div className="flex items-center gap-1.5">
                  <Cloud size={11} className="text-purple-400" />
                  <p className="text-[11px] font-semibold text-slate-200 truncate">{label}</p>
                  <span className="ml-auto text-[9px] text-slate-500 whitespace-nowrap">{relative(event.occurred_at)}</span>
                </div>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">{event.detail || "Portal folder refreshed"}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-16" />
      ) : visible.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <ShieldCheck size={22} className="mx-auto text-slate-600 mb-2" />
          <AbsentStore entity="ComplianceEvidenceAudit" what="Evidence activity:" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map((event) => {
            const style = EVENT_STYLE[event.event_type] || { label: event.event_type, color: "text-slate-300 bg-slate-500/15 border-slate-600" };
            return (
              <div key={event.id} className="rounded-xl p-2.5" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #3b82f6" }}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${style.color}`}>{style.label}</span>
                  <p className="text-[11px] font-semibold text-slate-200 truncate flex-1 min-w-0">{event.evidence_title || event.framework || "Evidence record"}</p>
                  {event.drive_url && (
                    <a href={event.drive_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-300">
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{formatStamp(event.occurred_at)}</span>
                  {event.framework && <span className="text-slate-400">· {event.framework}</span>}
                  {event.evidence_id && <span className="font-mono">· {event.evidence_id}</span>}
                  <span className="ml-auto flex items-center gap-1">
                    <FileText size={9} /> {event.actor || "system"}{event.actor_type === "system" ? " · automatic" : ""}
                  </span>
                </p>
                {event.detail && <p className="text-[10px] text-slate-400 mt-1">{event.detail}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}