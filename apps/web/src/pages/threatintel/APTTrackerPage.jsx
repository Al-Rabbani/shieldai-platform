import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import APTActorCard from "@/components/threatintel/APTActorCard";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function APTTrackerPage() {
  const [actors, setActors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    base44.entities.APTActor.list("-last_seen", 50).then(setActors).catch(() => setActors([])).finally(() => setLoading(false));
  }, []);

  async function analyzeActor(actor) {
    setModalTitle(`AI APT Analysis — ${actor.actor_name}`);
    setModalLoading(true); setModalData(null);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "threat_hunt",
      input: `Analyze APT actor: ${actor.actor_name} (${actor.aliases || "no known aliases"}). Origin: ${actor.origin_country}. Sophistication: ${actor.sophistication}. Targets: ${actor.target_sectors}. Active campaigns: ${actor.active_campaigns || 0}. MITRE techniques: ${(actor.mitre_techniques || []).join(", ") || "unknown"}. Provide detection and defensive recommendations relevant to our sector.`,
      priority: "high",
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <h1 className="text-xl font-bold text-white">🧬 APT TRACKER</h1>
      {loading ? (
        <div className="w-8 h-8 border-4 border-t-purple-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : actors.length === 0 ? (
        <p className="text-sm text-slate-500">No APT actors tracked yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {actors.map(a => <APTActorCard key={a.id} actor={a} onAnalyze={analyzeActor} />)}
        </div>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}