import React, { useState, useEffect } from "react";

export default function MissionControlPanel({ agents = [] }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [progress, setProgress] = useState(6);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timers = agents.map((_, i) => setTimeout(() => setVisibleCount(i + 1), (i + 1) * 300));
    const progressTimer = setInterval(() => setProgress(p => (p < 80 ? Math.min(80, p + Math.random() * 10) : 80)), 700);
    const elapsedTimer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { timers.forEach(clearTimeout); clearInterval(progressTimer); clearInterval(elapsedTimer); };
  }, [agents]);

  return (
    <div className="flex justify-start mb-4">
      <div className="rounded-xl p-4 w-full max-w-lg" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-xs font-bold text-blue-400 mb-2">🔮 GASCI Orchestrator — Routing Mission</p>

        <p className="text-[11px] text-slate-400 mb-1">Analysing request...</p>
        <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden mb-3">
          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Activating agents</p>
        <div className="space-y-1.5 mb-3">
          {agents.slice(0, visibleCount).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-slate-300 animate-fadeIn">
              <span>{a.emoji}</span>
              <span className="font-medium w-32 truncate">{a.name.replace(/^AI\s+/, "")}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-500">{a.detail}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1 pt-2 border-t" style={{ borderColor: "#1F2937" }}>
          <p className="text-[10px] text-slate-500">📡 Reading 6 live data sources...</p>
          <p className="text-[10px] text-slate-500">🔐 Zero Trust gate: <span className="text-emerald-400 font-semibold">✓ CLEARED</span></p>
          <p className="text-[10px] text-slate-500">🤖 GPT-4.1 parallel execution: <span className="text-blue-400 font-semibold">IN PROGRESS</span></p>
          <p className="text-[10px] text-slate-600 mt-1">⏱️ {elapsed}s elapsed</p>
        </div>
      </div>
    </div>
  );
}