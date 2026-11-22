import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import VMFindingsTable from "@/components/vm/VMFindingsTable";
import VMScanHistoryTable from "@/components/vm/VMScanHistoryTable";
import AIResponseModal, { NO_CODE_GENERATOR_NOTE } from "@/components/shared/AIResponseModal";

export default function VMSecurityPage() {
  const [findings, setFindings] = useState([]);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [lastFinding, setLastFinding] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, s] = await Promise.all([
      base44.entities.VMFinding.list("-cvss_score", 200).catch(() => []),
      base44.entities.VMScan.list("-scanned_at", 20).catch(() => []),
    ]);
    setFindings(f.filter(x => x.status === "open"));
    setScans(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const critical = findings.filter(f => f.severity === "critical").length;
  const exploited = findings.filter(f => f.exploited_in_wild).length;

  async function patch(finding) {
    setLastFinding(finding);
    setModalTitle(`AI Patch Script — ${finding.cve_id}`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const task = `Generate production bash patch script for ${finding.cve_id} on ${finding.nickname || finding.scan_id}. Package: ${finding.package_name} ${finding.installed_version} → ${finding.fixed_version}. OS: Linux. Command: ${finding.patch_command}. Include pre-check, backup, patch, verify steps. Must work on Ubuntu 22.04.`;
    const result = await invokeAction("gdsAgentOS", { action: "generate_code", task, code_type: "bash", live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleSelectAll(checked) {
    setSelectedIds(checked ? findings.map(f => f.id) : []);
  }

  async function bulkRemediate() {
    const selected = findings.filter(f => selectedIds.includes(f.id));
    setLastFinding(null);
    setModalTitle(`AI Bulk Remediation — ${selected.length} findings`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const task = `Generate a single production bash remediation script that patches ALL of the following VM vulnerabilities in one run:\n` +
      selected.map(f => `- ${f.cve_id} on ${f.nickname || f.scan_id}: ${f.package_name} ${f.installed_version} → ${f.fixed_version} (${f.patch_command})`).join("\n") +
      `\nInclude pre-checks, backups, sequential patch steps per host, and a final verification summary. Must work on Ubuntu 22.04.`;
    const result = await invokeAction("gdsAgentOS", { action: "generate_code", task, code_type: "bash", live_data_override: liveDataOverride }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
    setSelectedIds([]);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🖥️ VM & Endpoint Security</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">{findings.length} Findings</span>
        {critical > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">{critical} Critical</span>}
        {selectedIds.length > 0 && (
          <button onClick={bulkRemediate} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition">
            🧠 Bulk Remediate ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total VM Findings", value: findings.length, color: "text-white" },
          { label: "Critical", value: critical, color: "text-red-400" },
          { label: "Exploited in Wild", value: exploited, color: "text-red-400", pulse: exploited > 0 },
          { label: "Instances Scanned", value: scans.length, color: "text-white" },
        ].map((t, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className={`text-2xl font-bold ${t.color} ${t.pulse ? "animate-pulse" : ""}`}>{t.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <VMFindingsTable findings={findings} onPatch={patch} selectedIds={selectedIds} onToggle={toggleSelect} onToggleAll={toggleSelectAll} />
          <h2 className="text-sm font-bold text-white mt-6 mb-2">Scan History</h2>
          <VMScanHistoryTable scans={scans} />
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} codeAbsentNote={NO_CODE_GENERATOR_NOTE} response={modalData?.response} codeOutput={modalData?.code_output} agentSteps={modalData?.agent_steps} onRegenerate={() => (lastFinding ? patch(lastFinding) : null)} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}