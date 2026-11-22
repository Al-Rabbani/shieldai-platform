import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";

const BRANCH_META = {
  defensive: { label: "🛡️ Defensive Sweep", desc: "5 agents • Cloud + Vulns + SOC + Identity + Compliance", agents: ["soc","cloud","vuln","identity","compliance"] },
  offensive: { label: "⚔️ Offensive Hunt",  desc: "4 agents • Threat Hunter + Dark Web + Exploit + OSINT",  agents: ["hunter","dark-web","exploit","osint"] },
};

const AGENT_STEPS = {
  defensive: ["AI SOC Director", "AI Cloud Director", "AI Vuln Director", "AI Identity Director", "AI Compliance Director"],
  offensive: ["AI Threat Hunter", "AI Dark Web Monitor", "AI Exploit Intel", "AI OSINT Recon"],
};

function StatusCircle({ status }) {
  const c = status === "CRITICAL" ? "bg-destructive" : status === "HIGH" ? "bg-orange-500" : "bg-emerald-500";
  return <div className={`w-10 h-10 rounded-full flex-shrink-0 ${c}`} />;
}

export default function MissionModal({ onClose }) {
  const [branch, setBranch] = useState("defensive");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState(0);
  const [results, setResults] = useState(null);

  const launch = async () => {
    setPhase("executing");
    setProgress(0);
    setCurrentAgent(0);
    const steps = AGENT_STEPS[branch];
    let i = 0;
    const ticker = setInterval(() => {
      i++;
      setCurrentAgent(Math.min(i, steps.length - 1));
      setProgress(Math.min((i / steps.length) * 100, 95));
    }, 600);
    try {
      const r = await base44.functions.invoke("gdsMasterOrchestrator", {
        action: "workflow",
        agents: BRANCH_META[branch].agents,
        mission: description || "Run mission sweep",
        priority: "high",
      });
      clearInterval(ticker);
      setProgress(100);
      setResults(r.data);
      setPhase("results");
    } catch {
      clearInterval(ticker);
      setPhase("idle");
    }
  };

  const steps = AGENT_STEPS[branch];
  const overall = results?.overall_status;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-10 px-4">
      <div className="w-full max-w-2xl bg-card rounded-2xl border shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">⚡ Launch AI Mission</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-accent transition"><X className="w-5 h-5" /></button>
        </div>

        {phase === "idle" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(BRANCH_META).map(([key, meta]) => (
                <button key={key} onClick={() => setBranch(key)}
                  className={`rounded-xl border p-4 text-left transition ${branch === key ? "border-primary bg-primary/5" : "hover:bg-accent"}`}>
                  <p className="font-semibold text-sm">{meta.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{meta.desc}</p>
                </button>
              ))}
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="mt-4 w-full border rounded-xl px-4 py-3 text-sm resize-none h-20 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Describe the mission objective..." />
            <button onClick={launch} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-bold mt-4 hover:bg-primary/90 transition">
              ▶ Launch Mission
            </button>
          </>
        )}

        {phase === "executing" && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="animate-spin w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60 20" />
              </svg>
              <span className="text-sm font-medium">⚡ Executing...</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Agent {Math.min(currentAgent + 1, steps.length)}/{steps.length}: {steps[currentAgent]} — running...
            </p>
          </div>
        )}

        {phase === "results" && results && (
          <div>
            <div className="space-y-3 mt-2 max-h-80 overflow-y-auto">
              {(results.results || []).map((r, i) => (
                <div key={i} className="rounded-lg border p-3 flex items-start gap-3">
                  <StatusCircle status={r.result?.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{r.agent?.name}</p>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{r.result?.data?.headline}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{r.result?.duration_ms}ms</span>
                </div>
              ))}
            </div>
            <div className={`mt-4 rounded-xl p-4 border text-sm font-semibold ${overall === "CRITICAL" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"}`}>
              {overall === "CRITICAL" ? "🔴 CRITICAL — Immediate action required" : `✅ Mission ${overall} — ${results.results?.length ?? 0} agents completed`}
            </div>
            <button onClick={onClose} className="w-full border rounded-xl py-2 mt-3 text-sm hover:bg-accent transition">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}