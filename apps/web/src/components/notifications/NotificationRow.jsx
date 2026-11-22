import React from "react";
import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";

const SEV_DOT = { critical: "bg-red-500", high: "bg-orange-400", medium: "bg-amber-400", low: "bg-blue-400", info: "bg-slate-500" };
const TYPE_ICON = { critical_threat: "🔴", sla_breach: "⏱️", new_finding: "☁️", scan_complete: "✅", integration_error: "⚠️", ai_insight: "🧠", compliance_fail: "📋", system: "⚙️" };

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function NotificationRow({ notification, onMarkRead }) {
  const isDrift = notification.source_entity === "ConfigurationDrift";
  const revertTo = isDrift ? `/configuration-drift?drift=${notification.source_id}` : null;

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: notification.is_read ? "#0f1729" : "#131f38", border: isDrift ? "1px solid #4a3418" : "1px solid #1F2937" }}>
      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${SEV_DOT[notification.severity] || SEV_DOT.info}`} />
      <span className="text-base flex-shrink-0">{TYPE_ICON[notification.type] || "🔔"}</span>
      <div className="flex-1 min-w-0">
        {notification.action_url ? (
          <Link to={notification.action_url} className="text-sm text-white font-medium hover:text-blue-400 transition break-words block">{notification.title}</Link>
        ) : (
          <p className="text-sm text-white font-medium break-words">{notification.title}</p>
        )}
        {notification.message && (
          <p className="text-[10px] text-slate-400 break-words mt-0.5 font-mono">{notification.message}</p>
        )}
        <p className="text-[10px] text-slate-500 mt-0.5">{timeAgo(notification.created_at || notification.created_date)}</p>
      </div>
      {isDrift && revertTo && (
        <Link to={revertTo} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition flex-shrink-0">
          <RotateCcw size={10} /> Revert
        </Link>
      )}
      {!notification.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
      {!notification.is_read && (
        <button onClick={() => onMarkRead(notification)} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex-shrink-0 whitespace-nowrap">Mark Read</button>
      )}
    </div>
  );
}