import React from "react";
import { observeAgent } from "@/lib/agentObservation";

export default function AgentActivityStrip({ agents }) {
  if (!agents?.length) return null;

  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Agent heartbeat records · tool execution unverified</p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {agents.slice(0, 8).map(row => {
          const a = observeAgent(row);
          return (
            <div key={a.id} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
              <span className={`w-2 h-2 rounded-full ${a.status === "online" ? "bg-amber-500" : "bg-slate-600"}`} />
              <span className="text-[11px] text-slate-300 font-medium">{a.display_name || a.name}</span>
              <span className="text-[9px] font-semibold text-slate-400">
                {a.status === "online" ? "Recent heartbeat only" : a.status === "stale" ? "Stale heartbeat" : "No valid heartbeat"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}