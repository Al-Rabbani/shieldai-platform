import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, SevBadge, timeAgo } from "@/components/gds/GDSOSShared";

const CHANNEL_COLOR = { email: CYAN, slack: "#4a154b", webhook: HIGH, default: MUTED };

export default function GDSNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const r = await base44.functions.invoke("gdsNotificationEngine", { action: "unread" });
      if (r.data?.notifications) setNotifications(r.data.notifications);
      if (r.data?.unread_count != null) setUnread(r.data.unread_count);
      else setUnread(r.data?.notifications?.filter(n => !n.read)?.length ?? 0);
    } catch (e) {}
  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markRead = async (id) => {
    try {
      await base44.functions.invoke("gdsNotificationEngine", { action: "mark_read", notification_id: id });
      setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
      setUnread(u => Math.max(0, u - 1));
    } catch (e) {}
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        className="relative p-2 rounded-lg hover:bg-white/5 transition-all">
        <Bell className="w-4 h-4" style={{ color: unread > 0 ? CYAN : "#64748b" }} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
            style={{ background: DANGER, color: "#fff" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 shadow-2xl"
          style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: BORDER }}>
            <span className="text-sm font-bold text-white">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                  style={{ background: `${DANGER}20`, color: DANGER }}>{unread} unread</span>
              )}
              <button onClick={() => setOpen(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs" style={{ color: MUTED }}>No notifications</div>
            ) : (
              notifications.slice(0, 15).map((n, i) => {
                const isUnread = !n.read;
                const chColor = CHANNEL_COLOR[n.channel] || CHANNEL_COLOR.default;
                return (
                  <div key={n.id || i}
                    onClick={() => { if (isUnread && n.id) markRead(n.id); }}
                    className="flex items-start gap-3 px-4 py-3 border-b cursor-pointer hover:bg-white/5 transition-all"
                    style={{ borderColor: BORDER + "30", background: isUnread ? "rgba(0,212,255,0.03)" : "transparent" }}>
                    {isUnread && <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 animate-pulse" style={{ background: CYAN }} />}
                    <div className="flex-1 min-w-0" style={{ marginLeft: isUnread ? 0 : "10px" }}>
                      <p className="text-[11px] font-semibold text-white truncate">{n.title || n.message}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {n.severity && <SevBadge sev={n.severity} />}
                        {n.channel && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                            style={{ color: chColor, background: `${chColor}15` }}>{n.channel}</span>
                        )}
                        <span className="text-[9px]" style={{ color: MUTED }}>{timeAgo(n.created_date || n.sent_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2.5 border-t" style={{ borderColor: BORDER }}>
            <Link to="/notifications" onClick={() => setOpen(false)}
              className="text-xs font-bold hover:opacity-80 transition-opacity"
              style={{ color: CYAN }}>
              View All Notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}