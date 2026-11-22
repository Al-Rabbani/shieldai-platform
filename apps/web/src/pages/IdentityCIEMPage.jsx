import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import CIEMFindingsTable from "@/components/identity/CIEMFindingsTable";
import IdentityThreatsTable from "@/components/identity/IdentityThreatsTable";
import AIResponseModal from "@/components/shared/AIResponseModal";

const TABS = [
  { key: "ciem", label: "CIEM Findings" },
  { key: "threats", label: "Identity Threats" },
];

export default function IdentityCIEMPage() {
  const [findings, setFindings] = useState([]);
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ciem");
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, t] = await Promise.all([
      base44.entities.CIEMFinding.list("-detected_at", 100).catch(() => []),
      base44.entities.IdentityThreat.list("-detected_at", 20).catch(() => []),
    ]);
    setFindings(f.filter(x => x.status === "open"));
    setThreats(t);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const critical = findings.filter(f => f.severity === "critical").length;
  const high = findings.filter(f => f.severity === "high").length;
  const fullAccount = findings.filter(f => f.blast_radius === "full_account").length;
  const mfaNotEnabled = findings.filter(f => f.finding_type === "mfa_not_enforced").length;

  async function remediate(finding) {
    setModalTitle(`Identity Remediation — ${finding.identity_name}`);
    setModalLoading(true); setModalData(null);
    const input = `Remediate identity risk: ${finding.title}. Identity: ${finding.identity_name} (${finding.identity_type}). Blast radius: ${finding.blast_radius}. Permissions: ${finding.permissions_granted || "N/A"}`;
    const result = await invokeAction("gdsAgentOS", { action: "command", input, command_type: "identity_analysis" }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <h1 className="text-xl font-bold text-white">AI Identity Security Command</h1>

      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total CIEM Findings", value: findings.length },
          { label: "Critical", value: critical, color: "text-red-400" },
          { label: "High", value: high, color: "text-orange-400" },
          { label: "Full Account Blast Radius", value: fullAccount, color: "text-red-400" },
          { label: "MFA Not Enabled", value: mfaNotEnabled, color: "text-amber-400" },
        ].map((t, i) => (
          <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className={`text-2xl font-bold ${t.color || "text-white"}`}>{t.value}</p>
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
      ) : tab === "ciem" ? (
        <CIEMFindingsTable findings={findings} onRemediate={remediate} />
      ) : (
        <IdentityThreatsTable threats={threats} />
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}