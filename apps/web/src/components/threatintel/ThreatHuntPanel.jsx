import React from "react";
import ReactMarkdown from "react-markdown";
import AgentStepCard from "@/components/copilot/AgentStepCard";

export default function ThreatHuntPanel({ loading, result }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#0d1117", border: "1px solid #3b82f640" }}>
      <p className="text-xs font-bold text-blue-400 mb-2">🔍 AI THREAT HUNT RESULT</p>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className="w-4 h-4 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
          Running proactive threat hunt across all feeds...
        </div>
      ) : result?.response ? (
        <>
          {result.agent_steps?.length > 0 && (
            <div className="mb-2">{result.agent_steps.map((s, i) => <AgentStepCard key={i} step={s} />)}</div>
          )}
          <div className="text-xs text-slate-300 prose prose-invert prose-sm max-w-none leading-relaxed">
            <ReactMarkdown>{result.response}</ReactMarkdown>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-600">No hunt result yet.</p>
      )}
    </div>
  );
}