import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { invokeAction } from "@/lib/invokeAction";

export default function BlueTeamAdvisorPanel() {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");

  useEffect(() => {
    invokeAction("gdsAgentOS", {
      action: "command", command_type: "investigate_incident",
      input: "Blue team morning brief: review active incidents, exploited CVEs, and cloud misconfigurations. Give the top 3 defensive actions to take in the next 4 hours, time-boxed, with a clear owner for each.",
      priority: "emergency",
    }).then(r => setResponse(r.response)).catch(e => setResponse(`Advisory unavailable: ${e.message}`)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #3b82f6" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-400">🤖 AI Blue Team Advisor</p>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">DEFENSIVE</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-4 h-4 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
          Analysing defensive posture...
        </div>
      ) : (
        <div className="text-sm text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}