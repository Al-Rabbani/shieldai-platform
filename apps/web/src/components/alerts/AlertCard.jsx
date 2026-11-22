import React from "react";
import { Link } from "react-router-dom";

const BORDER_COLOR = { critical: "#EF4444", high: "#F97316", medium: "#EAB308", low: "#3B82F6", info: "#64748B" };
const SEV_BADGE = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400", info: "bg-slate-500/20 text-slate-400" };

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AlertCard({ notification, onDismiss }) {
  const color = BORDER_COLOR[notification.severity] || BORDER_COLOR.info;
  return (
    <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: notification.is_read ? "#0f1729" : "#131f38", borderLeft: `3px solid ${color}`, border: "1px solid #1F2937", borderLeftWidth: 3, borderLeftColor: color }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1" data-read={notification.is_read}>
          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${SEV_BADGE[notification.severity] || SEV_BADGE.info}`}>{notification.severity}</span>
          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">{notification.type?.replace(/_/g, " ")}</span>
        </div>
        <p className="text-sm font-bold text-white">{notification.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{notification.message}</p>
        <div className="flex items-center gap-3 mt-2">
          {notification.action_url && (
            <Link to={notification.action_url} className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition">View →</Link>
          )}
          <span className="text-[10px] text-slate-600">{timeAgo(notification.created_at || notification.created_date)}</span>
        </div>
      </div>
      <button onClick={() => onDismiss(notification)} className="text-slate-500 hover:text-white transition text-sm">✕</button>
    </div>
  );
}