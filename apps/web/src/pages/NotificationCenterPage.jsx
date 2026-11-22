import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import NotificationFilterTabs from "@/components/notifications/NotificationFilterTabs";
import NotificationRow from "@/components/notifications/NotificationRow";
import NotificationPreferencesPanel from "@/components/notifications/NotificationPreferencesPanel";

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");

  useEffect(() => {
    base44.entities.Notification.list("-created_date", 30).then(setNotifications).catch(() => setNotifications([])).finally(() => setLoading(false));
  }, []);

  async function markRead(n) {
    await base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {});
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filtered = notifications.filter(n => {
    if (tab === "Unread") return !n.is_read;
    if (tab === "Critical") return n.severity === "critical";
    if (tab === "Drift") return n.source_entity === "ConfigurationDrift";
    if (tab === "Cloud") return (n.action_url || "").includes("/cloud");
    if (tab === "Compliance") return (n.action_url || "").includes("/compliance");
    if (tab === "Incidents") return (n.action_url || "").includes("/incidents");
    return true;
  });

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white">🔔 NOTIFICATIONS</h1>
        {unreadCount > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">{unreadCount} unread</span>}
      </div>

      <NotificationFilterTabs active={tab} onChange={setTab} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications in this view.</p>
          ) : (
            filtered.map(n => <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />)
          )}
        </div>
        <NotificationPreferencesPanel />
      </div>
    </div>
  );
}