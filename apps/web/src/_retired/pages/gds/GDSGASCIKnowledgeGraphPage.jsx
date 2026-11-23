import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, AlertTriangle, Shield, Database, Crosshair, Link as LinkIcon, ZoomIn, ZoomOut, Maximize, X } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, SevBadge, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";

const NODE_TYPES = {
  asset: { color: CYAN, icon: Database, label: "Asset" },
  vulnerability: { color: DANGER, icon: AlertTriangle, label: "Vulnerability" },
  threat_actor: { color: HIGH, icon: Crosshair, label: "Threat Actor" },
};

function NodeDetailPanel({ node, onClose }) {
  if (!node) return null;
  const config = NODE_TYPES[node.type];
  const Icon = config?.icon || Database;
  
  return (
    <Card className="w-80 p-4" style={{ background: "#0a1628", border: `1px solid ${config?.color || CYAN}40` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${config?.color || CYAN}15` }}>
            <Icon className="w-4 h-4" style={{ color: config?.color || CYAN }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: config?.color || CYAN }}>
              {config?.label || "Node"}
            </p>
            <h3 className="text-sm font-bold text-white">{node.label}</h3>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        {node.risk_score != null && (
          <div>
            <p className="text-[10px] font-semibold mb-1" style={{ color: MUTED }}>Risk Score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${node.risk_score}%`,
                    background: node.risk_score >= 70 ? DANGER : node.risk_score >= 40 ? HIGH : LOW
                  }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: TEXT }}>{node.risk_score}</span>
            </div>
          </div>
        )}
        {node.severity && <SevBadge sev={node.severity} />}
        {node.cvss_score && <p className="text-[10px]" style={{ color: MUTED }}>CVSS: <span style={{ color: TEXT }}>{node.cvss_score}</span></p>}
        {node.origin_country && <p className="text-[10px]" style={{ color: MUTED }}>Origin: <span style={{ color: TEXT }}>{node.origin_country}</span></p>}
        {node.description && <p className="text-[10px]" style={{ color: MUTED }}>{node.description}</p>}
      </div>
    </Card>
  );
}

