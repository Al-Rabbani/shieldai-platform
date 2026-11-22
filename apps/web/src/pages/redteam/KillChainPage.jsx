import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { invokeAction } from "@/lib/invokeAction";

function tierStyle(pct) {
  if (pct < 30) return { border: "1px solid #ef4444", background: "rgba(127,29,29,0.3)" };
  if (pct < 60) return { border: "1px solid #eab308", background: "rgba(113,63,18,0.3)" };
  return { border: "1px solid #10b981", background: "rgba(6,78,59,0.3)" };
}

export default function KillChainPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invokeAction("gdsHermesOffensive", { action: "kill_chain_analysis" })
      .then(setData)
      .catch(e => setData({ error: e.message }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <h1 className="text-xl font-bold text-white">⚡ Kill Chain Analyzer — MITRE ATT&CK Coverage</h1>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-red-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : data?.error ? (
        <p className="text-sm text-red-400">Error: {data.error}</p>
      ) : (
        <>
          <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-black text-white">{data.overall_coverage_pct}% Coverage</p>
              <span className="text-xs text-slate-500">{data.stages.filter(s => s.coverage_pct >= 60).length}/14 tactics strong</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-800 mt-2">
              <div className="h-full rounded-full bg-red-500" style={{ width: `${data.overall_coverage_pct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {data.stages.map((s, i) => (
              <div key={i} title={s.gap} className="rounded-lg p-2.5 text-center cursor-help" style={tierStyle(s.coverage_pct)}>
                <p className="text-[9px] font-bold uppercase text-slate-300 truncate">{s.tactic}</p>
                <p className="text-lg font-black text-white mt-1">{s.coverage_pct}%</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #ef4444" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">🤖 AI Analysis</p>
            <div className="text-sm text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{data.analysis}</ReactMarkdown>
            </div>
          </div>
        </>
      )}
    </div>
  );
}