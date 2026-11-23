import React, { useState, useMemo } from "react";
import { Search, Layers, Database, Crown, Shield, Zap, Lock } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_PURPLE, COPILOT_GOLD, COPILOT_TEAL, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, BORDER, MUTED, TEXT, AGENT_FLEET, PLATFORM_FUNCTIONS } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import PlatformFunctionMap from "@/components/gds/PlatformFunctionMap";

const PILLAR_PROGRESS = {
  "AI Core": { current: 6, total: 6, color: COPILOT_PURPLE },
  "Cloud Security": { current: 7, total: 7, color: COPILOT_BLUE },
  "Compliance": { current: 6, total: 6, color: COPILOT_GREEN },
  "Orchestration": { current: 7, total: 7, color: COPILOT_ELECTRIC },
  "Threat Intel": { current: 6, total: 6, color: COPILOT_RED },
  "Vulnerability": { current: 5, total: 5, color: COPILOT_AMBER },
  "DevSecOps": { current: 6, total: 6, color: COPILOT_TEAL },
  "Identity": { current: 6, total: 6, color: COPILOT_PURPLE },
  "Executive": { current: 6, total: 6, color: COPILOT_GOLD },
  "Risk": { current: 4, total: 4, color: COPILOT_RED },
  "MSSP": { current: 8, total: 8, color: COPILOT_BLUE },
  "Remediation": { current: 3, total: 3, color: COPILOT_GREEN },
};

export default function GDSCoPilotPlatformPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const totalFunctions = Object.values(PLATFORM_FUNCTIONS).reduce((sum, cat) => sum + cat.functions.length, 0);
  const totalCategories = Object.keys(PLATFORM_FUNCTIONS).length;
  const totalAgents = AGENT_FLEET.length;

  const searchFiltered = useMemo(() => {
    return Object.entries(PLATFORM_FUNCTIONS).filter(([key, cat]) => {
      const matchesSearch = searchQuery === "" || 
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.functions.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "all" || key === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const getTierIcon = (tier) => {
    if (tier === "sovereign") return <Crown className="w-3 h-3" />;
    if (tier === "command") return <Shield className="w-3 h-3" />;
    if (tier === "specialist") return <Zap className="w-3 h-3" />;
    return <Lock className="w-3 h-3" />;
  };

  const getTierColor = (tier) => {
    if (tier === "sovereign") return COPILOT_GOLD;
    if (tier === "command") return COPILOT_BLUE;
    if (tier === "specialist") return COPILOT_TEAL;
    return COPILOT_RED;
  };

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Platform Function Integration Map" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">PLATFORM FUNCTION INTEGRATION MAP</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v8.0 · 86 FUNCTIONS · 26 CATEGORIES · 35 AGENTS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <CopilotStat label="Total Functions" value={totalFunctions} sub="Platform Integrated" color={COPILOT_ELECTRIC} />
        <CopilotStat label="Categories" value={totalCategories} sub="Security Domains" color={COPILOT_GOLD} />
        <CopilotStat label="Agents Wired" value={totalAgents} sub="35 Super Agents" color={COPILOT_PURPLE} />
        <CopilotStat label="Commands Powered" value={32} sub="Command Types" color={COPILOT_BLUE} />
      </div>

      {/* Platform Coverage by Pillar */}
      <div className="mb-6" style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4" style={{ color: COPILOT_GOLD }} /> Platform Coverage by Security Pillar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PILLAR_PROGRESS).map(([pillar, data]) => (
              <div key={pillar} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${data.color}30` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{pillar}</span>
                  <span className="text-[10px] font-bold" style={{ color: data.color }}>{data.current}/{data.total}</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(data.current / data.total) * 100}%`, background: data.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search functions..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="all">All Categories</option>
          {Object.keys(PLATFORM_FUNCTIONS).map(key => (
            <option key={key} value={key}>{PLATFORM_FUNCTIONS[key].name}</option>
          ))}
        </select>
      </div>

      {/* Interactive Platform Function Map */}
      <PlatformFunctionMap />
    </div>
  );
}