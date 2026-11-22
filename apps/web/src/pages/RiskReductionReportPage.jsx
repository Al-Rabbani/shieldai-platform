import React, { useState, useEffect } from "react";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import RiskReductionChart from "@/components/dashboard/RiskReductionChart";
import GenerateExecutiveReportButton from "@/components/dashboard/GenerateExecutiveReportButton";

export default function RiskReductionReportPage() {
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
      const result = await invokeAction("gdsAgentOS", {
        action: "command", command_type: "board_report",
        input: "Write a concise 2-paragraph executive summary of our 90-day risk reduction progress, suitable for a board presentation slide. Reference the risk score trend and remediation velocity.",
        live_data_override: liveDataOverride,
      }).catch(e => ({ response: `Summary unavailable: ${e.message}` }));
      setNarrative(result?.response || "Summary unavailable.");
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Executive Review</p>
          <h1 className="text-2xl font-bold text-white">90-Day Risk Reduction Report</h1>
          <p className="text-xs text-slate-500 mt-1">Generated {new Date().toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <GenerateExecutiveReportButton />
          <button onClick={() => window.print()} className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition">🖨️ Print / Export PDF</button>
        </div>
      </div>

      <RiskReductionChart days={90} />

      <div className="rounded-xl p-5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Executive Summary</p>
        {loading ? (
          <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
        ) : (
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{narrative}</p>
        )}
      </div>
    </div>
  );
}