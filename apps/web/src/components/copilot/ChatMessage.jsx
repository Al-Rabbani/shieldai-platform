import { base44 } from "@/api/base44Client";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import AgentStepCard from "./AgentStepCard";

function initials(name) {
  const words = (name || "").replace(/^AI\s+/, "").split(" ").filter(Boolean);
  return (words[0]?.[0] || "").toUpperCase() + (words[1]?.[0] || "").toUpperCase();
}

/* Three claims on this card used to be made without anything behind them.
 *
 * 1. The footer printed "GDS Agent OS v2.0" on every answer, because message.version was never set and the fallback was
 *    a literal. The release is now read from GET /health/version by the page and passed down; an unknown release says
 *    so instead of inventing a number.
 * 2. "Save Report" called base44.entities.CopilotReport.create(), an entity this platform does not serve, inside
 *    .catch(() => {}) - so the write always failed and the button always said "Saved!". There is no store for narrative
 *    answers here (custom_reports holds report DEFINITIONS - source_entity, columns, filters - not prose), so the button
 *    now does the one thing it can really do: writes the answer to a file the operator keeps, and says "Downloaded".
 * 3. "Share" said "Shared!" even when navigator.share did not exist and it had only copied to the clipboard, and even
 *    when the share sheet was dismissed. It now awaits the share and reports what actually happened.
 */
export default function ChatMessage({ message, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [shareState, setShareState] = useState(null);
  const [speakState, setSpeakState] = useState(null);

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

  /* Voice out. The MP3 is synthesised by the platform and played here; nothing is stored and the text is unchanged. */
  async function speak() {
    if (speakState === "playing") return;
    setSpeakState("synthesising");
    try {
      const { url } = await base44.platform.speak(message.content || "");
      const audio = new Audio(url);
      audio.onended = () => { setSpeakState(null); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeakState("failed"); URL.revokeObjectURL(url); setTimeout(() => setSpeakState(null), 2500); };
      await audio.play();
      setSpeakState("playing");
    } catch {
      setSpeakState("failed");
      setTimeout(() => setSpeakState(null), 2500);
    }
  }

  /* A file on the operator's machine, not a claim that something was stored server-side. */
  function download() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const name = `gds-copilot-${message.command_type || "answer"}-${stamp}.md`;
    const blob = new Blob([message.content || ""], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true); setTimeout(() => setDownloaded(false), 2000);
  }

  async function share() {
    const text = message.content || "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "GDS Agent OS Response", text });
        setShareState("shared");
      } catch (err) {
        /* AbortError means the operator closed the sheet: nothing was shared and nothing is claimed. */
        if (err && err.name !== "AbortError") setShareState("failed");
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareState("copied");
      } catch {
        setShareState("failed");
      }
    }
    setTimeout(() => setShareState(null), 2000);
  }

  const seconds = message.total_duration_ms ? (message.total_duration_ms / 1000).toFixed(1) : null;
  const shareLabel = shareState === "shared" ? "Shared" : shareState === "copied" ? "Copied" : shareState === "failed" ? "Could not share" : "Share";

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
            <span className="text-xs font-bold text-blue-400">GASCI — MISSION RESPONSE</span>
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
            <button
              onClick={speak}
              title="Synthesises this answer as audio and plays it here. Nothing is stored."
              className="text-[11px] font-medium text-blue-400 hover:text-blue-300"
            >
              🔊 {speakState === "playing" ? "Speaking" : speakState === "synthesising" ? "…" : speakState === "failed" ? "Could not speak" : "Speak"}
            </button>
            <button
              onClick={download}
              title="Writes this answer to a Markdown file on this machine. There is no report store for narrative answers on this platform."
              className="text-[11px] font-medium text-blue-400 hover:text-blue-300"
            >
              ⬇️ {downloaded ? "Downloaded" : "Download"}
            </button>
            {onRegenerate && <button onClick={onRegenerate} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">🔄 Regenerate</button>}
            <button onClick={share} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">📤 {shareLabel}</button>
          </div>

          <div className="px-4 pb-2.5 text-[10px] text-slate-600">
            {message.release ? `release ${message.release}` : "release unknown"} · {message.agents_count || message.agent_steps?.length || 0} agent(s) · Mission: {message.mission_id ? message.mission_id.slice(0, 16) : "none returned"} · {message.command_type || "—"}{message.cost_usd != null ? ` · $${message.cost_usd.toFixed(4)}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
