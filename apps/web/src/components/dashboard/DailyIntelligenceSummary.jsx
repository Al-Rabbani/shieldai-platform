import React from "react";
import ReactMarkdown from "react-markdown";

function generatedLabel(iso) {
  if (!iso) return null;
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return null;
  return when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function DailyIntelligenceSummary({ loading, text, generatedAt, error, onRefresh }) {
  const stamp = generatedLabel(generatedAt);
  return (
    <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-bold text-blue-400 flex-1">🧭 Today's Intelligence Summary</p>
        {stamp ? <span className="text-[9px] text-slate-500">generated {stamp}</span> : null}
        {onRefresh ? (
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Asks the reasoning agent again. One model call."
            className="text-[9px] font-bold px-2 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition disabled:opacity-40"
          >
            {loading ? "asking…" : "regenerate"}
          </button>
        ) : null}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 rounded animate-shimmer" style={{ background: "#1F2937" }} />
          <div className="h-3 rounded animate-shimmer w-5/6" style={{ background: "#1F2937" }} />
          <div className="h-3 rounded animate-shimmer w-3/4" style={{ background: "#1F2937" }} />
        </div>
      ) : (
        <div className="text-xs text-slate-300 prose prose-invert prose-sm max-w-none leading-relaxed">
          <ReactMarkdown>
            {text || (error ? `Summary unavailable: ${error}` : "No summary was returned by the reasoning agent.")}
          </ReactMarkdown>
        </div>
      )}
      <p className="text-[9px] text-slate-600 mt-2">
        Held for today, so reopening this page does not spend another model call. Regenerate asks the reasoning agent
        again and replaces it.
      </p>
    </div>
  );
}