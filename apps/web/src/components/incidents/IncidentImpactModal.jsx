import React from "react";

export default function IncidentImpactModal({ incident, onClose }) {
  if (!incident) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "#111827", border: "1px solid #1F2937" }} onClick={e => e.stopPropagation()}>
        <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">Business Impact</p>
        <h3 className="text-lg font-bold text-white mb-4">{incident.title}</h3>

        <div className="space-y-3">
          <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <p className="text-[10px] text-slate-500 uppercase">Financial Impact</p>
            <p className="text-xl font-bold text-red-400">${(incident.financial_impact_usd || 0).toLocaleString()}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <p className="text-[10px] text-slate-500 uppercase">Affected Assets</p>
            <p className="text-sm text-slate-200 mt-1">{(incident.affected_assets || []).join(", ") || "None recorded"}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <p className="text-[10px] text-slate-500 uppercase">Regulatory Impact</p>
            <p className="text-sm text-slate-200 mt-1">{incident.business_impact || "No regulatory impact recorded."}</p>
          </div>
        </div>

        <button onClick={onClose} className="mt-6 px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  );
}