import React from "react";
import { ListChecks, ScrollText, GitBranch, Timer } from "lucide-react";

const STATUS_DOT = {
  active: "#22c55e",
  working: "#3b82f6",
  idle: "#94a3b8",
  error: "#ef4444",
  unknown: "#64748b",
  archived: "#475569",
};

function heartbeatLabel(agent) {
  if (!agent.last_heartbeat) return "No heartbeat";
  const age = Date.now() - new Date(agent.last_heartbeat).getTime();
  if (!Number.isFinite(age)) return "No heartbeat";
  if (age < 3600000) return `${Math.max(1, Math.round(age / 60000))}m ago`;
  if (age < 86400000) return `${Math.round(age / 3600000)}h ago`;
  return `${Math.round(age / 86400000)}d ago`;
}

function currentTaskFor(agent, tasks) {
  const key = agent.agent_id || agent.id;
  return tasks.find(
    (task) => (task.agent_id === key || task.agent_id === agent.name) && ["running", "pending", "awaiting_approval"].includes(task.status)
  );
}

export default function AgentFleetCommandDeck({ agents, tasks = [], fixesByAgent = {}, onAssign, onViewLogs }) {
  if (agents.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-xs text-slate-500">No agent records stored yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <table className="w-full text-[11px] min-w-[720px]">
        <thead>
          <tr className="text-slate-500 border-b border-slate-800">
            <th className="text-left py-2 px-3 font-medium">Agent</th>
            <th className="text-left py-2 px-3 font-medium">Health</th>
            <th className="text-left py-2 px-3 font-medium">Current task</th>
            <th className="text-left py-2 px-3 font-medium">Executions</th>
            <th className="text-left py-2 px-3 font-medium">Avg duration</th>
            <th className="text-left py-2 px-3 font-medium">Fixes</th>
            <th className="text-right py-2 px-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => {
            const key = agent.agent_id || agent.id;
            const task = currentTaskFor(agent, tasks);
            const fixes = fixesByAgent[key] || fixesByAgent[agent.name] || 0;
            return (
              <tr key={agent.id || key} className="border-b border-slate-800/50">
                <td className="py-2 px-3">
                  <p className="text-white font-semibold">{agent.display_name || agent.name}</p>
                  <p className="text-[10px] text-slate-500">{agent.agent_type || agent.runtime_class || "agent"} · {key}</p>
                </td>
                <td className="py-2 px-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_DOT[agent.status] || "#64748b" }} />
                    <span className="text-slate-300 capitalize">{agent.status || "unknown"}</span>
                  </span>
                  <p className="text-[10px] text-slate-500">{heartbeatLabel(agent)}</p>
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {task ? (
                    <span>
                      <span className="text-white">{task.task_name}</span>
                      <span className="block text-[10px] text-blue-300 capitalize">{task.status?.replace(/_/g, " ")}</span>
                    </span>
                  ) : (
                    <span className="text-slate-600">Idle — no queued task</span>
                  )}
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">{agent.executions_total ?? 0}</td>
                <td className="py-2 px-3 font-mono text-slate-300">
                  {agent.avg_duration_ms ? `${(agent.avg_duration_ms / 1000).toFixed(1)}s` : "—"}
                </td>
                <td className="py-2 px-3 font-mono" style={{ color: fixes > 0 ? "#22c55e" : "#64748b" }}>{fixes}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onAssign(agent)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition"
                    >
                      <ListChecks size={11} /> Assign
                    </button>
                    <button
                      onClick={() => onViewLogs(agent)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-slate-500/15 text-slate-300 border border-slate-600 hover:bg-slate-500/25 transition"
                    >
                      <ScrollText size={11} /> Logs
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-[10px] text-slate-500 border-t border-slate-800">
        <span className="flex items-center gap-1"><GitBranch size={10} /> Health reflects stored telemetry only</span>
        <span className="flex items-center gap-1"><Timer size={10} /> Refreshes every 30 seconds</span>
      </div>
    </div>
  );
}