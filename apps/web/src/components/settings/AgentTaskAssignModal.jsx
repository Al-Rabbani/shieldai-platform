import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ListChecks, X } from "lucide-react";

export default function AgentTaskAssignModal({ agent, onClose, onAssigned }) {
  const [taskName, setTaskName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (!taskName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await base44.entities.CopilotTask.create({
        task_name: taskName.trim(),
        step_number: 1,
        execution_id: `manual-${Date.now()}`,
        agent_id: agent.agent_id || agent.id,
        status: "pending",
        explainability: notes.trim() || `Assigned manually to ${agent.display_name || agent.name}.`,
      });
      await base44.entities.CopilotAuditLog.create({
        event_type: "agent_assigned",
        pipeline_stage: "task_assignment",
        action_summary: `Task "${taskName.trim()}" assigned to ${agent.display_name || agent.name}`,
        risk_level: "low",
        policy_verdict: "pass",
        status: "logged",
        actor_id: agent.agent_id || agent.id,
      }).catch(() => {});
      onAssigned?.();
      onClose();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,6,16,0.75)" }}>
      <form onSubmit={submit} className="w-full max-w-md rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks size={16} className="text-blue-400" />
            <p className="text-sm font-bold text-white">Assign task · {agent.display_name || agent.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
        </div>
        <input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="Task name, e.g. Re-scan production database cluster"
          required
          className="w-full px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Instructions or context for the agent"
          className="w-full px-3 py-2 rounded-lg text-sm bg-[#0a0f1e] border border-slate-700 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <p className="text-[10px] text-slate-500">Queued tasks are stored against the agent record; execution requires the agent runtime.</p>
        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
        >
          {saving ? "Assigning…" : "Assign task"}
        </button>
      </form>
    </div>
  );
}