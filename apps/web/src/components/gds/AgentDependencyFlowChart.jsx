import React, { useMemo, useState, useRef, useCallback } from "react";
import { GitBranch, AlertTriangle, ZoomIn, ZoomOut, Maximize2, Info } from "lucide-react";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const AGENT_CLASS_COLORS = {
  SOC: DANGER, ThreatHunter: HIGH, IncidentResponse: DANGER,
  CloudSecurity: "#60a5fa", IdentitySecurity: "#a855f7",
  Compliance: LOW, ExecutiveIntelligence: "#fbbf24",
  DevSecOps: CYAN, RiskIntelligence: "#14b8a6",
};

const NODE_W = 160;
const NODE_H = 72;
const H_GAP = 80;
const V_GAP = 40;

// ── Build graph nodes + edges from agents + active collabs ─────────────────
function buildGraph(agents, activeCollabs) {
  const agentMap = {};
  agents.forEach(a => { agentMap[a.super_agent_id] = a; });

  const edges = []; // { from, to, label, bottleneck }
  const collabParticipants = {}; // agentId -> count of collab memberships

  activeCollabs.forEach(collab => {
    const participantIds = Array.isArray(collab.participant_agent_ids)
      ? collab.participant_agent_ids : [];
    const allIds = [collab.initiator_agent_id, ...participantIds].filter(Boolean);

    allIds.forEach(pid => {
      collabParticipants[pid] = (collabParticipants[pid] || 0) + 1;
    });

    participantIds.forEach(pid => {
      if (collab.initiator_agent_id && pid) {
        edges.push({
          from: collab.initiator_agent_id,
          to: pid,
          label: "delegates",
          collabId: collab.collaboration_id,
        });
      }
    });
  });

  // Mark bottlenecks: agents in 2+ collabs or receiving 2+ delegations
  const inDegree = {};
  edges.forEach(e => { inDegree[e.to] = (inDegree[e.to] || 0) + 1; });

  const nodes = agents.map(a => ({
    ...a,
    bottleneck: (inDegree[a.super_agent_id] || 0) >= 2 || (collabParticipants[a.super_agent_id] || 0) >= 3,
    inDegree: inDegree[a.super_agent_id] || 0,
  }));

  // Mark bottleneck on edges too
  edges.forEach(e => {
    e.bottleneck = (inDegree[e.to] || 0) >= 2;
  });

  return { nodes, edges };
}

// ── Layered layout: initiators on left, dependents on right ───────────────
function computeLayout(nodes, edges) {
  const initiatorIds = new Set(edges.map(e => e.from));
  const dependentIds = new Set(edges.map(e => e.to));
  const isolatedIds = new Set(nodes.map(n => n.super_agent_id).filter(
    id => !initiatorIds.has(id) && !dependentIds.has(id)
  ));

  const layers = [
    nodes.filter(n => initiatorIds.has(n.super_agent_id) && !dependentIds.has(n.super_agent_id)), // pure initiators
    nodes.filter(n => initiatorIds.has(n.super_agent_id) && dependentIds.has(n.super_agent_id)),  // both
    nodes.filter(n => !initiatorIds.has(n.super_agent_id) && dependentIds.has(n.super_agent_id)), // pure dependents
    nodes.filter(n => isolatedIds.has(n.super_agent_id)),                                          // isolated
  ].filter(l => l.length > 0);

  const positions = {};
  let xCursor = 24;
  layers.forEach((layer, li) => {
    const colH = layer.length * (NODE_H + V_GAP) - V_GAP;
    layer.forEach((node, ni) => {
      positions[node.super_agent_id] = {
        x: xCursor,
        y: 24 + ni * (NODE_H + V_GAP),
      };
    });
    xCursor += NODE_W + H_GAP;
  });

  const svgW = xCursor + 24;
  const svgH = Math.max(...Object.values(positions).map(p => p.y + NODE_H)) + 40;
  return { positions, svgW, svgH };
}

