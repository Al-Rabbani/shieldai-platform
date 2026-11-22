import React, { useMemo } from "react";
import { Globe, ShieldAlert } from "lucide-react";
import { SEVERITY_COLOR } from "@/lib/attackPaths";

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

function scoreChain(graph, path) {
  return path.reduce((sum, id) => {
    const node = graph.nodes.find((item) => item.id === id);
    if (!node) return sum;
    const rank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }[node.maxSeverity] || 0;
    return sum + rank * 10 + (node.vulns?.length || 0);
  }, 0);
}

function deepestChain(graph, startId) {
  const outgoing = new Map();
  graph.edges.forEach((edge) => {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    outgoing.get(edge.from).push(edge);
  });
  const paths = [];
  const walk = (current, visited) => {
    const next = outgoing.get(current) || [];
    if (next.length === 0 || visited.length > 5) {
      paths.push([...visited]);
      return;
    }
    next.forEach((edge) => {
      if (visited.includes(edge.to)) return;
      walk(edge.to, [...visited, edge.to]);
    });
  };
  walk(startId, [startId]);
  if (paths.length === 0) return [startId];
  return paths.sort((a, b) => scoreChain(graph, b) - scoreChain(graph, a))[0];
}

export default function AttackEntryPointMap({ graph, onSelect, selectedId }) {
  const chains = useMemo(() => {
    const entryIds = graph.edges.filter((edge) => edge.from === "internet").map((edge) => edge.to);
    return entryIds
      .map((id) => {
        const chain = deepestChain(graph, id);
        const entryNode = graph.nodes.find((node) => node.id === id);
        return {
          id,
          entry: entryNode,
          nodes: chain.map((nodeId) => graph.nodes.find((node) => node.id === nodeId)).filter(Boolean),
          score: scoreChain(graph, chain),
          severity: chain.reduce((worst, nodeId) => {
            const node = graph.nodes.find((item) => item.id === nodeId);
            if (!node?.maxSeverity) return worst;
            return (SEVERITY_RANK[node.maxSeverity] || 0) > (SEVERITY_RANK[worst] || 0) ? node.maxSeverity : worst;
          }, null),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [graph]);

  if (chains.length === 0) {
    return (
      <div className="rounded-lg p-3 text-[11px] text-slate-500" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
        No potential entry point is recorded — no API, container or serverless asset is exposed yet.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {chains.slice(0, 5).map((chain) => (
        <div key={chain.id} className="rounded-lg p-2 overflow-x-auto" style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${SEVERITY_COLOR[chain.severity] || "#475569"}` }}>
          <div className="flex items-center gap-2 min-w-max">
            <span className="flex items-center gap-1 text-[10px] font-bold text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10">
              <Globe size={9} /> entry point
            </span>

            {chain.nodes.map((node, index) => (
              <React.Fragment key={node.id}>
                {index === 0 ? (
                  <span className="w-6 sm:w-10 h-px flex-shrink-0 animate-dash" style={{ borderTop: "1.5px dashed #a16207" }} />
                ) : (
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <span className="w-5 sm:w-8 h-px animate-dash" style={{ borderTop: `1.5px ${index === 1 ? "solid" : "dashed"} ${index === 1 ? "#334155" : "#a16207"}` }} />
                    <span className="text-[8px] text-slate-600">pivot</span>
                    <span className="w-5 sm:w-8 h-px animate-dash" style={{ borderTop: `1.5px ${index === 1 ? "solid" : "dashed"} ${index === 1 ? "#334155" : "#a16207"}` }} />
                  </span>
                )}

                <button
                  onClick={() => onSelect(node.id)}
                  className={`text-left px-2 py-1 rounded-md border transition flex-shrink-0 ${selectedId === node.id ? "border-blue-500 bg-[#1d2c45]" : "border-slate-700 bg-[#111827] hover:border-slate-500"}`}
                >
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: node.maxSeverity ? SEVERITY_COLOR[node.maxSeverity] : "#334155" }} />
                    <span className="text-[10px] font-semibold text-white max-w-[110px] truncate">{node.name}</span>
                    {node.vulns?.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[8px] font-bold text-red-300">
                        <ShieldAlert size={8} /> {node.vulns.length}
                      </span>
                    )}
                  </span>
                  <span className="block text-[8px] text-slate-500 capitalize">{String(node.type || "asset").replace(/_/g, " ")}{index === 0 ? " · exposed" : " · hop"}</span>
                </button>
              </React.Fragment>
            ))}

            <span className="ml-2 text-[9px] text-slate-500 whitespace-nowrap">
              {chain.nodes.reduce((sum, node) => sum + (node.vulns?.length || 0), 0)} vulnerable step(s)
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}