import React from "react";
import { INCIDENT_TEMPLATES, suggestedTemplateKey } from "./incidentTemplates";

export default function IncidentQuickTemplates({ incidentType, onApply, applying }) {
  const suggested = suggestedTemplateKey(incidentType);

  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase mb-1">⚡ Quick-Action Templates</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(INCIDENT_TEMPLATES).map(([key, tpl]) => (
          <button
            key={key}
            disabled={applying === key}
            onClick={() => onApply(key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition text-left disabled:opacity-50 ${
              key === suggested ? "bg-amber-500/15 text-amber-400 border-amber-500/40" : "bg-slate-700/30 text-slate-300 border-slate-600/40 hover:bg-slate-700/50"
            }`}
          >
            {tpl.label}{key === suggested ? " ✓" : ""}{applying === key ? "…" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}