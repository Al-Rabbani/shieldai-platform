import React, { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/gds/GDSOSShared";
import { Network, AlertTriangle, Shield, Zap, Radio, Building2, Server, Wifi } from "lucide-react";
import { CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, BORDER, CARD } from "@/components/gds/GDSOSShared";

// Node type colors
const NODE_COLORS = {
  industrial: "#f59e0b",
  telecom: "#0ea5e9",
  smart_city: "#10b981",
  power: "#ef4444",
  water: "#3b82f6",
  transport: "#8b5cf6",
  emergency: "#dc2626",
  government: "#6366f1",
};

// Node type icons
const NODE_ICONS = {
  industrial: Server,
  telecom: Radio,
  smart_city: Building2,
  power: Zap,
  water: Wifi,
  transport: Network,
  emergency: AlertTriangle,
  government: Shield,
};

export default function DependencyGraph({ 
  industrialAssets = [], 
  telecomNodes = [], 
  smartCityAssets = [], 
  incidents = [] 
}) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [viewMode, setViewMode] = useState("all"); // all | industrial | telecom | smart_city

  // Build dependency graph from assets
  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const nodeMap = new Map();

    // Add industrial assets
    industrialAssets?.forEach(asset => {
      const node = {
        id: `ind-${asset.id}`,
        type: "industrial",
        name: asset.name || asset.site_name,
        sector: asset.industry_type || "manufacturing",
        criticality: asset.criticality_score || 50,
        status: asset.status || "operational",
        dependencies: asset.dependencies || [],
        impact_score: asset.impact_score || 0,
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // Add telecom nodes
    telecomNodes?.forEach(node => {
      const telecomNode = {
        id: `tel-${node.id}`,
        type: "telecom",
        name: node.name || node.node_type,
        sector: node.node_type || "core_router",
        criticality: node.risk_score || 50,
        status: node.status || "operational",
        dependencies: [],
        impact_score: node.throughput_gbps || 0,
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
      };
      nodes.push(telecomNode);
      nodeMap.set(telecomNode.id, telecomNode);
    });

    // Add smart city assets
    smartCityAssets?.forEach(asset => {
      const cityNode = {
        id: `city-${asset.id}`,
        type: "smart_city",
        name: asset.name || asset.infrastructure_type,
        sector: asset.infrastructure_type || "utility",
        criticality: asset.criticality_score || 50,
        status: asset.status || "operational",
        dependencies: asset.dependencies || [],
        impact_score: asset.citizens_impacted || 0,
        x: Math.random() * 80 + 10,
        y: Math.random() * 60 + 20,
      };
      nodes.push(cityNode);
      nodeMap.set(cityNode.id, cityNode);
    });

    // Create links based on dependencies
    nodes.forEach(node => {
      if (node.dependencies && node.dependencies.length > 0) {
        node.dependencies.forEach(depId => {
          // Try to find matching node
          const targetNode = Array.from(nodeMap.values()).find(n => 
            n.name?.toLowerCase().includes(depId.toLowerCase()) ||
            n.id.includes(depId)
          );
          
          if (targetNode) {
            links.push({
              source: node.id,
              target: targetNode.id,
              type: "dependency",
              strength: 1,
            });
          }
        });
      }
    });

    // Add cross-sector links (telecom powers everything, industrial needs power, etc.)
    const telecomNodes_list = nodes.filter(n => n.type === "telecom");
    const industrialNodes = nodes.filter(n => n.type === "industrial");
    const cityNodes = nodes.filter(n => n.type === "smart_city");

    // Telecom provides connectivity to all
    telecomNodes_list.forEach(tel => {
      industrialNodes.slice(0, 3).forEach(ind => {
        links.push({
          source: tel.id,
          target: ind.id,
          type: "connectivity",
          strength: 0.5,
        });
      });
      cityNodes.slice(0, 3).forEach(city => {
        links.push({
          source: tel.id,
          target: city.id,
          type: "connectivity",
          strength: 0.5,
        });
      });
    });

    return { nodes, links, nodeMap };
  }, [industrialAssets, telecomNodes, smartCityAssets]);

  // Calculate cascade impact when a node fails
  const cascadeImpact = useMemo(() => {
    if (!selectedNode) return { affected: [], totalImpact: 0 };

    const affected = [];
    const visited = new Set();
    const queue = [selectedNode.id];

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = graphData.nodeMap.get(nodeId);
      if (!node) continue;

      affected.push(node);

      // Find all nodes that depend on this one
      graphData.links.forEach(link => {
        if (link.target === nodeId && !visited.has(link.source)) {
          queue.push(link.source);
        }
      });
    }

    const totalImpact = affected.reduce((sum, n) => sum + (n.impact_score || 0), 0);
    return { affected, totalImpact };
  }, [selectedNode, graphData]);

  // Filter nodes by view mode
  const filteredNodes = useMemo(() => {
    if (viewMode === "all") return graphData.nodes;
    return graphData.nodes.filter(n => n.type === viewMode);
  }, [graphData.nodes, viewMode]);

  const NodeIcon = selectedNode ? NODE_ICONS[selectedNode.type] || Network : Network;

  return (
    <Card className="p-5" glow>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Network className="w-4 h-4" style={{ color: CYAN }} />
          Cross-Sector Dependency Graph
        </h3>
        <div className="flex items-center gap-2">
          {["all", "industrial", "telecom", "smart_city"].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all ${
                viewMode === mode 
                  ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-400" 
                  : "bg-white/5 border-white/10 text-slate-400"
              }`}
              style={{ border: `1px solid ${viewMode === mode ? CYAN + "40" : "rgba(255,255,255,0.1)"}` }}
            >
              {mode.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="relative h-96 rounded-xl overflow-hidden" 
        style={{ 
          background: "linear-gradient(180deg, #0a1628 0%, #0f2342 100%)", 
          border: `1px solid ${BORDER}` 
        }}>
        
        {/* Grid background */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "30px 30px"
        }} />

        {/* Links */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {graphData.links
            .filter(link => {
              const sourceNode = graphData.nodeMap.get(link.source);
              const targetNode = graphData.nodeMap.get(link.target);
              return filteredNodes.some(n => n.id === link.source) && 
                     filteredNodes.some(n => n.id === link.target);
            })
            .map((link, idx) => {
              const sourceNode = graphData.nodeMap.get(link.source);
              const targetNode = graphData.nodeMap.get(link.target);
              if (!sourceNode || !targetNode) return null;

              const isHighlighted = selectedNode && 
                (cascadeImpact.affected.some(n => n.id === link.source) || 
                 cascadeImpact.affected.some(n => n.id === link.target));

              return (
                <line
                  key={idx}
                  x1={`${sourceNode.x}%`}
                  y1={`${sourceNode.y}%`}
                  x2={`${targetNode.x}%`}
                  y2={`${targetNode.y}%`}
                  stroke={isHighlighted ? CYAN : "rgba(100,116,139,0.3)"}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeDasharray={link.type === "connectivity" ? "4 2" : "none"}
                  opacity={isHighlighted ? 0.8 : 0.4}
                />
              );
            })}
        </svg>

        {/* Nodes */}
        {filteredNodes.map(node => {
          const Icon = NODE_ICONS[node.type] || Network;
          const color = NODE_COLORS[node.type] || MUTED;
          const isSelected = selectedNode?.id === node.id;
          const isHovered = hoveredNode?.id === node.id;
          const isAffected = selectedNode && cascadeImpact.affected.some(n => n.id === node.id);
          const size = isSelected ? 20 : isHovered || isAffected ? 16 : 12;

          return (
            <div
              key={node.id}
              className="absolute cursor-pointer transition-all duration-200"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Node circle */}
              <div
                className={`rounded-full flex items-center justify-center transition-all duration-200 ${
                  isSelected ? "animate-pulse" : ""
                }`}
                style={{
                  width: size,
                  height: size,
                  background: isAffected ? `${color}40` : `${color}20`,
                  border: `2px solid ${color}`,
                  boxShadow: isSelected || isAffected ? `0 0 20px ${color}80` : "none",
                }}
              >
                <Icon className="flex-shrink-0" style={{ color, width: size * 0.5, height: size * 0.5 }} />
              </div>

              {/* Node label */}
              {(isHovered || isSelected || isAffected) && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1.5 rounded-lg whitespace-nowrap z-10"
                  style={{ 
                    background: "#0a1628", 
                    border: `1px solid ${color}40`,
                    minWidth: "120px"
                  }}
                >
                  <p className="text-[9px] font-bold text-white truncate">{node.name}</p>
                  <p className="text-[8px]" style={{ color }}>{node.sector.replace(/_/g, " ")}</p>
                  {isAffected && selectedNode?.id !== node.id && (
                    <p className="text-[8px] text-red-400 mt-1">⚠️ Affected by failure</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {filteredNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm" style={{ color: MUTED }}>No assets in this sector</p>
          </div>
        )}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-4 p-4 rounded-xl" style={{ background: `${NODE_COLORS[selectedNode.type]}08`, border: `1px solid ${NODE_COLORS[selectedNode.type]}30` }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                style={{ background: `${NODE_COLORS[selectedNode.type]}20`, border: `1px solid ${NODE_COLORS[selectedNode.type]}40` }}>
                <NodeIcon className="w-5 h-5" style={{ color: NODE_COLORS[selectedNode.type] }} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{selectedNode.name}</h4>
                <p className="text-[9px]" style={{ color: MUTED }}>
                  {selectedNode.type.replace("_", " ")} · {selectedNode.sector.replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedNode(null)}
              className="text-[9px] px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: MUTED, border: `1px solid ${BORDER}` }}
            >
              ✕ Close
            </button>
          </div>

          {/* Impact Analysis */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[8px] font-bold uppercase mb-1" style={{ color: MUTED }}>Cascade Impact</p>
              <p className="text-xl font-black" style={{ color: DANGER }}>{cascadeImpact.affected.length - 1} nodes</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[8px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Impact Score</p>
              <p className="text-xl font-black" style={{ color: HIGH }}>{cascadeImpact.totalImpact}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[8px] font-bold uppercase mb-1" style={{ color: MUTED }}>Criticality</p>
              <p className={`text-xl font-black ${selectedNode.criticality > 70 ? "text-red-400" : selectedNode.criticality > 40 ? "text-orange-400" : "text-green-400"}`}>
                {selectedNode.criticality}
              </p>
            </div>
          </div>

          {/* Affected Nodes List */}
          {cascadeImpact.affected.length > 1 && (
            <div className="mt-3">
              <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Affected by Failure Cascade</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {cascadeImpact.affected.slice(1, 6).map(node => (
                  <div key={node.id} className="flex items-center gap-2 p-2 rounded-lg" 
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: DANGER }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-semibold text-white truncate">{node.name}</p>
                      <p className="text-[8px]" style={{ color: MUTED }}>{node.type.replace("_", " ")}</p>
                    </div>
                    <span className="text-[8px] px-1.5 py-0.5 rounded" 
                      style={{ background: `${NODE_COLORS[node.type]}15`, color: NODE_COLORS[node.type] }}>
                      Impact: {node.impact_score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Legend:</p>
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[8px] font-bold" style={{ color: TEXT }}>{type.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}