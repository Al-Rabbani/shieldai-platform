import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, RefreshCw, CheckCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, MUTED,
  SevBadge, Skeleton, EmptyState, Card, Breadcrumb, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

const SEVERITIES = ["all","critical","high","medium","low"];
const CHANNELS = ["all","email","slack","webhook","in_app"];

export default function GDSNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sevFilter, setSevFilter] = useState("all");
  const [chanFilter, setChanFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const r = await base44.functions.invoke("gdsNotificationEngine", { action: "unread" });
      if (r.data?.notifications) setNotifications(r.data.notifications);
      else if (Array.isArray(r.data)) setNotifications(r.data);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await base44.functions.invoke("gdsNotificationEngine", { action: "mark_read", notification_id: id });
      setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    } catch (e) {}
  };

  const filtered = notifications.filter(n => {
    const sv = sevFilter === "all" || n.severity === sevFilter;
    const ch = chanFilter === "all" || n.channel === chanFilter;
    return sv && ch;
  });

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Notifications" }]} />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Notifications</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>{notifications.filter(n => !n.read).length} unread</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {["Severity:", ...SEVERITIES].map((s, i) => i === 0
          ? <span key="l" className="text-xs font-bold" style={{ color: MUTED }}>{s}</span>
          : <button key={s} onClick={() => setSevFilter(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: sevFilter === s ? `${CYAN}20` : "transparent", border: `1px solid ${sevFilter === s ? CYAN + "40" : BORDER}`, color: sevFilter === s ? CYAN : MUTED }}>
              {s}
            </button>
        )}
        <span className="text-xs font-bold ml-4" style={{ color: MUTED }}>Channel:</span>
        {CHANNELS.map(c => (
          <button key={c} onClick={() => setChanFilter(c)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: chanFilter === c ? `${CYAN}20` : "transparent", border: `1px solid ${chanFilter === c ? CYAN + "40" : BORDER}`, color: chanFilter === c ? CYAN : MUTED }}>
            {c}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? <Skeleton lines={5} /> : filtered.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="All clear — no matching notifications" />
        ) : (
          <div>
            {filtered.map((n, i) => {
              const isUnread = !n.read;
              return (
                <div key={n.id || i}
                  className="flex items-start gap-4 px-5 py-4 border-b hover:bg-white/[0.02] transition-all"
                  style={{ borderColor: BORDER + "30", background: isUnread ? "rgba(0,212,255,0.02)" : "transparent" }}>
                  {isUnread && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse" style={{ background: CYAN }} />}
                  <div className="flex-1 min-w-0" style={{ marginLeft: isUnread ? 0 : "14px" }}>
                    <p className="text-sm font-semibold text-white">{n.title || n.message}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {n.severity && <SevBadge sev={n.severity} />}
                      {n.channel && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{ color: CYAN, background: `${CYAN}15` }}>{n.channel}</span>
                      )}
                      <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(n.created_date || n.sent_at)}</span>
                    </div>
                  </div>
                  {isUnread && n.id && (
                    <button onClick={() => markRead(n.id)}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                      style={{ background: `${CYAN}12`, color: CYAN, border: `1px solid ${CYAN}20` }}>
                      <CheckCircle className="w-3 h-3" /> Mark Read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}