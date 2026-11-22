import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { observeAgent } from "@/lib/agentObservation";
import RealAgentCard from "@/components/settings/RealAgentCard";
import FleetStatusPanel from "@/components/settings/FleetStatusPanel";
import FleetHeartbeatMonitor from "@/components/settings/FleetHeartbeatMonitor";
import FleetTopologyMap from "@/components/settings/FleetTopologyMap";
import AgentFleetCommandDeck from "@/components/settings/AgentFleetCommandDeck";
import AgentTaskAssignModal from "@/components/settings/AgentTaskAssignModal";
import AgentLogsDrawer from "@/components/settings/AgentLogsDrawer";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function AgentFleetPage() {
  const [agents, setAgents] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [assessmentPlan, setAssessmentPlan] = useState(null);
  const [planError, setPlanError] = useState(null);
  const [assessing, setAssessing] = useState(null);
  const [assessmentResults, setAssessmentResults] = useState({});
  const [assessmentProgress, setAssessmentProgress] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [fixesByAgent, setFixesByAgent] = useState({});
  const [assignAgent, setAssignAgent] = useState(null);
  const [logsAgent, setLogsAgent] = useState(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [agentRows, taskRows, fixed] = await Promise.all([
        base44.entities.Agent.list("-last_heartbeat", 100),
        base44.entities.CopilotTask.list("-created_date", 200).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: "fixed" }, "-fixed_at", 300).catch(() => []),
      ]);
      setAgents((agentRows || []).map(a => observeAgent(a)));
      setTasks(taskRows || []);
      const counts = {};
      (fixed || []).forEach(finding => {
        const key = finding.fixed_by_agent_id || finding.assigned_to;
        if (!key) return;
        counts[key] = (counts[key] || 0) + 1;
      });
      setFixesByAgent(counts);
    } catch (error) {
      setAgents([]);
      setLoadError('Agent telemetry is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);

  async function verifyRuntime() {
    setModalTitle('Runtime connection');
    setModalLoading(true); setModalData(null);
    const result = await invokeAction('gds-runtime-diagnostics', {})
      .catch(error => error?.response?.data || { error: 'Runtime diagnostics are unavailable.' });
    setModalData({ response: result.success
      ? `Connection: ${result.connection_status}\n\nReported agents: ${result.declared_agents ?? 'Unknown'}\n\nReported tools: ${result.declared_tools ?? 'Unknown'}\n\nReported release: ${result.reported_release_sha ?? 'Unknown'}\n\nThis confirms metadata access only. Worker execution, isolation and recovery remain unverified.`
      : result.error || 'Runtime diagnostics are unavailable.' });
    setModalLoading(false);
  }

  async function loadAssessmentPlan() {
    setPlanError(null);
    const result = await invokeAction('gdsFleetAssessment', { action: 'plan' })
      .catch(error => error?.response?.data || { error: 'Assessment plan unavailable' });
    if (!Array.isArray(result?.agents)) { setPlanError(result?.error || 'Assessment plan unavailable'); return; }
    setAssessmentPlan(result);
  }

  async function invokeAssessment(agentId) {
    const result = await invokeAction('gdsFleetAssessment', { action: 'assess', agent_id: agentId })
      .catch(error => error?.response?.data || { error: 'Assessment unavailable' });
    setAssessmentResults(previous => ({ ...previous, [agentId]: result }));
    return result;
  }

  async function runAllAssessments() {
    if (!assessmentPlan) return;
    const runnable = assessmentPlan.agents.filter(row => row.assessment_status === 'read_only_case_available');
    setAssessing('all');
    for (let index = 0; index < runnable.length; index++) {
      setAssessmentProgress(`${index + 1} of ${runnable.length}: ${runnable[index].agent_id}`);
      await invokeAssessment(runnable[index].agent_id);
    }
    setAssessmentProgress(null); setAssessing(null);
  }

  async function assessAgent(agentId) {
    setAssessing(agentId);
    setModalTitle(`Sandbox assessment — ${agentId}`);
    setModalLoading(true); setModalData(null);
    const result = await invokeAssessment(agentId);
    setModalData({ response: result?.mission_id
      ? `Outcome: ${result.verification_status}\nTool: ${result.tool}\nMission: ${result.mission_id}\nRequest receipt: ${result.receipt?.request_id || 'Missing'}\nDecision receipt: ${result.receipt?.decision_id || 'Missing'}\nBroker decision: ${result.receipt?.decision || 'Unknown'}\nExecution: ${result.receipt?.execution_status || 'Unknown'}\nTool result: ${result.tool_success ? 'Succeeded' : result.outcome_code || 'Not verified'}\n\nThis checks one bounded read-only capability in the isolated sandbox.`
      : result?.error || 'Assessment unavailable' });
    setModalLoading(false); setAssessing(null);
  }

  async function restart(agent) {
    setModalTitle(`Recovery — ${agent.name}`);
    setModalLoading(false);
    setModalData({ response: 'No restart was performed. An authenticated runtime recovery connection is required. Stored status records cannot restart a worker.' });
  }

  async function diagnose(agent) {
    setModalTitle(`AI Diagnosis — ${agent.name}`);
    setModalLoading(true); setModalData(null);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "default",
      input: `Review the stored telemetry for ${agent.name} and recommend verification and recovery steps. Observed status: ${agent.status}. Last recorded heartbeat: ${agent.last_heartbeat || 'none'}. Do not claim current execution or a measured health score.`, 
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  const heartbeatAge = (agent) => (agent.last_heartbeat ? Date.now() - new Date(agent.last_heartbeat).getTime() : null);
  const isActive = (agent) => {
    const age = heartbeatAge(agent);
    return age != null && Number.isFinite(age) && age < 86400000;
  };
  const isStale = (agent) => {
    const age = heartbeatAge(agent);
    return age != null && Number.isFinite(age) && age >= 86400000;
  };
  const isNever = (agent) => heartbeatAge(agent) == null;
  const FILTERS = [
    { key: "all", label: "All", count: agents.length },
    { key: "active", label: "Active (24h)", count: agents.filter(isActive).length },
    { key: "stale", label: "Stale", count: agents.filter(isStale).length },
    { key: "never", label: "No heartbeat", count: agents.filter(isNever).length },
  ];
  const filteredAgents = agents.filter((agent) => {
    if (statusFilter === "active") return isActive(agent);
    if (statusFilter === "stale") return isStale(agent);
    if (statusFilter === "never") return isNever(agent);
    return true;
  });

  const online = agents.filter(a => a.status === "online").length;
  const degraded = agents.filter(a => a.status === "degraded").length;
  const offline = agents.filter(a => a.status === "offline").length;
  const stale = agents.filter(a => a.status === "stale").length;
  const unknown = agents.filter(a => a.status === "unknown").length;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div>
        <h1 className="text-xl font-bold text-white">⚙️ Agent Fleet Command</h1>
        <p className="text-xs text-slate-500">Health, current task, performance and logs for every security agent</p>
      </div>

      <FleetStatusPanel />

      <FleetHeartbeatMonitor agents={agents} />

      <FleetTopologyMap />

      <button onClick={verifyRuntime} className="px-3 py-2 rounded-lg text-sm bg-blue-500/15 text-blue-300 border border-blue-500/30">Verify runtime connection</button>
      <button onClick={loadAssessmentPlan} className="ml-2 px-3 py-2 rounded-lg text-sm bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Load live sandbox plan</button>
      {planError && <p role="alert" className="text-sm text-amber-400">{planError}</p>}
      {assessmentPlan && <section className="rounded-xl p-4 text-sm text-slate-200 space-y-3" style={{ background: '#111827', border: '1px solid #1F2937' }}>
        <h2 className="font-semibold text-white">GDS backend fleet — {assessmentPlan.agents.length} registered roles</h2>
        <p className="text-xs text-slate-400">This registry is separate from the 20 historical Base44 records below. Run a bounded mission to see its actual receipt. A declared role or stale heartbeat does not establish capability.</p>
        <button disabled={assessing !== null} onClick={runAllAssessments} className="px-3 py-2 rounded bg-blue-500/20 text-blue-200 disabled:opacity-50">Run {assessmentPlan.agents.filter(row => row.assessment_status === 'read_only_case_available').length} safe missions</button>
        {assessmentProgress && <p role="status" className="text-xs text-blue-300">Assessing {assessmentProgress}</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {assessmentPlan.agents.map(row => <div key={row.agent_id} className="rounded-lg border border-slate-700 p-3">
            <div className="font-medium break-words">{row.agent_id}</div>
            <div className="text-xs text-slate-400">Declared: {row.declared_status} · {row.assessment_status}</div>
            {row.mission && <div className="mt-2 space-y-1 text-xs text-slate-300">
              <div><span className="text-slate-500">Mission:</span> {row.mission}</div>
              <div><span className="text-slate-500">Pass check:</span> {row.outcome_check}</div>
              <div><span className="text-slate-500">Fixture:</span> {row.required_fixture}</div>
              {row.approval_required && <div className="text-amber-300">Approval required</div>}
            </div>}
            {assessmentResults[row.agent_id] && <div className="mt-2 text-xs break-all">
              <div className={assessmentResults[row.agent_id].verification_status === 'tool_executed' ? 'text-emerald-300' : 'text-amber-300'}>Observed: {assessmentResults[row.agent_id].verification_status || 'not_verified'}{assessmentResults[row.agent_id].outcome_code ? ` · ${assessmentResults[row.agent_id].outcome_code}` : ''}</div>
              <div>Mission: {assessmentResults[row.agent_id].mission_id || 'No receipt'}</div>
              <div>Request: {assessmentResults[row.agent_id].receipt?.request_id || 'No receipt'}</div>
              <div>Decision: {assessmentResults[row.agent_id].receipt?.decision_id || 'No receipt'}</div>
              {assessmentResults[row.agent_id].identity_evidence && <div className="mt-1 break-words text-amber-200">Identity inventory: {JSON.stringify(assessmentResults[row.agent_id].identity_evidence.observed)} · Unmeasured: {assessmentResults[row.agent_id].identity_evidence.unmeasured_controls.join(', ') || 'none'} · Grade: unavailable</div>}
              <div>Checked: {assessmentResults[row.agent_id].checked_at || 'Unknown'}</div>
            </div>}
            {row.assessment_status === 'read_only_case_available'
              ? <button disabled={assessing !== null} onClick={() => assessAgent(row.agent_id)} className="mt-2 px-2 py-1 rounded bg-blue-500/20 text-blue-200 disabled:opacity-50">{assessing === row.agent_id ? 'Assessing…' : 'Run read-only mission'}</button>
              : <p className="mt-2 text-xs text-amber-400">Scoped fixture or approval required</p>}
          </div>)}
        </div>
      </section>}

      <p className="text-xs text-slate-400">Fresh heartbeat means recent telemetry only. Capability and tool execution require an independently verified mission receipt.</p>
      {loadError && <p role="alert" className="text-sm text-amber-400">{loadError}</p>}
      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="rounded-xl p-3 text-sm text-slate-300" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <span className="font-bold text-white">{agents.length} stored agent records</span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-emerald-400 font-semibold">{online} Fresh heartbeats</span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-amber-400 font-semibold">{degraded} Degraded</span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-red-400 font-semibold">{offline} Offline · {stale} Stale</span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-slate-400">Health score: <span className="text-white font-semibold">Unmeasured</span> · {unknown} Unknown</span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-white">Agent command deck</p>
            <AgentFleetCommandDeck
              agents={filteredAgents}
              tasks={tasks}
              fixesByAgent={fixesByAgent}
              onAssign={setAssignAgent}
              onViewLogs={setLogsAgent}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                  statusFilter === f.key
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                    : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                {f.label} · {f.count}
              </button>
            ))}
          </div>

          {statusFilter === "active" && filteredAgents.length === 0 && (
            <p className="text-xs text-amber-400">
              No agent has a heartbeat in the last 24 hours, so the active filter is empty. Records still exist — switch to All to see them.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            {filteredAgents.map(a => <RealAgentCard key={a.id} agent={a} onRestart={restart} onDiagnose={diagnose} />)}
          </div>
        </>
      )}

      {assignAgent && (
        <AgentTaskAssignModal agent={assignAgent} onClose={() => setAssignAgent(null)} onAssigned={load} />
      )}

      {logsAgent && <AgentLogsDrawer agent={logsAgent} onClose={() => setLogsAgent(null)} />}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}