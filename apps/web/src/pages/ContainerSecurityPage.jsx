import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import ContainerFindingsTable from "@/components/container/ContainerFindingsTable";
import ContainerScanCard from "@/components/container/ContainerScanCard";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function ContainerSecurityPage() {
  const [findings, setFindings] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [lastFinding, setLastFinding] = useState(null);
  /* Platform totals, so a page of 200 is never presented as the estate. */
  const [summary, setSummary] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, s, sum] = await Promise.all([
      base44.entities.ContainerFinding.list("-cvss_score", 200).catch(() => []),
      base44.entities.ContainerScan.list("-scanned_at", 20).catch(() => []),
      base44.entities.ContainerFinding.summary().catch(() => null),
    ]);
    setSummary(sum);
    /* The platform stores a newly detected finding as "observed"; nothing is stored as "open".
       Active means any state before resolution, so resolved/accepted-risk/false-positive drop out. */
    const ACTIVE = new Set(["observed", "open", "triaged", "in_progress", "investigating", "confirmed"]);
    setFindings(f.filter((x) => ACTIVE.has(String(x.status || "").toLowerCase())));
    setScans(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const critical = summary?.by_severity?.critical ?? findings.filter(f => f.severity === "critical").length;
  const secrets = findings.filter(f => f.category === "secret").length;
  const totalFindings = summary?.total ?? findings.length;
  const imagesScanned = summary?.images ?? scans.length;

  async function fix(finding) {
    setLastFinding(finding);
    setModalTitle(`AI Fix — ${finding.title}`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const task = `Generate Dockerfile remediation for: ${finding.title} in image ${finding.image || finding.scan_id}. Category: ${finding.category}. ${finding.description}. Remediation: ${finding.remediation}. Output corrected Dockerfile snippet and build commands.`;
    const result = await invokeAction("gdsAgentOS", { action: "generate_code", task, code_type: "dockerfile", live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🐳 Container & Image Security</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">{totalFindings} Findings</span>
        {critical > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">{critical} Critical</span>}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Container Findings", value: totalFindings, color: "text-white" },
          { label: "Critical", value: critical, color: "text-red-400" },
          { label: "Secrets in Images", value: secrets, color: "text-red-400" },
          { label: "Images Scanned", value: imagesScanned, color: "text-white" },
        ].map((t, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <p className="text-[11px] text-slate-500">
            Showing {findings.length} of {totalFindings} open container findings
            {summary?.newest ? ` · newest ${new Date(summary.newest).toLocaleDateString()}` : ""}
          </p>
          <ContainerFindingsTable findings={findings} onFix={fix} />
          <h2 className="text-sm font-bold text-white mt-6 mb-2">Image Scan Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            {scans.map(s => <ContainerScanCard key={s.id} scan={s} />)}
          </div>
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} codeOutput={modalData?.code_output} agentSteps={modalData?.agent_steps} onRegenerate={() => lastFinding && fix(lastFinding)} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}