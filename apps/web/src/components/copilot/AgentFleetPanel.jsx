import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { HEARTBEAT_COLORS } from "./agentFleetData";
import FleetAgentCard from "./FleetAgentCard";
import SessionHistorySidebar from "./SessionHistorySidebar";

/* Three states, kept apart, because they are different facts:
     registered  - GET /agents, the registry in gds_api/agents/registry.py (23 agents)
     heartbeat   - GET /agents/fleet/status, verified heartbeats only (1 offline, 22 never reported)
     executed    - the same route's capability_evidence, executed governed receipts in 24h
   Before 22 Nov 2026 this panel showed "{n} ACTIVE" over 26 hardcoded entries, one of them a Jira tool the owner removed.
   A registry status of OPERATIONAL is not a heartbeat and is never drawn as one. */
export default function AgentFleetPanel({ selectedAgent, onSelectAgent }) {
  const [agents, setAgents] = useState([]);
  const [fleet, setFleet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Agent.list().catch(() => []),
      base44.entities.Agent.summary().catch(() => null),
    ])
      .then(([a, f]) => { setAgents(a); setFleet(f); })
      .finally(() => setLoading(false));
  }, []);

  const roles = fleet?.roles || [];
  const byKey = {};
  roles.forEach(r => { byKey[r.agent_id] = r; });

  const live = roles.filter(r => r.state === "live").length;
  const offline = roles.filter(r => r.state === "offline").length;
  const unknown = roles.filter(r => r.state === "unknown").length;

  /* Tools are what the registered agents declare; nothing is listed that no agent names. */
  const toolCounts = {};
  agents.forEach(a => (a.tool_names || []).forEach(t => { toolCounts[t] = (toolCounts[t] || 0) + 1; }));
  const tools = Object.entries(toolCounts).sort((x, y) => x[0].localeCompare(y[0]));

  return (
    <div style={{ width: 260, background: "#0d1428", borderRight: "1px solid #1e3a5f", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div className="p-3 border-b" style={{ borderColor: "#1e3a5f" }}>
        <span className="text-sm font-bold text-white">🧬 AGENT FLEET</span>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full"
                style={{ background: live > 0 ? HEARTBEAT_COLORS.live : HEARTBEAT_COLORS.stale }} />
          <span className="text-[10px] font-semibold text-slate-300">
            {loading ? "reading registry" : `${agents.length} registered · ${live} live`}
          </span>
        </div>
        <p className="text-[9px] text-slate-500 mt-1 leading-snug">
          {loading ? "" : `${offline} heartbeat offline · ${unknown} never reported`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        {agents.map(agent => {
          const role = byKey[agent.stable_key] || byKey[agent.name] || null;
          return (
            <FleetAgentCard
              key={agent.stable_key || agent.name}
              agent={{
                name: agent.display_name || agent.name,
                role: role?.capability_evidence || agent.team,
                risk_level: agent.risk_ceiling,
                heartbeat_state: role ? (role.state === "live" ? "live" : role.state === "offline" ? "stale" : "never") : "never",
                heartbeat_age_hours: role?.last_observed_at
                  ? Math.floor((Date.now() - new Date(role.last_observed_at).getTime()) / 3600000)
                  : null,
              }}
              selected={selectedAgent === (agent.display_name || agent.name)}
              onSelect={onSelectAgent}
            />
          );
        })}

        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-3 mb-1.5 px-1">
          🔗 Tools declared ({tools.length})
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3 px-1">
          {tools.map(([name, count]) => (
            <span
              key={name}
              title={`Declared by ${count} agent${count === 1 ? "" : "s"}`}
              className="flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded-full text-slate-300"
              style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: HEARTBEAT_COLORS.live }} />
              {name}
            </span>
          ))}
        </div>

        <p className="text-[9px] text-slate-600 px-1 leading-snug">
          {fleet?.evidence_source || "Heartbeat and execution evidence come from /agents/fleet/status."}
        </p>
      </div>

      <SessionHistorySidebar />
    </div>
  );
}
