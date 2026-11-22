import React, { useState, useMemo } from "react";
import { Brain, Cloud, Shield, Zap, Lock, Crown, Activity, Database, Link2, X, Search, Filter } from "lucide-react";
import { COPILOT_CARD, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_PURPLE, COPILOT_GOLD, COPILOT_TEAL, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, BORDER, MUTED, TEXT, AGENT_FLEET, PLATFORM_FUNCTIONS, AGENT_TIERS } from "@/components/gds/CopilotShared";

const CATEGORY_COLORS = {
  ai_core: COPILOT_PURPLE,
  cloud_security: COPILOT_BLUE,
  compliance: COPILOT_GREEN,
  orchestration: COPILOT_ELECTRIC,
  threat_intel: COPILOT_RED,
  vulnerability: COPILOT_AMBER,
  devsecops: COPILOT_TEAL,
  identity: COPILOT_PURPLE,
  executive: COPILOT_GOLD,
  risk: COPILOT_RED,
  remediation: COPILOT_GREEN,
  audit: COPILOT_BLUE,
  mssp: COPILOT_BLUE,
  pentest: COPILOT_RED,
  supply_chain: COPILOT_TEAL,
  containers: COPILOT_BLUE,
  kubernetes: COPILOT_TEAL,
  api_security: COPILOT_PURPLE,
  data_security: COPILOT_GREEN,
  regulatory: COPILOT_GOLD,
  slsa: COPILOT_AMBER,
  quantum: COPILOT_PURPLE,
  autonomous_ir: COPILOT_RED,
  platform_health: COPILOT_GREEN,
  notifications: COPILOT_AMBER,
  evidence: COPILOT_BLUE,
};

const AGENT_ROLE_TO_CATEGORY = {
  copilot_command: ["orchestration", "executive", "risk"],
  threat_hunting: ["threat_intel", "ai_core"],
  executive_intelligence: ["executive", "risk", "compliance"],
  incident_response: ["orchestration", "threat_intel", "evidence"],
  security_operations: ["threat_intel", "notifications", "orchestration"],
  cloud_security: ["cloud_security", "containers", "kubernetes"],
  identity_security: ["identity", "audit"],
  vulnerability_mgmt: ["vulnerability", "remediation", "cloud_security"],
  devsecops: ["devsecops", "supply_chain", "api_security"],
  compliance_automation: ["compliance", "audit", "regulatory"],
  risk_intelligence: ["risk", "executive", "ai_core"],
  authorized_pentesting: ["pentest", "threat_intel"],
  knowledge_retrieval: ["ai_core", "evidence"],
  workflow_automation: ["orchestration", "notifications"],
  security_operations: ["mssp", "notifications"],
};

