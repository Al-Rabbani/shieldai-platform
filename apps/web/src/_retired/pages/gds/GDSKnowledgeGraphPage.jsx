import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, Search, Plus, X } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const NODE_TYPE_COLORS = { threat: DANGER, vulnerability: HIGH, asset: "#60a5fa", control: LOW, incident: "#f97316", compliance: "#14b8a6", actor: "#a855f7", capability: "#fbbf24" };
const RELATIONSHIP_COLORS = { exploits: DANGER, affects: HIGH, mitigates: LOW, depends_on: "#60a5fa", targets: DANGER, detects: "#14b8a6", remediates: LOW };

export default function GDSKnowledgeGraphPage() {
  const [nodeType, setNodeType] = useState("all");
  const [startNode, setStartNode] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: graphData, isLoading } = useQuery({
    queryKey: ["memory-graph"],
    queryFn: () => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "graph_query" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const nodes = graphData?.nodes || [];
  const paths = graphData?.paths || [];
  const filteredNodes = nodeType === "all" ? nodes : nodes.filter(n => n.node_type === nodeType);

  const inputStyle = { background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none" };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Knowledge Graph" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Network className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Knowledge Graph</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            {nodes.length} nodes · {paths.length} edges
          </span>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" /> Add Node
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={nodeType} onChange={e => setNodeType(e.target.value)} className="px-3 py-1.5 rounded-lg text-[11px] outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: nodeType !== "all" ? CYAN : MUTED }}>
          <option value="all">All Node Types</option>
          {Object.keys(NODE_TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={startNode} onChange={e => setStartNode(e.target.value)} placeholder="Start node label..." className="px-3 py-1.5 rounded-lg text-[11px] outline-none flex-1 min-w-[180px]" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Search className="w-3.5 h-3.5" /> Query
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Nodes", value: nodes.length, color: CYAN },
          { label: "Total Edges", value: paths.length, color: "#a855f7" },
          { label: "Matched Nodes", value: filteredNodes.length, color: LOW },
          { label: "Connected Paths", value: paths.filter(p => p.weight > 0.5).length, color: HIGH },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Knowledge Paths</h3>
        </div>
        {isLoading ? <Skeleton lines={5} /> : paths.length === 0 ? (
          <EmptyState icon={Network} title="No graph paths" description="Query the graph to see relationships" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["From", "Relationship", "To", "Weight", "Confidence"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paths.slice(0, 20).map((path, i) => {
                  const relColor = RELATIONSHIP_COLORS[path.relationship] || MUTED;
                  return (
                    <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: NODE_TYPE_COLORS[path.from_type] || MUTED, background: `${NODE_TYPE_COLORS[path.from_type] || MUTED}18` }}>{path.from_type || "node"}</span>
                          <span className="text-white truncate max-w-[150px]">{path.from}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: relColor, background: `${relColor}18`, border: `1px solid ${relColor}30` }}>{path.relationship || "related"}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: NODE_TYPE_COLORS[path.to_type] || MUTED, background: `${NODE_TYPE_COLORS[path.to_type] || MUTED}18` }}>{path.to_type || "node"}</span>
                          <span className="text-white truncate max-w-[150px]">{path.to}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${(path.weight || 0) * 100}%`, background: relColor }} />
                          </div>
                          <span className="text-[10px] font-mono" style={{ color: relColor }}>{(path.weight || 0).toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: path.confidence >= 70 ? LOW : path.confidence >= 40 ? MEDIUM : DANGER }}>{path.confidence ?? 0}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}