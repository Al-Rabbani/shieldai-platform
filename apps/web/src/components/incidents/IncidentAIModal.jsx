import React from "react";

export default function IncidentAIModal({ incident, response, loading, onClose }) {
  if (!incident) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-2xl p-6" style={{ background: "#111827", border: "1px solid #1F2937" }} onClick={e => e.stopPropagation()}>
        <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">AI Incident Commander</p>
        <h3 className="text-lg font-bold text-white mb-4">{incident.title}</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-4 h-4 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
            Analyzing incident...
          </div>
        ) : (
          <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{response}</p>
        )}
        <button onClick={onClose} className="mt-6 px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Close</button>
      </div>
    </div>
  );
}