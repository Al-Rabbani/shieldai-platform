import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import IncidentCard from "@/components/incidents/IncidentCard";
import IncidentTimelineModal from "@/components/incidents/IncidentTimelineModal";
import IncidentImpactModal from "@/components/incidents/IncidentImpactModal";
import IncidentDetailPanel from "@/components/incidents/IncidentDetailPanel";
import IncidentStatusChips from "@/components/incidents/IncidentStatusChips";
import IncidentMetricsRow from "@/components/incidents/IncidentMetricsRow";
import NewIncidentModal from "@/components/incidents/NewIncidentModal";
import ActiveIncidentHeroCard from "@/components/incidents/ActiveIncidentHeroCard";
import IncidentTaskChecklist from "@/components/incidents/IncidentTaskChecklist";
import IncidentTimelineView from "@/components/incidents/IncidentTimelineView";
import ResolvedIncidentCard from "@/components/incidents/ResolvedIncidentCard";
import GdprNotificationModal from "@/components/incidents/GdprNotificationModal";
import AIResponseModal from "@/components/shared/AIResponseModal";

const DEFAULT_TASKS = [
  { title: "Isolate affected systems from network", priority: "critical" },
  { title: "Block C2 communication at firewall", priority: "critical" },
  { title: "Capture forensic memory dumps before reboot", priority: "critical" },
  { title: "Preserve disk images for chain of custody", priority: "high" },
  { title: "Identify and revoke compromised credentials", priority: "critical" },
  { title: "Remove ransomware persistence mechanisms", priority: "high" },
  { title: "Restore systems from clean backups", priority: "medium" },
];

