import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  Shield, AlertTriangle, Target, Network, Lock, Cloud, Database, 
  Globe, Server, Eye, ChevronRight, Zap, Activity, TrendingUp
} from "lucide-react";
import { 
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, 
  Card, Breadcrumb, SevBadge 
} from "@/components/gds/GDSOSShared";

// Attack path visualization node types
const NODE_TYPES = {
  internet: { icon: Globe, color: CYAN, label: "Internet" },
  endpoint: { icon: Server, color: HIGH, label: "Endpoint" },
  service: { icon: Cloud, color: MEDIUM, label: "Service" },
  database: { icon: Database, color: DANGER, label: "Database" },
  credential: { icon: Lock, color: HIGH, label: "Credential" },
};

// Sample attack scenarios
const ATTACK_SCENARIOS = [
  {
    id: "scenario-1",
    name: "SQL Injection to Data Exfiltration",
    description: "Attacker exploits SQL injection in web app to access customer database",
    severity: "critical",
    likelihood: "high",
    business_impact: "critical",
    mitre_techniques: ["T1190", "T1005", "T1041"],
  },
  {
    id: "scenario-2",
    name: "Credential Stuffing Attack",
    description: "Automated login attempts using leaked credentials",
    severity: "high",
    likelihood: "medium",
    business_impact: "high",
    mitre_techniques: ["T1110", "T1078"],
  },
  {
    id: "scenario-3",
    name: "API Key Exposure",
    description: "Hardcoded API keys in public repository lead to cloud compromise",
    severity: "critical",
    likelihood: "medium",
    business_impact: "critical",
    mitre_techniques: ["T1552", "T1078"],
  },
];

