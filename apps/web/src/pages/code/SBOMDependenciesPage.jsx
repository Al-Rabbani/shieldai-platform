import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import DependencyRiskTable from "@/components/code/DependencyRiskTable";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function SBOMDependenciesPage() {
  const [risks, setRisks] = useState([]);
  const [sboms, setSboms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [lr, sb] = await Promise.all([
      base44.entities.LicenseRisk.list("-detected_at", 30).catch(() => []),
      base44.entities.SBOM.list("-generated_at", 5).catch(() => []),
    ]);
    setRisks(lr); setSboms(sb);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPackages = sboms.reduce((s, b) => s + (b.total_packages || 0), 0);
  const vulnerablePackages = sboms.reduce((s, b) => s + (b.vulnerable_packages || 0), 0);
  const eolCount = risks.filter(r => r.is_eol).length;

  async function runAnalysis() {
    setModalTitle("AI SBOM Analysis");
    setModalLoading(true); setModalData(null);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "code_generation",
      input: `Analyze software bill of materials across ${sboms.length} SBOM(s): ${totalPackages} total packages, ${vulnerablePackages} with vulnerabilities. ${risks.length} license/dependency risks detected including axios, lodash, jsonwebtoken exposures. Recommend a prioritized supply chain remediation plan.`,
      priority: "normal",
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">📦 SBOM & SUPPLY CHAIN</h1>
        <button onClick={runAnalysis} className="ml-auto px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">🤖 AI SBOM Analysis</button>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "SBOMs Generated", value: sboms.length, color: "text-white" },
              { label: "Total Packages", value: totalPackages.toLocaleString(), color: "text-white" },
              { label: "Vulnerable Packages", value: vulnerablePackages, color: vulnerablePackages > 0 ? "text-red-400" : "text-emerald-400" },
              { label: "EOL Dependencies", value: eolCount, color: eolCount > 0 ? "text-amber-400" : "text-white" },
            ].map((t, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
              </div>
            ))}
          </div>

          <DependencyRiskTable risks={risks} />
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}