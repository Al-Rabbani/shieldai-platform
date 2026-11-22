import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Copy } from "lucide-react";
import { ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveBadge, EXECUTIVE_PAGE_BG, GOLD, CARD_BG, BORDER, MUTED } from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

export default function GDSMarketplaceTemplatesPage() {
  const { data: templates = [] } = useQuery({ queryKey: ["marketplace-templates"], queryFn: () => base44.entities.MarketplaceTemplate.list("-installs_count", 100).catch(() => []) });
  
  const stats = { total: templates.length, free: templates.filter(t => t.pricing_model === "free").length, compliance: templates.filter(t => t.category === "compliance").length };

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "Template Library" }]} />
      <BoardConfidentialBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Template Library</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>{stats.total} Templates · {stats.compliance} Compliance · {stats.free} Free</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Templates</p><p className="text-3xl font-black" style={{ color: GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #10B98130` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Free</p><p className="text-3xl font-black text-green-400">{stats.free}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #A855F730` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Compliance</p><p className="text-3xl font-black" style={{ color: "#A855F7" }}>{stats.compliance}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #0EA5E930` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Rating</p><p className="text-3xl font-black text-sky-400">{(templates.reduce((s, t) => s + (t.rating || 0), 0) / (templates.length || 1)).toFixed(1)}</p></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(tpl => (
          <Card key={tpl.id} className="p-5 hover:scale-[1.02] transition-transform" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}><FileText className="w-6 h-6" style={{ color: GOLD }} /></div>
              <ExecutiveBadge color={tpl.pricing_model === "free" ? "#10B981" : "#F59E0B"}>{tpl.pricing_model || "free"}</ExecutiveBadge>
            </div>
            <h4 className="text-base font-bold text-white mb-1">{tpl.display_name || tpl.name}</h4>
            <p className="text-[10px] mb-3" style={{ color: MUTED }}>{tpl.description?.slice(0, 80)}</p>
            <div className="flex items-center justify-between mb-3">
              <ExecutiveBadge color={GOLD}>{tpl.template_type || "general"}</ExecutiveBadge>
              <div className="flex items-center gap-1"><Copy className="w-3 h-3" style={{ color: "#F59E0B" }} /><span className="text-xs font-bold text-white">{tpl.rating || 0}</span></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: MUTED }}>{tpl.installs_count >= 1000 ? `${(tpl.installs_count/1000).toFixed(1)}K` : tpl.installs_count} uses</span>
              <span className="text-[10px]" style={{ color: MUTED }}>by {tpl.publisher_name || "Publisher"}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}