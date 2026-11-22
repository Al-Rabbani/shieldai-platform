import { useEffect, useRef, useState } from "react";

function CountUp({ target, duration = 1500 }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || target === 0) { setVal(target); return; }
    started.current = true;
    const steps = 40;
    const step = target / steps;
    let cur = 0;
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(Math.round(cur));
      if (cur >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{val}</span>;
}

export default function DeduplicationFunnel({ rawCount, findings }) {
  const merged = findings.filter(f => (f.source_count || 1) > 1).length;
  const reachable = findings.filter(f => f.reachability !== "not_reachable").length;
  const exploitable = findings.filter(f => f.exploitability !== "none").length;
  const actionable = findings.filter(f => f.status === "open" || f.status === "in_remediation").length;
  const noisePct = rawCount > 0 ? Math.round((1 - findings.length / rawCount) * 100) : 0;

  const stages = [
    { label: "Raw Findings", count: rawCount, color: "#ef4444", width: "100%" },
    { label: "After Deduplication", count: findings.length, color: "#f97316", width: `${Math.max(15, (findings.length / (rawCount || 1)) * 100)}%` },
    { label: "Reachability Filter", count: reachable, color: "#eab308", width: `${Math.max(12, (reachable / (rawCount || 1)) * 100)}%` },
    { label: "Exploitability Scoring", count: exploitable, color: "#3b82f6", width: `${Math.max(8, (exploitable / (rawCount || 1)) * 100)}%` },
    { label: "Actionable Findings", count: actionable, color: "#10b981", width: `${Math.max(5, (actionable / (rawCount || 1)) * 100)}%` },
  ];

  return (
    <div className="rounded-xl p-6" style={{ background: "#0a0f1e", border: "1px solid rgba(16,185,129,0.2)" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-white">Deduplication Visualizer</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ShieldAI found{" "}
            <span className="text-red-400 font-bold font-mono">{rawCount}</span> raw findings across all scanners →{" "}
            AutoTriage merged them into{" "}
            <span className="text-emerald-400 font-bold font-mono">{findings.length}</span> unique issues
            {noisePct > 0 && <span className="text-emerald-400 font-bold"> ({noisePct}% noise reduction)</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black font-mono text-emerald-400"><CountUp target={noisePct} />%</p>
          <p className="text-[10px] font-mono text-slate-500">noise reduced</p>
        </div>
      </div>

      <div className="space-y-2 mt-5">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-3">
            <div className="w-40 text-right flex-shrink-0">
              <span className="text-[10px] font-mono text-slate-500">{stage.label}</span>
            </div>
            <div className="flex-1 relative h-7 rounded-lg overflow-hidden" style={{ background: "rgba(30,58,95,0.2)" }}>
              <div className="absolute inset-y-0 left-0 rounded-lg flex items-center pl-3 transition-all duration-1000"
                style={{ width: stage.width, background: `${stage.color}22`, border: `1px solid ${stage.color}40` }}>
              </div>
              <div className="absolute inset-0 flex items-center pl-3">
                <span className="text-xs font-black font-mono" style={{ color: stage.color }}>
                  <CountUp target={stage.count} duration={1200 + i * 200} />
                </span>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex-shrink-0 text-slate-600 text-xs">↓</div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 grid grid-cols-3 gap-4 text-center" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
        <div>
          <p className="text-xl font-black font-mono text-emerald-400"><CountUp target={noisePct} /></p>
          <p className="text-[10px] font-mono text-slate-500">% noise removed</p>
        </div>
        <div>
          <p className="text-xl font-black font-mono text-blue-400"><CountUp target={merged} /></p>
          <p className="text-[10px] font-mono text-slate-500">findings merged</p>
        </div>
        <div>
          <p className="text-xl font-black font-mono text-amber-400"><CountUp target={actionable} /></p>
          <p className="text-[10px] font-mono text-slate-500">actionable findings</p>
        </div>
      </div>
    </div>
  );
}