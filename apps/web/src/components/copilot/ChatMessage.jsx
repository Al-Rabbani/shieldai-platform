import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import AgentStepCard from "./AgentStepCard";

function initials(name) {
  const words = (name || "").replace(/^AI\s+/, "").split(" ").filter(Boolean);
  return (words[0]?.[0] || "").toUpperCase() + (words[1]?.[0] || "").toUpperCase();
}

export default function ChatMessage({ message, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] flex items-start gap-2">
          <div className="rounded-xl px-4 py-2.5 text-sm text-white" style={{ background: "#1f2937" }}>
            {message.content}
          </div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: "#3b82f6" }}>
            {initials(message.userInitials || "You")}
          </div>
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[75%] rounded-xl px-4 py-3 text-sm text-red-300" style={{ background: "#1a0000", border: "1px solid #ef4444" }}>
          ⚠️ {message.content}
        </div>
      </div>
    );
  }

  function copy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  async function save() {
    await base44.entities.CopilotReport.create({
      report_type: "soc_summary",
      title: `Agent OS Response — ${message.command_type || "session"}`,
      audience: "security_team",
      executive_summary: message.content.slice(0, 2000),
      status: "ready",
    }).catch(() => {});
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: "GDS Agent OS Response", text: message.content }).catch(() => {});
    } else {
      navigator.clipboard.writeText(message.content);
    }
    setShared(true); setTimeout(() => setShared(false), 1500);
  }

  const seconds = message.total_duration_ms ? (message.total_duration_ms / 1000).toFixed(1) : null;

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] w-full">
        {message.agent_steps?.length > 0 && (
          <div className="mb-2">
            {message.agent_steps.map((s, i) => <AgentStepCard key={i} step={s} />)}
          </div>
        )}

        <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #3b82f655" }}>
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <span className="text-sm">🔮</span>
            <span className="text-xs font-bold text-blue-400">GASCI — FINAL INTELLIGENCE BRIEFING</span>
            {seconds && <span className="ml-auto text-[10px] text-slate-500">⚡ {seconds}s</span>}
          </div>

          <div className="px-4 pb-3 text-sm text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content || ""}</ReactMarkdown>
          </div>

          {message.code_output && (
            <div className="mx-4 mb-3 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <pre className="text-xs text-slate-200 whitespace-pre-wrap overflow-x-auto font-mono">{message.code_output}</pre>
            </div>
          )}

          <div className="flex items-center gap-4 px-4 py-2.5 border-t" style={{ borderColor: "#1F2937" }}>
            <button onClick={copy} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">📋 {copied ? "Copied!" : "Copy"}</button>
            <button onClick={save} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">💾 {saved ? "Saved!" : "Save Report"}</button>
            {onRegenerate && <button onClick={onRegenerate} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">🔄 Regenerate</button>}
            <button onClick={share} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">📤 {shared ? "Shared!" : "Share"}</button>
          </div>

          <div className="px-4 pb-2.5 text-[10px] text-slate-600">
            {message.version || "GDS Agent OS v2.0"} · {message.agents_count || message.agent_steps?.length || 0} agents · Mission: {message.mission_id ? message.mission_id.slice(0, 16) : "—"} · {message.command_type || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}