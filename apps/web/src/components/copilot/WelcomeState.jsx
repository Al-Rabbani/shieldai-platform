import React from "react";
import { QUICK_ACTIONS } from "./agentFleetData";

export default function WelcomeState({ onSelect }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5"
        style={{ background: "#1e3a5f", border: "1px solid #3b82f6", boxShadow: "0 0 30px rgba(59,130,246,0.35)" }}
      >
        🛡️
      </div>
      <h1 className="text-xl font-black text-white mb-2">GDS Agent OS v2.0</h1>
      <p className="text-sm text-blue-400 font-semibold mb-1">Sovereign AI Security Operating System</p>
      <p className="text-xs text-slate-400 max-w-md mb-8">
        Registered agents, declared tools and heartbeat evidence are read live from the platform<br />
        Live AWS · A2A messaging · MCP tools · Zero Trust gate
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
        {QUICK_ACTIONS.map((c, i) => (
          <button
            key={i}
            onClick={() => onSelect({ label: c.input, command_type: c.command_type })}
            className="flex flex-col items-center gap-1.5 text-center text-xs font-medium text-slate-300 px-3 py-3 rounded-xl transition hover:border-blue-500 hover:bg-white/5"
            style={{ background: "#111827", border: "1px solid #1F2937" }}
          >
            <span className="text-lg">{c.label.split(" ")[0]}</span>
            <span>{c.label.split(" ").slice(1).join(" ")}</span>
          </button>
        ))}
      </div>
    </div>
  );
}