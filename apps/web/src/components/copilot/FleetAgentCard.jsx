import React from "react";
import { HEARTBEAT_COLORS, TIER_COLORS, tierForRisk } from "./agentFleetData";

function initials(name) {
  const words = name.replace(/^AI\s+/, "").split(" ").filter(Boolean);
  return (words[0]?.[0] || "").toUpperCase() + (words[1]?.[0] || "").toUpperCase();
}

function heartbeatLabel(agent) {
  if (agent.heartbeat_state === "live") return `heartbeat ${agent.heartbeat_age_hours}h ago`;
  if (agent.heartbeat_state === "stale") return `heartbeat ${agent.heartbeat_age_hours}h ago (stale)`;
  return "no heartbeat ever";
}

export default function FleetAgentCard({ agent, selected, onSelect }) {
  const color = TIER_COLORS[tierForRisk(agent.risk_level)];
  const dot = HEARTBEAT_COLORS[agent.heartbeat_state] || HEARTBEAT_COLORS.never;
  return (
    <button
      onClick={() => onSelect(agent.key || agent.name)}
      className="w-full flex items-center gap-2 p-2 rounded-lg text-left transition mb-1.5"
      style={{ background: selected ? "#1e3a5f" : "#0d1428", borderLeft: `3px solid ${color}` }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 relative"
        style={{ background: color + "55", border: `1px solid ${color}` }}
      >
        {initials(agent.name)}
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{ background: dot, boxShadow: "0 0 0 2px #0d1428" }}
          title={heartbeatLabel(agent)}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-white truncate">{agent.name}</p>
        <p className="text-[9px] truncate" style={{ color: dot }} title={agent.role || ""}>
          {agent.role ? String(agent.role).replace(/_/g, " ") : heartbeatLabel(agent)}
        </p>
      </div>
    </button>
  );
}
