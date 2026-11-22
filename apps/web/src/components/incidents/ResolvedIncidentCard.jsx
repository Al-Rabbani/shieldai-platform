import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function extractImpact(incident) {
  if (incident.financial_impact_usd) return incident.financial_impact_usd;
  const m = /\$([\d.]+)\s*M|\$([\d,]+)K/i.exec(incident.business_impact || "");
  if (!m) return 0;
  return m[1] ? Math.round(parseFloat(m[1]) * 1000000) : parseInt((m[2] || "0").replace(/,/g, ""), 10) * 1000;
}

export default function ResolvedIncidentCard({ incident }) {
  const [open, setOpen] = useState(false);
  if (!incident) return null;
  const impact = extractImpact(incident);
  const closed = incident.closed_at ? new Date(incident.closed_at) : null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✅</span>
          <p className="text-sm font-medium text-white">{incident.title} — Resolved</p>
          <span className="text-[10px] text-slate-500">{closed ? closed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-slate-400 space-y-1 border-t border-slate-800 pt-3">
          <p>Financial Impact: <span className="text-white font-semibold">${impact.toLocaleString()}</span></p>
          <p>Affected Assets: {(incident.affected_assets || []).join(", ") || "—"}</p>
          <p>{incident.business_impact}</p>
        </div>
      )}
    </div>
  );
}