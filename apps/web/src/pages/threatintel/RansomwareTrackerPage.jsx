import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import RansomwareTrackerCard from "@/components/threatintel/RansomwareTrackerCard";
import AIResponseModal from "@/components/shared/AIResponseModal";

const FALLBACK_GROUPS = [
  { group_name: "LockBit 3.0", origin_country: "Russia/Affiliate", status: "active", victims_this_month: 47, victims_count: 2840, avg_ransom_usd: 850000, double_extortion: true, leak_site: "Tor hidden service", target_sectors: ["Healthcare", "Financial", "MSSP"], threat_level: "critical" },
  { group_name: "The Gentlemen", origin_country: "Unknown", status: "active", victims_this_month: 12, victims_count: 340, avg_ransom_usd: 420000, double_extortion: true, leak_site: "BreachForums-linked", target_sectors: ["Technology", "Retail"], threat_level: "critical" },
  { group_name: "Qilin", origin_country: "Russia-linked", status: "active", victims_this_month: 8, victims_count: 510, avg_ransom_usd: 610000, double_extortion: true, leak_site: "Tor hidden service", target_sectors: ["Legal", "Healthcare"], threat_level: "high" },
  { group_name: "Akira", origin_country: "Unknown", status: "active", victims_this_month: 15, victims_count: 890, avg_ransom_usd: 380000, double_extortion: true, leak_site: "Tor hidden service", target_sectors: ["Education", "Manufacturing"], threat_level: "high" },
];

export default function RansomwareTrackerPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    base44.entities.RansomwareGroup.list("-victims_this_month", 20).then(list => {
      setGroups(list.length > 0 ? list.map(g => ({ ...g, target_sectors: (g.target_sectors || "").split(",").map(s => s.trim()).filter(Boolean) })) : FALLBACK_GROUPS);
    }).catch(() => setGroups(FALLBACK_GROUPS)).finally(() => setLoading(false));
  }, []);

  async function brief(group) {
    setModalTitle(`AI Threat Brief — ${group.group_name}`);
    setModalLoading(true); setModalData(null);
    const result = await invokeAction("gdsAgentOS", {
      action: "command", command_type: "threat_hunt",
      input: `Give a threat brief on ${group.group_name} ransomware group and their relevance to GDS current posture.`,
      priority: "high",
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#050b14" }}>
      <h1 className="text-xl font-bold text-white">🦠 RANSOMWARE TRACKER</h1>

      <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/40">
        <p className="text-sm font-bold text-red-400">🔴 LockBit 3.0 is the #1 active ransomware threat to GDS — 47 victims this month, targeting EU MSPs directly</p>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-red-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {groups.map((g, i) => <RansomwareTrackerCard key={g.id || i} group={g} onBrief={brief} />)}
        </div>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}