import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, Shield, Crosshair, Database, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const NODE_COLORS = {
  threat_actor: DANGER, campaign: HIGH, malware_family: "#a855f7",
  ioc: CYAN, technique: MUTED, vulnerability: "#f59e0b", actor: DANGER
};

export default function GDSThreatIntelGraphPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeTypeFilter, setNodeTypeFilter] = useState({});
  const svgRef = useRef(null);

  const { data: nodes = [], isLoading: loadN } = useQuery({
    queryKey: ["threat-graph-nodes"], queryFn: () => base44.entities.ThreatGraphNode.list("", 200).catch(() => []),
  });

  const { data: edges = [], isLoading: loadE } = useQuery({
    queryKey: ["threat-graph-edges"], queryFn: () => base44.entities.ThreatGraphEdge.list("", 500).catch(() => []),
  });

  const totalNodes = nodes.length;
  const totalEdges = edges.length;
  const activeNodes = nodes.filter(n => n.is_active).length;
  const criticalNodes = nodes.filter(n => (n.risk_score || 0) >= 80).length;

  const toggleNodeType = (type) => {
    setNodeTypeFilter(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const filteredNodes = nodes.filter(n => !nodeTypeFilter[n.node_type] || nodeTypeFilter[n.node_type]);
  const nodeMap = new Map(filteredNodes.map(n => [n.id, n]));
  const filteredEdges = edges.filter(e => nodeMap.has(e.source_node_id) && nodeMap.has(e.target_node_id));

  // Simple force-directed layout simulation
  const [positions, setPositions] = useState({});
  useEffect(() => {
    if (filteredNodes.length === 0) return;
    const pos = {};
    const width = 800, height = 500;
    filteredNodes.forEach((n, i) => {
      pos[n.id] = {
        x: width / 2 + (Math.random() - 0.5) * 400,
        y: height / 2 + (Math.random() - 0.5) * 300
      };
    });
    // Simple repulsion + spring forces
    for (let iter = 0; iter < 50; iter++) {
      filteredNodes.forEach(n => {
        filteredNodes.forEach(n2 => {
          if (n.id === n2.id) return;
          const dx = pos[n.id].x - pos[n2.id].x;
          const dy = pos[n.id].y - pos[n2.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 5000 / (dist * dist);
          pos[n.id].x += (dx / dist) * force;
          pos[n.id].y += (dy / dist) * force;
        });
      });
      filteredEdges.forEach(e => {
        if (!pos[e.source_node_id] || !pos[e.target_node_id]) return;
        const dx = pos[e.target_node_id].x - pos[e.source_node_id].x;
        const dy = pos[e.target_node_id].y - pos[e.source_node_id].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 100) * 0.01;
        pos[e.source_node_id].x += (dx / dist) * force;
        pos[e.source_node_id].y += (dy / dist) * force;
        pos[e.target_node_id].x -= (dx / dist) * force;
        pos[e.target_node_id].y -= (dy / dist) * force;
      });
      filteredNodes.forEach(n => {
        pos[n.id].x = Math.max(50, Math.min(width - 50, pos[n.id].x));
        pos[n.id].y = Math.max(50, Math.min(height - 50, pos[n.id].y));
      });
    }
    setPositions(pos);
  }, [filteredNodes.length]);

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Threat Intelligence Graph" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Network className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Threat Intelligence Graph</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Interactive threat entity relationship visualization</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Nodes</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{totalNodes}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Edges</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalEdges}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{activeNodes}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Nodes</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{criticalNodes}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Filter Node Types:</p>
          {Object.keys(NODE_COLORS).map(type => (
            <button
              key={type}
              onClick={() => toggleNodeType(type)}
              className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${nodeTypeFilter[type] ? "" : "opacity-40"}`}
              style={{ background: `${NODE_COLORS[type]}15`, border: `1px solid ${NODE_COLORS[type]}40`, color: NODE_COLORS[type] }}
            >
              {type.replace("_", " ")}
            </button>
          ))}
        </div>

        {loadN || loadE ? <Skeleton lines={8} /> : filteredNodes.length === 0 ? (
          <EmptyState icon={Network} title="No graph data" description="Threat graph entities will appear here" />
        ) : (
          <div className="relative" style={{ height: "500px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", overflow: "hidden" }}>
            <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 800 500">
              {/* Edges */}
              {filteredEdges.map((edge, i) => {
                const src = positions[edge.source_node_id];
                const tgt = positions[edge.target_node_id];
                if (!src || !tgt) return null;
                return (
                  <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                );
              })}
              {/* Nodes */}
              {filteredNodes.map((node) => {
                const pos = positions[node.id];
                if (!pos) return null;
                const color = NODE_COLORS[node.node_type] || MUTED;
                const radius = Math.max(8, Math.min(30, (node.risk_score || 50) / 3));
                return (
                  <g key={node.id} onClick={() => setSelectedNode(node)} style={{ cursor: "pointer" }}>
                    <circle cx={pos.x} cy={pos.y} r={radius} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
                    <text x={pos.x} y={pos.y + radius + 12} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">{node.name || node.entity_id}</text>
                  </g>
                );
              })}
            </svg>
            {/* Legend */}
            <div className="absolute bottom-4 left-4 p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.8)", border: `1px solid ${BORDER}` }}>
              <p className="text-[9px] font-bold mb-2" style={{ color: MUTED }}>Click nodes for details</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(NODE_COLORS).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="text-[9px]" style={{ color: MUTED }}>{type.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Node Detail Sidebar */}
      {selectedNode && (
        <Card className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">{selectedNode.name || selectedNode.entity_id}</h3>
              <p className="text-[10px]" style={{ color: MUTED }}>{selectedNode.node_type?.replace("_", " ")}</p>
            </div>
            <button onClick={() => setSelectedNode(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Close</button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold mb-1" style={{ color: TEXT }}>Risk Score</p>
              <p className="font-mono" style={{ color: selectedNode.risk_score >= 80 ? DANGER : TEXT }}>{selectedNode.risk_score || 0}</p>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: TEXT }}>Active</p>
              <p style={{ color: selectedNode.is_active ? LOW : MUTED }}>{selectedNode.is_active ? "Yes" : "No"}</p>
            </div>
            {selectedNode.description && (
              <div className="col-span-2">
                <p className="font-bold mb-1" style={{ color: TEXT }}>Description</p>
                <p style={{ color: MUTED }}>{selectedNode.description}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}