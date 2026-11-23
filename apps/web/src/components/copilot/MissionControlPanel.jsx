import React, { useEffect, useState } from "react";

/* What is observable while a mission runs, and nothing else.
 *
 * This panel used to animate a progress bar with Math.random() (6% climbing to 80%), list agents behind pulsing green
 * dots, and assert "Reading 6 live data sources", "Zero Trust gate: CLEARED" and "GPT-4.1 parallel execution: IN
 * PROGRESS". The Co-Pilot sends one synchronous POST to the gdsAgentOS function. While it is in flight the browser
 * knows three things: the request was sent, which agent and command type were asked for, and how long it has waited.
 * It receives no progress events, no per-agent steps and no gate verdict, so none is drawn. The percentage was the
 * worst of them: a number that looked measured and was invented, on a page whose whole job is to report measurements.
 * The response, once it arrives, states what actually executed - that is where the agent steps belong. */
export default function MissionControlPanel({ agentLabel, commandType, startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = startedAt || Date.now();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - started) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <div className="flex justify-start mb-4">
      <div className="rounded-xl p-4 w-full max-w-lg" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2 mb-2">
          <span>⏳</span>
          <p className="text-xs font-bold text-blue-400">Mission in flight</p>
          <span className="ml-auto text-[10px] font-mono text-slate-500">{elapsed}s</span>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-slate-500">
            Sent to <span className="text-slate-300 font-semibold">{agentLabel || "an agent the orchestrator selects"}</span>
          </p>
          <p className="text-[10px] text-slate-500">
            Command type <span className="text-slate-300 font-mono">{commandType || "auto"}</span>
          </p>
        </div>

        <p className="text-[9px] text-slate-600 mt-2 leading-snug">
          One synchronous request. The orchestrator streams no progress events, per-agent steps or gate verdict to the
          browser, so none is shown here; the response states what actually executed.
        </p>
      </div>
    </div>
  );
}
