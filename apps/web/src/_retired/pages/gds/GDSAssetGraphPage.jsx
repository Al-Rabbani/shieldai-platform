import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Search, GitBranch } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  SevBadge, Skeleton, EmptyState, Card, Breadcrumb, PAGE_BG
} from "@/components/gds/GDSOSShared";

const LAYER_META = [
  { num: 1, label: "Repositories",     countKey: "repo_count",      findingsKey: "repo_findings" },
  { num: 2, label: "Containers",       countKey: "container_count", findingsKey: "container_findings" },
  { num: 3, label: "K8s Clusters",     countKey: "k8s_count",       findingsKey: null },
  { num: 4, label: "Cloud Accounts",   countKey: "cloud_count",     findingsKey: "cloud_findings" },
  { num: 5, label: "Virtual Machines", countKey: "vm_count",        findingsKey: null },
  { num: 6, label: "Internet-Facing",  countKey: "internet_count",  findingsKey: null },
];

const NODE_TYPE_COLOR = { repository: CYAN, container: "#8b5cf6", k8s: "#f59e0b", cloud_account: "#0ea5e9", vm: "#10b981", internet_facing: DANGER };

function ScoreBar({ value }) {
  const color = value >= 70 ? DANGER : value >= 40 ? HIGH : value >= 20 ? MEDIUM : LOW;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono w-5 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export default function GDSAssetGraphPage() {
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lineageQuery, setLineageQuery] = useState("");
  const [lineageResult, setLineageResult] = useState(null);
  const [lineageLoading, setLineageLoading] = useState(false);

  const build = async () => {
    setLoading(true);
    try {
      const r = await base44.functions.invoke("gdsASPMAssetGraph", { action: "build" });
      if (r.data) setGraph(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const queryLineage = async () => {
    if (!lineageQuery.trim()) return;
    setLineageLoading(true); setLineageResult(null);
    try {
      const r = await base44.functions.invoke("gdsASPMAssetGraph", { action: "query_lineage", asset: lineageQuery });
      if (r.data) setLineageResult(r.data);
    } catch (e) { console.error(e); }
    finally { setLineageLoading(false); }
  };

  useEffect(() => { build(); }, []);

  const nodes = graph?.nodes || [];
  const riskPaths = graph?.risk_paths || [];
  const layerData = graph?.layers || {};

  const nodeTypes = ["all", ...new Set(nodes.map(n => n.type).filter(Boolean))];
  const filteredNodes = nodes.filter(n => {
    const matchType = typeFilter === "all" || n.type === typeFilter;
    const matchSearch = !search || (n.label || n.id || "").toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Asset Graph" }]} />
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Code-to-Cloud Asset Graph</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Full lineage from source repositories to internet-facing services</p>
        </div>
        <button onClick={build} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Building…" : "Rebuild Graph"}
        </button>
      </div>

      {loading && !graph ? <Skeleton lines={5} /> : !graph ? (
        <EmptyState icon={GitBranch} title="No graph data" description="Click Rebuild Graph to build the asset graph" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Nodes",          value: graph.nodes_count ?? nodes.length,     color: CYAN   },
              { label: "Edges",          value: graph.edges_count ?? graph.edges ?? "—", color: MEDIUM },
              { label: "Layers",         value: graph.layers_count ?? 6,              color: CYAN   },
              { label: "Critical Nodes", value: graph.critical_nodes ?? nodes.filter(n => (n.risk_score ?? 0) >= 70).length, color: DANGER },
            ].map(({ label, value, color }) => (
              <Card key={label} className="p-4 text-center" style={{ border: `1px solid ${color}20` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
              </Card>
            ))}
          </div>

          {riskPaths.length > 0 && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-3">Risk Paths ({riskPaths.length})</h3>
              <div className="space-y-2">
                {riskPaths.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap p-2 rounded-xl" style={{ background: `${DANGER}06`, border: `1px solid ${DANGER}15` }}>
                    <span className="text-xs font-mono text-white">{p.source || p.from}</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>→</span>
                    <span className="text-xs font-mono text-white">{p.destination || p.to}</span>
                    {p.risk && <SevBadge sev={p.risk} />}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: BORDER }}><h3 className="font-bold text-white">Layer-by-Layer Breakdown</h3></div>
            <div className="divide-y" style={{ borderColor: BORDER + "30" }}>
              {LAYER_META.map(({ num, label, countKey, findingsKey }) => {
                const count = layerData[countKey] ?? graph[countKey] ?? "—";
                const findings = findingsKey ? (layerData[findingsKey] ?? graph[findingsKey] ?? 0) : null;
                return (
                  <div key={num} className="flex items-center gap-4 px-5 py-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0" style={{ background: `${CYAN}15`, color: CYAN }}>{num}</span>
                    <span className="text-sm font-bold text-white w-36 flex-shrink-0">{label}</span>
                    <span className="text-sm font-black font-mono" style={{ color: CYAN }}>{count}</span>
                    {findings != null && <span className="text-[10px]" style={{ color: MUTED }}>{findings} findings</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">Query Lineage</h3>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
                <input value={lineageQuery} onChange={e => setLineageQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && queryLineage()}
                  placeholder="Type an asset name…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
              </div>
              <button onClick={queryLineage} disabled={lineageLoading || !lineageQuery.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {lineageLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {lineageLoading ? "Querying…" : "Query"}
              </button>
            </div>
            {lineageResult && (
              <div className="mt-4 space-y-2">
                {lineageResult.asset && <div className="flex items-center gap-2"><span className="text-xs font-bold text-white">{lineageResult.asset.label || lineageResult.asset.name}</span></div>}
                {lineageResult.linked_findings?.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-1"><SevBadge sev={f.severity} /><span className="text-xs text-white truncate">{f.title}</span></div>
                ))}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: BORDER }}>
              <h3 className="font-bold text-white flex-1">Nodes ({filteredNodes.length})</h3>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs outline-none"
                style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: MUTED }}>
                {nodeTypes.map(t => <option key={t} value={t}>{t === "all" ? "All Types" : t}</option>)}
              </select>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter…"
                  className="pl-7 pr-3 py-1.5 rounded-xl text-xs outline-none w-32"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
              </div>
            </div>
            {filteredNodes.length === 0
              ? <div className="p-8 text-center text-xs" style={{ color: MUTED }}>No nodes match the filter</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                      {["ID","Type","Label","Layer","Risk Score","Critical"].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {filteredNodes.slice(0, 50).map((n, i) => {
                        const color = NODE_TYPE_COLOR[n.type] || MUTED;
                        return (
                          <tr key={n.id || i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                            <td className="px-4 py-2 text-[10px] font-mono" style={{ color: MUTED }}>{(n.id || "").slice(0, 16)}</td>
                            <td className="px-4 py-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: `${color}15` }}>{n.type || "—"}</span></td>
                            <td className="px-4 py-2 text-xs text-white truncate max-w-[140px]">{n.label || n.name || "—"}</td>
                            <td className="px-4 py-2 text-xs font-mono" style={{ color: MUTED }}>{n.layer ?? "—"}</td>
                            <td className="px-4 py-2 w-28"><ScoreBar value={n.risk_score ?? 0} /></td>
                            <td className="px-4 py-2 text-xs font-mono text-center" style={{ color: (n.critical_count ?? 0) > 0 ? DANGER : MUTED }}>{n.critical_count ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>
        </>
      )}
    </div>
  );
}