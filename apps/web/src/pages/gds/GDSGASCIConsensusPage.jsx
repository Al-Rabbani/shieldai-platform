import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Vote, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

export default function GDSGASCIConsensusPage() {
  const { data: votes = [], isLoading } = useQuery({
    queryKey: ["gasci-votes"],
    queryFn: () => base44.entities.ConsensusVote.list("-voted_at", 100).catch(() => []),
  });

  const stats = {
    total: votes.length,
    consensusRate: votes.length > 0 ? Math.round((votes.filter(v => v.consensus_confidence >= 70).length / votes.length) * 100) : 0,
    tieBreaks: votes.filter(v => v.status === "tied").length,
    dissent: votes.filter(v => v.dissent_noted).length
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Consensus" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Consensus Engine</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Multi-agent and multi-model voting</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Votes</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Consensus Rate</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{stats.consensusRate}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Tie-Breaks</p>
          <p className="text-2xl font-black" style={{ color: MEDIUM }}>{stats.tieBreaks}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Dissent Count</p>
          <p className="text-2xl font-black" style={{ color: DANGER }}>{stats.dissent}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? <Skeleton lines={10} /> : votes.length === 0 ? (
          <Card className="p-12 text-center"><p className="text-sm" style={{ color: MUTED }}>No consensus votes</p></Card>
        ) : (
          votes.slice(0, 10).map(vote => (
            <Card key={vote.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white max-w-lg truncate">{vote.question}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded ${vote.voting_type === 'multi_agent' ? 'bg-purple-400/20 text-purple-400' : 'bg-blue-400/20 text-blue-400'}`}>{vote.voting_type}</span>
              </div>
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div className="h-3" style={{ width: `${vote.consensus_confidence || 0}%`, background: LOW }} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: LOW }}>{vote.consensus_confidence || 0}%</span>
                </div>
                <p className="text-[10px]" style={{ color: MUTED }}>Consensus Confidence</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>Winner: {vote.winner}</span>
                  {vote.dissent_noted && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${MEDIUM}15`, color: MEDIUM }}>Dissent noted</span>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${vote.status === 'completed' ? 'bg-green-400/20 text-green-400' : 'bg-gray-400/20 text-gray-400'}`}>{vote.status}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}