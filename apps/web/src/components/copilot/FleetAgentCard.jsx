import React from "react";
import { TIER_COLORS } from "./agentFleetData";

function initials(name) {
  const words = name.replace(/^AI\s+/, "").split(" ").filter(Boolean);
  return (words[0]?.[0] || "").toUpperCase() + (words[1]?.[0] || "").toUpperCase();
}

export default function FleetAgentCard({ agent, selected, onSelect }) {
  const color = TIER_COLORS[agent.tier];
  return (
    <button
      onClick={() => !agent.locked && onSelect(agent.name)}
      disabled={agent.locked}
      className="w-full flex items-center gap-2 p-2 rounded-lg text-left transition mb-1.5"
      style={{
        background: selected ? "#1e3a5f" : "#0d1428",
        borderLeft: `3px solid ${color}`,
        opacity: agent.locked ? 0.55 : 1,
        cursor: agent.locked ? "not-allowed" : "pointer",
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 relative"
        style={{ background: color + "55", border: `1px solid ${color}` }}
      >
        {initials(agent.name)}
        {!agent.locked && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{ background: "#22c55e", boxShadow: "0 0 0 2px #0d1428" }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-white truncate">{agent.icon} {agent.name}</p>
        <p className="text-[9px] truncate" style={{ color: agent.locked ? "#ef4444" : "#64748b" }}>
          {agent.subtitle || agent.runs}
        </p>
      </div>
    </button>
  );
}