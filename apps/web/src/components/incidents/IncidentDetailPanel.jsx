import React, { useState, useEffect } from "react";
import { attemptWrite } from "@/lib/writeFailure";
import { base44 } from "@/api/base44Client";
import IncidentCommsPanel from "./IncidentCommsPanel";
import IncidentQuickTemplates from "./IncidentQuickTemplates";
import { INCIDENT_TEMPLATES } from "./incidentTemplates";

const AI_ACTIONS = [
  { key: "threat_hunt", label: "🔍 Hunt IOCs" },
  { key: "remediation_plan", label: "🔧 Remediation Plan" },
  { key: "board_report", label: "📊 Executive Brief" },
  { key: "compliance_check", label: "📝 GDPR Notice" },
];

const STAGES = ["investigating", "contained", "resolved"];

export default function IncidentDetailPanel({ incident, onClose, onAIAction }) {
  const [tasks, setTasks] = useState([]);
  const [applyingKey, setApplyingKey] = useState(null);

  useEffect(() => {
    base44.entities.IncidentTask.filter({ incident_id: incident.id }).then(setTasks).catch(() => setTasks([]));
  }, [incident.id]);

  async function toggleTask(t) {
    const status = t.status === "completed" ? "open" : "completed";
    const saved = await attemptWrite("change a task's status", () => base44.entities.IncidentTask.update(t.id, { status }));
    // Reflect the change only once the platform accepted it: IncidentTask has no store here.
    if (saved !== null) setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status } : x));
  }

  const stageIdx = STAGES.indexOf(incident.status);

  async function applyTemplate(key) {
    setApplyingKey(key);
    const tpl = INCIDENT_TEMPLATES[key];
    const created = await attemptWrite("add the template's tasks", () => base44.entities.IncidentTask.bulkCreate(
      tpl.steps.map(s => ({ incident_id: incident.id, title: s.title, priority: s.priority, assignee_name: s.assignee_name, status: "open" }))
    ));
    if (created !== null) setTasks(prev => [...prev, ...(created || [])]);
    setApplyingKey(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md h-full overflow-y-auto p-5 space-y-4" style={{ background: "#0d1117", borderLeft: "1px solid #1F2937" }} onClick={e => e.stopPropagation()}>
        <div>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400">{incident.severity}</span>
          <h3 className="text-lg font-bold text-white mt-2">{incident.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {["Detected", "Investigating", "Contained", "Eradicated", "Recovered"].map((s, i) => (
            <React.Fragment key={s}>
              <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${i <= stageIdx + 1 ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-600"}`}>{s}</span>
              {i < 4 && <span className="w-2 h-px bg-slate-700" />}
            </React.Fragment>
          ))}
        </div>

        <div>
          <p className="text-[10px] text-slate-500 uppercase">Financial Exposure</p>
          <div className="h-2 rounded-full bg-slate-800 mt-1">
            <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, (incident.financial_impact_usd || 0) / 30000)}%` }} />
          </div>
          <p className="text-sm font-bold text-red-400 mt-1">${(incident.financial_impact_usd || 0).toLocaleString()}</p>
        </div>

        <div>
          <p className="text-[10px] text-slate-500 uppercase mb-1">Affected Assets</p>
          <p className="text-xs text-slate-300">{(incident.affected_assets || []).join(", ") || "None recorded"}</p>
        </div>

        <div>
          <p className="text-[10px] text-slate-500 uppercase mb-1">Tasks</p>
          {tasks.length === 0 ? <p className="text-xs text-slate-600">No tasks logged.</p> : (
            <div className="space-y-1.5">
              {tasks.map(t => (
                <label key={t.id} className="flex items-center gap-2 text-xs text-slate-300 rounded-lg px-2 py-1.5" style={{ background: "#111827" }}>
                  <input type="checkbox" checked={t.status === "completed"} onChange={() => toggleTask(t)} />
                  <span className={t.status === "completed" ? "line-through text-slate-600" : ""}>{t.title}</span>
                  <span className="ml-auto text-[9px] uppercase text-slate-500">{t.priority}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <IncidentQuickTemplates incidentType={incident.incident_type} onApply={applyTemplate} applying={applyingKey} />

        <IncidentCommsPanel incidentId={incident.id} />

        <div>
          <p className="text-[10px] text-slate-500 uppercase mb-1">AI Actions</p>
          <div className="grid grid-cols-2 gap-2">
            {AI_ACTIONS.map(a => (
              <button key={a.key} onClick={() => onAIAction(incident, a.key, a.label)} className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">{a.label}</button>
            ))}
          </div>
        </div>

        <button onClick={onClose} className="w-full px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  );
}