import React from "react";
import { TICKER_AGENTS } from "./agentFleetData";

export default function AgentStatusTicker({ activeAgents = [] }) {
  const items = [...TICKER_AGENTS, ...TICKER_AGENTS];
  return (
    <div className="overflow-hidden flex-shrink-0" style={{ background: "#0a0f1e", borderBottom: "1px solid #1e3a5f" }}>
      <div className="flex items-center gap-4 py-1.5 px-4 animate-marquee whitespace-nowrap">
        {items.map((label, i) => {
          const isActive = activeAgents.some(a => label.includes(a) || a.includes(label.split(" ")[1] || ""));
          return (
            <span
              key={i}
              className="text-[10px] font-medium flex-shrink-0"
              style={{ color: isActive ? "#93c5fd" : "#475569" }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}