import React, { useState } from "react";

export default function AgentStepCard({ step }) {
  const [expanded, setExpanded] = useState(false);
  const seconds = step.duration_ms ? (step.duration_ms / 1000).toFixed(1) : null;

  return (
    <div className="rounded-lg mb-2 overflow-hidden" style={{ background: "#0d1428", border: `1px solid ${step.color}33` }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span>{step.emoji}</span>
        <span className="text-xs font-bold text-white flex-1 truncate">{step.agent}</span>
        {seconds && <span className="text-[10px] text-slate-500 flex-shrink-0">⚡ {seconds}s</span>}
        <span className="text-[10px] text-slate-500 flex-shrink-0">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 text-[12px] text-slate-300 leading-relaxed animate-fadeIn">
          {step.output}
        </div>
      )}
    </div>
  );
}