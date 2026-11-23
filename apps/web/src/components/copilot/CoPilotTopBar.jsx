import React from "react";
import { Link } from "react-router-dom";
import { Bell, Settings } from "lucide-react";

function gradeColor(grade) {
  if (grade === "A") return "#22c55e";
  if (grade === "B") return "#3b82f6";
  if (grade === "C") return "#f59e0b";
  return "#ef4444";
}

/* The title used to read "GDS AGENT OS v2.0" while the sidebar on the same screen read "GDS OS v9.076.2": two invented
 * version claims disagreeing with each other. There is no version constant to read in this app, but the platform does
 * publish what is deployed at GET /health/version (commit sha, branch, deploy time, migrations applied), so the badge
 * now shows that and says "unknown" rather than inventing a number when the route cannot be read.
 *
 * The bell carried notificationCount={8} hardcoded by the page and had no handler at all. GET /notifications is scoped
 * to the calling user and answers unread_only=true, so the badge is a measured count, and the bell goes somewhere. */
export default function CoPilotTopBar({ risk, unreadCount = null, version = null }) {
  const color = gradeColor(risk?.grade);
  const release = version?.sha ? version.sha.slice(0, 7) : null;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ background: "#0d1428", borderBottom: "1px solid #1e3a5f" }}>
      <span className="text-lg">🔮</span>
      <span className="text-sm font-bold text-white">GDS AGENT OS</span>
      <span
        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
        title={version ? `${version.branch || "branch unknown"} · deployed ${version.deployed_at || "unknown"} · ${version.migrations_applied ?? "?"} migrations` : "GET /health/version could not be read"}
      >
        {release ? `release ${release}` : "release unknown"}
      </span>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
      </span>

      <span className="ml-auto flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: color + "22", color, border: `1px solid ${color}55` }}>
        {risk?.overall_score ?? "—"} {risk?.grade ?? "—"} {risk?.trend === "improving" ? "↗" : risk?.trend === "degrading" ? "↘" : "→"}
      </span>

      <Link
        to="/notifications"
        title={unreadCount == null ? "Unread count unavailable" : `${unreadCount} unread notification(s)`}
        className="relative flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-slate-200"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      <Link
        to="/settings"
        title="Settings"
        className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-slate-200"
      >
        <Settings size={15} />
      </Link>
    </div>
  );
}
