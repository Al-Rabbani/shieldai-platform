import React from "react";

const ACTIONS = [
  { status: "open", label: "Open" },
  { status: "in_remediation", label: "In Remediation" },
  { status: "fixed", label: "Fixed" },
  { status: "accepted_risk", label: "Accepted Risk" },
  { status: "false_positive", label: "False Positive" },
];

export default function VulnKanbanToolbar({ selectedIds, onBulkUpdate, onClear }) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-2xl" style={{ background: "#111827", border: "1px solid #3b82f6" }}>
      <span className="text-xs font-bold text-blue-400">{selectedIds.length} selected</span>
      {ACTIONS.map(a => (
        <button key={a.status} onClick={() => onBulkUpdate(a.status)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
          → {a.label}
        </button>
      ))}
      <button onClick={onClear} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Clear</button>
    </div>
  );
}