import React, { useState, useEffect, useRef } from "react";
import { Shield, ChevronDown, ChevronRight, X, Play, RefreshCw, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const SAMPLE_DATA = [
  { id: 1, cve: "CVE-2024-3094", pkg: "libxz 5.6.0", severity: "critical", reachable: true, confidence: "High", callPath: "main() → compress() → lzma_stream_decoder() → [VULNERABLE]", status: "open", effectiveSev: "critical" },
  { id: 2, cve: "CVE-2024-1234", pkg: "lodash 4.17.11", severity: "high", reachable: false, confidence: "High", callPath: "N/A — function never called in production code paths", status: "suppressed", effectiveSev: "info" },
  { id: 3, cve: "CVE-2023-9801", pkg: "axios 0.21.1", severity: "high", reachable: true, confidence: "High", callPath: "api/handler.js:34 → httpClient.get() → axios@request() → [VULNERABLE REDIRECT]", status: "open", effectiveSev: "high" },
  { id: 4, cve: "CVE-2023-8812", pkg: "express 4.17.0", severity: "medium", reachable: false, confidence: "Medium", callPath: "N/A — route handler unreachable via any public endpoint", status: "suppressed", effectiveSev: "info" },
  { id: 5, cve: "CVE-2024-0056", pkg: "moment 2.29.1", severity: "medium", reachable: null, confidence: "Low", callPath: "Unknown — dynamic require() prevents static analysis", status: "analyzing", effectiveSev: "medium" },
  { id: 6, cve: "CVE-2023-7219", pkg: "jsonwebtoken 8.5.0", severity: "critical", reachable: true, confidence: "High", callPath: "auth/middleware.js:12 → jwt.verify() → [VULNERABLE ALG CONFUSION]", status: "open", effectiveSev: "critical" },
  { id: 7, cve: "CVE-2023-6547", pkg: "node-fetch 2.6.0", severity: "high", reachable: false, confidence: "High", callPath: "N/A — only used in test files, excluded from production build", status: "suppressed", effectiveSev: "info" },
  { id: 8, cve: "CVE-2024-2291", pkg: "webpack 5.76.0", severity: "medium", reachable: false, confidence: "High", callPath: "N/A — dev dependency only", status: "suppressed", effectiveSev: "info" },
  { id: 9, cve: "CVE-2024-5521", pkg: "semver 7.3.2", severity: "medium", reachable: null, confidence: "Low", callPath: "Requires runtime trace — static analysis inconclusive", status: "analyzing", effectiveSev: "medium" },
  { id: 10, cve: "CVE-2023-4881", pkg: "protobufjs 6.11.2", severity: "high", reachable: true, confidence: "Medium", callPath: "services/messaging.js:89 → decode() → protobuf.Root.fromJSON() → [PROTOTYPE POLLUTION]", status: "open", effectiveSev: "high" },
  { id: 11, cve: "CVE-2024-6632", pkg: "tar 6.1.0", severity: "high", reachable: false, confidence: "High", callPath: "N/A — archive utility never invoked in request handler paths", status: "suppressed", effectiveSev: "info" },
  { id: 12, cve: "CVE-2024-7891", pkg: "vm2 3.9.17", severity: "critical", reachable: true, confidence: "High", callPath: "plugins/sandbox.js:5 → VM.run() → [SANDBOX ESCAPE]", status: "open", effectiveSev: "critical" },
];

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#6B7280" };
const CONF_COLOR = { High: "#22c55e", Medium: "#eab308", Low: "#f97316" };

function CallPathModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border p-6" style={{ background: "#111827", borderColor: "#374151" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">Call Path — {item.cve}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-4 rounded-xl border font-mono text-xs" style={{ background: "#0d1220", borderColor: "#374151" }}>
          <div className="text-emerald-400 mb-3">// Vulnerability call chain trace</div>
          {item.callPath.split("→").map((seg, i, arr) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-slate-500">{String(i).padStart(2, "0")}</span>
              <span style={{ paddingLeft: `${i * 16}px`, color: i === arr.length - 1 ? "#ef4444" : "#9CA3AF" }}>
                {i > 0 && "↳ "}{seg.trim()}
              </span>
            </div>
          ))}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(item.callPath); toast.success("Copied"); }}
          className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
          <Copy className="w-3.5 h-3.5" /> Copy call path
        </button>
      </div>
    </div>
  );
}

function CounterUp({ target, color }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = Math.ceil(target / 40);
        const t = setInterval(() => { start = Math.min(start + step, target); setVal(start); if (start >= target) clearInterval(t); }, 40);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref} style={{ color }}>{val}</span>;
}

