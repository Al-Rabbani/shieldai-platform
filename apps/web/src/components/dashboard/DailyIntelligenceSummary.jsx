import React from "react";
import ReactMarkdown from "react-markdown";

export default function DailyIntelligenceSummary({ loading, text }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold text-blue-400 mb-2">🧭 Today's Intelligence Summary</p>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 rounded animate-shimmer" style={{ background: "#1F2937" }} />
          <div className="h-3 rounded animate-shimmer w-5/6" style={{ background: "#1F2937" }} />
          <div className="h-3 rounded animate-shimmer w-3/4" style={{ background: "#1F2937" }} />
        </div>
      ) : (
        <div className="text-xs text-slate-300 prose prose-invert prose-sm max-w-none leading-relaxed">
          <ReactMarkdown>{text || "No summary available."}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}