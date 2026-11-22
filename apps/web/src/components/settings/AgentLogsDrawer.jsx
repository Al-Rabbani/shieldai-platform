import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ScrollText, X, RefreshCw } from "lucide-react";

const EVENT_COLOR = {
  completed: "#22c55e",
  execution_completed: "#22c55e",
  task_completed: "#22c55e",
  running: "#3b82f6",
  agent_assigned: "#3b82f6",
  pending: "#f59e0b",
  awaiting_approval: "#f59e0b",
  approval_requested: "#f59e0b",
  failed: "#ef4444",
  execution_failed: "#ef4444",
  safety_blocked: "#ef4444",
};

export default function AgentLogsDrawer({ agent, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  const key = agent?.agent_id || agent?.id;

  const load = useCallback(async () => {
    setLoading(true);
    const [taskRows, auditRows] = await Promise.all([
      base44.entities.CopilotTask.filter({ agent_id: key }, "-created_date", 40).catch(() => []),
      base44.entities.CopilotAuditLog.filter({ actor_id: key }, "-created_date", 40).catch(() => []),
    ]);
    setTasks(taskRows || []);
    setAudit(auditRows || []);
    setLoading(false);
  }, [key]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(2,6,16,0.7)" }}>
      <div className="w-full max-w-md h-full overflow-y-auto" style={{ background: "#0d1421", borderLeft: "1px solid #1F2937" }}>
        <div className="sticky top-0 flex items-center justify-between px-4 py-3" style={{ background: "#111827", borderBottom: "1px solid #1F2937" }}>
          <div className="flex items-center gap-2">
            <ScrollText size={16} className="text-blue-400" />
            <div>
              <p className="text-sm font-bold text-white">Agent logs</p>
              <p className="text-[10px] text-slate-500">{agent?.display_name || agent?.name} · {key}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="text-slate-500 hover:text-slate-300"><RefreshCw size={14} /></button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
          </div>
        </div>

        {loading ? (
          <div className="w-6 h-6 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-16" />
        ) : (
          <div className="p-4 space-y-4">
            <section>
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Task history ({tasks.length})</p>
              {tasks.length === 0 ? (
                <p className="text-[11px] text-slate-600">No tasks recorded for this agent yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div key={task.id} className="rounded-lg p-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-white font-medium truncate">{task.task_name}</p>
                        <span className="text-[9px] font-bold uppercase flex-shrink-0" style={{ color: EVENT_COLOR[task.status] || "#94a3b8" }}>
                          {task.status?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        step {task.step_number} · {task.duration_ms ? `${(task.duration_ms / 1000).toFixed(1)}s` : "no duration"} · {task.created_date ? new Date(task.created_date).toLocaleString("en-GB") : "—"}
                      </p>
                      {task.explainability && <p className="text-[10px] text-slate-400 mt-1">{task.explainability}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Audit events ({audit.length})</p>
              {audit.length === 0 ? (
                <p className="text-[11px] text-slate-600">No audit events recorded for this agent yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {audit.map((row) => (
                    <div key={row.id} className="rounded-lg p-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-200">{row.action_summary}</p>
                        <span className="text-[9px] font-bold uppercase flex-shrink-0" style={{ color: EVENT_COLOR[row.event_type] || "#94a3b8" }}>
                          {row.event_type?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {row.pipeline_stage || "—"} · {row.created_date ? new Date(row.created_date).toLocaleString("en-GB") : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}