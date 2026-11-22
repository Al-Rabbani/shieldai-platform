import React, { useState, useEffect } from "react";
import { invokeAction } from "@/lib/invokeAction";
import AttackPathCard from "@/components/redteam/AttackPathCard";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function AttackPathsPage() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    invokeAction("gdsHermesOffensive", { action: "attack_path_discovery", authorization_ref: "CONTINUOUS-MONITORING-2026" })
      .then(r => setPaths(r.paths || []))
      .finally(() => setLoading(false));
  }, []);

  async function deepDive(path) {
    setModalTitle(`AI Deep Dive — ${path.title}`);
    setModalLoading(true); setModalData(null);
    const input = `Deep dive analysis of attack path: ${path.title}. Entry: ${path.entry_point}. Blast radius: ${path.blast_radius}. Risk score: ${path.risk_score}. Provide specific remediation steps ranked by priority.`;
    const result = await invokeAction("gdsAgentOS", { action: "command", command_type: "remediation_plan", input }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <h1 className="text-xl font-bold text-white">🗺️ Attack Path Discovery</h1>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-red-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : paths.length === 0 ? (
        <p className="text-sm text-slate-500">No attack paths discovered yet.</p>
      ) : (
        <div className="space-y-3">
          {paths.map(p => <AttackPathCard key={p.id} path={p} onDeepDive={deepDive} />)}
        </div>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}