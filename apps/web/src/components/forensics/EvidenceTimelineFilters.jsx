import React from "react";
import { RotateCcw } from "lucide-react";
import { ACTION_ORDER } from "@/components/forensics/evidenceActionStyles";

export const EMPTY_EVIDENCE_FILTERS = { from: "", to: "", action: "all", actor: "all", agentId: "all", incidentType: "all" };

const INPUT = "px-2 py-1.5 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none";

export default function EvidenceTimelineFilters({ filters, setFilters, actionOptions, actorOptions, agentOptions, incidentOptions, activeCount }) {
  const set = (patch) => setFilters({ ...filters, ...patch });

  const fields = [
    { label: "From", node: <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className={INPUT} /> },
    { label: "To", node: <input type="date" value={filters.to} onChange={(e) => set({ to: e.target.value })} className={INPUT} /> },
    {
      label: "Category",
      node: (
        <select value={filters.action} onChange={(e) => set({ action: e.target.value })} className={INPUT}>
          <option value="all">All categories</option>
          {actionOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      ),
    },
    {
      label: "User",
      node: (
        <select value={filters.actor} onChange={(e) => set({ actor: e.target.value })} className={INPUT}>
          <option value="all">All users</option>
          {actorOptions.map((actor) => <option key={actor} value={actor}>{actor}</option>)}
        </select>
      ),
    },
    {
      label: "Agent ID",
      node: (
        <select value={filters.agentId} onChange={(e) => set({ agentId: e.target.value })} className={INPUT}>
          <option value="all">All agents</option>
          {agentOptions.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
        </select>
      ),
    },
    {
      label: "Incident type",
      node: (
        <select value={filters.incidentType} onChange={(e) => set({ incidentType: e.target.value })} className={INPUT}>
          <option value="all">All incident types</option>
          {incidentOptions.map((type) => <option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}
        </select>
      ),
    },
  ];

  return (
    <div className="mb-3">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
        {fields.map((field) => (
          <label key={field.label} className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">{field.label}</span>
            {field.node}
          </label>
        ))}
      </div>
      {activeCount > 0 && (
        <button onClick={() => setFilters(EMPTY_EVIDENCE_FILTERS)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 mt-2">
          <RotateCcw size={11} /> Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}

export function actionOptionsFromRows(rows) {
  const present = new Set((rows || []).map((row) => row.action).filter(Boolean));
  return ACTION_ORDER.filter((key) => present.has(key)).map((key) => ({
    key,
    label: key === "viewed" ? "Accessed" : key.charAt(0).toUpperCase() + key.slice(1),
  }));
}