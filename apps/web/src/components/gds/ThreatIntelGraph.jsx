import React, { useState, useRef } from "react";
import { Shield, Crosshair, Cloud, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const NODE_TYPES = {
  threat_actor: { color: DANGER, size: 24, icon: Crosshair },
  vulnerability: { color: HIGH, size: 20, icon: AlertTriangle },
  cloud_asset: { color: CYAN, size: 20, icon: Cloud }
};

export default function ThreatIntelGraph({ actors = [], vulnerabilities = [], assets = [], relationships = [] }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const allNodes = [
    ...actors.map(a => ({ id: `actor-${a.id}`, type: 'threat_actor', data: a, label: a.threat_actor_name || a.name })),
    ...vulnerabilities.map(v => ({ id: `vuln-${v.id}`, type: 'vulnerability', data: v, label: v.cve_id || v.vulnerability_id })),
    ...assets.map(a => ({ id: `asset-${a.id}`, type: 'cloud_asset', data: a, label: a.asset_name || a.name }))
  ];

  const edges = relationships || [];

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px]">
          <span style={{ color: MUTED }}>Legend:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: DANGER }} />
            <span style={{ color: TEXT }}>Threat Actor</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: HIGH }} />
            <span style={{ color: TEXT }}>Vulnerability</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: CYAN }} />
            <span style={{ color: TEXT }}>Cloud Asset</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="px-2 py-1 rounded text-xs font-bold" style={{ background: "rgba(255,255,255,0.05)", color: TEXT }}>−</button>
          <span className="text-xs font-mono" style={{ color: MUTED }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="px-2 py-1 rounded text-xs font-bold" style={{ background: "rgba(255,255,255,0.05)", color: TEXT }}>+</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-3 py-1 rounded text-xs font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>Reset</button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden" style={{ background: "#050e1f", border: `1px solid ${BORDER}` }}>
        <svg
          ref={svgRef}
          width="100%"
          height="600"
          viewBox="0 0 1200 600"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {edges.map((edge, i) => {
              const source = allNodes.find(n => n.id === edge.source_id);
              const target = allNodes.find(n => n.id === edge.target_id);
              if (!source || !target) return null;
              const sx = (source.data.x || 600) * 2;
              const sy = (source.data.y || 300) * 2;
              const tx = (target.data.x || 600) * 2;
              const ty = (target.data.y || 300) * 2;
              return (
                <line
                  key={i}
                  x1={sx}
                  y1={sy}
                  x2={tx}
                  y2={ty}
                  stroke={edge.relationship_type === 'exploits' ? DANGER : edge.relationship_type === 'targets' ? HIGH : CYAN}
                  strokeWidth={2}
                  opacity={0.4}
                  strokeDasharray={edge.relationship_type === 'targets' ? "5,5" : "none"}
                />
              );
            })}

            {allNodes.map((node) => {
              const config = NODE_TYPES[node.type];
              const Icon = config.icon;
              const isSelected = selectedNode?.id === node.id;
              const x = (node.data.x || 600) * 2;
              const y = (node.data.y || 300) * 2;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x}, ${y})`}
                  onClick={() => setSelectedNode(node)}
                  style={{ cursor: 'pointer' }}
                >
                  {isSelected && (
                    <circle r={config.size * 0.8} fill="none" stroke={config.color} strokeWidth="3" opacity="0.5">
                      <animate attributeName="r" from={config.size * 0.6} to={config.size * 1} dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    r={config.size * 0.5}
                    fill={`${config.color}20`}
                    stroke={config.color}
                    strokeWidth={isSelected ? 3 : 2}
                  />
                  <foreignObject x={-12} y={-12} width={24} height={24}>
                    <div style={{ color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </foreignObject>
                  <text
                    y={config.size * 0.7 + 5}
                    textAnchor="middle"
                    fill={TEXT}
                    fontSize="11"
                    fontWeight="600"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                  >
                    {node.label?.slice(0, 20)}{node.label?.length > 20 ? '...' : ''}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </Card>

      {selectedNode && (
        <Card className="p-4" style={{ background: CARD, border: `1px solid ${NODE_TYPES[selectedNode.type]?.color || BORDER}` }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {React.createElement(NODE_TYPES[selectedNode.type]?.icon || Shield, { className: "w-6 h-6", style: { color: NODE_TYPES[selectedNode.type]?.color } })}
              <div>
                <h4 className="text-sm font-bold text-white">{selectedNode.label}</h4>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: NODE_TYPES[selectedNode.type]?.color }}>{selectedNode.type.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white"><span className="text-xl">×</span></button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {selectedNode.type === 'threat_actor' && (
              <>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Sophistication</p><p className="text-sm" style={{ color: TEXT }}>{selectedNode.data.sophistication_level || 'Advanced'}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Origin</p><p className="text-sm" style={{ color: TEXT }}>{selectedNode.data.origin_country || 'Unknown'}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Motivation</p><p className="text-sm" style={{ color: TEXT }}>{selectedNode.data.motivation || 'Financial'}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Active Since</p><p className="text-sm" style={{ color: TEXT }}>{selectedNode.data.first_seen ? new Date(selectedNode.data.first_seen).getFullYear() : 'Unknown'}</p></div>
              </>
            )}
            {selectedNode.type === 'vulnerability' && (
              <>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>CVSS Score</p><p className={`text-sm font-bold ${selectedNode.data.cvss_score >= 9 ? 'text-red-400' : selectedNode.data.cvss_score >= 7 ? 'text-orange-400' : 'text-yellow-400'}`}>{selectedNode.data.cvss_score || 'N/A'}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Exploited</p><p className="text-sm" style={{ color: selectedNode.data.is_exploited ? DANGER : LOW }}>{selectedNode.data.is_exploited ? 'Yes - Active' : 'No'}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Patch Available</p><p className="text-sm" style={{ color: selectedNode.data.has_patch ? LOW : DANGER }}>{selectedNode.data.has_patch ? 'Yes' : 'No'}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Affected Assets</p><p className="text-sm" style={{ color: TEXT }}>{selectedNode.data.affected_assets_count || 0}</p></div>
              </>
            )}
            {selectedNode.type === 'cloud_asset' && (
              <>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Provider</p><p className="text-sm" style={{ color: TEXT }}>{selectedNode.data.cloud_provider || 'AWS'}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Criticality</p><p className={`text-sm font-bold ${selectedNode.data.business_criticality === 'critical' ? 'text-red-400' : selectedNode.data.business_criticality === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>{selectedNode.data.business_criticality || 'Medium'}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Risk Score</p><p className="text-sm font-bold" style={{ color: selectedNode.data.risk_score >= 80 ? DANGER : selectedNode.data.risk_score >= 50 ? HIGH : MEDIUM }}>{selectedNode.data.risk_score || 0}</p></div>
                <div><p className="font-bold mb-1" style={{ color: MUTED }}>Vulnerabilities</p><p className="text-sm" style={{ color: TEXT }}>{selectedNode.data.vulnerability_count || 0}</p></div>
              </>
            )}
          </div>

          <div className="mt-4 pt-4 border-t" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Connections</p>
            <div className="flex flex-wrap gap-2">
              {edges.filter(e => e.source_id === selectedNode.id || e.target_id === selectedNode.id).map((edge, i) => {
                const connectedNode = allNodes.find(n => n.id === (edge.source_id === selectedNode.id ? edge.target_id : edge.source_id));
                if (!connectedNode) return null;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedNode(connectedNode)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: `${NODE_TYPES[connectedNode.type]?.color}15`, border: `1px solid ${NODE_TYPES[connectedNode.type]?.color}30`, color: NODE_TYPES[connectedNode.type]?.color }}
                  >
                    {edge.relationship_type === 'exploits' ? selectedNode.type === 'threat_actor' ? 'Exploits' : 'Exploited By' : edge.relationship_type === 'targets' ? 'Targets' : 'Connected'} → {connectedNode.label}
                  </button>
                );
              })}
              {edges.filter(e => e.source_id === selectedNode.id || e.target_id === selectedNode.id).length === 0 && (
                <span className="text-[10px]" style={{ color: MUTED }}>No connections</span>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}