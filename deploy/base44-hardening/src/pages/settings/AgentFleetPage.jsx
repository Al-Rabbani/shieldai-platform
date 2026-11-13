import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { observeAgent } from "@/lib/agentObservation";
import RealAgentCard from "@/components/settings/RealAgentCard";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function AgentFleetPage() {
  const [agents, setAgents] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(() => {
    setLoadError(null);
    base44.entities.Agent.list("-last_heartbeat", 100).then(rows => setAgents(rows.map(a => observeAgent(a)))).catch(() => { setAgents([]); setLoadError('Agent telemetry is unavailable.'); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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
      input: `Diagnose why ${agent.name} agent is offline and recommend recovery steps. Status: ${agent.status}. Health score: ${agent.health_score}%. Last heartbeat: ${agent.last_heartbeat}.`,
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  const online = agents.filter(a => a.status === "online").length;
  const degraded = agents.filter(a => a.status === "degraded").length;
  const offline = agents.filter(a => a.status === "offline").length;
  const unknown = agents.filter(a => a.status === "unknown").length;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <h1 className="text-xl font-bold text-white">⚙️ Agent Fleet</h1>
      <button onClick={verifyRuntime} className="px-3 py-2 rounded-lg text-sm bg-blue-500/15 text-blue-300 border border-blue-500/30">Verify runtime connection</button>

      <p className="text-xs text-slate-400">Status follows recorded heartbeat age. Tool execution remains unverified.</p>
      {loadError && <p role="alert" className="text-sm text-amber-400">{loadError}</p>}
      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="rounded-xl p-3 text-sm text-slate-300" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <span className="font-bold text-white">{agents.length} Registered Agents</span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-emerald-400 font-semibold">{online} Fresh heartbeats</span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-amber-400 font-semibold">{degraded} Degraded</span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-red-400 font-semibold">{offline} Offline</span>
            <span className="mx-2 text-slate-600">·</span>
            <span className="text-slate-400">Health score: <span className="text-white font-semibold">Unmeasured</span> · {unknown} Unknown</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {agents.map(a => <RealAgentCard key={a.id} agent={a} onRestart={restart} onDiagnose={diagnose} />)}
          </div>
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}
