import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import CloudFindingsTable from "@/components/cloud/CloudFindingsTable";
import CIEMIdentityTable from "@/components/cloud/CIEMIdentityTable";
import AttackSurfaceCards from "@/components/cloud/AttackSurfaceCards";
import AttackSurfaceBasis from "@/components/cloud/AttackSurfaceBasis";
import AIResponseModal, { NO_CODE_GENERATOR_NOTE } from "@/components/shared/AIResponseModal";

const TABS = [
  { key: "findings", label: "Cloud Findings" },
  { key: "ciem", label: "CIEM / Identity" },
  { key: "surface", label: "Attack Surface" },
];

export default function CloudSecurityPage() {
  const [cloudFindings, setCloudFindings] = useState([]);
  const [ciemFindings, setCiemFindings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [attackSurface, setAttackSurface] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("findings");
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [cloud, ciem, surface, acc, summary] = await Promise.all([
      base44.entities.CloudFinding.list("-detected_at", 500).catch(() => []),
      base44.entities.CIEMFinding.list("-detected_at", 100).catch(() => []),
      base44.entities.AttackSurface.list("-last_seen", 20).catch(() => []),
      base44.entities.CloudAccount.list("-created_date", 10).catch(() => []),
      base44.entities.AttackSurface.summary().catch(() => null),
    ]);
    /* Nothing is ever stored as "open": a new finding is 'observed' and moves through triaged -> in_progress
       -> resolved/accepted_risk/false_positive. Filtering on "open" turned three real cloud findings into zero. */
    const ACTIVE = new Set(["observed", "open", "new", "triaged", "in_progress", "reopened"]);
    setCloudFindings(cloud.filter(f => ACTIVE.has(String(f.status || "").toLowerCase())));
    setCiemFindings(ciem.filter(f => ACTIVE.has(String(f.status || "").toLowerCase())));
    setAttackSurface(surface);
    setAccounts(acc);
    setSurfaceSummary(summary);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const critical = cloudFindings.filter(f => f.severity === "critical").length;
  const high = cloudFindings.filter(f => f.severity === "high").length;
  /* The grid shows 20 cards; the estate is 145 assets. Counting the page is how a tile reports 0 while 73
     assets are measured internet-facing, so this reads /cloud/attack-surface/summary instead. */
  const [surfaceSummary, setSurfaceSummary] = useState(null);
  const internetFacing = surfaceSummary ? surfaceSummary.with_known_exposure : null;

  async function remediateFinding(f) {
    setModalTitle(`AWS CLI Remediation — ${f.title}`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const result = await invokeAction("gdsAgentOS", {
      action: "generate_code",
      task: `AWS CLI remediation for: ${f.title}. Resource: ${f.resource}. CIS: ${f.cis_control}. AWS Account: 696616821372`,
      code_type: "aws_cli",
      live_data_override: liveDataOverride,
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  async function remediateIdentity(f) {
    setModalTitle(`Identity Remediation — ${f.identity_name}`);
    setModalLoading(true); setModalData(null);
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const result = await invokeAction("gdsAgentOS", {
      action: "command",
      input: `Remediate identity risk: ${f.title}. Identity: ${f.identity_name} (${f.identity_type}). Blast radius: ${f.blast_radius}`,
      command_type: "remediation_plan",
      live_data_override: liveDataOverride,
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">AWS Cloud Security — Account 696616821372</h1>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">{cloudFindings.length} Findings</span>
        {critical > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/20 text-red-400">{critical} Critical</span>}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total Cloud Findings", value: cloudFindings.length, color: "text-white" },
          { label: "Critical", value: critical, color: "text-red-400" },
          { label: "High", value: high, color: "text-orange-400" },
          { label: "CIEM Findings", value: ciemFindings.length, color: "text-white" },
          { label: "Internet-Facing Assets", value: internetFacing === null ? "—" : internetFacing, color: internetFacing === null ? "text-slate-500" : internetFacing > 0 ? "text-red-400" : "text-emerald-400" },
        ].map((t, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1 rounded-xl p-1 w-fit" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${tab === t.key ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-800"}`}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          {tab === "findings" && <CloudFindingsTable findings={cloudFindings} onRemediate={remediateFinding} />}
          {tab === "ciem" && <CIEMIdentityTable findings={ciemFindings} onRemediate={remediateIdentity} />}
          {tab === "surface" && (
            <>
              <AttackSurfaceBasis />
              <AttackSurfaceCards assets={attackSurface} />
            </>
          )}
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} codeAbsentNote={NO_CODE_GENERATOR_NOTE} response={modalData?.response} codeOutput={modalData?.code_output} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}