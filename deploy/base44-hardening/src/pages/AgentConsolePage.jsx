import React, { useState, useEffect, useCallback } from "react";
import { observeAgent } from "@/lib/agentObservation";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import AgentCard from "@/components/agents/AgentCard";
import AgentTelemetryBar from "@/components/agents/AgentTelemetryBar";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function AgentConsolePage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAgent, setModalAgent] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await base44.entities.Agent.list("-last_heartbeat", 50).catch(() => []);
    setAgents(list.map(a => observeAgent(a)));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = agents.filter(a => a.status === "online").length;
  const idle = agents.filter(a => a.status === "idle").length;
  const totalExec = null;
  const avgHealth = null;
  const mostActive = null;

  async function activate(agent) {
    if (agent.runtime_class === "restricted") return;
    setModalAgent(agent);
    setModalLoading(true);
    setModalData(null);
    const displayName = agent.display_name || agent.name;
    const cmdType = agent.runtime_class === "restricted" ? "threat_hunt" : agent.runtime_class === "sovereign" ? "board_report" : "soc_summary";
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const result = await invokeAction("gdsAgentOS", { action: "command", input: `Summarise stored security records relevant to ${displayName}. State missing evidence and recommended next steps. Do not claim any live execution.`, command_type: cmdType, live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">{agents.length} Registered Security Agents</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">{active} Fresh heartbeats</span>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-400">{idle} Idle</span>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {agents.map(a => <AgentCard key={a.id} agent={a} onActivate={activate} />)}
          </div>

          <AgentTelemetryBar totalExecutions={totalExec} avgSuccessRate={avgHealth} mostActive={mostActive} />
        </>
      )}

      {modalAgent && (
        <AIResponseModal
          title={`${modalAgent.display_name || modalAgent.name} — Stored-record briefing`}
          loading={modalLoading}
          response={modalData?.response}
          agentSteps={modalData?.agent_steps}
          meta={{ model: modalData?.version, timing: modalData?.total_duration_ms ? `${(modalData.total_duration_ms / 1000).toFixed(1)}s` : null }}
          onClose={() => setModalAgent(null)}
        />
      )}
    </div>
  );
}
