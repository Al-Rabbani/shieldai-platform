import React, { useEffect, useState, useRef } from "react";
import { Card } from "@/components/gds/GDSOSShared";
import { Network, ZoomIn, ZoomOut, Filter, X } from "lucide-react";

const NODE_COLORS = {
  asset: "#00d4ff",
  vulnerability: "#ff3b3b",
  threat: "#ff8c00",
  ioc: "#a855f7",
  campaign: "#f97316",
  actor: "#ef4444",
};

const NODE_SIZES = { asset: 20, vulnerability: 12, threat: 15, ioc: 10, campaign: 14, actor: 16 };

export default function AssetKnowledgeGraph({ assets, vulnerabilities, threats, iocs, campaigns, actors }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [filter, setFilter] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [positions, setPositions] = useState({});

  useEffect(() => {
    const nodes = [];
    const links = [];
    const newPositions = {};

    // Add assets
    (assets || []).slice(0, 50).forEach((asset, i) => {
      const id = `asset-${asset.id || i}`;
      nodes.push({
        id, label: asset.name || asset.hostname || `Asset ${i + 1}`,
        type: "asset", size: NODE_SIZES.asset, color: NODE_COLORS.asset, data: asset,
      });
      const angle = (i / 50) * Math.PI * 2;
      const radius = 200 + Math.random() * 100;
      newPositions[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });

    // Add vulnerabilities
    (vulnerabilities || []).slice(0, 100).forEach((vuln, i) => {
      const id = `vuln-${vuln.id || i}`;
      const severityColor = vuln.severity === "critical" ? "#ff0000" : vuln.severity === "high" ? "#ff6b6b" : "#ffa500";
      nodes.push({
        id, label: vuln.cve_id || vuln.title || `VULN-${i + 1}`,
        type: "vulnerability", size: NODE_SIZES.vulnerability, color: severityColor, data: vuln,
      });
      const assetNode = nodes.find(n => n.id.startsWith("asset-") && (n.data.id === vuln.asset_id || n.data.name === vuln.asset_name));
      if (assetNode) {
        links.push({ source: id, target: assetNode.id, type: "affected_by" });
        const basePos = positions[assetNode.id] || newPositions[assetNode.id] || { x: 0, y: 0 };
        newPositions[id] = { x: basePos.x + (Math.random() - 0.5) * 80, y: basePos.y + (Math.random() - 0.5) * 80 };
      } else {
        const angle = Math.random() * Math.PI * 2;
        newPositions[id] = { x: Math.cos(angle) * 150, y: Math.sin(angle) * 150 };
      }
    });

    // Add threats
    (threats || []).slice(0, 50).forEach((threat, i) => {
      const id = `threat-${threat.id || i}`;
      nodes.push({
        id, label: threat.title || threat.name || `Threat ${i + 1}`,
        type: "threat", size: NODE_SIZES.threat, color: NODE_COLORS.threat, data: threat,
      });
      const vulnNode = nodes.find(n => n.id.startsWith("vuln-") && (n.data.id === threat.vulnerability_id || n.data.cve_id === threat.cve_id));
      if (vulnNode) {
        links.push({ source: id, target: vulnNode.id, type: "exploits" });
        const basePos = positions[vulnNode.id] || newPositions[vulnNode.id] || { x: 0, y: 0 };
        newPositions[id] = { x: basePos.x + (Math.random() - 0.5) * 60, y: basePos.y + (Math.random() - 0.5) * 60 };
      }
    });

    // Add IOCs
    (iocs || []).slice(0, 50).forEach((ioc, i) => {
      const id = `ioc-${ioc.id || i}`;
      nodes.push({
        id, label: ioc.value || ioc.indicator || `IOC-${i + 1}`,
        type: "ioc", size: NODE_SIZES.ioc, color: NODE_COLORS.ioc, data: ioc,
      });
      const threatNode = nodes.find(n => n.id.startsWith("threat-"));
      if (threatNode) {
        links.push({ source: id, target: threatNode.id, type: "associated_with" });
        newPositions[id] = { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 300 };
      }
    });

    // Add campaigns
    (campaigns || []).slice(0, 20).forEach((campaign, i) => {
      const id = `campaign-${campaign.id || i}`;
      nodes.push({
        id, label: campaign.name || `Campaign ${i + 1}`,
        type: "campaign", size: NODE_SIZES.campaign, color: NODE_COLORS.campaign, data: campaign,
      });
      const threatNode = nodes.find(n => n.id.startsWith("threat-"));
      if (threatNode) {
        links.push({ source: id, target: threatNode.id, type: "part_of" });
        newPositions[id] = { x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 200 };
      }
    });

    // Add actors
    (actors || []).slice(0, 15).forEach((actor, i) => {
      const id = `actor-${actor.id || i}`;
      nodes.push({
        id, label: actor.name || actor.alias || `Actor ${i + 1}`,
        type: "actor", size: NODE_SIZES.actor, color: NODE_COLORS.actor, data: actor,
      });
      const campaignNode = nodes.find(n => n.id.startsWith("campaign-"));
      if (campaignNode) {
        links.push({ source: id, target: campaignNode.id, type: "attributed_to" });
        newPositions[id] = { x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 150 };
      }
    });

    setGraphData({ nodes, links });
    setPositions(newPositions);
  }, [assets, vulnerabilities, threats, iocs, campaigns, actors]);

  const filteredNodes = filter === "all" ? graphData.nodes : graphData.nodes.filter(n => n.type === filter);
  const filteredLinks = graphData.links.filter(
    link => filteredNodes.some(n => n.id === link.source) && filteredNodes.some(n => n.id === link.target)
  );

  const nodeStats = {
    asset: graphData.nodes.filter(n => n.type === "asset").length,
    vulnerability: graphData.nodes.filter(n => n.type === "vulnerability").length,
    threat: graphData.nodes.filter(n => n.type === "threat").length,
    ioc: graphData.nodes.filter(n => n.type === "ioc").length,
    campaign: graphData.nodes.filter(n => n.type === "campaign").length,
    actor: graphData.nodes.filter(n => n.type === "actor").length,
  };

  return (
    <Card className="p-5" style={{ minHeight: "500px" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Network className="w-4 h-4" style={{ color: "#00d4ff" }} />
          Asset-Vulnerability-Threat Knowledge Graph
        </h3>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="text-[10px] px-2 py-1 rounded-lg outline-none"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff" }}>
            <option value="all">All Nodes</option>
            <option value="asset">Assets</option>
            <option value="vulnerability">Vulnerabilities</option>
            <option value="threat">Threats</option>
            <option value="ioc">IOCs</option>
            <option value="campaign">Campaigns</option>
            <option value="actor">Actors</option>
          </select>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))} className="p-1.5 rounded-lg hover:bg-white/5"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)" }}>
            <ZoomIn className="w-3.5 h-3.5" style={{ color: "#00d4ff" }} />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 rounded-lg hover:bg-white/5"
            style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.3)" }}>
            <ZoomOut className="w-3.5 h-3.5" style={{ color: "#00d4ff" }} />
          </button>
        </div>
      </div>

      <div className="w-full rounded-xl relative" style={{ height: "420px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(0,212,255,0.2)", overflow: "hidden" }}>
        <svg width="100%" height="100%" viewBox="-400 -300 800 600" style={{ transform: `scale(${zoom})`, transition: "transform 0.3s ease" }}>
          {filteredLinks.map((link, i) => {
            const source = filteredNodes.find(n => n.id === link.source);
            const target = filteredNodes.find(n => n.id === link.target);
            if (!source || !target) return null;
            const srcPos = positions[source.id] || { x: 0, y: 0 };
            const tgtPos = positions[target.id] || { x: 0, y: 0 };
            const linkColor = link.type === "exploits" ? "#ff3b3b" : link.type === "affected_by" ? "#00d4ff" : "#a855f7";
            return (
              <line key={i} x1={srcPos.x} y1={srcPos.y} x2={tgtPos.x} y2={tgtPos.y}
                stroke={linkColor} strokeWidth="1.5" opacity="0.4" />
            );
          })}
          {filteredNodes.map((node) => {
            const pos = positions[node.id] || { x: (Math.random() - 0.5) * 600, y: (Math.random() - 0.5) * 400 };
            const isSelected = selectedNode?.id === node.id;
            return (
              <g key={node.id} onClick={() => setSelectedNode(node)} style={{ cursor: "pointer" }}>
                <circle cx={pos.x} cy={pos.y} r={node.size * (isSelected ? 1.5 : 1)}
                  fill={node.color} opacity="0.8"
                  style={{ filter: isSelected ? `drop-shadow(0 0 8px ${node.color})` : "none", transition: "all 0.3s ease" }} />
                {node.size >= 14 && (
                  <text x={pos.x} y={pos.y + node.size + 14} textAnchor="middle" fill="#e2e8f0"
                    fontSize="9" fontWeight="600">{node.label.length > 20 ? node.label.substring(0, 18) + "..." : node.label}</text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex gap-3 flex-wrap">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-[9px] capitalize" style={{ color: "#64748b" }}>{type}</span>
            </div>
          ))}
        </div>

        {/* Node count */}
        <div className="absolute top-3 right-3 text-[9px]" style={{ color: "#64748b" }}>
          {filteredNodes.length} nodes · {filteredLinks.length} relationships
        </div>

        {/* Selected node details */}
        {selectedNode && (
          <div className="absolute top-3 left-3 p-3 rounded-xl max-w-xs"
            style={{ background: "rgba(10,22,40,0.95)", border: `1px solid ${selectedNode.color}40`, backdropFilter: "blur(8px)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase" style={{ color: selectedNode.color }}>{selectedNode.type}</span>
              <button onClick={() => setSelectedNode(null)} className="text-[10px]" style={{ color: "#64748b" }}>
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs font-bold text-white mb-1">{selectedNode.label}</p>
            {selectedNode.data?.severity && (
              <span className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ background: `${selectedNode.color}20`, color: selectedNode.color }}>{selectedNode.data.severity}</span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-3 mt-4">
        {Object.entries(nodeStats).map(([type, count]) => (
          <div key={type} className="text-center p-2 rounded-lg"
            style={{ background: `${NODE_COLORS[type]}08`, border: `1px solid ${NODE_COLORS[type]}30` }}>
            <p className="text-lg font-black" style={{ color: NODE_COLORS[type] }}>{count}</p>
            <p className="text-[9px] font-bold uppercase" style={{ color: "#64748b" }}>{type}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}