export default function GDSThreatModelPage() {
  const [selectedScenario, setSelectedScenario] = useState(ATTACK_SCENARIOS[0]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [viewMode, setViewMode] = useState("graph"); // graph | list

  const { data: assets = [] } = useQuery({
    queryKey: ["cloud-assets-threat-model"],
    queryFn: () => base44.entities.ASMCloudAsset.list("-risk_score", 200).catch(() => []),
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["threat-findings"],
    queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []),
  });

  const { data: attackPaths = [] } = useQuery({
    queryKey: ["attack-paths-data"],
    queryFn: () => base44.entities.AttackSimulation.list("-completed_at", 100).catch(() => []),
  });

  // Build attack path nodes from assets
  const attackPathNodes = useMemo(() => {
    const nodes = [];
    
    // Internet entry point
    nodes.push({
      id: "internet",
      type: "internet",
      label: "Internet",
      x: 50,
      y: 50,
      risk_score: 0,
    });

    // Add internet-facing assets
    const internetFacing = assets.filter(a => a.internet_facing);
    internetFacing.slice(0, 5).forEach((asset, idx) => {
      nodes.push({
        id: asset.id || `endpoint-${idx}`,
        type: "endpoint",
        label: asset.asset_name || asset.hostname || `Endpoint ${idx + 1}`,
        x: 200 + (idx * 150),
        y: 150,
        risk_score: asset.risk_score || 50,
        asset,
      });
    });

    // Add internal services
    const internalServices = assets.filter(a => !a.internet_facing && a.service_type);
    internalServices.slice(0, 3).forEach((asset, idx) => {
      nodes.push({
        id: asset.id || `service-${idx}`,
        type: "service",
        label: asset.asset_name || asset.service_type || `Service ${idx + 1}`,
        x: 300 + (idx * 200),
        y: 300,
        risk_score: asset.risk_score || 40,
        asset,
      });
    });

    // Add databases
    const databases = assets.filter(a => a.asset_type === "database" || a.service_type === "database");
    databases.slice(0, 2).forEach((asset, idx) => {
      nodes.push({
        id: asset.id || `database-${idx}`,
        type: "database",
        label: asset.asset_name || `Database ${idx + 1}`,
        x: 400 + (idx * 250),
        y: 450,
        risk_score: asset.risk_score || 80,
        asset,
      });
    });

    return nodes;
  }, [assets]);

  // Calculate connections between nodes
  const connections = useMemo(() => {
    const conns = [];
    const internetNode = attackPathNodes.find(n => n.type === "internet");
    const endpoints = attackPathNodes.filter(n => n.type === "endpoint");
    const services = attackPathNodes.filter(n => n.type === "service");
    const databases = attackPathNodes.filter(n => n.type === "database");

    // Internet to endpoints
    endpoints.forEach(ep => {
      conns.push({
        from: internetNode?.id,
        to: ep.id,
        type: "network",
        risk: ep.risk_score,
      });
    });

    // Endpoints to services
    services.forEach((svc, idx) => {
      const sourceEp = endpoints[idx % endpoints.length];
      if (sourceEp) {
        conns.push({
          from: sourceEp.id,
          to: svc.id,
          type: "api_call",
          risk: svc.risk_score,
        });
      }
    });

    // Services to databases
    databases.forEach((db, idx) => {
      const sourceSvc = services[idx % services.length] || endpoints[0];
      if (sourceSvc) {
        conns.push({
          from: sourceSvc.id,
          to: db.id,
          type: "data_access",
          risk: db.risk_score,
        });
      }
    });

    return conns;
  }, [attackPathNodes]);

  const stats = {
    totalAssets: assets.length,
    internetFacing: assets.filter(a => a.internet_facing).length,
    criticalPaths: attackPaths.filter(p => p.blast_radius_score >= 70).length,
    highRiskNodes: attackPathNodes.filter(n => n.risk_score >= 60).length,
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[
        { label: "Threat", path: "/threat-intel" },
        { label: "Threat Modeling" }
      ]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
            <Network className="w-6 h-6" style={{ color: DANGER }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Threat Modeling</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Interactive attack path visualization for cloud assets</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {[
              { value: "graph", label: "Graph View" },
              { value: "list", label: "List View" },
            ].map(mode => (
              <button
                key={mode.value}
                onClick={() => setViewMode(mode.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: viewMode === mode.value ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${viewMode === mode.value ? CYAN + "40" : BORDER}`,
                  color: viewMode === mode.value ? CYAN : MUTED
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Assets</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.totalAssets}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Internet-Facing</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.internetFacing}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Paths</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.criticalPaths}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${MEDIUM}08`, border: `1px solid ${MEDIUM}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Risk Nodes</p>
          <p className="text-2xl font-black font-mono" style={{ color: MEDIUM }}>{stats.highRiskNodes}</p>
        </Card>
      </div>

      {/* Attack Scenarios */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: DANGER }} />
            Attack Scenarios
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ATTACK_SCENARIOS.map(scenario => (
            <Card
              key={scenario.id}
              glow={selectedScenario?.id === scenario.id}
              className="p-4 cursor-pointer transition-all hover:scale-[1.01]"
              onClick={() => setSelectedScenario(scenario)}
              style={{
                border: `1px solid ${scenario.severity === 'critical' ? DANGER : scenario.severity === 'high' ? HIGH : MEDIUM}30`
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-white">{scenario.name}</p>
                  <p className="text-[9px] mt-1" style={{ color: MUTED }}>{scenario.description}</p>
                </div>
                <SevBadge sev={scenario.severity} />
              </div>
              <div className="flex items-center gap-3 text-[9px] mt-3">
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" style={{ color: HIGH }} />
                  <span style={{ color: MUTED }}>Likelihood:</span>
                  <span className="font-bold" style={{ color: HIGH }}>{scenario.likelihood}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" style={{ color: DANGER }} />
                  <span style={{ color: MUTED }}>Impact:</span>
                  <span className="font-bold" style={{ color: DANGER }}>{scenario.business_impact}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Attack Path Visualization */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: CYAN }} />
            Attack Path Visualization
          </h3>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: MUTED }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: CYAN }} /> Internet
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: HIGH }} /> Endpoint
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: MEDIUM }} /> Service
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: DANGER }} /> Database
            </span>
          </div>
        </div>

        {viewMode === "graph" ? (
          <div className="relative h-[500px] overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
              {connections.map((conn, idx) => {
                const fromNode = attackPathNodes.find(n => n.id === conn.from);
                const toNode = attackPathNodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;

                const lineColor = conn.risk >= 70 ? DANGER : conn.risk >= 40 ? HIGH : MEDIUM;
                
                return (
                  <g key={idx}>
                    <line
                      x1={`${fromNode.x}px`}
                      y1={`${fromNode.y}px`}
                      x2={`${toNode.x}px`}
                      y2={`${toNode.y}px`}
                      stroke={lineColor}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.6"
                    />
                    <circle cx={`${(fromNode.x + toNode.x) / 2}px`} cy={`${(fromNode.y + toNode.y) / 2}px`} r="3" fill={lineColor} />
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            {attackPathNodes.map(node => {
              const NodeType = NODE_TYPES[node.type]?.icon || Server;
              const nodeColor = NODE_TYPES[node.type]?.color || MUTED;
              
              return (
                <div
                  key={node.id}
                  className={`absolute p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-110 ${selectedAsset?.id === node.id ? 'ring-2 ring-cyan-400' : ''}`}
                  style={{
                    left: node.x - 60,
                    top: node.y - 30,
                    background: "rgba(5,14,31,0.95)",
                    borderColor: nodeColor,
                    boxShadow: `0 0 20px ${nodeColor}40`,
                  }}
                  onClick={() => setSelectedAsset(node.asset || node)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <NodeType className="w-4 h-4" style={{ color: nodeColor }} />
                    <span className="text-xs font-bold text-white">{node.label}</span>
                  </div>
                  {node.risk_score > 0 && (
                    <div className="text-[9px]" style={{ color: MUTED }}>
                      Risk: <span className="font-mono" style={{ color: node.risk_score >= 70 ? DANGER : node.risk_score >= 40 ? HIGH : MEDIUM }}>
                        {node.risk_score}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {attackPathNodes.filter(n => n.type !== "internet").map((node, idx) => {
              const NodeType = NODE_TYPES[node.type]?.icon || Server;
              const nodeColor = NODE_TYPES[node.type]?.color || MUTED;
              
              return (
                <div
                  key={node.id}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ 
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid ${nodeColor}30`,
                  }}
                  onClick={() => setSelectedAsset(node.asset || node)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${nodeColor}15`, border: `1px solid ${nodeColor}40` }}>
                      <NodeType className="w-5 h-5" style={{ color: nodeColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{node.label}</span>
                        <SevBadge sev={node.risk_score >= 70 ? "critical" : node.risk_score >= 40 ? "high" : "medium"} />
                      </div>
                      <p className="text-[9px]" style={{ color: MUTED }}>{NODE_TYPES[node.type]?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[9px]" style={{ color: MUTED }}>Risk Score</p>
                      <p className="text-sm font-black font-mono" style={{ color: node.risk_score >= 70 ? DANGER : node.risk_score >= 40 ? HIGH : MEDIUM }}>
                        {node.risk_score || "N/A"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5" style={{ color: MUTED }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Selected Asset Details */}
      {selectedAsset && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4" style={{ color: CYAN }} />
              Asset Details
            </h3>
            <button
              onClick={() => setSelectedAsset(null)}
              className="text-slate-600 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Asset Name</p>
              <p className="text-sm font-bold text-white">{selectedAsset.asset_name || selectedAsset.hostname || "Unknown"}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Asset Type</p>
              <p className="text-sm font-bold text-white">{selectedAsset.asset_type || selectedAsset.service_type || "Unknown"}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Risk Score</p>
              <p className="text-sm font-black font-mono" style={{ color: selectedAsset.risk_score >= 70 ? DANGER : selectedAsset.risk_score >= 40 ? HIGH : MEDIUM }}>
                {selectedAsset.risk_score || "N/A"}
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Internet Facing</p>
              <p className="text-sm font-bold" style={{ color: selectedAsset.internet_facing ? HIGH : LOW }}>
                {selectedAsset.internet_facing ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {findings.length > 0 && (
            <div className="mt-4">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Related Open Findings</p>
              <div className="flex flex-wrap gap-2">
                {findings.slice(0, 5).map(finding => (
                  <span key={finding.id} className="text-[9px] px-2 py-1 rounded"
                    style={{ background: `${DANGER}15`, color: DANGER, border: `1px solid ${DANGER}30` }}>
                    {finding.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* MITRE ATT&CK Mapping */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: CYAN }} />
          MITRE ATT&CK Techniques
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {selectedScenario.mitre_techniques.map((technique, idx) => (
            <div key={idx} className="p-3 rounded-lg text-center" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
              <p className="text-xs font-bold text-white">{technique}</p>
              <p className="text-[9px]" style={{ color: MUTED }}>Technique</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}