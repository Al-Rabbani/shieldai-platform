import React, { useMemo } from "react";
import { SEVERITY_COLOR, LAYER_LABELS } from "@/lib/attackPaths";

const NODE_W = 128;
const NODE_H = 46;
const COL_GAP = 172;
const ROW_GAP = 66;

function typeLabel(type) {
  return type === "entry" ? "entry" : String(type || "asset").replace(/_/g, " ");
}

export default function AttackPathGraph({ graph, selectedId, pathIds, onSelect }) {
  const layout = useMemo(() => {
    const layers = new Map();
    graph.nodes.forEach((node) => {
      if (!layers.has(node.layer)) layers.set(node.layer, []);
      layers.get(node.layer).push(node);
    });
    const positions = new Map();
    const orderedLayers = [...layers.keys()].sort((a, b) => a - b);
    let maxRows = 1;
    orderedLayers.forEach((layer) => {
      const rows = layers.get(layer).sort((a, b) => (a.vulns.length === b.vulns.length ? a.name.localeCompare(b.name) : b.vulns.length - a.vulns.length));
      maxRows = Math.max(maxRows, rows.length);
      rows.forEach((node, index) => {
        positions.set(node.id, { x: 24 + layer * COL_GAP, y: 30 + index * ROW_GAP });
      });
    });
    return { positions, width: 48 + (Math.max(...orderedLayers, 0) + 1) * COL_GAP, height: 60 + maxRows * ROW_GAP, layers: orderedLayers };
  }, [graph]);

  if (graph.nodes.length <= 1) {
    return (
      <div className="rounded-lg p-6 text-center" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
        <p className="text-xs text-slate-500">No assets in the inventory yet, so there is no path to trace.</p>
      </div>
    );
  }

  const pathSet = new Set(pathIds || []);

  return (
    <div className="overflow-x-auto">
      <svg width={layout.width} height={layout.height} role="img" aria-label="Cloud asset attack path graph">
        {layout.layers.map((layer) => (
          <text key={`label-${layer}`} x={24 + layer * COL_GAP} y={12} fill="#64748b" fontSize="9" fontWeight="700" letterSpacing="0.6">
            {LAYER_LABELS[layer] || "Lateral"}
          </text>
        ))}

        {graph.edges.map((edge) => {
          const from = layout.positions.get(edge.from);
          const to = layout.positions.get(edge.to);
          if (!from || !to) return null;
          const active = pathSet.has(edge.from) && pathSet.has(edge.to);
          const x1 = from.x + NODE_W;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x;
          const y2 = to.y + NODE_H / 2;
          const midX = (x1 + x2) / 2;
          const stroke = active ? "#ef4444" : edge.inferred ? "#a16207" : "#334155";
          return (
            <path
              key={`${edge.from}-${edge.to}`}
              d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={stroke}
              strokeWidth={active ? 2 : 1}
              strokeDasharray={edge.from === "internet" || edge.inferred ? "4 3" : "none"}
            />
          );
        })}

        {graph.nodes.map((node) => {
          const position = layout.positions.get(node.id);
          if (!position) return null;
          const selected = selectedId === node.id;
          const onPath = pathSet.has(node.id);
          const accent = node.type === "entry" ? "#a855f7" : node.type === "ai_model" ? "#f43f5e" : node.maxSeverity ? SEVERITY_COLOR[node.maxSeverity] : "#475569";
          return (
            <g key={node.id} onClick={() => onSelect(node.id)} className="cursor-pointer" role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onSelect(node.id); }}>
              <rect
                x={position.x}
                y={position.y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={selected ? "#1d2c45" : "#111827"}
                stroke={selected ? "#3b82f6" : onPath ? "#ef444488" : "#1F2937"}
                strokeWidth={selected ? 2 : 1}
              />
              <rect x={position.x} y={position.y} width={3} height={NODE_H} rx={1.5} fill={accent} />
              <text x={position.x + 10} y={position.y + 18} fill="#f8fafc" fontSize="9.5" fontWeight="700">
                {node.name.length > 19 ? `${node.name.slice(0, 18)}…` : node.name}
              </text>
              <text x={position.x + 10} y={position.y + 31} fill="#94a3b8" fontSize="8">
                {typeLabel(node.type)}
                {node.vulns.length > 0 ? ` · ${node.vulns.length} vuln${node.vulns.length === 1 ? "" : "s"}` : " · clean"}
              </text>
              {node.maxSeverity && (
                <circle cx={position.x + NODE_W - 10} cy={position.y + 11} r={4} fill={SEVERITY_COLOR[node.maxSeverity]} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}