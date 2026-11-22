import React, { useState, useEffect } from "react";
import { invokeAction } from "@/lib/invokeAction";
import { AGENT_FLEET, MCP_TOOLS_FALLBACK, TIER_COLORS } from "./agentFleetData";
import FleetAgentCard from "./FleetAgentCard";
import SessionHistorySidebar from "./SessionHistorySidebar";

const RISK_DOT = { low: "#10b981", medium: "#f59e0b", high: "#ef4444" };

export default function AgentFleetPanel({ selectedAgent, onSelectAgent }) {
  const [agents, setAgents] = useState(AGENT_FLEET);
  const [tools, setTools] = useState(MCP_TOOLS_FALLBACK);

  useEffect(() => {
    invokeAction("gdsAgentOS", { action: "list_agents" })
      .then(r => { if (r?.agents?.length) setAgents(r.agents.map(a => ({ ...a, icon: a.emoji, subtitle: a.capabilities?.[0]?.replace(/_/g, " ") }))); })
      .catch(() => {});
    invokeAction("gdsAgentOS", { action: "list_tools" })
      .then(r => { if (r?.tools?.length) setTools(r.tools); })
      .catch(() => {});
  }, []);

  const activeCount = agents.filter(a => !a.locked).length;

  return (
    <div style={{ width: 260, background: "#0d1428", borderRight: "1px solid #1e3a5f", display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div className="p-3 border-b" style={{ borderColor: "#1e3a5f" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">🧬 AGENT FLEET</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-400">{activeCount} ACTIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        {agents.map(agent => (
          <FleetAgentCard key={agent.name} agent={agent} selected={selectedAgent === agent.name} onSelect={onSelectAgent} />
        ))}

        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-3 mb-1.5 px-1">🔗 MCP Tools</p>
        <div className="flex flex-wrap gap-1.5 mb-3 px-1">
          {tools.map(t => (
            <span
              key={t.name}
              className="flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded-full text-slate-300"
              style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: RISK_DOT[t.risk] || "#64748b" }} />
              {t.name}
              {t.approval_required && <span>🔒</span>}
            </span>
          ))}
        </div>

        <SessionHistorySidebar />
      </div>
    </div>
  );
}