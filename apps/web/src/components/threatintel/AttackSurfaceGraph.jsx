import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Share2, ShieldAlert, Wrench, X } from "lucide-react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

function circularLayout(nodes) {
  const cx = 400;
  const cy = 235;
  const rx = 320;
  const ry = 175;
  return nodes.map((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    return { ...node, x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });
}

export default function AttackSurfaceGraph() {
  const [assets, setAssets] = useState([]);
  const [links, setLinks] = useState([]);
  const [findings, setFindings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [assetRows, linkRows, findingRows] = await Promise.all([
        base44.entities.Asset.list("-created_date", 300).catch(() => []),
        base44.entities.AssetDependency.list("-created_date", 400).catch(() => []),
        base44.entities.TriagedFinding.filter({ severity: { $in: ["critical", "high"] }, status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 400).catch(() => []),
      ]);
      setAssets(assetRows || []);
      setLinks(linkRows || []);
      setFindings(findingRows || []);
      setLoading(false);
    })();
  }, []);

  const findingsByAsset = useMemo(() => {
    const map = new Map();
    findings.forEach((f) => {
      const key = f.asset_name || "unattributed";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    });
    return map;
  }, [findings]);

  const nodes = useMemo(() => {
    const names = new Set([...assets.map((a) => a.name), ...findings.map((f) => f.asset_name)]);
    links.forEach((l) => { names.add(l.asset_name); names.add(l.depends_on_name); });
    return [...names].filter(Boolean).map((name) => {
      const asset = assets.find((a) => a.name === name);
      const vulns = findingsByAsset.get(name) || [];
      const critical = vulns.filter((f) => f.severity === "critical").length;
      const high = vulns.filter((f) => f.severity === "high").length;
      return {
        id: name,
        kind: asset ? "asset" : "external",
        type: asset?.type,
        provider: asset?.cloud_provider,
        risk: asset?.risk_score || 0,
        critical,
        high,
        total: vulns.length,
      };
    });
  }, [assets, links, findingsByAsset]);

  const positioned = useMemo(() => circularLayout(nodes), [nodes]);
  const positionById = useMemo(() => Object.fromEntries(positioned.map((n) => [n.id, n])), [positioned]);
  const edges = useMemo(
    () => links.filter((l) => positionById[l.asset_name] && positionById[l.depends_on_name]),
    [links, positionById]
  );

  const dependents = useMemo(() => {
    const map = new Map();
    edges.forEach((edge) => {
      if (!map.has(edge.depends_on_name)) map.set(edge.depends_on_name, []);
      map.get(edge.depends_on_name).push(edge.asset_name);
    });
    return map;
  }, [edges]);

  function blastRadius(id) {
    const seen = new Set();
    const queue = [...(dependents.get(id) || [])];
    while (queue.length) {
      const next = queue.shift();
      if (next === id || seen.has(next)) continue;
      seen.add(next);
      queue.push(...(dependents.get(next) || []));
    }
    return [...seen];
  }

  const selectedNode = positionById[selected] || null;
  const selectedVulns = selected ? findingsByAsset.get(selected) || [] : [];
  const selectedBlast = selected ? blastRadius(selected) : [];

  const criticalAssets = nodes.filter((n) => n.kind === "asset" && n.critical > 0);
  const exposedAssets = nodes.filter((n) => n.kind === "asset" && n.total > 0);

  async function openAsset(name) {
    setSelected(selected === name ? null : name);
  }

  if (loading) {
    return (
      <div className="rounded-xl py-16 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <Share2 size={15} className="text-blue-400" />
          <p className="text-sm font-bold text-white">Attack Surface Dependency Graph</p>
          <span className="text-[10px] text-slate-500">
            {exposedAssets.length} exposed asset(s) · {criticalAssets.length} with critical findings · {edges.length} link(s)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} /> Critical finding</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#f97316" }} /> High finding</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} /> No high/critical</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 p-2">
          {nodes.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-12">No assets or findings recorded yet.</p>
          ) : (
            <svg viewBox="0 0 800 470" className="w-full h-auto" role="img" aria-label="Attack surface dependency graph">
              <defs>
                <marker id="asg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const from = positionById[edge.asset_name];
                const to = positionById[edge.depends_on_name];
                const active = !selected || edge.asset_name === selected || edge.depends_on_name === selected;
                return (
                  <line
                    key={edge.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={edge.is_critical ? "#ef4444" : "#334155"}
                    strokeWidth={edge.is_critical ? 1.8 : 1.1}
                    strokeOpacity={active ? 0.7 : 0.12}
                    markerEnd="url(#asg-arrow)"
                  />
                );
              })}
              {positioned.map((node) => {
                const color = node.critical > 0 ? "#ef4444" : node.high > 0 ? "#f97316" : "#3b82f6";
                const isSelected = node.id === selected;
                const related = !selected || isSelected || edges.some((e) => (e.asset_name === node.id && e.depends_on_name === selected) || (e.depends_on_name === node.id && e.asset_name === selected));
                return (
                  <g key={node.id} onClick={() => openAsset(node.id)} className="cursor-pointer" opacity={related ? 1 : 0.3}>
                    <title>{`${node.id} · ${node.critical} critical, ${node.high} high open`}</title>
                    {isSelected && <circle cx={node.x} cy={node.y} r={16} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="3 3" />}
                    <circle cx={node.x} cy={node.y} r={node.critical > 0 ? 8 : 6.5} fill={color} stroke="#0a0f1e" strokeWidth="1.5" />
                    <text x={node.x} y={node.y + 21} textAnchor="middle" fontSize="9" fill={isSelected ? "#f8fafc" : "#94a3b8"} fontWeight={isSelected ? 700 : 400}>
                      {node.id.length > 20 ? `${node.id.slice(0, 19)}…` : node.id}
                    </text>
                    {node.total > 0 && (
                      <text x={node.x} y={node.y + 31} textAnchor="middle" fontSize="8" fill={color} fontWeight="700">
                        {node.critical > 0 ? `C${node.critical}` : ""}{node.high > 0 ? ` H${node.high}` : ""}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
          <p className="text-[10px] text-slate-600 px-2 pb-2">
            Nodes are coloured by their highest open finding. Arrows point from an asset to what it depends on — click any node to see its vulnerabilities and blast radius.
          </p>
        </div>

        <div className="border-t lg:border-t-0 lg:border-l border-slate-800 p-3 max-h-[520px] overflow-y-auto">
          {!selectedNode ? (
            <div className="text-center py-10">
              <ShieldAlert size={20} className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">Select an asset</p>
              <p className="text-[10px] text-slate-600 mt-1">See its high and critical findings, remediation plan and what depends on it.</p>
              {criticalAssets.length > 0 && (
                <div className="mt-3 text-left">
                  <p className="text-[9px] uppercase text-slate-500 mb-1">Exposed critical assets</p>
                  {criticalAssets.slice(0, 6).map((n) => (
                    <button key={n.id} onClick={() => setSelected(n.id)} className="block w-full text-left text-[10px] text-red-300 hover:text-red-200 truncate">
                      {n.id} · C{n.critical}{n.high ? ` H${n.high}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white break-words">{selectedNode.id}</p>
                  <p className="text-[10px] text-slate-500">
                    {selectedNode.kind === "asset"
                      ? `${selectedNode.type?.replace("_", " ")} · ${selectedNode.provider} · risk ${selectedNode.risk}`
                      : "External dependency"}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close" className="text-slate-500 hover:text-slate-300"><X size={13} /></button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <p className="text-[9px] uppercase text-slate-500">Critical</p>
                  <p className="text-sm font-bold font-mono text-red-400">{selectedNode.critical}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <p className="text-[9px] uppercase text-slate-500">High</p>
                  <p className="text-sm font-bold font-mono text-orange-400">{selectedNode.high}</p>
                </div>
                <div className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                  <p className="text-[9px] uppercase text-slate-500">Blast</p>
                  <p className="text-sm font-bold font-mono text-amber-400">{selectedBlast.length}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Vulnerabilities &amp; remediation</p>
                {selectedVulns.length === 0 ? (
                  <p className="text-[10px] text-slate-500">No open high or critical findings on this asset.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedVulns.map((f) => (
                      <div key={f.id} className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-semibold text-slate-200">{f.title}</p>
                          <span className="text-[9px] font-bold uppercase flex-shrink-0" style={{ color: SEV_COLOR[f.severity] }}>{f.severity}</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">{[f.cve_id, f.cwe_id].filter(Boolean).join(" · ") || f.status?.replace("_", " ")}</p>
                        <p className="text-[9px] text-slate-400 mt-1 flex items-start gap-1">
                          <Wrench size={9} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{f.remediation || "No remediation plan recorded."}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Would break with it</p>
                {selectedBlast.length === 0 ? (
                  <p className="text-[10px] text-slate-500">Nothing declares a dependency on this asset.</p>
                ) : (
                  <p className="text-[10px] text-amber-300">{selectedBlast.join(", ")}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}