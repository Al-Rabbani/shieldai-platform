import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Activity } from "lucide-react";
import { ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveBadge, EXECUTIVE_PAGE_BG, GOLD, CARD_BG, BORDER, MUTED } from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

export default function GDSMarketplaceWorkflowsPage() {
  const { data: workflows = [] } = useQuery({ queryKey: ["marketplace-workflows"], queryFn: () => base44.entities.MarketplaceWorkflow.list("-installs_count", 100).catch(() => []) });
  
  const stats = { total: workflows.length, certified: workflows.filter(w => w.is_certified).length, avgSteps: workflows.reduce((s, w) => s + (w.steps_count || 0), 0) / (workflows.length || 1) };

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "Workflow Marketplace" }]} />
      <BoardConfidentialBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Workflow Marketplace</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>{stats.total} Automated Workflows Available</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Workflows</p><p className="text-3xl font-black" style={{ color: GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #10B98130` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Certified</p><p className="text-3xl font-black text-green-400">{stats.certified}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #0EA5E930` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Steps</p><p className="text-3xl font-black text-sky-400">{Math.round(stats.avgSteps)}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #A855F730` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Autonomy Level</p><p className="text-3xl font-black" style={{ color: "#A855F7" }}>{(workflows.reduce((s, w) => s + (w.autonomy_level || 0), 0) / (workflows.length || 1)).toFixed(1)}</p></Card>
      </div>

      <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Workflow</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Steps</th>
              <th className="pb-3">Duration</th>
              <th className="pb-3">Autonomy</th>
              <th className="pb-3">MITRE</th>
              <th className="pb-3">Publisher</th>
              <th className="pb-3">Installs</th>
              <th className="pb-3">Rating</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {workflows.map(wf => (
              <tr key={wf.id} className="border-t" style={{ borderColor: BORDER }}>
                <td className="py-3 font-semibold text-white">{wf.display_name}</td>
                <td className="py-3"><ExecutiveBadge color="#A855F7">{wf.workflow_type}</ExecutiveBadge></td>
                <td className="py-3 text-white">{wf.steps_count || 0}</td>
                <td className="py-3 text-white">{wf.avg_duration_minutes || 0}m</td>
                <td className="py-3"><div className="w-16 h-2 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(wf.autonomy_level || 0) * 20}%`, background: "#A855F7" }} /></div></td>
                <td className="py-3"><div className="flex gap-1">{(wf.mitre_techniques || []).slice(0, 2).map((t, i) => (<span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${GOLD}15`, color: GOLD }}>{t}</span>))}</div></td>
                <td className="py-3" style={{ color: MUTED }}>{wf.publisher_name || "Publisher"}</td>
                <td className="py-3 text-white">{wf.installs_count >= 1000 ? `${(wf.installs_count/1000).toFixed(1)}K` : wf.installs_count}</td>
                <td className="py-3"><div className="flex items-center gap-1">⭐ {wf.rating || 0}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}