export default function IncidentResponsePage() {
  const [incidents, setIncidents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [timelineIncident, setTimelineIncident] = useState(null);
  const [impactIncident, setImpactIncident] = useState(null);
  const [detailIncident, setDetailIncident] = useState(null);
  const [newIncidentDefaults, setNewIncidentDefaults] = useState(null);
  const [gdprIncident, setGdprIncident] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [incList, taskList, timelineList] = await Promise.all([
      base44.entities.Incident.list("-opened_at", 20).catch(() => []),
      base44.entities.IncidentTask.list("-priority", 20).catch(() => []),
      base44.entities.IncidentTimeline.list("-timestamp", 30).catch(() => []),
    ]);
    setIncidents(incList);
    setTasks(taskList);
    setTimeline(timelineList);
    setLoading(false);

    /* Nothing is seeded here. This block used to invent the incident's own history: it created default tasks in
     * IncidentTask and four narrative milestones in IncidentTimeline, neither of which has a store on this
     * platform. The adapter throws for both, `.catch(() => [])` swallowed the throw, and the empty array was
     * appended to state - so the page rendered a timeline it had made up, with timestamps derived from
     * opened_at so it looked observed. An incident with no recorded history now shows none. */
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeIncident = incidents.find(i => !i.closed_at && i.status !== "resolved");
  const resolvedIncident = incidents.find(i => i.closed_at && i.id !== activeIncident?.id);
  const activeTasks = tasks.filter(t => t.incident_id === activeIncident?.id);
  const activeTimeline = timeline.filter(t => t.incident_id === activeIncident?.id);

  async function runBrief(incident) {
    setModalTitle(`AI Incident Commander Brief — ${incident.title}`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "investigate_incident",
      input: `Give me an incident commander brief for the active ${incident.title} incident. ${incident.business_impact}. Systems: ${(incident.affected_assets || []).join(", ")}. GDPR 72h deadline approaching. What are the top 3 priorities right now?`,
      priority: "emergency", live_data_override: liveDataOverride,
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  async function completeTask(task) {
    await base44.entities.IncidentTask.update(task.id, { status: "completed", completed_at: new Date().toISOString() }).catch(() => {});
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "completed" } : t));
  }

  async function triageIncident(incident) {
    const priority = incident.severity || "medium";
    const ENGINEER_BY_SEVERITY = {
      critical: "Alex Chen (IR Lead)",
      high: "Priya Nair (Senior SOC Analyst)",
      medium: "Jordan Lee (SOC Analyst)",
      low: "Sam Rivera (SOC Analyst)",
    };
    const engineer = ENGINEER_BY_SEVERITY[priority] || "SOC Analyst On-Call";

    await base44.entities.IncidentTask.create({
      incident_id: incident.id,
      title: `Initial Investigation — ${incident.title}`,
      description: "Confirm scope, gather initial evidence, and identify affected systems.",
      priority,
      assignee_name: engineer,
      status: "open",
    }).catch(() => {});

    /* Only the assignment is written. "investigating" is not a status the incidents table holds (it has open, and
     * resolved_at marks closure), so sending it recorded nothing and would have hidden the incident from every count
     * that reads status = 'open'. An investigation in progress is derived from the assignment itself. */
    await base44.entities.Incident.update(incident.id, { assigned_to: engineer }).catch(() => {});
    load();
  }

  async function runAIAction(incident, commandType, label) {
    setDetailIncident(null);
    setModalTitle(`${label} — ${incident.title}`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const input = `${label} for incident: ${incident.title}. Type: ${incident.incident_type}. Severity: ${incident.severity}. Description: ${incident.description}.`;
    const result = await invokeAction("gdsAgentOS", { action: "command", command_type: commandType, input, live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🚨 INCIDENT COMMAND</h1>
        {activeIncident && <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-red-500 text-white animate-pulse">1 ACTIVE</span>}
        <IncidentStatusChips incidents={incidents} />
        <div className="ml-auto flex gap-2">
          <button onClick={() => setNewIncidentDefaults({})} className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-700/50 text-slate-200 hover:bg-slate-700 transition">+ New Incident</button>
          <button onClick={() => setNewIncidentDefaults({ severity: "critical", incident_type: "major_incident" })} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition">⚡ Declare Major Incident</button>
        </div>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <ActiveIncidentHeroCard incident={activeIncident} onBrief={runBrief} onFileGdpr={setGdprIncident} />

          <IncidentMetricsRow incidents={incidents} />

          {activeIncident && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Incident Response Tasks</p>
                <IncidentTaskChecklist tasks={activeTasks} onComplete={completeTask} />
              </div>
              <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Incident Timeline</p>
                <IncidentTimelineView events={activeTimeline} />
              </div>
            </div>
          )}

          <ResolvedIncidentCard incident={resolvedIncident} />

          {incidents.length === 0 ? (
            <p className="text-sm text-slate-500">No incidents recorded.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {incidents.map(inc => (
                <div key={inc.id} onClick={() => setDetailIncident(inc)} className="cursor-pointer">
                  <IncidentCard incident={inc} onCommand={(i) => runBrief(i)} onTimeline={(i) => setTimelineIncident(i)} onImpact={(i) => setImpactIncident(i)} onTriage={(i) => triageIncident(i)} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
      {timelineIncident && <IncidentTimelineModal incident={timelineIncident} onClose={() => setTimelineIncident(null)} />}
      {impactIncident && <IncidentImpactModal incident={impactIncident} onClose={() => setImpactIncident(null)} />}
      {detailIncident && <IncidentDetailPanel incident={detailIncident} onClose={() => setDetailIncident(null)} onAIAction={runAIAction} />}
      {newIncidentDefaults && (
        <NewIncidentModal initialValues={newIncidentDefaults} onClose={() => setNewIncidentDefaults(null)} onCreated={() => { setNewIncidentDefaults(null); load(); }} />
      )}
      {gdprIncident && (
        <GdprNotificationModal incident={gdprIncident} onClose={() => setGdprIncident(null)} onSubmitted={() => setGdprIncident(null)} />
      )}
    </div>
  );
}