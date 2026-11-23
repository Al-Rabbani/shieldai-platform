import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import AttackPathCard from "@/components/redteam/AttackPathCard";
import AIResponseModal from "@/components/shared/AIResponseModal";

/**
 * The page the /red-team/attack-paths route actually renders (pages/redteam, not the unrouted pages/cloud duplicate).
 *
 * It called invokeAction("gdsHermesOffensive"), a function the API does not serve, with no .catch, so the rejection went
 * unhandled and surfaced to the user as a stack trace. There is no attack-path store and cloud_asset_relationships holds
 * 0 edges against 145 assets, so nothing can be discovered: the page now reads the measured route and says so.
 */
export default function AttackPathsPage() {
  const [paths, setPaths] = useState([]);
  const [basis, setBasis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    let live = true;
    base44.entities.CloudAttackPath.list("-created_date", 20)
      .then((rows) => { if (live) setPaths(rows || []); })
      .catch(() => { if (live) setPaths([]); })
      .finally(() => { if (live) setLoading(false); });
    base44.entities.CloudAttackPath.summary()
      .then((payload) => { if (live) setBasis(payload || null); })
      .catch(() => { if (live) setBasis(null); });
    return () => { live = false; };
  }, []);

  async function deepDive(path) {
    setModalTitle(`AI Deep Dive — ${path.title}`);
    setModalLoading(true);
    setModalData(null);
    const input = `Deep dive analysis of attack path: ${path.title}. Entry: ${path.entry_point}. Blast radius: ${path.blast_radius}. Risk score: ${path.risk_score}. Provide specific remediation steps ranked by priority.`;
    const result = await invokeAction("gdsAgentOS", { action: "command", command_type: "remediation_plan", input })
      .catch((e) => ({ response: `The reasoning engine did not answer: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <h1 className="text-xl font-bold text-white">🗺️ Attack Path Discovery</h1>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-red-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : paths.length === 0 ? (
        <p className="text-sm text-slate-500 max-w-3xl">
          {basis?.basis
            || "No attack path is recorded or can be computed here. This is not a clean result: it is the absence of a path store and of any relationship edges to walk."}
        </p>
      ) : (
        <div className="space-y-3">
          {paths.map((p) => <AttackPathCard key={p.id} path={p} onDeepDive={deepDive} />)}
        </div>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}
