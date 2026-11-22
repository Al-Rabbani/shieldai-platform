import React from "react";
import { DEFAULT_ACTIVE_AGENTS } from "./agentFleetData";

export default function AgentStatusChips({ selectedAgent }) {
  const chips = selectedAgent && !DEFAULT_ACTIVE_AGENTS.includes(selectedAgent)
    ? [...DEFAULT_ACTIVE_AGENTS, selectedAgent]
    : DEFAULT_ACTIVE_AGENTS;

  return (
    <div className="flex items-center gap-2 px-4 py-2 flex-wrap flex-shrink-0" style={{ background: "#0a0f1e", borderBottom: "1px solid #1e3a5f" }}>
      {chips.map(name => {
        const active = name === selectedAgent || (!selectedAgent && DEFAULT_ACTIVE_AGENTS.includes(name));
        return (
          <span
            key={name}
            className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full"
            style={{
              background: active ? "#1e3a5f" : "#111827",
              color: active ? "#93c5fd" : "#64748b",
              border: active ? "1px solid #3b82f6" : "1px solid #1F2937",
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
            {name.replace(/^AI\s+/, "")}
          </span>
        );
      })}
    </div>
  );
}