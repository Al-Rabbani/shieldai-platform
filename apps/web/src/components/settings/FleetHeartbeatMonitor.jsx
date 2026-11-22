import React, { useMemo } from "react";
import { HeartPulse } from "lucide-react";

const BUCKETS = {
  live: { label: "Live", color: "#10b981", track: "#065f46" },
  recent: { label: "Recent", color: "#3b82f6", track: "#1e3a8a" },
  stale: { label: "Stale", color: "#f59e0b", track: "#78350f" },
  cold: { label: "Cold", color: "#ef4444", track: "#7f1d1d" },
};

function ageMs(agent) {
  if (!agent.last_heartbeat) return null;
  const ms = Date.now() - new Date(agent.last_heartbeat).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function bucketOf(ms) {
  if (ms == null) return "cold";
  if (ms < 5 * 60000) return "live";
  if (ms < 3600000) return "recent";
  if (ms < 86400000) return "stale";
  return "cold";
}

function ageText(ms) {
  if (ms == null) return "No heartbeat recorded";
  if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.round(ms / 3600000)}h ago`;
  return `${Math.round(ms / 86400000)}d ago`;
}

export default function FleetHeartbeatMonitor({ agents = [] }) {
  const rows = useMemo(
    () =>
      agents
        .map((agent) => {
          const ms = ageMs(agent);
          return { agent, ms, bucket: bucketOf(ms) };
        })
        .sort((a, b) => (a.ms == null ? Infinity : a.ms) - (b.ms == null ? Infinity : b.ms)),
    [agents]
  );

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.bucket]: (acc[r.bucket] || 0) + 1 }), {});

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-2">
          <HeartPulse size={16} className="text-red-400" />
          <h2 className="text-sm font-bold text-white">Heartbeat Monitor</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(BUCKETS).map(([key, meta]) => (
            <span key={key} className="text-[11px] text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: meta.color }} />
              {meta.label}: <span className="font-bold text-white">{counts[key] || 0}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="max-h-[260px] overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No agents registered.</p>
        ) : (
          rows.map(({ agent, ms, bucket }) => {
            const meta = BUCKETS[bucket];
            const position = ms == null ? 0 : Math.min(100, (ms / 86400000) * 100);
            return (
              <div key={agent.id} className="flex items-center gap-3 py-1.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${bucket === "live" ? "animate-pulse-green" : ""}`}
                  style={{ background: meta.color }}
                />
                <span className="w-40 truncate text-xs text-slate-300" title={agent.display_name || agent.name}>
                  {agent.display_name || agent.name}
                </span>
                <div className="relative flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#0a0f1e" }}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${100 - position}%`, background: `${meta.color}55` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-3 rounded-sm" style={{ left: `${Math.max(0, Math.min(98, 100 - position))}%`, background: meta.color }} />
                </div>
                <span className="w-24 text-right text-[10px] flex-shrink-0" style={{ color: meta.color }}>{ageText(ms)}</span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-slate-600 mt-2">
        Track spans 24 hours for each agent, positioned by its recorded last heartbeat. A heartbeat is telemetry only and
        does not prove a worker is running.
      </p>
    </div>
  );
}