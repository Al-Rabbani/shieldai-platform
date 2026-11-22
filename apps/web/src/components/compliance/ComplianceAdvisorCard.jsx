import React from "react";

export default function ComplianceAdvisorCard({ text, loading }) {
  return (
    <div className="rounded-2xl p-4 flex-shrink-0 w-72" style={{ background: "#111827", border: "1px solid #3b82f640" }}>
      <p className="text-xs font-bold text-blue-400 mb-2">🤖 AI Compliance Director says:</p>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 rounded animate-shimmer" style={{ background: "#1F2937" }} />
          <div className="h-3 rounded animate-shimmer w-4/5" style={{ background: "#1F2937" }} />
          <div className="h-3 rounded animate-shimmer w-3/5" style={{ background: "#1F2937" }} />
        </div>
      ) : (
        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{text || "No advisory available yet."}</p>
      )}
    </div>
  );
}