import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plug, Zap } from "lucide-react";
import { ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveBadge, EXECUTIVE_PAGE_BG, GOLD, CARD_BG, BORDER, MUTED } from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

const CATEGORIES = ["All", "Cloud", "Security", "Identity", "AI", "DevOps", "Messaging", "Database", "Business"];

export default function GDSMarketplaceIntegrationsPage() {
  const { data: integrations = [] } = useQuery({ queryKey: ["marketplace-integrations"], queryFn: () => base44.entities.Integration.list("-installs_count", 100).catch(() => []) });
  const { data: connectors = [] } = useQuery({ queryKey: ["marketplace-connectors"], queryFn: () => base44.entities.ConnectorRegistration.list("-execution_count", 100).catch(() => []) });
  
  const stats = { total: integrations.length + connectors.length, active: integrations.filter(i => i.status === "active").length + connectors.filter(c => c.status === "active").length };

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "Integration Marketplace" }]} />
      <BoardConfidentialBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Integration Marketplace</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>{stats.total} Integrations · {stats.active} Active</p>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total</p><p className="text-3xl font-black" style={{ color: GOLD }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #10B98130` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active</p><p className="text-3xl font-black text-green-400">{stats.active}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #0EA5E930` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Integrations</p><p className="text-3xl font-black text-sky-400">{integrations.length}</p></Card>
        <Card className="p-4 text-center" style={{ background: CARD_BG, border: `1px solid #A855F730` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Connectors</p><p className="text-3xl font-black" style={{ color: "#A855F7" }}>{connectors.length}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Zap className="w-4 h-4" style={{ color: GOLD }} />Integrations</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Name</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Provider</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Installs</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {integrations.slice(0, 8).map(int => (
                <tr key={int.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-semibold text-white">{int.name}</td>
                  <td className="py-3"><ExecutiveBadge color={GOLD}>{int.integration_type}</ExecutiveBadge></td>
                  <td className="py-3" style={{ color: MUTED }}>{int.provider_name || "N/A"}</td>
                  <td className="py-3"><ExecutiveBadge color={int.status === "active" ? "#10B981" : "#EF4444"}>{int.status}</ExecutiveBadge></td>
                  <td className="py-3 text-white">{int.installs_count >= 1000 ? `${(int.installs_count/1000).toFixed(1)}K` : int.installs_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Plug className="w-4 h-4" style={{ color: GOLD }} />Connectors</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Name</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Auth</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Executions</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {connectors.slice(0, 8).map(conn => (
                <tr key={conn.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-semibold text-white">{conn.name}</td>
                  <td className="py-3"><ExecutiveBadge color={GOLD}>{conn.category}</ExecutiveBadge></td>
                  <td className="py-3" style={{ color: MUTED }}>{conn.auth_method}</td>
                  <td className="py-3"><ExecutiveBadge color={conn.status === "active" ? "#10B981" : "#EF4444"}>{conn.status}</ExecutiveBadge></td>
                  <td className="py-3 text-white">{conn.execution_count >= 1000 ? `${(conn.execution_count/1000).toFixed(1)}K` : conn.execution_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}