export default function PlatformFunctionMap() {
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTier, setSelectedTier] = useState("all");

  // Build function-to-agent mapping
  const functionAgentMap = useMemo(() => {
    const map = {};
    Object.entries(PLATFORM_FUNCTIONS).forEach(([category, catData]) => {
      catData.functions.forEach(func => {
        const relevantAgents = AGENT_FLEET.filter(agent => {
          const agentCategories = AGENT_ROLE_TO_CATEGORY[agent.role] || [];
          return agentCategories.includes(category);
        });
        map[func] = {
          category,
          agents: relevantAgents,
          color: CATEGORY_COLORS[category] || COPILOT_ELECTRIC,
        };
      });
    });
    return map;
  }, []);

  // Filter functions
  const filteredFunctions = useMemo(() => {
    return Object.entries(PLATFORM_FUNCTIONS).filter(([key]) => {
      const matchesCategory = selectedCategory === "all" || key === selectedCategory;
      return matchesCategory;
    }).flatMap(([key, cat]) => {
      return cat.functions.map(func => ({
        name: func,
        category: key,
        color: CATEGORY_COLORS[key] || COPILOT_ELECTRIC,
        agents: functionAgentMap[func]?.agents || [],
        icon: cat.icon,
      }));
    }).filter(f => {
      const matchesSearch = searchQuery === "" || f.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = selectedTier === "all" || f.agents.some(a => a.tier === selectedTier);
      return matchesSearch && matchesTier;
    });
  }, [selectedCategory, selectedTier, searchQuery, functionAgentMap]);

  const totalFunctions = Object.values(PLATFORM_FUNCTIONS).reduce((sum, cat) => sum + cat.functions.length, 0);
  const activeAgents = AGENT_FLEET.length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-64 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: MUTED }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search functions or agents..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
        </div>
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}
        >
          <option value="all">All Categories</option>
          {Object.entries(PLATFORM_FUNCTIONS).map(([key, cat]) => (
            <option key={key} value={key}>{cat.icon} {cat.name}</option>
          ))}
        </select>
        <select 
          value={selectedTier} 
          onChange={(e) => setSelectedTier(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}
        >
          <option value="all">All Agent Tiers</option>
          <option value="sovereign">👑 Sovereign</option>
          <option value="command">🛡️ Command</option>
          <option value="specialist">⚡ Specialist</option>
          <option value="restricted">🔒 Restricted</option>
        </select>
      </div>

      {/* Interactive Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Function Nodes */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} />
            Platform Functions ({filteredFunctions.length}/{totalFunctions})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto pr-2">
            {filteredFunctions.map((func, idx) => (
              <div
                key={func.name}
                onClick={() => setSelectedFunction(selectedFunction?.name === func.name ? null : func)}
                className={`p-3 rounded-xl cursor-pointer transition-all hover:scale-105 ${selectedFunction?.name === func.name ? 'ring-2' : ''}`}
                style={{ 
                  background: `${func.color}10`, 
                  border: `1px solid ${func.color}40`,
                  ringColor: func.color
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{func.icon}</span>
                    <div>
                      <p className="text-xs font-mono font-bold" style={{ color: func.color }}>{func.name}</p>
                      <p className="text-[9px] uppercase" style={{ color: MUTED }}>{func.category.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <Link2 className="w-3.5 h-3.5" style={{ color: MUTED }} />
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {func.agents.slice(0, 4).map(agent => {
                    const tier = AGENT_TIERS[agent.tier];
                    return (
                      <span 
                        key={agent.id}
                        className="text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
                        style={{ background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}
                      >
                        {tier.icon} {agent.name.split(" ").slice(2).join(" ").slice(0, 6)}
                      </span>
                    );
                  })}
                  {func.agents.length > 4 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ color: MUTED, border: `1px solid ${BORDER}` }}>
                      +{func.agents.length - 4}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Nodes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4" style={{ color: COPILOT_GOLD }} />
            AI Agents ({activeAgents})
          </h3>
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-2">
            {AGENT_FLEET.filter(agent => {
              if (selectedTier === "all") return true;
              return agent.tier === selectedTier;
            }).map((agent, idx) => {
              const tier = AGENT_TIERS[agent.tier];
              const agentCategories = AGENT_ROLE_TO_CATEGORY[agent.role] || [];
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                  className={`p-3 rounded-xl cursor-pointer transition-all hover:scale-105 ${selectedAgent?.id === agent.id ? 'ring-2' : ''}`}
                  style={{ 
                    background: `${tier.color}10`, 
                    border: `1px solid ${tier.color}40`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${tier.color}20` }}>
                      <span className="text-lg">{tier.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: TEXT }}>{agent.name}</p>
                      <p className="text-[9px] uppercase" style={{ color: MUTED }}>{agent.role.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    {agentCategories.slice(0, 3).map((cat, i) => (
                      <span 
                        key={i}
                        className="text-[8px] px-1.5 py-0.5 rounded"
                        style={{ background: `${CATEGORY_COLORS[cat] || COPILOT_ELECTRIC}20`, color: CATEGORY_COLORS[cat] || COPILOT_ELECTRIC }}
                      >
                        {cat.replace(/_/g, " ").slice(0, 8)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span style={{ color: MUTED }}>{agent.functions} functions</span>
                    <span style={{ color: tier.color }}>{tier.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Function Detail Modal */}
      {selectedFunction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-3xl rounded-2xl p-6" style={{ background: "#0a0f1c", border: `2px solid ${selectedFunction.color}` }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-2xl">{selectedFunction.icon}</span>
                {selectedFunction.name}
              </h4>
              <button onClick={() => setSelectedFunction(null)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: MUTED }} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Category</p>
                <p className="text-sm font-bold" style={{ color: selectedFunction.color }}>{selectedFunction.category.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Connected Agents</p>
                <p className="text-sm font-black" style={{ color: COPILOT_GOLD }}>{selectedFunction.agents.length}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Connected AI Agents</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {selectedFunction.agents.map(agent => {
                  const tier = AGENT_TIERS[agent.tier];
                  return (
                    <div key={agent.id} className="p-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${tier.color}30` }}>
                      <span className="text-lg">{tier.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate" style={{ color: TEXT }}>{agent.name}</p>
                        <p className="text-[8px]" style={{ color: MUTED }}>{agent.role.replace(/_/g, " ")}</p>
                      </div>
                      <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${tier.color}20`, color: tier.color }}>{tier.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-3xl rounded-2xl p-6" style={{ background: "#0a0f1c", border: `2px solid ${AGENT_TIERS[selectedAgent.tier].color}` }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-black text-white flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${AGENT_TIERS[selectedAgent.tier].color}20` }}>
                  <span className="text-2xl">{AGENT_TIERS[selectedAgent.tier].icon}</span>
                </div>
                {selectedAgent.name}
              </h4>
              <button onClick={() => setSelectedAgent(null)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" style={{ color: MUTED }} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Tier</p>
                <p className="text-sm font-black" style={{ color: AGENT_TIERS[selectedAgent.tier].color }}>{AGENT_TIERS[selectedAgent.tier].label}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Functions</p>
                <p className="text-sm font-black" style={{ color: COPILOT_ELECTRIC }}>{selectedAgent.functions}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Commands</p>
                <p className="text-sm font-black" style={{ color: COPILOT_BLUE }}>{selectedAgent.commands}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Capabilities</p>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedAgent.capabilities.map((cap, idx) => (
                  <span key={idx} className="text-[9px] px-2 py-1 rounded-lg" style={{ background: `${COPILOT_ELECTRIC}20`, color: COPILOT_ELECTRIC, border: `1px solid ${COPILOT_ELECTRIC}40` }}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Accessible Function Categories</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(AGENT_ROLE_TO_CATEGORY[selectedAgent.role] || []).map(cat => (
                  <div key={cat} className="p-2 rounded-lg" style={{ background: `${CATEGORY_COLORS[cat] || COPILOT_ELECTRIC}15`, border: `1px solid ${CATEGORY_COLORS[cat] || COPILOT_ELECTRIC}30` }}>
                    <p className="text-[10px] font-bold" style={{ color: CATEGORY_COLORS[cat] || COPILOT_ELECTRIC }}>{cat.replace(/_/g, " ")}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>{PLATFORM_FUNCTIONS[cat]?.functions.length || 0} functions</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}