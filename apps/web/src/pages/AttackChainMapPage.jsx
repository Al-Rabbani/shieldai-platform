import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { buildAttackGraph, findBestPath, SEVERITY_COLOR, describeExposure } from "@/lib/attackPaths";
import { Network, ShieldAlert, ExternalLink, TrendingUp } from "lucide-react";

const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const RISK_RANK = { critical: 5, high: 4, medium: 3, low: 2, unrated: 1 };

function riskColor(score) {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

export default function AttackChainMapPage() {
  const [assets, setAssets] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    (async () => {
      const [assetRows, dependencyRows, findingRows] = await Promise.all([
        base44.entities.Asset.list("-risk_score", 300).catch(() => []),
        base44.entities.AssetDependency.list("-created_date", 300).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 500).catch(() => []),
      ]);
      setAssets(assetRows || []);
      setDependencies(dependencyRows || []);
      setFindings(findingRows || []);
      setLoading(false);
    })();
  }, []);

  const graph = useMemo(() => buildAttackGraph({ assets, dependencies, findings }), [assets, dependencies, findings]);

  const chains = useMemo(() => {
    const assetNodes = graph.nodes.filter((node) => node.id !== "internet");
    return assetNodes
      .map((node) => {
        const path = findBestPath(graph, node.id);
        return {
          node,
          path,
          pathNodes: (path || []).map((id) => graph.nodes.find((item) => item.id === id)).filter(Boolean),
          exactVulns: node.vulns.filter((vuln) => (vuln.asset_name || "").trim().toLowerCase() === node.name.trim().toLowerCase()).length,
        };
      })
      .filter((chain) => chain.path && chain.node.vulns.length > 0)
      .sort(
        (a, b) =>
          (SEV_RANK[b.node.maxSeverity] || 0) - (SEV_RANK[a.node.maxSeverity] || 0) ||
          b.exactVulns - a.exactVulns ||
          (b.node.riskScore || 0) - (a.node.riskScore || 0)
      )
      .slice(0, 8);
  }, [graph]);

  const exposure = useMemo(() => describeExposure(graph), [graph]);
  const worst = chains[0] || null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Network size={22} className="text-red-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">ATK-009 | ATTACK CHAINS</span>
            <h1 className="text-xl font-bold text-white mt-1">Most exposed assets — attack chains</h1>
            <p className="text-xs text-slate-500">Entry point → vulnerable asset → deepest reachable hop, ranked by worst open finding.</p>
          </div>
        </div>
        <Link to="/attack-simulator" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition">
          <ExternalLink size={13} /> Open simulator
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Exposed assets", value: chains.length, color: "#ef4444" },
          { label: "Reachable of total", value: `${exposure.reachableCount}/${exposure.totalCount}`, color: "#3b82f6" },
          { label: "Open findings", value: graph.openFindingCount, color: "#f59e0b" },
          { label: "Inferred pivots", value: graph.inferredEdges, color: "#a855f7" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${tile.color}` }}>
            <p className="text-lg font-bold text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500">{tile.label}</p>
          </div>
        ))}
      </div>

      {chains.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <ShieldAlert size={22} className="mx-auto text-slate-600 mb-2" />
          <p className="text-xs text-slate-500">No asset with an open finding is reachable from the internet in the current graph.</p>
        </div>
      ) : (
        <>
          {worst && (
            <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${SEVERITY_COLOR[worst.node.maxSeverity] || "#ef4444"}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-300 flex items-center gap-1">
                <TrendingUp size={11} /> Most exposed asset
              </p>
              <p className="text-sm font-bold text-white mt-1">{worst.node.name}</p>
              <p className="text-[11px] text-slate-400">
                {worst.node.vulns.length} finding(s) mapped · highest severity {worst.node.maxSeverity} · risk {worst.node.riskScore ?? "—"} · {worst.pathNodes.length - 1} pivot(s) from the internet
              </p>
            </div>
          )}

          <div className="space-y-2">
            {chains.map((chain) => (
              <div
                key={chain.node.id}
                className="rounded-xl p-2.5"
                style={{
                  background: "#111827",
                  border: "1px solid #1F2937",
                  borderLeft: `3px solid ${SEVERITY_COLOR[chain.node.maxSeverity] || "#475569"}`,
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-white truncate max-w-[220px]">{chain.node.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-slate-300 border-slate-600 bg-slate-700/30 capitalize">
                    {String(chain.node.type || "asset").replace(/_/g, " ")}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: riskColor(chain.node.riskScore || 0), background: "#0a0f1e", border: `1px solid ${riskColor(chain.node.riskScore || 0)}55` }}>
                    risk {chain.node.riskScore ?? "—"}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-red-300">
                    <ShieldAlert size={9} /> {chain.node.vulns.length} finding(s)
                  </span>
                  {chain.node.business_criticality && (
                    <span className="text-[9px] text-amber-300">· {chain.node.business_criticality} business criticality</span>
                  )}
                </div>

                <div className="mt-2 overflow-x-auto">
                  <div className="flex items-center gap-1.5 min-w-max">
                    {chain.pathNodes.map((node, index) => (
                      <React.Fragment key={node.id}>
                        {index > 0 && (
                          <span className="flex items-center gap-0.5 flex-shrink-0">
                            <span className="w-5 sm:w-9 h-px animate-dash" style={{ borderTop: `1.5px ${index === 1 ? "solid" : "dashed"} ${index === 1 ? "#334155" : "#a16207"}` }} />
                            <span className="text-[7px] text-slate-600 uppercase">{index === 1 ? "exposed" : "pivot"}</span>
                            <span className="w-5 sm:w-9 h-px animate-dash" style={{ borderTop: `1.5px ${index === 1 ? "solid" : "dashed"} ${index === 1 ? "#334155" : "#a16207"}` }} />
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedId((current) => (current === node.id ? null : node.id))}
                          className={`text-left px-2 py-1 rounded-md border transition flex-shrink-0 ${selectedId === node.id ? "border-blue-500 bg-[#1d2c45]" : "border-slate-700 bg-[#0a0f1e] hover:border-slate-500"}`}
                        >
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: node.id === "internet" ? "#a855f7" : node.maxSeverity ? SEVERITY_COLOR[node.maxSeverity] : "#334155" }} />
                            <span className="text-[10px] font-semibold text-white max-w-[110px] truncate">{node.name}</span>
                            {node.vulns?.length > 0 && <span className="text-[8px] font-bold text-red-300">{node.vulns.length}</span>}
                          </span>
                          <span className="block text-[8px] text-slate-500 capitalize">{node.id === "internet" ? "attacker entry" : String(node.type || "asset").replace(/_/g, " ")}</span>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {selectedId === chain.node.id && chain.node.vulns.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                    {chain.node.vulns.slice(0, 4).map((vuln) => (
                      <p key={vuln.id} className="text-[10px] text-slate-400 truncate">
                        <span className="font-bold uppercase mr-1" style={{ color: SEVERITY_COLOR[vuln.severity] || "#64748b" }}>{vuln.severity}</span>
                        {vuln.title}
                        {vuln.cve_id ? ` · ${vuln.cve_id}` : ""}
                      </p>
                    ))}
                    {chain.node.vulns.length > 4 && <p className="text-[10px] text-slate-600">+ {chain.node.vulns.length - 4} more</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-600 flex items-center gap-1">
            <Network size={11} /> Solid legs are recorded dependencies; dashed amber legs are inferred pivots where no dependency is registered.
          </p>
        </>
      )}
    </div>
  );
}