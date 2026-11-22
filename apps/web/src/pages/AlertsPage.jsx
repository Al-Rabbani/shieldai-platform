import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import AlertCard from "@/components/alerts/AlertCard";
import AuditLogTable from "@/components/alerts/AuditLogTable";

export default function AlertsPage() {
  const [notifications, setNotifications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const knownIds = useRef(new Set());

  const load = useCallback(async (isPoll = false) => {
    if (!isPoll) setLoading(true);
    const [n, l] = await Promise.all([
      base44.entities.Notification.list("-created_date", 50).catch(() => []),
      base44.entities.AuditLog.list("-timestamp", 30).catch(() => []),
    ]);
    const visible = n.filter(x => !x.is_dismissed);
    if (isPoll && knownIds.current.size > 0) {
      const fresh = visible.filter(x => !knownIds.current.has(x.id));
      if (fresh.length > 0) setNewCount(c => c + fresh.length);
    }
    visible.forEach(x => knownIds.current.add(x.id));
    setNotifications(visible);
    setLogs(l);
    if (!isPoll) setLoading(false);
  }, []);

  useEffect(() => { load(false); }, [load]);
  useEffect(() => {
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  async function dismiss(notification) {
    await base44.entities.Notification.update(notification.id, { is_dismissed: true, is_read: true });
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  function refreshNow() {
    setNewCount(0);
    load(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white">Live Security Alert Feed</h1>
        {unreadCount > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">{unreadCount} unread</span>}
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
            Mark All Read
          </button>
        )}
      </div>

      {newCount > 0 && (
        <button onClick={refreshNow} className="w-full text-center py-2 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
          {newCount} new alert{newCount > 1 ? "s" : ""} — click to refresh
        </button>
      )}

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : notifications.length === 0 ? (
        <p className="text-sm text-slate-500">No active alerts.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => <AlertCard key={n.id} notification={n} onDismiss={dismiss} />)}
        </div>
      )}

      <h2 className="text-sm font-bold text-white mt-6 mb-2">Recent Agent Actions</h2>
      <AuditLogTable logs={logs} />
    </div>
  );
}