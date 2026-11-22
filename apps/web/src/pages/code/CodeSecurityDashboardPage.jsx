import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import CodeRepoDetailCard from "@/components/code/CodeRepoDetailCard";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function CodeSecurityDashboardPage() {
  const [repos, setRepos] = useState([]);
  const [licenseRisks, setLicenseRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, l] = await Promise.all([
      base44.entities.CodeRepository.list("-created_date", 10).catch(() => []),
      base44.entities.LicenseRisk.list("-detected_at", 10).catch(() => []),
    ]);
    setRepos(r); setLicenseRisks(l);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const criticalFindings = repos.reduce((s, r) => s + (r.critical_count || 0), 0);
  const outdatedDeps = repos.reduce((s, r) => s + (r.outdated_deps || 0), 0);
  const avgQuality = repos.length ? Math.round(repos.reduce((s, r) => s + (r.code_quality_score || 0), 0) / repos.length) : 0;
  const avgCoverage = repos.length ? Math.round(repos.reduce((s, r) => s + (r.test_coverage_pct || 0), 0) / repos.length) : 0;

  async function runDirector() {
    setModalTitle("AI DevSecOps Director");
    setModalLoading(true); setModalData(null);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "code_generation",
      input: `Review code security posture across ${repos.length} repositories: ${criticalFindings} critical findings, ${outdatedDeps} outdated dependencies, avg quality score ${avgQuality}. Recommend prioritized remediation plan.`,
      priority: "normal",
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">💻 CODE SECURITY</h1>
        <Link to="/code/sbom" className="text-xs font-bold text-blue-400 hover:text-blue-300">📦 SBOM & Supply Chain →</Link>
        <button onClick={runDirector} className="ml-auto px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">🤖 AI DevSecOps Director</button>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: "Repos Scanned", value: repos.length, color: "text-white" },
              { label: "Critical Findings", value: criticalFindings, color: criticalFindings > 0 ? "text-red-400" : "text-white" },
              { label: "Outdated Deps", value: outdatedDeps, color: outdatedDeps > 0 ? "text-amber-400" : "text-white" },
              { label: "Code Quality Score", value: `${avgQuality}%`, color: avgQuality < 60 ? "text-red-400" : "text-emerald-400" },
              { label: "Test Coverage", value: `${avgCoverage}%`, color: avgCoverage < 60 ? "text-amber-400" : "text-emerald-400" },
            ].map((t, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
              </div>
            ))}
          </div>

          {repos.length === 0 ? (
            <p className="text-sm text-slate-500">No repositories connected yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {repos.map(r => <CodeRepoDetailCard key={r.id} repo={r} />)}
            </div>
          )}

          {licenseRisks.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Top License / Dependency Risks</p>
              <p className="text-xs text-slate-400">{licenseRisks.slice(0, 5).map(l => l.package_name).join(", ")}</p>
            </div>
          )}
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}