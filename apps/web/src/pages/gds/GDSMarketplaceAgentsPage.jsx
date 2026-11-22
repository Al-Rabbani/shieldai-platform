import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Filter, Star, CheckCircle } from "lucide-react";
import { ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveBadge, EXECUTIVE_PAGE_BG, GOLD, CARD_BG, BORDER, MUTED } from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

const AGENT_CLASSES = ["security_analyst", "threat_hunter", "incident_responder", "compliance_auditor", "executive_advisor"];
const LLM_COLORS = { "claude-4-opus": "#A855F7", "gpt-4o": "#10B981", "deepseek-r2": "#0EA5E9" };

export default function GDSMarketplaceAgentsPage() {
  const { data: agents = [] } = useQuery({ queryKey: ["marketplace-agents"], queryFn: () => base44.entities.MarketplaceAgent.list("-installs_count", 100).catch(() => []) });
  const [view, setView] = useState("card");
  const [filterClass, setFilterClass] = useState("");

  const filtered = agents.filter(a => !filterClass || a.agent_class === filterClass);
  const formatInstalls = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : n;

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "AI Agent Marketplace" }]} />
      <BoardConfidentialBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">AI Agent Marketplace</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>{agents.length} AI Agents Available</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("card")} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${view === "card" ? "" : "opacity-60"}`} style={{ background: view === "card" ? `${GOLD}20` : `${GOLD}08`, color: view === "card" ? GOLD : MUTED, border: `1px solid ${view === "card" ? GOLD + '40' : GOLD + '20'}` }}>Card</button>
          <button onClick={() => setView("table")} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${view === "table" ? "" : "opacity-60"}`} style={{ background: view === "table" ? `${GOLD}20` : `${GOLD}08`, color: view === "table" ? GOLD : MUTED, border: `1px solid ${view === "table" ? GOLD + '40' : GOLD + '20'}` }}>Table</button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setFilterClass("")} className={`text-[10px] font-bold px-4 py-2 rounded-full whitespace-nowrap ${!filterClass ? '' : 'opacity-60'}`} style={{ background: !filterClass ? `${GOLD}20` : `${GOLD}08`, color: !filterClass ? GOLD : MUTED, border: `1px solid ${!filterClass ? GOLD + '40' : GOLD + '20'}` }}>All</button>
        {AGENT_CLASSES.map(cls => (
          <button key={cls} onClick={() => setFilterClass(cls)} className={`text-[10px] font-bold px-4 py-2 rounded-full whitespace-nowrap capitalize ${filterClass === cls ? '' : 'opacity-60'}`} style={{ background: filterClass === cls ? `${GOLD}20` : `${GOLD}08`, color: filterClass === cls ? GOLD : MUTED, border: `1px solid ${filterClass === cls ? GOLD + '40' : GOLD + '20'}` }}>{cls.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {view === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => (
            <Card key={agent.id} className="p-5 hover:scale-[1.02] transition-transform" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
              <div className="flex items-start justify-between mb-3">
                <ExecutiveBadge color="#A855F7">{agent.agent_class || "agent"}</ExecutiveBadge>
                {agent.is_certified && <CheckCircle className="w-4 h-4" style={{ color: "#10B981" }} />}
              </div>
              <h4 className="text-base font-bold text-white mb-2">{agent.display_name}</h4>
              <p className="text-[10px] mb-3" style={{ color: MUTED }}>by {agent.publisher_name || "Publisher"}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {(agent.supported_llms || []).slice(0, 3).map((llm, i) => (
                  <span key={i} className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${LLM_COLORS[llm] || MUTED}15`, color: LLM_COLORS[llm] || MUTED, border: `1px solid ${LLM_COLORS[llm] || MUTED}30` }}>{llm}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {(agent.capabilities || []).slice(0, 3).map((cap, i) => (
                  <span key={i} className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}>{cap}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 mb-3">
                {agent.has_memory && <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "#10B98115", color: "#10B981", border: "1px solid #10B98130" }}>Memory</span>}
                {agent.has_rag && <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "#0EA5E915", color: "#0EA5E9", border: "1px solid #0EA5E930" }}>RAG</span>}
                {agent.mcp_compatible && <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "#A855F715", color: "#A855F7", border: "1px solid #A855F730" }}>MCP</span>}
                {agent.a2a_compatible && <span className="text-[9px] px-2 py-0.5 rounded" style={{ background: "#F59E0B15", color: "#F59E0B", border: "1px solid #F59E0B30" }}>A2A</span>}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExecutiveBadge color={agent.price_month_usd === 0 ? "#10B981" : "#F59E0B"}>{agent.price_month_usd === 0 ? "Free" : `$${agent.price_month_usd}/mo`}</ExecutiveBadge>
                  <div className="flex items-center gap-1"><Star className="w-3 h-3" style={{ color: "#F59E0B" }} /><span className="text-xs font-bold text-white">{agent.rating || 0}</span></div>
                </div>
                <span className="text-[10px]" style={{ color: MUTED }}>{formatInstalls(agent.installs_count)} installs</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Agent</th>
                <th className="pb-3">Class</th>
                <th className="pb-3">LLMs</th>
                <th className="pb-3">Features</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Rating</th>
                <th className="pb-3">Installs</th>
                <th className="pb-3">Success Rate</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {filtered.map(agent => (
                <tr key={agent.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-semibold text-white">{agent.display_name}</td>
                  <td className="py-3"><ExecutiveBadge color="#A855F7">{agent.agent_class || "agent"}</ExecutiveBadge></td>
                  <td className="py-3"><div className="flex gap-1">{(agent.supported_llms || []).slice(0, 2).map((llm, i) => (<span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${LLM_COLORS[llm] || MUTED}15`, color: LLM_COLORS[llm] || MUTED }}>{llm}</span>))}</div></td>
                  <td className="py-3"><div className="flex gap-1">{agent.has_memory && "🧠"}{agent.has_rag && "🗄️"}{agent.mcp_compatible && "🔌"}{agent.a2a_compatible && "🌐"}</div></td>
                  <td className="py-3"><ExecutiveBadge color={agent.price_month_usd === 0 ? "#10B981" : "#F59E0B"}>{agent.price_month_usd === 0 ? "Free" : `$${agent.price_month_usd}`}</ExecutiveBadge></td>
                  <td className="py-3"><div className="flex items-center gap-1"><Star className="w-3 h-3" style={{ color: "#F59E0B" }} /><span className="text-white">{agent.rating || 0}</span></div></td>
                  <td className="py-3 text-white">{formatInstalls(agent.installs_count)}</td>
                  <td className="py-3"><ExecutiveBadge color={agent.success_rate_pct >= 90 ? "#10B981" : "#F59E0B"}>{agent.success_rate_pct || 0}%</ExecutiveBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}