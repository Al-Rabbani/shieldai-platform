import React from "react";

const SEV_ICON = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵" };
const SEV_LABEL = { critical: "CRITICAL", high: "HIGH", medium: "MED", low: "LOW" };

export default function GlobalThreatMapPanel({ feeds }) {
  const top = [...feeds].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  }).slice(0, 4);

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">🌍 Global Threat Landscape</p>
      {top.length === 0 ? (
        <p className="text-xs text-slate-600">No active threats tracked.</p>
      ) : (
        <div className="space-y-1.5">
          {top.map((f, i) => (
            <p key={f.id || i} className="text-xs text-slate-300">
              {SEV_ICON[f.severity] || "🔵"} <span className="font-bold">{SEV_LABEL[f.severity] || "LOW"}:</span> {f.title}
              {f.affected_asset ? ` (${f.affected_asset})` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}