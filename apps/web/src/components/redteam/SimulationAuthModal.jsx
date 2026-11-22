import React, { useState } from "react";

export default function SimulationAuthModal({ adversary, onCancel, onConfirm }) {
  const [authRef, setAuthRef] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl p-5" style={{ background: "#0d1117", border: "1px solid #ef4444" }} onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold text-red-400">⚠️ Authorization Required</p>
        <p className="text-xs text-slate-400 mt-1">Simulating {adversary.name} requires explicit authorization for this non-production test.</p>

        <label className="block text-[10px] text-slate-500 uppercase mt-4 mb-1">Authorization Reference</label>
        <input
          value={authRef} onChange={e => setAuthRef(e.target.value)}
          placeholder="e.g. AUTH-2026-003"
          className="w-full rounded-lg px-3 py-2 text-sm text-white bg-slate-800 border border-slate-700 focus:outline-none focus:border-red-500"
        />

        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <input type="checkbox" checked disabled />
          Scope: non-production only
        </div>

        <p className="text-[10px] text-slate-600 mt-3">By proceeding you confirm this is authorized security testing.</p>

        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Cancel</button>
          <button disabled={!authRef.trim()} onClick={() => onConfirm(authRef.trim())} className="flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-40">▶ Run Simulation</button>
        </div>
      </div>
    </div>
  );
}