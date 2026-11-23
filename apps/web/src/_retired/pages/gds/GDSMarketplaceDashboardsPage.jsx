import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart2, TrendingUp } from "lucide-react";
import { ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveBadge, EXECUTIVE_PAGE_BG, GOLD, CARD_BG, BORDER, MUTED } from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

export default function GDSMarketplaceDashboardsPage() {
  const { data: dashboards = [] } = useQuery({ queryKey: ["marketplace-dashboards"], queryFn: () => base44.entities.MarketplaceDashboard.list("-installs_count", 100).catch(() => []) });
  
  const stats = { total: dashboards.length, featured: dashboards.filter(d => d.is_featured).length, avgRating: dashboards.reduce((s, d) => s + (d.rating || 0), 0) / (dashboards.length || 1) };

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "Dashboard Marketplace" }]} />
      <BoardConfidentialBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Dashboard Marketplace</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>{stats.total} Pre-built Dashboards Available</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Dashboards</p><p className="text-3xl font-black" style={{ color: GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #F59E0B30` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Featured</p><p className="text-3xl font-black" style={{ color: "#F59E0B" }}>{stats.featured}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #10B98130` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Rating</p><p className="text-3xl font-black text-green-400">{stats.avgRating.toFixed(1)}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #0EA5E930` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Installs</p><p className="text-3xl font-black text-sky-400">{dashboards.reduce((s, d) => s + (d.installs_count || 0), 0).toLocaleString()}</p></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboards.map(dash => (
          <Card key={dash.id} className="p-5 hover:scale-[1.02] transition-transform" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30` }}><BarChart2 className="w-6 h-6" style={{ color: GOLD }} /></div>
              {dash.is_featured && <ExecutiveBadge color="#F59E0B">Featured</ExecutiveBadge>}
            </div>
            <h4 className="text-base font-bold text-white mb-1">{dash.display_name || dash.name}</h4>
            <p className="text-[10px] mb-3" style={{ color: MUTED }}>{dash.description?.slice(0, 80)}</p>
            <div className="flex items-center justify-between mb-3">
              <ExecutiveBadge color={GOLD}>{dash.category || "general"}</ExecutiveBadge>
              <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3" style={{ color: "#F59E0B" }} /><span className="text-xs font-bold text-white">{dash.rating || 0}</span></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: MUTED }}>{dash.installs_count >= 1000 ? `${(dash.installs_count/1000).toFixed(1)}K` : dash.installs_count} installs</span>
              <span className="text-[10px]" style={{ color: MUTED }}>by {dash.publisher_name || "Publisher"}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}