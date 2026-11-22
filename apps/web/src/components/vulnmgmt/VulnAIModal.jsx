import React, { useState } from "react";

export default function VulnAIModal({ finding, response, codeOutput, loading, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!finding) return null;

  function copyCode() {
    navigator.clipboard.writeText(codeOutput || response || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6" style={{ background: "#111827", border: "1px solid #1F2937" }} onClick={e => e.stopPropagation()}>
        <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">AI Remediation Plan</p>
        <h3 className="text-lg font-bold text-white mb-4">{finding.cve_id || finding.title}</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-4 h-4 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
            Generating remediation plan...
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{response}</p>
            {codeOutput && (
              <div className="mt-4 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-500">GENERATED FIX</p>
                  <button onClick={copyCode} className="text-[10px] font-medium text-blue-400 hover:text-blue-300">{copied ? "Copied!" : "Copy"}</button>
                </div>
                <pre className="text-xs text-slate-200 whitespace-pre-wrap overflow-x-auto">{codeOutput}</pre>
              </div>
            )}
            {!codeOutput && response && (
              <button onClick={copyCode} className="mt-3 text-[11px] font-medium text-blue-400 hover:text-blue-300">{copied ? "Copied!" : "Copy response"}</button>
            )}
          </>
        )}
        <button onClick={onClose} className="mt-6 px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  );
}