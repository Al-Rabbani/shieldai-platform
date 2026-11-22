import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { HEARTBEAT_COLORS } from "./agentFleetData";
import FleetAgentCard from "./FleetAgentCard";
import SessionHistorySidebar from "./SessionHistorySidebar";

/* Registered, heartbeat and tool-executed are three different states and this panel keeps them apart.
   Before 22 Nov 2026 it showed a pulsing "{n} ACTIVE" over 26 hardcoded entries, including a Jira tool the owner removed,
   because functions.invoke("gdsAgentOS") has no route here. It now reads GET /agents (the real registry in
   gds_api/agents/registry.py) and GET /agents/fleet/status for the heartbeat evidence. */
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

  /* Tools are what the registered agents declare they can call; nothing is listed that no agent names. */
  const toolCounts = {};
  agents.forEach(a => (a.tool_names || []).forEach(t => { toolCounts[t] = (toolCounts[t] || 0) + 1; }));
  const tools = Object.entries(toolCounts).sort((x, y) => x[0].localeCompare(y[0]));

  const live = fleet?.live ?? fleet?.agents_live ?? 0;
  const stale = fleet?.stale ?? fleet?.agents_stale ?? 0;
  const never = fleet?.never ?? fleet?.agents_never ?? Math.max(0, agents.length - live - stale);

  return (
    <div style={{ width: 260, background: "#0d1428", borderRight: "1px solid #1e3a5f", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div className="p-3 border-b" style={{ borderColor: "#1e3a5f" }}>
        <span className="text-sm font-bold text-white">🧬 AGENT FLEET</span>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: live > 0 ? HEARTBEAT_COLORS.live : HEARTBEAT_COLORS.stale }} />
          <span className="text-[10px] font-semibold text-slate-300">
            {loading ? "reading registry" : `${agents.length} registered · ${live} live`}
          </span>
        </div>
        <p className="text-[9px] text-slate-500 mt-1 leading-snug">
          {stale > 0 || never > 0
            ? `${stale} stale heartbeat${stale === 1 ? "" : "s"} · ${never} never reported`
            : "Heartbeat state comes from /agents/fleet/status."}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        {agents.map(agent => (
          <FleetAgentCard
            key={agent.name}
            agent={{
              name: agent.display_name || agent.name,
              role: agent.department || agent.team,
              risk_level: agent.risk_ceiling,
              heartbeat_state: agent.heartbeat_state
                || (agent.status === "active" ? "live" : agent.status === "planned" ? "never" : "stale"),
              heartbeat_age_hours: agent.heartbeat_age_hours,
            }}
            selected={selectedAgent === (agent.display_name || agent.name)}
            onSelect={onSelectAgent}
          />
        ))}

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
          Tool calls are recorded inside mission reports, so no per-agent execution count is claimed here.
        </p>
      </div>

      <SessionHistorySidebar />
    </div>
  );
}
