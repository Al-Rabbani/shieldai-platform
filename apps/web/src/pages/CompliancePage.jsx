import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import ComplianceScoreCard from "@/components/compliance/ComplianceScoreCard";
import ComplianceHighLevelOverview from "@/components/compliance/ComplianceHighLevelOverview";
import ComplianceGapsTable from "@/components/compliance/ComplianceGapsTable";
import ComplianceAdvisorCard from "@/components/compliance/ComplianceAdvisorCard";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function CompliancePage() {
  const [frameworks, setFrameworks] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDownload, setModalDownload] = useState(false);
  const [advisorText, setAdvisorText] = useState("");
  const [advisorLoading, setAdvisorLoading] = useState(true);

  useEffect(() => {
    invokeAction("gdsAgentOS", {
      action: "command", command_type: "compliance_check",
      input: "Quick compliance advisor brief — top 3 priority frameworks and single most important action for each",
      priority: "normal",
    }).then(r => setAdvisorText(r.response)).catch(() => setAdvisorText("Advisory unavailable.")).finally(() => setAdvisorLoading(false));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, v] = await Promise.all([
      base44.entities.ComplianceFramework.list("-created_date", 20).catch(() => []),
      base44.entities.PolicyViolation.list("-detected_at", 100).catch(() => []),
    ]);
    setFrameworks(f);
    setViolations(v);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const avgScore = frameworks.length ? Math.round(frameworks.reduce((s, f) => s + (f.score || 0), 0) / frameworks.length) : 0;
  const criticalGaps = violations.filter(v => v.status !== "resolved");

  async function analyze(framework) {
    setModalTitle(`AI Gap Analysis — ${framework.name}`);
    setModalDownload(false);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const input = `Compliance gap analysis for ${framework.name}: current score ${framework.score}%, passing=${framework.passing_count || 0}, failing=${framework.failing_count || 0}. List top 5 critical control gaps and remediation steps.`;
    const result = await invokeAction("gdsAgentOS", { action: "command", command_type: "compliance_check", input, live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  async function generateBoardReport() {
    setModalTitle("Q3 2026 Board Security & Compliance Report");
    setModalDownload(true);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const input = "Generate full Q3 2026 board security and compliance report for Global Digital Security. Include risk score, all compliance frameworks, financial exposure, MSSP revenue, and top 5 recommended board actions.";
    const result = await invokeAction("gdsAgentOS", { action: "command", command_type: "board_report", input, live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">📋 Compliance Command Centre</h1>
        <button onClick={generateBoardReport} className="ml-auto px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition">
          📥 Export Report
        </button>
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-2xl font-black" style={{ color: avgScore < 80 ? "#EF4444" : "#10B981" }}>{avgScore}%</p>
          {avgScore < 80 && <span className="text-xs font-bold text-amber-400">⚠️ BELOW 80% BOARD TARGET</span>}
        </div>
        <div className="h-2.5 rounded-full bg-slate-800">
          <div className="h-full rounded-full" style={{ width: `${avgScore}%`, background: avgScore < 80 ? "#EF4444" : "#10B981" }} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          <span>Frameworks: {frameworks.length} active</span>
          <span>Critical gaps: {criticalGaps.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
        <ComplianceHighLevelOverview frameworks={frameworks} />
        <div className="grid grid-cols-4 gap-4 items-start">
          <div className="col-span-3 space-y-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {frameworks.map(f => <ComplianceScoreCard key={f.id} framework={f} onAnalyze={analyze} />)}
            </div>

            <h2 className="text-sm font-bold text-white mt-2 mb-2">Critical Gaps</h2>
            <ComplianceGapsTable violations={criticalGaps} />
          </div>
          <ComplianceAdvisorCard text={advisorText} loading={advisorLoading} />
        </div>
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} showDownload={modalDownload} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}