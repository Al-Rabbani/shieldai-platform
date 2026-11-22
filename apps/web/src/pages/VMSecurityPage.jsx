import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import VMFindingsTable from "@/components/vm/VMFindingsTable";
import AIResponseModal, { NO_CODE_GENERATOR_NOTE } from "@/components/shared/AIResponseModal";

/**
 * Host package vulnerabilities.
 *
 * Measured 22 Nov 2026: this platform has no vm_findings and no vm_scans table (information_schema matched only
 * webhook_endpoints), so the previous page asked for two names nothing could answer and printed "No VM findings
 * found" over a real estate. What does exist is 60 OSV findings for the packages installed in the API virtualenv,
 * served by GET /host/vulnerabilities and GET /host/summary.
 *
 * So the page now reports the estate that exists and names the two things this platform does not measure
 * (instances scanned, endpoint agents) instead of printing a zero for them. Columns that had no data behind them
 * (hostname, OS, installed, fixed, patch command, category) are gone rather than rendered as em dashes forever.
 */
export default function VMSecurityPage() {
  const [findings, setFindings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [lastFinding, setLastFinding] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, sum] = await Promise.all([
      base44.entities.VMFinding.list("-cvss_score", 200).catch(() => []),
      base44.entities.VMFinding.summary().catch(() => null),
    ]);
    setFindings(Array.isArray(f) ? f : []);
    setSummary(sum);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = summary?.open ?? findings.filter((f) => f.is_open).length;
  const total = summary?.total ?? findings.length;
  const resolved = summary?.resolved ?? null;
  const packages = summary?.packages ?? null;
  const basis = summary?.basis || null;
  const notMeasured = summary?.not_measured || {};

  async function analyse(finding) {
    setLastFinding(finding);
    setModalTitle(`AI Analysis — ${finding.cve_id || finding.title}`);
    setModalLoading(true);
    setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const task =
      `Explain the real remediation for ${finding.cve_id || "this advisory"} affecting the Python package ` +
      `${finding.package_name || "unknown"} on the host that runs this platform. It is currently ${finding.status}. ` +
      `State whether an upgrade resolves it, what the upgrade is, and what would break. Base it on the finding, ` +
      `not on general advice.`;
    const result = await invokeAction("gdsAgentOS", { action: "command", input: task, command_type: "vulnerability_analysis", live_data_override: liveDataOverride })
      .catch((e) => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  const tiles = [
    { label: "Open", value: open, color: open > 0 ? "text-orange-400" : "text-white" },
    { label: "Packages", value: packages ?? "—", color: "text-white" },
    { label: "Resolved", value: resolved ?? "—", color: "text-emerald-400" },
    { label: "Total recorded", value: total, color: "text-white" },
  ];

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🖥️ Host &amp; Package Vulnerabilities</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">{open} open</span>
        {summary?.by_severity_open?.critical > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">
            {summary.by_severity_open.critical} critical
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        {basis ? <>Source: {basis}. </> : null}
        No VM or endpoint scan store exists on this platform, so an &ldquo;instances scanned&rdquo; figure cannot be produced
        from anything{notMeasured.endpoint_agents ? <> — and {notMeasured.endpoint_agents}</> : null}. Those two states are
        absent, not zero.
      </p>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <VMFindingsTable
          findings={findings}
          onAnalyse={analyse}
          emptyNote={
            basis
              ? `No host package findings are recorded. The ${basis} has not reported an advisory, which is a measured clean state.`
              : "No host package findings are recorded, and the source of that absence is not stated by the API."
          }
        />
      )}

      {modalTitle && (
        <AIResponseModal
          title={modalTitle}
          loading={modalLoading}
          codeAbsentNote={NO_CODE_GENERATOR_NOTE}
          response={modalData?.response}
          codeOutput={modalData?.code_output}
          agentSteps={modalData?.agent_steps}
          onRegenerate={() => (lastFinding ? analyse(lastFinding) : null)}
          onClose={() => setModalTitle(null)}
        />
      )}
    </div>
  );
}
