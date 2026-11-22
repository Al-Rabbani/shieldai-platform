import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import AgentStepCard from "@/components/copilot/AgentStepCard";

export default function RedTeamAdvisorPanel() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
      const input = "Red team advisory: Based on our current attack surface, what are the top 3 most likely attack paths an adversary would use to compromise Global Digital Security right now? Give specific MITRE techniques and kill chain stages.";
      const result = await invokeAction("gdsAgentOS", { action: "command", command_type: "risk_assessment", input, priority: "high", live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
      setData(result);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #ef4444" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-red-400">🤖 AI Red Team Advisor</p>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">HERMES</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-4 h-4 border-2 border-t-red-500 border-white/10 rounded-full animate-spin" />
          🔮 GASCI routing to specialists...
        </div>
      ) : (
        <div className="animate-fadeIn">
          {data?.agent_steps?.length > 0 && (
            <div className="mb-3">
              {data.agent_steps.map((s, i) => <AgentStepCard key={i} step={s} />)}
            </div>
          )}
          <div className="text-sm text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{data?.response || "No advisory available."}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}