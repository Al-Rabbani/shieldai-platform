import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, CheckCheck, Trash2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#475569" };
const TYPE_ICON = { critical_threat: "🔴", sla_breach: "⏰", new_finding: "🔍", scan_complete: "✅", integration_error: "⚠️", ai_insight: "🧠", compliance_fail: "📋", system: "⚙️" };
const TYPE_COLOR = {
  critical_threat: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)" },
  sla_breach: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)" },
  ai_insight: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
  compliance_fail: { color: "#06b6d4", bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)" },
  scan_complete: { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
  integration_error: { color: "#f43f5e", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.25)" },
  system: { color: "#475569", bg: "rgba(71,85,105,0.1)", border: "rgba(71,85,105,0.25)" },
};

const FILTER_TABS = [
  { key: "all", label: "ALL" },
  { key: "unread", label: "UNREAD" },
  { key: "critical", label: "CRITICAL" },
  { key: "sla_breach", label: "SLA" },
  { key: "critical_threat", label: "THREATS" },
  { key: "ai_insight", label: "INTEL" },
  { key: "system", label: "SYSTEM" },
];

const ACTION_URLS = { critical_threat: "/runtime", sla_breach: "/sla-tracker", ai_insight: "/ai-engine", compliance_fail: "/compliance", integration_error: "/integrations", scan_complete: "/code" };

function timeAgo(ts) {
  if (!ts) return "";
  try { return formatDistanceToNow(new Date(ts), { addSuffix: true }); } catch { return ""; }
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications-page"],
    queryFn: () => base44.entities.Notification.list("-created_at", 200),
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-page"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-page"] }),
  });

  const deleteSelected = useMutation({
    mutationFn: async () => {
      await Promise.all([...selected].map(id => base44.entities.Notification.delete(id)));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications-page"] }); setSelected(new Set()); },
  });

  const filtered = notifications.filter(n => {
    if (filter === "unread") return !n.read;
    if (filter === "critical") return n.severity === "critical";
    if (filter === "all") return true;
    return n.type === filter;
  });

  const unread = notifications.filter(n => !n.read).length;
  const critical = notifications.filter(n => n.severity === "critical").length;

  function toggleSelect(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white font-mono">NOTIFICATION CENTRE</h1>
            {unread > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                style={{ color: "#ef4444", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                {unread} NEW
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-mono">All platform alerts, threats, and system messages</p>
        </div>
        <button onClick={() => markAllRead.mutate()} disabled={unread === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white btn-interactive disabled:opacity-40"
          style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.5)" }}>
          <CheckCheck className="w-4 h-4" /> Mark All Read
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "UNREAD", val: unread, color: "#3b82f6", pulse: unread > 0 },
          { label: "CRITICAL UNREAD", val: critical, color: "#ef4444", pulse: critical > 0 },
          { label: "TOTAL", val: notifications.length, color: "#475569" },
        ].map(({ label, val, color, pulse }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: `${color}0d`, border: `1px solid ${color}25` }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
              <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {FILTER_TABS.map(({ key, label }) => {
          const cnt = key === "unread" ? unread : key === "critical" ? critical : key === "all" ? notifications.length : notifications.filter(n => n.type === key).length;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold flex-shrink-0 transition-all"
              style={{
                background: filter === key ? "rgba(59,130,246,0.15)" : "#0a0f1e",
                color: filter === key ? "#60a5fa" : "#475569",
                border: `1px solid ${filter === key ? "rgba(59,130,246,0.35)" : "rgba(30,58,95,0.4)"}`,
              }}>
              {label}
              {cnt > 0 && (
                <span className="px-1 rounded text-[9px]" style={{ background: filter === key ? "rgba(59,130,246,0.3)" : "rgba(71,85,105,0.3)", color: filter === key ? "#93c5fd" : "#64748b" }}>
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <span className="text-xs text-slate-400 font-mono">{selected.size} selected</span>
          <button onClick={() => deleteSelected.mutate()}
            className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-semibold btn-interactive"
            style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="text-[11px] text-slate-600 hover:text-white ml-auto transition-colors">Clear</button>
        </div>
      )}

      {/* Notification list */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
        {isLoading ? (
          <div className="py-12 text-center text-slate-600">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-600">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-25" />
            <p className="text-sm font-semibold">No notifications</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(30,58,95,0.3)" }}>
            {filtered.map((n) => {
              const sevColor = SEV_COLOR[n.severity] || "#475569";
              const typeStyle = TYPE_COLOR[n.type] || TYPE_COLOR.system;
              const actionUrl = ACTION_URLS[n.type];
              return (
                <div key={n.id}
                  onClick={() => { toggleSelect(n.id); if (!n.read) markRead.mutate(n.id); }}
                  className="flex items-start gap-3 px-5 py-4 hover:bg-white/2 cursor-pointer transition-all group"
                  style={{
                    background: !n.read ? "rgba(59,130,246,0.03)" : selected.has(n.id) ? "rgba(59,130,246,0.05)" : "transparent",
                    borderLeft: n.severity === "critical" ? `3px solid #ef4444` : "3px solid transparent",
                  }}>

                  <input type="checkbox" checked={selected.has(n.id)} onChange={() => {}} className="mt-1 flex-shrink-0 cursor-pointer" />

                  {/* Severity dot */}
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: sevColor, boxShadow: n.severity === "critical" ? `0 0 6px ${sevColor}` : "none" }} />

                  {/* Type icon */}
                  <span className="flex-shrink-0 text-base mt-0.5">{TYPE_ICON[n.type] || "📌"}</span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase"
                        style={{ color: typeStyle.color, background: typeStyle.bg, border: `1px solid ${typeStyle.border}` }}>
                        {n.type?.replace(/_/g, " ")}
                      </span>
                      {!n.read && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse"
                          style={{ color: "#60a5fa", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <p className={`text-sm text-white leading-snug ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-[10px] font-mono text-slate-600">{timeAgo(n.created_at)}</p>
                    {actionUrl && (
                      <a href={actionUrl}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-mono text-blue-400 hover:text-blue-300">
                        View <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}