export default function GDSKnowledgeGraphPage() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState("all");

  const { data: assets = [], isLoading: loadAssets } = useQuery({
    queryKey: ["gasci-graph-assets"],
    queryFn: () => base44.entities.ASMCloudAsset.filter({ risk_score: { $gte: 30 } }, "", 100).catch(() => []),
  });
  
  const { data: vulnerabilities = [], isLoading: loadVulns } = useQuery({
    queryKey: ["gasci-graph-vulns"],
    queryFn: () => base44.entities.CVERecord.filter({ cvss_score: { $gte: 7 } }, "", 100).catch(() => []),
  });
  
  const { data: actors = [], isLoading: loadActors } = useQuery({
    queryKey: ["gasci-graph-actors"],
    queryFn: () => base44.entities.ThreatActor.list().catch(() => []),
  });

  const graphData = useMemo(() => {
    const nodes = [];
    const positions = {};
    const centerX = 500, centerY = 350, radius = 280;
    let idx = 0;

    if (filter === "all" || filter === "assets") {
      assets.forEach((asset, i) => {
        const angle = (2 * Math.PI * idx) / (assets.length || 1);
        const node = {
          id: `asset-${asset.id}`,
          type: "asset",
          label: asset.asset || asset.name || "Unknown Asset",
          risk_score: asset.risk_score,
          asset_type: asset.asset_type,
        };
        nodes.push(node);
        positions[node.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
        idx++;
      });
    }

    if (filter === "all" || filter === "vulnerabilities") {
      vulnerabilities.forEach((vuln, i) => {
        const angle = (2 * Math.PI * idx) / (vulnerabilities.length || 1);
        const node = {
          id: `vuln-${vuln.id}`,
          type: "vulnerability",
          label: vuln.cve_id || vuln.title || "Unknown CVE",
          severity: vuln.severity,
          cvss_score: vuln.cvss_score,
          description: vuln.description,
        };
        nodes.push(node);
        positions[node.id] = {
          x: centerX + (radius * 0.5) * Math.cos(angle),
          y: centerY + (radius * 0.5) * Math.sin(angle),
        };
        idx++;
      });
    }

    if (filter === "all" || filter === "actors") {
      actors.forEach((actor, i) => {
        const angle = (2 * Math.PI * idx) / (actors.length || 1);
        const node = {
          id: `actor-${actor.id}`,
          type: "threat_actor",
          label: actor.actor_name || actor.name || "Unknown Actor",
          origin_country: actor.origin_country,
          threat_level: actor.threat_level,
        };
        nodes.push(node);
        positions[node.id] = {
          x: centerX + (radius * 0.3) * Math.cos(angle),
          y: centerY + (radius * 0.3) * Math.sin(angle),
        };
        idx++;
      });
    }

    return { nodes, positions };
  }, [assets, vulnerabilities, actors, filter]);

  const stats = {
    total: graphData.nodes.length,
    assets: filter === "all" ? assets.length : graphData.nodes.filter(n => n.type === "asset").length,
    vulnerabilities: filter === "all" ? vulnerabilities.length : graphData.nodes.filter(n => n.type === "vulnerability").length,
    actors: filter === "all" ? actors.length : graphData.nodes.filter(n => n.type === "threat_actor").length,
  };

  const isLoading = loadAssets || loadVulns || loadActors;

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "GASCI AI BRAIN", path: "/gasci" }, { label: "Knowledge Graph" }]} />
      
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Knowledge Graph</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            Interactive mapping of assets, vulnerabilities, and threat actors
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {[
            { key: "all", label: "All" },
            { key: "assets", label: "Assets" },
            { key: "vulnerabilities", label: "Vulns" },
            { key: "actors", label: "Actors" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setSelectedNode(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f.key ? "" : "hover:opacity-70"
              }`}
              style={{
                background: filter === f.key ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${filter === f.key ? CYAN + "40" : BORDER}`,
                color: filter === f.key ? CYAN : MUTED
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Nodes</p>
          <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Assets</p>
          <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{stats.assets}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Vulnerabilities</p>
          <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{stats.vulnerabilities}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Threat Actors</p>
          <p className="text-xl font-black font-mono" style={{ color: HIGH }}>{stats.actors}</p>
        </Card>
      </div>
      
      <Card className="p-5" style={{ minHeight: "600px" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Interactive Graph</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
              className="p-2"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: CYAN }}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono" style={{ color: MUTED }}>{Math.round(zoom * 100)}%</span>
            <Button
              onClick={() => setZoom(z => Math.min(2, z + 0.2))}
              className="p-2"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: CYAN }}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => { setZoom(1); setSelectedNode(null); }}
              className="p-2"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: CYAN }}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <Skeleton lines={8} />
        ) : graphData.nodes.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No graph data"
            description="Connect data sources to visualize relationships"
          />
        ) : (
          <div className="relative w-full overflow-hidden" style={{ height: "600px", background: "#020817", borderRadius: "12px" }}>
            <svg width="100%" height="100%" viewBox="0 0 1000 700">
              <g style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
                {graphData.nodes.map(node => {
                  const pos = graphData.positions[node.id];
                  if (!pos) return null;
                  const config = NODE_TYPES[node.type];
                  const isSelected = selectedNode?.id === node.id;
                  const Icon = config?.icon;
                  
                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="cursor-pointer"
                      style={{ transition: "all 0.2s" }}
                    >
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isSelected ? 18 : 14}
                        fill={config?.color || CYAN}
                        opacity={0.2}
                        style={{ transition: "all 0.2s" }}
                      />
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={isSelected ? 12 : 8}
                        fill={config?.color || CYAN}
                        style={{ filter: `drop-shadow(0 0 8px ${config?.color || CYAN}88)` }}
                      />
                      {Icon && (
                        <foreignObject x={pos.x - 6} y={pos.y - 6} width="12" height="12">
                          <Icon className="w-3 h-3" style={{ color: "#020817" }} />
                        </foreignObject>
                      )}
                      <text
                        x={pos.x}
                        y={pos.y + 28}
                        textAnchor="middle"
                        className="text-[10px] font-semibold"
                        fill={TEXT}
                        style={{ pointerEvents: "none" }}
                      >
                        {node.label.length > 20 ? node.label.slice(0, 20) + "…" : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
            
            <div className="absolute bottom-4 left-4 flex items-center gap-4 px-3 py-2 rounded-lg"
              style={{ background: "rgba(2,8,23,0.9)", border: `1px solid ${BORDER}` }}>
              {Object.entries(NODE_TYPES).map(([type, config]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: config.color }} />
                  <span className="text-[10px] font-semibold" style={{ color: TEXT }}>{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      {selectedNode && (
        <div className="fixed bottom-6 right-6 z-50">
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
      )}
    </div>
  );
}