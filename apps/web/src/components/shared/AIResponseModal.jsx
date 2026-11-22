import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import AgentStepCard from "@/components/copilot/AgentStepCard";

export const NO_CODE_GENERATOR_NOTE =
  "This platform answers with agent reasoning, not generated code. There is no code-generation engine here, so no patch " +
  "script is produced. Treat the analysis above as guidance and the remediation command recorded on the finding as the " +
  "authoritative fix.";

export default function AIResponseModal({ title, loading, response, codeOutput, codeAbsentNote, meta, actions, agentSteps, showDownload, onRegenerate, onClose }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [loading]);

  function copyCode() {
    navigator.clipboard.writeText(codeOutput || response || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const blob = new Blob([response || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "report").replace(/[^a-z0-9]+/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveToReport() {
    if (!response || saving) return;
    setSaving(true);
    await base44.entities.CopilotReport.create({
      report_type: "soc_summary",
      title: title || "Co-Pilot Response",
      audience: "security_team",
      executive_summary: response.slice(0, 2000),
      status: "ready",
    }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: "#0d1117", borderLeft: "3px solid #3b82f6", border: "1px solid #1F2937", borderLeftWidth: "3px", borderLeftColor: "#3b82f6" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex-shrink-0 ml-3">GDS Co-Pilot v10.4</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 mt-4">
            <div className="w-4 h-4 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
            🤖 GDS AI analysing... <span className="text-slate-600">{elapsed}s</span>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {agentSteps?.length > 0 && (
              <div className="mt-3">
                {agentSteps.map((s, i) => <AgentStepCard key={i} step={s} />)}
              </div>
            )}
            <div className="text-sm text-slate-200 leading-relaxed mt-3 prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{response || ""}</ReactMarkdown>
            </div>
            {codeOutput && (
              <div className="mt-4 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-500">GENERATED CODE</p>
                  <button onClick={copyCode} className="text-[10px] font-medium text-blue-400 hover:text-blue-300">{copied ? "Copied!" : "Copy"}</button>
                </div>
                <pre className="text-xs text-slate-200 whitespace-pre-wrap overflow-x-auto">{codeOutput}</pre>
              </div>
            )}
            {!codeOutput && codeAbsentNote && (
              <div className="mt-4 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <p className="text-[10px] text-slate-500">NO PATCH SCRIPT</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{codeAbsentNote}</p>
              </div>
            )}
            {meta && (
              <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-slate-500">
                {meta.model && <span>Model: {meta.model}</span>}
                {meta.timing && <span>· {meta.timing}</span>}
                {meta.sessionId && <span>· Session: {meta.sessionId}</span>}
              </div>
            )}
            {actions?.length > 0 && (
              <p className="text-[10px] text-slate-600 mt-2">Actions: {actions.join(" · ")}</p>
            )}

            {response && (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800">
                <button onClick={copyCode} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">📋 {copied ? "Copied!" : "Copy"}</button>
                <button onClick={saveToReport} disabled={saving} className="text-[11px] font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50">💾 {saving ? "Saving..." : saved ? "Saved!" : "Save to Report"}</button>
                {onRegenerate && (
                  <button onClick={onRegenerate} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">🔄 Regenerate</button>
                )}
                {showDownload && (
                  <button onClick={download} className="text-[11px] font-medium text-blue-400 hover:text-blue-300">Download</button>
                )}
              </div>
            )}
          </div>
        )}
        <button onClick={onClose} className="mt-6 px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  );
}