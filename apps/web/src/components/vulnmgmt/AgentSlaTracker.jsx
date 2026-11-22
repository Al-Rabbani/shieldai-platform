import React, { useMemo, useState } from "react";
import { Timer, CheckCircle2, AlertTriangle } from "lucide-react";

const SLA_HOURS = { critical: 24, high: 72, medium: 168, low: 720, info: 720 };

function hoursBetween(from, to) {
  if (!from || !to) return null;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(diff) || diff < 0) return null;
  return diff / 3600000;
}

function formatHours(hours) {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function AgentSlaTracker({ pending = [], fixed = [], agents = [] }) {
  const [showTasks, setShowTasks] = useState(false);

  const label = (key) => {
    const match = agents.find((a) => a.canonical_agent_id === key || a.agent_id === key || a.name === key || a.display_name === key);
    return match ? match.display_name || match.name : key;
  };

  const resolvedTasks = useMemo(() => {
    return fixed
      .map((f) => {
        const severity = f.severity || f.normalized_severity || "medium";
        const start = f.remediation_started_at || f.detected_at;
        const taken = hoursBetween(start, f.fixed_at);
        const target = SLA_HOURS[severity] ?? SLA_HOURS.medium;
        const breached =
          f.sla_breached === true ||
          (taken != null && taken > target) ||
          (f.sla_deadline && f.fixed_at && new Date(f.fixed_at) > new Date(f.sla_deadline));
        return {
          ...f,
          agent_key: f.fixed_by_agent_id || f.assigned_to || "Unattributed",
          severity,
          taken,
          target,
          breached,
        };
      })
      .filter((f) => f.taken != null);
  }, [fixed]);

  const perAgent = useMemo(() => {
    const map = new Map();
    resolvedTasks.forEach((task) => {
      const entry = map.get(task.agent_key) || { key: task.agent_key, tasks: [], within: 0, breached: 0 };
      entry.tasks.push(task);
      if (task.breached) entry.breached += 1;
      else entry.within += 1;
      map.set(task.agent_key, entry);
    });
    pending.forEach((f) => {
      const key = f.assigned_to || f.assigned_agent_id;
      if (!key) return;
      const entry = map.get(key) || { key, tasks: [], within: 0, breached: 0 };
      entry.open = (entry.open || 0) + 1;
      if (f.sla_deadline && new Date(f.sla_deadline) < new Date()) entry.overdue = (entry.overdue || 0) + 1;
      map.set(key, entry);
    });
    return [...map.values()]
      .map((entry) => {
        const avg = entry.tasks.length
          ? entry.tasks.reduce((sum, t) => sum + t.taken, 0) / entry.tasks.length
          : null;
        const avgTarget = entry.tasks.length
          ? entry.tasks.reduce((sum, t) => sum + t.target, 0) / entry.tasks.length
          : null;
        const resolved = entry.tasks.length;
        return {
          ...entry,
          avg,
          avgTarget,
          resolved,
          adherence: resolved ? Math.round((entry.within / resolved) * 100) : null,
        };
      })
      .sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));
  }, [resolvedTasks, pending]);

  const totals = useMemo(() => {
    const resolved = resolvedTasks.length;
    const avg = resolved ? resolvedTasks.reduce((s, t) => s + t.taken, 0) / resolved : null;
    const within = resolvedTasks.filter((t) => !t.breached).length;
    return { resolved, avg, within, breached: resolved - within };
  }, [resolvedTasks]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Avg resolution", value: formatHours(totals.avg), color: "#3b82f6" },
          { label: "Resolved tasks", value: totals.resolved, color: "#10b981" },
          { label: "Within SLA", value: totals.resolved ? `${Math.round((totals.within / totals.resolved) * 100)}%` : "—", color: "#10b981" },
          { label: "SLA breached", value: totals.breached, color: "#ef4444" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-[9px] uppercase text-slate-500">{item.label}</p>
            <p className="text-lg font-bold font-mono" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ borderBottom: "1px solid #1F2937" }}>
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <Timer size={13} className="text-blue-400" /> Average resolution time per agent
          </p>
          <span className="text-[9px] text-slate-500">SLA target: C 24h · H 72h · M 7d · L 30d</span>
        </div>

        {perAgent.length === 0 ? (
          <p className="text-center py-8 text-xs text-slate-500">
            No resolved tasks with timestamps yet. Resolution time is measured from remediation start (or detection) to fix.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {perAgent.map((entry) => (
              <div key={entry.key} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-100 flex-1 min-w-0 truncate">{label(entry.key)}</span>
                  <span className="text-[10px] font-mono text-blue-300">avg {formatHours(entry.avg)}</span>
                  <span className="text-[9px] text-slate-500">target {formatHours(entry.avgTarget)}</span>
                  <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> {entry.within}
                  </span>
                  {entry.breached > 0 && (
                    <span className="text-[9px] font-bold text-red-400 flex items-center gap-0.5">
                      <AlertTriangle size={10} /> {entry.breached}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${entry.adherence ?? 0}%`,
                        background: entry.adherence >= 80 ? "#10b981" : entry.adherence >= 50 ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 w-28 text-right">
                    {entry.resolved} resolved{entry.open ? ` · ${entry.open} open` : ""}
                    {entry.overdue ? ` · ${entry.overdue} overdue` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <button
          onClick={() => setShowTasks((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-left"
        >
          <span className="text-xs font-bold text-white">Per-task resolution detail</span>
          <span className="text-[10px] text-slate-500">{showTasks ? "Hide" : `Show ${resolvedTasks.length}`}</span>
        </button>
        {showTasks && (
          <div className="overflow-x-auto border-t border-slate-800">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-1.5 px-2 text-[9px] uppercase text-slate-500">Task</th>
                  <th className="py-1.5 px-2 text-[9px] uppercase text-slate-500">Agent</th>
                  <th className="py-1.5 px-2 text-[9px] uppercase text-slate-500">Sev</th>
                  <th className="py-1.5 px-2 text-[9px] uppercase text-slate-500">Time taken</th>
                  <th className="py-1.5 px-2 text-[9px] uppercase text-slate-500">SLA</th>
                </tr>
              </thead>
              <tbody>
                {resolvedTasks.slice(0, 40).map((task) => (
                  <tr key={task.id} className="border-b border-slate-800/50 hover:bg-white/5">
                    <td className="py-1.5 px-2 text-slate-300 max-w-[200px]"><p className="truncate" title={task.title}>{task.title}</p></td>
                    <td className="py-1.5 px-2 text-slate-400 text-[10px]">{label(task.agent_key)}</td>
                    <td className="py-1.5 px-2 text-[9px] font-bold uppercase text-slate-400">{task.severity}</td>
                    <td className="py-1.5 px-2 font-mono text-slate-300">{formatHours(task.taken)}</td>
                    <td className={`py-1.5 px-2 text-[10px] font-bold ${task.breached ? "text-red-400" : "text-emerald-400"}`}>
                      {task.breached ? "breached" : "met"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500">
        Measured from remediation start (or detection when no start is recorded) to the fix timestamp, compared with the severity SLA target.
      </p>
    </div>
  );
}