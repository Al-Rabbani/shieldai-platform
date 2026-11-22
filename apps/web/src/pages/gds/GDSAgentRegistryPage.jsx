import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Book, Search, Play, Cpu, Layers } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, EmptyState, Skeleton, PAGE_BG
} from "@/components/gds/GDSOSShared";
import GDSPageShell from "@/components/gds/GDSPageShell";

const AGENT_TYPE_COLORS = {
  scanner: "#0ea5e9", triager: "#a855f7", hunter: "#f97316",
  responder: "#ef4444", soar: "#ef4444", compliance: "#10b981",
  devsecops: "#06b6d4", supply_chain: "#14b8a6", kernel: "#eab308",
  governance: "#6366f1",
};

function AgentTypeBadge({ type }) {
  const color = AGENT_TYPE_COLORS[type] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {type}
    </span>
  );
}

export default function GDSAgentRegistryPage() {
  const [tab, setTab] = useState("catalog"); // catalog | registered
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["agent-registry"],
    queryFn: () => base44.functions.invoke("gdsAgentRuntime", { action: "list", include_catalog: true }).then(r => r.data),
    refetchInterval: 60000,
  });

  const catalog = data?.catalog || [];
  const registered = data?.registered || [];

  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(a =>
      (a.name || "").toLowerCase().includes(q) ||
      (a.agent_id || "").toLowerCase().includes(q) ||
      (a.capabilities || []).some(c => c.toLowerCase().includes(q))
    );
  }, [catalog, search]);

  const handleStart = async (agent_id) => {
    try {
      await base44.functions.invoke("gdsAgentRuntime", { action: "start", agent_id });
      alert(`Agent ${agent_id} started!`);
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  return (
    <GDSPageShell
      title="Agent Registry"
      breadcrumbs={[{ label: "Agent Runtime", path: "/agents" }, { label: "Registry" }]}
      version="EDP-003 v1.0"
      live
    >
      <div className="mb-6">
        {/* Tab bar */}
        <div className="flex items-center gap-4 mb-4 border-b" style={{ borderColor: BORDER }}>
          <button onClick={() => setTab("catalog")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${tab === "catalog" ? "text-cyan-400" : "text-gray-500 hover:text-white"}`}
            style={{ borderBottomColor: tab === "catalog" ? CYAN : "transparent" }}>
            Catalog Agents ({catalog.length})
          </button>
          <button onClick={() => setTab("registered")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${tab === "registered" ? "text-cyan-400" : "text-gray-500 hover:text-white"}`}
            style={{ borderBottomColor: tab === "registered" ? CYAN : "transparent" }}>
            Registered Agents ({registered.length})
          </button>
          {/* Capability search */}
          <div className="ml-auto relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by capability…"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
        </div>

        {tab === "catalog" ? (
          /* Catalog Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
              ))
            ) : filteredCatalog.length === 0 ? (
              <div className="col-span-full">
                <EmptyState icon={Book} title="No matching agents" description="Try a different search term" />
              </div>
            ) : (
              filteredCatalog.map(agent => (
                <Card key={agent.agent_id} className="p-5 flex flex-col h-full" glow>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{agent.name}</h3>
                      <p className="text-[10px] font-mono" style={{ color: MUTED }}>{agent.agent_id}</p>
                    </div>
                    <AgentTypeBadge type={agent.agent_type} />
                  </div>

                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                      style={{ color: CYAN, background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}>
                      {agent.runtime_class}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      agent.priority === "critical" ? "text-red-400 bg-red-500/15 border border-red-500/30" :
                      agent.priority === "high" ? "text-orange-400 bg-orange-500/15 border border-orange-500/30" :
                      agent.priority === "medium" ? "text-yellow-400 bg-yellow-500/15 border border-yellow-500/30" :
                      "text-gray-400 bg-gray-500/15 border border-gray-500/30"
                    }`}>
                      {agent.priority}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: MUTED }}>Capabilities</p>
                    <div className="flex flex-wrap gap-1">
                      {(agent.capabilities || []).slice(0, 3).map((cap, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ color: MUTED, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                          {cap}
                        </span>
                      ))}
                      {(agent.capabilities || []).length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED }}>
                          +{(agent.capabilities || []).length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t" style={{ borderColor: BORDER }}>
                    <p className="text-[10px]" style={{ color: MUTED }}>
                      {(agent.tools_allowed || []).length} tools allowed
                    </p>
                    <button onClick={() => handleStart(agent.agent_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                      style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                      <Play className="w-3 h-3" /> Start
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Registered Agents Table */
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
              <h3 className="text-sm font-bold text-white">Custom Registered Agents</h3>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
              </div>
            ) : registered.length === 0 ? (
              <EmptyState icon={Layers} title="No registered agents" description="Register custom agents from the Agent Runtime page" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Agent ID", "Name", "Type", "Runtime Class", "Priority", "Registered"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registered.map((a, i) => (
                      <tr key={a.agent_id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-mono text-[11px]" style={{ color: TEXT }}>{a.agent_id}</td>
                        <td className="py-2 px-3 font-semibold text-white">{a.name}</td>
                        <td className="py-2 px-3"><AgentTypeBadge type={a.agent_type} /></td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{a.runtime_class || "—"}</td>
                        <td className="py-2 px-3 text-[10px] capitalize" style={{ color: MUTED }}>{a.priority || "medium"}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{a.registered_at ? new Date(a.registered_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </GDSPageShell>
  );
}