export default function ReachabilityPage() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState(SAMPLE_DATA);

  useEffect(() => { document.title = "ShieldAI | Reachability Analysis"; }, []);

  const reachable = data.filter(d => d.reachable === true).length;
  const notReachable = data.filter(d => d.reachable === false).length;
  const unknown = data.filter(d => d.reachable === null).length;
  const total = data.length;
  const suppressPct = Math.round((notReachable / total) * 100);

  const filtered = filter === "all" ? data
    : filter === "reachable" ? data.filter(d => d.reachable === true)
    : filter === "suppressed" ? data.filter(d => d.reachable === false)
    : data.filter(d => d.reachable === null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 2000));
    setAnalyzing(false);
    toast.success("Reachability analysis complete");
  };

  const suppress = (id) => {
    setData(prev => prev.map(d => d.id === id ? { ...d, reachable: false, status: "suppressed", effectiveSev: "info" } : d));
    toast.success("Finding suppressed as non-reachable");
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>Code Security</span><span>/</span>
          <span style={{ color: GOLD }}>Reachability Analysis</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Vulnerability Reachability Analysis</h1>
            <p className="text-slate-400 text-sm mt-0.5">Not all vulnerabilities are created equal — we confirm which ones can actually be reached and exploited in your specific codebase.</p>
          </div>
          <button onClick={handleAnalyze} disabled={analyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-50"
            style={{ background: `linear-gradient(135deg,${GOLD},#a8873e)` }}>
            {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Play className="w-4 h-4" />Run Analysis</>}
          </button>
        </div>
      </div>

      {/* Noise reduction banner */}
      <div className="fu rounded-2xl p-5 border" style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.08),rgba(34,197,94,0.03))", borderColor: "rgba(34,197,94,0.3)", animationDelay: "60ms" }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-3xl font-black" style={{ color: "#22c55e" }}>{suppressPct}%</div>
          <div>
            <div className="font-bold text-white">of your vulnerabilities are NOT reachable in production</div>
            <div className="text-sm text-slate-400">{notReachable} findings suppressed as noise — your team only needs to fix <span className="text-white font-bold">{reachable}</span> real issues</div>
          </div>
          <div className="ml-auto h-2.5 rounded-full bg-[#1F2937] overflow-hidden w-48 flex-shrink-0">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${suppressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="fu grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: "80ms" }}>
        {[
          { label: "Total CVEs Found", value: total, color: "#9CA3AF" },
          { label: "Confirmed Reachable", value: reachable, color: "#ef4444" },
          { label: "Not Reachable (Suppressed)", value: notReachable, color: "#22c55e" },
          { label: "Unknown (Needs Analysis)", value: unknown, color: "#eab308" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: s.color + "33" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{s.label}</div>
            <div className="text-2xl font-black"><CounterUp target={s.value} color={s.color} /></div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="fu grid grid-cols-1 md:grid-cols-3 gap-4" style={{ animationDelay: "100ms" }}>
        {[
          { title: "Static Call Graph Analysis", desc: "Traces your entire dependency tree and function call graph to map which vulnerable functions are actually imported and called.", icon: "🔍" },
          { title: "Runtime Trace Analysis", desc: "Instruments your application at runtime to capture actual execution paths and confirm which code paths are live in production.", icon: "⚡" },
          { title: "AI-Powered Inference", desc: "Uses large language models to reason about indirect code paths, dynamic requires, and framework magic that static analysis misses.", icon: "🤖" },
        ].map((m, i) => (
          <div key={m.title} className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="text-sm font-bold text-white mb-1">{m.title}</div>
            <div className="text-xs text-slate-400">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="fu flex gap-2 flex-wrap" style={{ animationDelay: "120ms" }}>
        {[["all", "All", "#9CA3AF"], ["reachable", "Reachable ⚠️", "#ef4444"], ["suppressed", "Not Reachable ✓", "#22c55e"], ["unknown", "Unknown 🟡", "#eab308"]].map(([v, l, c]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="px-4 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{ background: filter === v ? c + "20" : "#111827", color: filter === v ? c : "#6B7280", borderColor: filter === v ? c + "44" : "#1F2937" }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div className="fu rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "140ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
                {["CVE ID", "Package", "Severity", "Effective Sev.", "Reachable?", "Confidence", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const notReach = row.reachable === false;
                return (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: "1px solid #1F2937", opacity: notReach ? 0.55 : 1 }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: notReach ? "#6B7280" : "#60a5fa", textDecoration: notReach ? "line-through" : "none" }}>
                      {row.cve}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{row.pkg}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize" style={{ color: SEV_COLOR[row.severity], background: SEV_COLOR[row.severity] + "15", borderColor: SEV_COLOR[row.severity] + "40" }}>{row.severity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize" style={{ color: SEV_COLOR[row.effectiveSev], background: SEV_COLOR[row.effectiveSev] + "15", borderColor: SEV_COLOR[row.effectiveSev] + "40" }}>{row.effectiveSev}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.reachable === true && <span className="text-red-400 font-bold">✅ Yes</span>}
                      {row.reachable === false && <span className="text-emerald-400">❌ No</span>}
                      {row.reachable === null && <span className="text-yellow-400">⚠️ Unknown</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold" style={{ color: CONF_COLOR[row.confidence] }}>{row.confidence}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-md capitalize font-semibold"
                        style={{ background: row.status === "suppressed" ? "rgba(34,197,94,0.1)" : row.status === "open" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)", color: row.status === "suppressed" ? "#22c55e" : row.status === "open" ? "#ef4444" : "#eab308" }}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelected(row)} className="text-[10px] px-2 py-1 rounded-lg border"
                          style={{ color: "#9CA3AF", borderColor: "#374151", background: "#1F2937" }}>Call Path</button>
                        {row.reachable !== false && (
                          <button onClick={() => suppress(row.id)} className="text-[10px] px-2 py-1 rounded-lg border"
                            style={{ color: "#22c55e", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" }}>Suppress</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Noise Reduction Stats */}
      <div className="fu grid grid-cols-1 md:grid-cols-3 gap-4" style={{ animationDelay: "160ms" }}>
        {[
          { label: "Before ShieldAI Reachability", value: total, sub: "findings to fix", color: "#ef4444" },
          { label: "After Reachability Analysis", value: reachable + unknown, sub: "findings actually need attention", color: GOLD },
          { label: "Developer Time Saved", value: `~${notReachable * 4}h`, sub: "of investigation time eliminated", color: "#22c55e" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border p-5 text-center" style={{ background: "#111827", borderColor: s.color + "33" }}>
            <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white font-semibold">{s.label}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {selected && <CallPathModal item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}