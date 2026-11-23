import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle } from "lucide-react";
import { FINBreadcrumb, FINBanner, FINBadge, FIN_PAGE_BG, FIN_CARD, FIN_GOLD, FIN_GREEN, BORDER, MUTED, SANCTIONS_LIST_COLORS } from "@/components/gds/FinancialSecurityShared";
import { Card } from "@/components/gds/GDSOSShared";

export default function GDSFinancialSanctionsPage() {
  const { data: matches = [] } = useQuery({ queryKey: ["fin-sanctions"], queryFn: () => base44.entities.SanctionsMatch.list("-screened_at", 200).catch(() => []) });

  const stats = {
    total: matches.length,
    blocked: matches.filter(m => m.disposition === "blocked" || m.status === "confirmed").length,
    pending: matches.filter(m => m.status === "pending_review" || m.status === "under_review").length,
    cleared: matches.filter(m => m.disposition === "cleared" || m.status === "cleared").length,
  };

  return (
    <div style={FIN_PAGE_BG}>
      <FINBreadcrumb items={[{ label: "Sanctions Screening" }]} />
      <FINBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">SANCTIONS & COMPLIANCE SCREENING</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-003 · Global Sanctions</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={FIN_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Matches</p><p className="text-3xl font-black" style={{ color: FIN_GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #dc262660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Confirmed Blocks</p><p className={`text-3xl font-black ${stats.blocked > 0 ? 'animate-pulse text-red-400' : 'text-white'}`}>{stats.blocked}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid #f9731660` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Pending Review</p><p className="text-3xl font-black text-amber-400">{stats.pending}</p></Card>
        <Card className="p-4 text-center" style={{ ...FIN_CARD, border: `2px solid ${FIN_GREEN}60` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Cleared</p><p className="text-3xl font-black" style={{ color: FIN_GREEN }}>{stats.cleared}</p></Card>
      </div>

      <Card className="p-5" style={FIN_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Entity Screened</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Lists Matched</th>
              <th className="pb-3">Match Score</th>
              <th className="pb-3">Match Type</th>
              <th className="pb-3">Sanctions List</th>
              <th className="pb-3">Disposition</th>
              <th className="pb-3">False Positive</th>
              <th className="pb-3">Screened</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {matches.map(m => (
              <tr key={m.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-bold text-white">{m.entity_screened}</td>
                <td className="py-3"><FINBadge color={MUTED}>{m.entity_type || "individual"}</FINBadge></td>
                <td className="py-3">{m.lists_matched?.slice(0, 3).map((l, i) => <FINBadge key={i} color={SANCTIONS_LIST_COLORS[l] || MUTED} className="mr-1">{l}</FINBadge>)}</td>
                <td className="py-3"><div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${m.match_score_pct || 0}%`, background: (m.match_score_pct || 0) > 85 ? "#dc2626" : "#f97316" }} /></div></td>
                <td className="py-3"><FINBadge color={m.match_type === "exact" ? "#dc2626" : m.match_type === "fuzzy" ? "#ef4444" : "#f97316"}>{m.match_type || "unknown"}</FINBadge></td>
                <td className="py-3"><FINBadge color={SANCTIONS_LIST_COLORS[m.sanctions_list] || MUTED}>{m.sanctions_list || "ofac_sdn"}</FINBadge></td>
                <td className="py-3"><FINBadge color={m.disposition === "blocked" ? "#dc2626" : m.disposition === "cleared" ? FIN_GREEN : "#f97316"}>{m.disposition || "pending"}</FINBadge></td>
                <td className="py-3">{m.false_positive ? <span className="text-green-400">YES</span> : <span style={{ color: MUTED }}>—</span>}</td>
                <td className="py-3" style={{ color: MUTED }}>{m.screened_at ? new Date(m.screened_at).toLocaleString() : "—"}</td>
                <td className="py-3"><FINBadge color={m.status === "confirmed" ? "#dc2626" : m.status === "cleared" ? FIN_GREEN : "#f97316"}>{m.status || "pending"}</FINBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}