// ── Curved SVG arrow ──────────────────────────────────────────────────────
function Arrow({ from, to, bottleneck, label, positions }) {
  const f = positions[from];
  const t = positions[to];
  if (!f || !t) return null;

  const x1 = f.x + NODE_W;
  const y1 = f.y + NODE_H / 2;
  const x2 = t.x;
  const y2 = t.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  const color = bottleneck ? HIGH : `${CYAN}70`;
  const strokeW = bottleneck ? 2.5 : 1.5;

  return (
    <g>
      <defs>
        <marker id={`arrow-${from}-${to}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={color} />
        </marker>
      </defs>
      <path
        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={bottleneck ? "6 3" : "none"}
        markerEnd={`url(#arrow-${from}-${to})`}
        style={{ filter: bottleneck ? `drop-shadow(0 0 3px ${HIGH}88)` : "none" }}
      />
      {label && (
        <text x={mx} y={(y1 + y2) / 2 - 4} textAnchor="middle" fontSize={9} fill={MUTED}>{label}</text>
      )}
    </g>
  );
}

// ── Agent node ──────────────────────────────────────────────────────────
function AgentNode({ node, pos, selected, onSelect }) {
  const color = AGENT_CLASS_COLORS[node.agent_class] || MUTED;
  const borderColor = node.bottleneck ? HIGH : selected ? CYAN : `${color}50`;
  const glow = node.bottleneck ? `drop-shadow(0 0 6px ${HIGH}88)` : selected ? `drop-shadow(0 0 4px ${CYAN}66)` : "none";

  return (
    <g transform={`translate(${pos.x},${pos.y})`} style={{ cursor: "pointer" }} onClick={() => onSelect(node)}>
      <rect width={NODE_W} height={NODE_H} rx={10} ry={10}
        fill="#0a1628" stroke={borderColor} strokeWidth={selected ? 2 : 1}
        style={{ filter: glow }} />

      {/* Class color accent bar */}
      <rect width={4} height={NODE_H} rx={2} fill={color} />

      {/* Bottleneck badge */}
      {node.bottleneck && (
        <g transform={`translate(${NODE_W - 20},4)`}>
          <circle r={8} fill={`${HIGH}25`} stroke={HIGH} strokeWidth={1} />
          <text x={0} y={4} textAnchor="middle" fontSize={9} fill={HIGH} fontWeight="bold">!</text>
        </g>
      )}

      {/* Agent name */}
      <text x={14} y={22} fontSize={11} fill="white" fontWeight="bold"
        style={{ fontFamily: "Inter, sans-serif" }}>
        {(node.name || node.super_agent_id || "Agent").slice(0, 14)}
      </text>

      {/* Agent class */}
      <text x={14} y={38} fontSize={8.5} fill={color}
        style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
        {node.agent_class || "—"}
      </text>

      {/* Status dot */}
      <circle cx={14} cy={56} r={4}
        fill={node.status === "active" ? LOW : node.status === "suspended" ? HIGH : MUTED}
        style={{ filter: node.status === "active" ? `drop-shadow(0 0 3px ${LOW}88)` : "none" }}
      />
      <text x={23} y={60} fontSize={8} fill={MUTED} style={{ fontFamily: "Inter, sans-serif" }}>
        {node.status || "inactive"} · {node.inDegree} dep{node.inDegree !== 1 ? "s" : ""}
      </text>
    </g>
  );
}

export default function AgentDependencyFlowChart({ agents = [], activeCollabs = [], isLoading = false }) {
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);

  const { nodes, edges } = useMemo(() => buildGraph(agents, activeCollabs), [agents, activeCollabs]);
  const { positions, svgW, svgH } = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);

  const bottlenecks = nodes.filter(n => n.bottleneck);

  const handleSelect = useCallback((node) => {
    setSelected(prev => prev?.super_agent_id === node.super_agent_id ? null : node);
  }, []);

  const selectedEdges = selected
    ? edges.filter(e => e.from === selected.super_agent_id || e.to === selected.super_agent_id)
    : [];
  const connectedIds = new Set(selectedEdges.flatMap(e => [e.from, e.to]));

  if (isLoading) {
    return (
      <Card className="p-5 h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-cyan-400 border-white/10 rounded-full animate-spin" />
      </Card>
    );
  }

  if (nodes.length === 0) {
    return (
      <Card className="p-5 flex flex-col items-center justify-center py-16">
        <GitBranch className="w-8 h-8 mb-3" style={{ color: MUTED }} />
        <p className="text-sm font-bold text-white mb-1">No agents to map</p>
        <p className="text-xs" style={{ color: MUTED }}>Create super agents to visualize dependency flow</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4" style={{ color: CYAN }} />
          <span className="text-sm font-bold text-white">Agent Dependency Flow</span>
          {bottlenecks.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded"
              style={{ color: HIGH, background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>
              <AlertTriangle className="w-2.5 h-2.5" />
              {bottlenecks.length} bottleneck{bottlenecks.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: MUTED }}>{nodes.length} agents · {edges.length} links</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-all"
              style={{ color: MUTED }}>
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono w-8 text-center" style={{ color: CYAN }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.15))}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-all"
              style={{ color: MUTED }}>
              <ZoomIn className="w-3 h-3" />
            </button>
            <button onClick={() => setZoom(1)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-all"
              style={{ color: MUTED }}>
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* SVG canvas */}
        <div ref={containerRef} className="flex-1 overflow-auto"
          style={{ background: "#020c1a", minHeight: 320, maxHeight: 480 }}>
          <svg
            width={svgW * zoom}
            height={svgH * zoom}
            style={{ display: "block" }}
          >
            <g transform={`scale(${zoom})`}>
              {/* Grid lines */}
              <defs>
                <pattern id="dep-grid" width={40} height={40} patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth={0.5} />
                </pattern>
              </defs>
              <rect width={svgW} height={svgH} fill="url(#dep-grid)" />

              {/* Edges */}
              {edges.map((edge, i) => (
                <Arrow key={i} from={edge.from} to={edge.to}
                  bottleneck={edge.bottleneck || (selected && connectedIds.has(edge.from) && connectedIds.has(edge.to))}
                  label={edge.label}
                  positions={positions} />
              ))}

              {/* Nodes */}
              {nodes.map(node => {
                const pos = positions[node.super_agent_id];
                if (!pos) return null;
                const dim = selected && !connectedIds.has(node.super_agent_id) && node.super_agent_id !== selected?.super_agent_id;
                return (
                  <g key={node.super_agent_id} style={{ opacity: dim ? 0.3 : 1, transition: "opacity 0.2s" }}>
                    <AgentNode node={node} pos={pos} selected={selected?.super_agent_id === node.super_agent_id} onSelect={handleSelect} />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-56 flex-shrink-0 border-l p-4 space-y-3" style={{ borderColor: BORDER, background: "#050e1f" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: CYAN }}>Agent Detail</span>
              <button onClick={() => setSelected(null)} className="hover:text-white transition-colors" style={{ color: MUTED }}>×</button>
            </div>
            <div>
              <p className="text-sm font-black text-white">{selected.name}</p>
              <p className="text-[10px] mt-0.5" style={{ color: AGENT_CLASS_COLORS[selected.agent_class] || MUTED }}>{selected.agent_class}</p>
            </div>
            {selected.bottleneck && (
              <div className="flex items-start gap-2 p-2 rounded-lg" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}25` }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: HIGH }} />
                <p className="text-[10px]" style={{ color: HIGH }}>Bottleneck — receives {selected.inDegree} delegations. Consider distributing load.</p>
              </div>
            )}
            <div className="space-y-1.5">
              {[
                { label: "Status", value: selected.status || "inactive" },
                { label: "Priority", value: selected.priority || "—" },
                { label: "Inbound deps", value: selected.inDegree },
                { label: "Health", value: `${selected.health_score ?? "—"}%` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: MUTED }}>{label}</span>
                  <span className="text-[10px] font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
            {selectedEdges.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1.5" style={{ color: MUTED }}>Connected via</p>
                <div className="space-y-1">
                  {selectedEdges.map((e, i) => (
                    <div key={i} className="text-[9px] px-2 py-1 rounded" style={{ background: "rgba(0,212,255,0.05)", color: CYAN }}>
                      {e.from === selected.super_agent_id ? `→ ${e.to?.slice(0, 16)}` : `← ${e.from?.slice(0, 16)}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-5 py-2.5 border-t flex-wrap" style={{ borderColor: BORDER }}>
        {[
          { color: CYAN, label: "Normal dependency" },
          { color: HIGH, label: "Bottleneck link", dashed: true },
          { color: LOW, label: "Active agent" },
          { color: MUTED, label: "Inactive agent" },
        ].map(({ color, label, dashed }) => (
          <div key={label} className="flex items-center gap-1.5">
            <svg width={20} height={8}>
              <line x1={0} y1={4} x2={20} y2={4} stroke={color} strokeWidth={1.5}
                strokeDasharray={dashed ? "4 2" : "none"} />
            </svg>
            <span className="text-[9px]" style={{ color: MUTED }}>{label}</span>
          </div>
        ))}
        <span className="text-[9px] ml-auto" style={{ color: MUTED }}>Click a node to inspect connections</span>
      </div>
    </Card>
  );
}