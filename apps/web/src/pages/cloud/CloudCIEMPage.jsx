import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import CIEMStatsRow from "@/components/cloud/CIEMStatsRow";
import CIEMFindingsFullTable from "@/components/cloud/CIEMFindingsFullTable";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function CloudCIEMPage() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await base44.entities.CIEMFinding.list("-detected_at", 30).catch(() => []);
    setFindings(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalIdentities = new Set(findings.map(f => f.identity_name)).size;
  const overprivileged = findings.filter(f => f.finding_type === "overprivileged").length;
  const inactive90 = findings.filter(f => (f.days_inactive || 0) >= 90).length;
  const adminAccess = findings.filter(f => f.finding_type === "admin_access").length;
  const rootFinding = findings.find(f => f.identity_name === "root");

  async function runDirector() {
    setModalTitle("AI CIEM Director");
    setModalLoading(true); setModalData(null);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "identity_analysis",
      input: "Analyze CIEM findings for AWS 696616821372 — identify over-privileged identities and right-sizing recommendations",
      priority: "normal",
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  async function rightSize(f) {
    setModalTitle(`Right-Size Permissions — ${f.identity_name}`);
    setModalLoading(true); setModalData(null);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "identity_analysis",
      input: `Right-size permissions for identity: ${f.identity_name} (${f.identity_type}). Finding: ${f.title}. Blast radius: ${f.blast_radius}. AWS Account: 696616821372.`,
      priority: "normal",
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🔑 CIEM — Cloud Identity Entitlement Management</h1>
        <button onClick={runDirector} className="ml-auto px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">🤖 AI CIEM Director</button>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <CIEMStatsRow totalIdentities={totalIdentities} overprivileged={overprivileged} inactive90={inactive90} adminAccess={adminAccess} />

          {rootFinding && (
            <div className="rounded-xl p-3 text-sm font-semibold text-red-300" style={{ background: "rgba(127,29,29,0.2)", border: "1px solid #ef4444" }}>
              🔴 Root Account MFA Not Enforced — AWS Account 696616821372. This is a critical exposure requiring immediate remediation.
            </div>
          )}

          <CIEMFindingsFullTable findings={findings} onRightSize={rightSize} />
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}