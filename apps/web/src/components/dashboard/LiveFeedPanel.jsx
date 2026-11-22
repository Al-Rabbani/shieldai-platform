import React, { useEffect, useRef } from "react";

const SEV_COLOR = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

function timeAgo(dateStr) {
  if (!dateStr) return "just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATIC_FEED = [
  { severity: "critical", message: "Zero-day exploit in prod-api — CVE-2026-9981", time: "1m ago" },
  { severity: "high", message: "Privilege escalation attempt blocked on prod-db", time: "3m ago" },
  { severity: "critical", message: "Data exfiltration path confirmed — kill switch ready", time: "7m ago" },
  { severity: "high", message: "1,240 brute-force attempts on /api/auth/login", time: "12m ago" },
  { severity: "medium", message: "S3 bucket public access misconfiguration detected", time: "18m ago" },
  { severity: "high", message: "SLA breach: CVE-2026-1234 in auth-service (48h limit)", time: "22m ago" },
  { severity: "critical", message: "APT29 TTP pattern matched across 4 runtime events", time: "31m ago" },
  { severity: "medium", message: "Container image CVE approaching patch deadline", time: "45m ago" },
];

export default function LiveFeedPanel({ notifications = [] }) {
  const scrollRef = useRef(null);

  const feed = notifications.length > 0
    ? notifications.slice(0, 15).map(n => ({
        severity: n.severity,
        message: n.message?.slice(0, 80) || n.title,
        time: timeAgo(n.created_at),
      }))
    : STATIC_FEED;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const interval = setInterval(() => {
      el.scrollTop += 1;
      if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
        el.scrollTop = 0;
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl overflow-hidden flex flex-col h-full" style={{
      background: "#0a0f1e",
      border: "1px solid rgba(30,58,95,0.5)",
      minHeight: 280
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[11px] font-mono font-semibold text-red-400 tracking-widest">◉ LIVE FEED</span>
        <span className="ml-auto text-[10px] text-slate-600 font-mono">{feed.length} events</span>
      </div>

      {/* Feed */}
      <div ref={scrollRef} className="flex-1 overflow-hidden py-1" style={{ maxHeight: 280 }}>
        {[...feed, ...feed].map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 px-4 py-2 hover:bg-white/3 transition-colors">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
              style={{ background: SEV_COLOR[item.severity] || "#6b7280", boxShadow: `0 0 4px ${SEV_COLOR[item.severity] || "#6b7280"}` }} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">{item.message}</p>
              <p className="text-[9px] font-mono text-slate-600 mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}