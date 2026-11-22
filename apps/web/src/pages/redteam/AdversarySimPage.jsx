import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { invokeAction } from "@/lib/invokeAction";
import AdversaryCard from "@/components/redteam/AdversaryCard";
import SimulationAuthModal from "@/components/redteam/SimulationAuthModal";

export default function AdversarySimPage() {
  const [adversaries, setAdversaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    invokeAction("gdsHermesOffensive", { action: "list_adversaries" })
      .then(r => setAdversaries(r.adversaries || []))
      .finally(() => setLoading(false));
  }, []);

  async function runSimulation(authRef) {
    setSimulating(true);
    const r = await invokeAction("gdsHermesOffensive", {
      action: "adversary_simulation", adversary: selected.key, target: "gds-staging-environment",
      authorization_ref: authRef, scope: "non-production only",
    }).catch(e => ({ narrative: `Error: ${e.message}` }));
    setResult(r);
    setSelected(null);
    setSimulating(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <h1 className="text-xl font-bold text-white">🎭 Adversary Simulation</h1>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-red-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {adversaries.map(a => <AdversaryCard key={a.key} adversary={a} onSimulate={setSelected} />)}
        </div>
      )}

      {selected && !simulating && <SimulationAuthModal adversary={selected} onCancel={() => setSelected(null)} onConfirm={runSimulation} />}

      {simulating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <div className="w-5 h-5 border-2 border-t-red-500 border-white/10 rounded-full animate-spin" />
            Running authorized adversary emulation...
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #ef4444" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white">Simulation Result — {result.adversary}</p>
            {result.risk_score != null && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Risk {result.risk_score}</span>}
          </div>
          <div className="text-sm text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none mb-3">
            <ReactMarkdown>{result.narrative || ""}</ReactMarkdown>
          </div>
          {result.techniques_used?.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Techniques Used</p>
              <div className="flex flex-wrap gap-1">{result.techniques_used.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300">{t}</span>)}</div>
            </div>
          )}
          {result.detection_gaps?.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Detection Gaps</p>
              <ul className="text-xs text-red-400 list-disc list-inside space-y-0.5">{result.detection_gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </div>
          )}
          {result.recommended_controls?.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase mb-1">Recommended Controls</p>
              <ul className="text-xs text-emerald-400 list-disc list-inside space-y-0.5">{result.recommended_controls.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </div>
          )}
          <button onClick={() => setResult(null)} className="mt-3 px-4 py-2 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition">Close</button>
        </div>
      )}
    </div>
  );
}