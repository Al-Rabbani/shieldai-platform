import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, ZoomIn, ZoomOut, RotateCcw, Maximize2, Activity, AlertTriangle, ChevronRight } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Card, Breadcrumb, Skeleton, PAGE_BG
} from "@/components/gds/GDSOSShared";

const LEGEND_DEFAULT = [
  { label: "Repository",    color: CYAN,      type: "repository" },
  { label: "Container",     color: "#8b5cf6", type: "container" },
  { label: "Cloud",         color: "#0ea5e9", type: "cloud_account" },
  { label: "Internet",      color: DANGER,    type: "internet_facing" },
  { label: "VM",            color: "#10b981", type: "vm" },
  { label: "IAM Role",      color: "#f59e0b", type: "iam_role" },
  { label: "KEV Node",      color: "#ff3b3b", type: "kev" },
];

export default function GDSAttackGraphPage() {
  const networkRef = useRef(null);
  const networkInstance = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [blastResult, setBlastResult] = useState(null);
  const [blastLoading, setBlastLoading] = useState(false);
  const [physicsOn, setPhysicsOn] = useState(true);
  const [visLoaded, setVisLoaded] = useState(false);
  const [highlightedNode, setHighlightedNode] = useState(null);

  const loadVis = () => new Promise((resolve) => {
    if (window.vis) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/vis-network/standalone/umd/vis-network.min.js";
    script.onload = resolve;
    document.head.appendChild(script);
  });

  const buildGraph = async () => {
    setLoading(true); setSelected(null); setBlastResult(null);
    try {
      const r = await base44.functions.invoke("gdsAttackGraphEngine", { action: "build" });
      if (r.data) setGraphData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadVis().then(() => { setVisLoaded(true); });
    buildGraph();
  }, []);

  useEffect(() => {
    if (!visLoaded || !graphData || !networkRef.current) return;
    const nodes = (graphData.nodes || []).map(n => ({
      id: n.id,
      label: (n.label || n.id || "").slice(0, 20),
      color: { background: n.color || CYAN, border: n.color || CYAN, highlight: { background: "#fff", border: n.color || CYAN } },
      size: n.size || 18,
      title: n.tooltip || n.label,
      font: { color: TEXT, size: 11 },
      borderWidth: n.is_kev || n.kev ? 3 : 1,
      borderWidthSelected: 4,
      _raw: n,
    }));
    const edges = (graphData.edges || []).map((e, i) => ({
      id: i,
      from: e.from,
      to: e.to,
      color: { color: e.color || "#1e3a5f", highlight: CYAN },
      dashes: e.dashes || false,
      width: e.width || 1,
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
    }));

    const data = { nodes: new window.vis.DataSet(nodes), edges: new window.vis.DataSet(edges) };
    const options = {
      physics: { enabled: physicsOn, stabilization: { iterations: 150 } },
      interaction: { tooltipDelay: 100, hover: true, navigationButtons: false, keyboard: false },
      layout: { randomSeed: 42 },
      edges: { smooth: { type: "dynamic" } },
    };

    if (networkInstance.current) networkInstance.current.destroy();
    const net = new window.vis.Network(networkRef.current, data, options);
    networkInstance.current = net;

    net.on("click", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const raw = nodes.find(n => n.id === nodeId)?._raw;
        setSelected(raw || { id: nodeId });
      } else {
        setSelected(null);
      }
    });
  }, [visLoaded, graphData]);

  useEffect(() => {
    if (!networkInstance.current) return;
    networkInstance.current.setOptions({ physics: { enabled: physicsOn } });
  }, [physicsOn]);

  const focusNode = (nodeId) => {
    if (!networkInstance.current) return;
    networkInstance.current.focus(nodeId, { scale: 1.5, animation: { duration: 600, easingFunction: "easeInOutQuad" } });
    networkInstance.current.selectNodes([nodeId]);
    setHighlightedNode(nodeId);
  };

  const analyzeBlast = async () => {
    setBlastLoading(true);
    try {
      const r = await base44.functions.invoke("gdsAttackGraphEngine", { action: "blast_radius" });
      if (r.data) setBlastResult(r.data);
    } catch (e) { console.error(e); }
    finally { setBlastLoading(false); }
  };

  const stats = graphData ? [
    { label: "Nodes",          value: graphData.nodes_count ?? graphData.nodes?.length ?? 0,     color: CYAN   },
    { label: "Edges",          value: graphData.edges_count ?? graphData.edges?.length ?? 0,     color: MEDIUM },
    { label: "Layers",         value: graphData.layers ?? 7,                                     color: CYAN   },
    { label: "Choke Points",   value: graphData.choke_points ?? graphData.choke_points_count ?? 0, color: HIGH  },
    { label: "Critical Paths", value: graphData.critical_paths ?? 0,                             color: DANGER },
    { label: "KEV Nodes",      value: graphData.kev_nodes ?? 0,                                  color: DANGER },
  ] : [];

  const chokePoints = graphData?.choke_point_nodes || graphData?.choke_point_list || [];
  const legend = graphData?.legend || LEGEND_DEFAULT;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Attack Graph" }]} />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Live Attack Path Graph</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>7-layer code-to-cloud attack path visualization</p>
        </div>
        <button onClick={buildGraph} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Building…" : "Rebuild Graph"}
        </button>
      </div>

      {/* Stats */}
      {loading && !graphData ? <Skeleton lines={2} /> : (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {stats.map(({ label, value, color }) => (
            <Card key={label} className="p-3 text-center" style={{ border: `1px solid ${color}20` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
              <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Graph panel */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-sm font-bold text-white">Attack Path Visualization</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => networkInstance.current?.moveTo({ scale: (networkInstance.current.getScale() * 1.3), animation: true })}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all" title="Zoom In"
              style={{ border: `1px solid ${BORDER}` }}>
              <ZoomIn className="w-3.5 h-3.5" style={{ color: MUTED }} />
            </button>
            <button onClick={() => networkInstance.current?.moveTo({ scale: (networkInstance.current.getScale() / 1.3), animation: true })}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all" title="Zoom Out"
              style={{ border: `1px solid ${BORDER}` }}>
              <ZoomOut className="w-3.5 h-3.5" style={{ color: MUTED }} />
            </button>
            <button onClick={() => networkInstance.current?.fit({ animation: true })}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all" title="Fit Graph"
              style={{ border: `1px solid ${BORDER}` }}>
              <Maximize2 className="w-3.5 h-3.5" style={{ color: MUTED }} />
            </button>
            <button onClick={() => { networkInstance.current?.moveTo({ position: { x: 0, y: 0 }, scale: 1, animation: true }); }}
              className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-all" title="Reset View"
              style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPhysicsOn(p => !p)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
              style={{ background: physicsOn ? `${CYAN}15` : "rgba(255,255,255,0.05)", border: `1px solid ${physicsOn ? CYAN + "40" : BORDER}`, color: physicsOn ? CYAN : MUTED }}>
              Physics {physicsOn ? "ON" : "OFF"}
            </button>
          </div>
        </div>
        <div className="flex">
          <div ref={networkRef} style={{ flex: 1, minHeight: 500, background: "#050e1f" }}>
            {loading && (
              <div className="flex items-center justify-center h-full" style={{ minHeight: 500 }}>
                <RefreshCw className="w-8 h-8 animate-spin" style={{ color: CYAN }} />
              </div>
            )}
          </div>
          {selected && (
            <div className="w-64 flex-shrink-0 p-4 space-y-3 border-l overflow-y-auto" style={{ borderColor: BORDER, background: "#050e1f", maxHeight: 500 }}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">Node Details</h4>
                <button onClick={() => setSelected(null)} className="text-xs hover:text-white" style={{ color: MUTED }}>✕</button>
              </div>
              {[
                ["ID",         selected.id],
                ["Type",       selected.type],
                ["Label",      selected.label || selected.node_name],
                ["Severity",   selected.severity],
                ["Risk Score", selected.risk_score],
                ["Findings",   selected.findings_count ?? selected.findings],
                ["KEV",        selected.is_kev ? "Yes" : selected.kev ? "Yes" : "No"],
                ["Layer",      selected.layer],
              ].filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                <div key={k}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{k}</p>
                  <p className="text-xs text-white mt-0.5 break-all">{String(v)}</p>
                </div>
              ))}
              {selected.severity && <SevBadge sev={selected.severity} />}
            </div>
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-3 border-t flex-wrap" style={{ borderColor: BORDER }}>
          {legend.map((l, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
              <span className="text-[10px]" style={{ color: MUTED }}>{l.label || l.type}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Choke Points */}
      {chokePoints.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-sm font-bold text-white">Choke Points</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>High-degree nodes that are critical bottlenecks — sorted by connectivity</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                {["Label","Type","Degree","Risk",""].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {[...chokePoints].sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0)).map((n, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                    <td className="px-4 py-2.5 text-xs text-white font-semibold">{n.label || n.id}</td>
                    <td className="px-4 py-2.5 text-[10px] font-mono" style={{ color: MUTED }}>{n.type || "—"}</td>
                    <td className="px-4 py-2.5 text-sm font-black font-mono" style={{ color: HIGH }}>{n.degree ?? "—"}</td>
                    <td className="px-4 py-2.5"><SevBadge sev={n.risk || n.severity} /></td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => focusNode(n.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:opacity-80 transition-all"
                        style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
                        View <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Blast Radius */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Blast Radius Analysis</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Analyze the impact spread of the top critical finding</p>
          </div>
          <button onClick={analyzeBlast} disabled={blastLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${DANGER}12`, border: `1px solid ${DANGER}30`, color: DANGER }}>
            <AlertTriangle className={`w-4 h-4 ${blastLoading ? "animate-pulse" : ""}`} />
            {blastLoading ? "Analyzing…" : "Analyze Blast Radius"}
          </button>
        </div>
        {blastResult && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}25` }}>
              <SevBadge sev={blastResult.severity || blastResult.finding_severity} />
              <p className="text-sm font-bold text-white">{blastResult.target_finding || blastResult.finding_title || "Critical Finding"}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Same Pkg Findings", value: blastResult.same_package_findings ?? 0,         color: HIGH   },
                { label: "Affected VMs",       value: blastResult.affected_vms ?? 0,                  color: DANGER },
                { label: "Cloud Accounts",     value: blastResult.affected_cloud_accounts ?? 0,       color: HIGH   },
                { label: "Internet Exposed",   value: blastResult.internet_exposed_endpoints ?? 0,    color: DANGER },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl text-center" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
                  <p className="text-[9px] uppercase" style={{ color: MUTED }}>{label}</p>
                  <p className="text-2xl font-black font-mono mt-1" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
            {blastResult.total_impact_score != null && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold" style={{ color: MUTED }}>Total Impact Score</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(blastResult.total_impact_score, 100)}%`, background: DANGER }} />
                </div>
                <span className="text-sm font-black font-mono" style={{ color: DANGER }}>{blastResult.total_impact_score}</span>
              </div>
            )}
            {(blastResult.mitigation || blastResult.recommendation) && (
              <div className="p-4 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: LOW }}>Recommended Mitigation</p>
                <p className="text-xs text-white">{blastResult.mitigation || blastResult.recommendation}</p>
              </div>
            )}
          </div>
        )}
        {!blastResult && !blastLoading && (
          <p className="text-xs" style={{ color: MUTED }}>Click "Analyze Blast Radius" to assess the impact of your riskiest finding.</p>
        )}
      </Card>
    </div>
  );
}