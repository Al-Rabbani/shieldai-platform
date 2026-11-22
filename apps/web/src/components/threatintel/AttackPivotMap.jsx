import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Waypoints, AlertTriangle, Crosshair } from "lucide-react";

const VECTORS = [
  {
    key: "prompt_injection",
    label: "Prompt injection",
    color: "#a855f7",
    entry: ["ai_model"],
    note: "Content an LLM ingests carries instructions. The model acts with its cloud role and reaches internal data stores.",
  },
  {
    key: "ssrf",
    label: "SSRF pivot",
    color: "#f97316",
    entry: ["api", "serverless"],
    note: "A request parameter reaches an internal endpoint, then hops through compute into storage.",
  },
  {
    key: "stolen_key",
    label: "Stolen API key",
    color: "#ef4444",
    entry: ["api", "container"],
    note: "Leaked credentials give an attacker the service's blast radius — every dependency that identity can touch.",
  },
  {
    key: "supply_chain",
    label: "Supply chain",
    color: "#22c55e",
    entry: ["container", "serverless"],
    note: "A poisoned dependency or image ships inside the workload and inherits its network and data access.",
  },
];

const WIDTH = 880;
const HEIGHT = 440;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const RX = 320;
const RY = 160;

const SYNTHETIC = [
  ["ai_model", "database"],
  ["api", "compute"],
  ["container", "compute"],
  ["serverless", "database"],
  ["compute", "storage"],
];

export default function AttackPivotMap() {
  const [assets, setAssets] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vectorKey, setVectorKey] = useState("prompt_injection");
  const [selectedName, setSelectedName] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Asset.list("-risk_score", 60).catch(() => []),
      base44.entities.AssetDependency.list("-created_date", 200).catch(() => []),
    ]).then(([assetRows, dependencyRows]) => {
      setAssets(assetRows);
      setDependencies(dependencyRows);
      setLoading(false);
    });
  }, []);

  const vector = VECTORS.find((item) => item.key === vectorKey) || VECTORS[0];

  const nodes = useMemo(() => {
    const positioned = {};
    assets.forEach((asset, index) => {
      const angle = (2 * Math.PI * index) / Math.max(assets.length, 1) - Math.PI / 2;
      positioned[asset.name] = {
        asset,
        x: CX + RX * Math.cos(angle),
        y: CY + RY * Math.sin(angle),
      };
    });
    return positioned;
  }, [assets]);

  const edges = useMemo(() => {
    const found = new Map();
    const add = (from, to, type, explicit) => {
      if (!from || !to || from === to) return;
      if (!nodes[from] || !nodes[to]) return;
      const key = [from, to].sort().join("|");
      if (found.has(key)) return;
      found.set(key, { key, from, to, type: type || "network", explicit });
    };

    dependencies.forEach((dependency) => {
      add(dependency.asset_name, dependency.depends_on_name, dependency.dependency_type, true);
    });

    SYNTHETIC.forEach(([fromType, toType]) => {
      const fromNames = assets.filter((asset) => asset.type === fromType).map((asset) => asset.name);
      const toNames = assets.filter((asset) => asset.type === toType).map((asset) => asset.name);
      fromNames.forEach((fromName) => toNames.forEach((toName) => add(fromName, toName, "data_flow", false)));
    });

    return [...found.values()];
  }, [assets, dependencies, nodes]);

  const reach = useMemo(() => {
    const entryNames = assets.filter((asset) => vector.entry.includes(asset.type)).map((asset) => asset.name);
    const visited = new Set(entryNames);
    const pathEdges = new Set();
    let frontier = entryNames;

    for (let depth = 0; depth < 3; depth += 1) {
      const next = [];
      edges.forEach((edge) => {
        if (frontier.includes(edge.from) && !visited.has(edge.to)) {
          visited.add(edge.to);
          next.push(edge.to);
          pathEdges.add(edge.key);
        } else if (frontier.includes(edge.to) && !visited.has(edge.from)) {
          visited.add(edge.from);
          next.push(edge.from);
          pathEdges.add(edge.key);
        }
      });
      frontier = next;
    }

    return { nodes: visited, edges: pathEdges, entryCount: entryNames.length };
  }, [assets, edges, vector]);

  const selected = selectedName ? nodes[selectedName]?.asset : null;
  const exploited = [...reach.nodes];
  const highestRisk = exploited
    .map((name) => nodes[name]?.asset)
    .filter(Boolean)
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))[0];

  if (loading) {
    return <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-16" />;
  }

  if (assets.length === 0) {
    return (
      <div className="rounded-xl py-16 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <Waypoints size={22} className="mx-auto text-slate-600 mb-2" />
        <p className="text-xs text-slate-500">No assets discovered yet — the pivot map draws itself from Asset Inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex flex-wrap items-center gap-2">
          <Crosshair size={14} className="text-slate-400" />
          <p className="text-xs font-bold text-white">Attack vector</p>
          {VECTORS.map((item) => (
            <button
              key={item.key}
              onClick={() => setVectorKey(item.key)}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold border transition"
              style={{
                color: vectorKey === item.key ? "#050e1f" : item.color,
                background: vectorKey === item.key ? item.color : `${item.color}18`,
                borderColor: `${item.color}66`,
              }}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-slate-500">
            {reach.entryCount} entry asset(s) · {exploited.length} reachable in 3 hops
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">{vector.note}</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: 460 }}>
          {edges.map((edge) => {
            const active = reach.edges.has(edge.key);
            const from = nodes[edge.from];
            const to = nodes[edge.to];
            return (
              <line
                key={edge.key}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={active ? vector.color : edge.explicit ? "#334155" : "#1e293b"}
                strokeWidth={active ? 2.4 : 1}
                strokeDasharray={edge.explicit ? "none" : "4 5"}
                opacity={active ? 0.95 : 0.45}
                className={active ? "animate-dash" : undefined}
              />
            );
          })}

          {Object.entries(nodes).map(([name, node]) => {
            const active = reach.nodes.has(name);
            const isEntry = vector.entry.includes(node.asset.type);
            const radius = active ? 15 : 11;
            return (
              <g key={name} onClick={() => setSelectedName(name)} style={{ cursor: "pointer" }}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={active ? `${vector.color}33` : "#111827"}
                  stroke={active ? vector.color : "#334155"}
                  strokeWidth={isEntry ? 3 : 1.5}
                />
                <circle cx={node.x} cy={node.y} r={4} fill={active ? vector.color : "#64748b"} />
                <text x={node.x} y={node.y + radius + 12} textAnchor="middle" fontSize="10" fill={active ? "#e2e8f0" : "#64748b"}>
                  {name.length > 22 ? `${name.slice(0, 20)}…` : name}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-[10px] text-slate-500" style={{ borderTop: "1px solid #1F2937" }}>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: vector.color }} /> pivot path</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-600" /> recorded dependency</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-800" /> type-based assumption</span>
          <span className="ml-auto">Click any node for detail</span>
        </div>
      </div>

      {dependencies.length === 0 && (
        <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
          <AlertTriangle size={11} /> The dependency registry is empty, so links are inferred from asset types. Record real dependencies in Asset Inventory for an exact map.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Exposed assets on this path</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {exploited.map((name) => {
              const asset = nodes[name]?.asset;
              if (!asset) return null;
              return (
                <button key={name} onClick={() => setSelectedName(name)} className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-white/5 text-left">
                  <span className="text-[11px] text-slate-200 truncate">{asset.name}</span>
                  <span className="text-[10px] text-slate-500 capitalize">{asset.type?.replace("_", " ")} · {asset.risk_score ?? "—"}</span>
                </button>
              );
            })}
            {exploited.length === 0 && <p className="text-[11px] text-slate-500">No asset matches this vector&apos;s entry point yet.</p>}
          </div>
        </div>

        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          {selected ? (
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">{selected.name}</p>
              <p className="text-[11px] text-slate-400 capitalize">{selected.type?.replace("_", " ")} · {selected.cloud_provider} · {selected.region || "region unknown"}</p>
              <p className="text-[11px] text-slate-400">Risk score: <span className="text-white font-semibold">{selected.risk_score ?? "—"}</span> · open findings: <span className="text-white font-semibold">{selected.open_findings ?? 0}</span></p>
              <p className="text-[11px] text-slate-400">On call: {selected.assigned_to || "unassigned"}</p>
              <div className="pt-1">
                <p className="text-[10px] uppercase text-slate-500 mb-1">Dependencies</p>
                <div className="flex flex-wrap gap-1">
                  {(dependencies.filter((dependency) => dependency.asset_name === selected.name || dependency.depends_on_name === selected.name)).length === 0 ? (
                    <span className="text-[10px] text-slate-600">No recorded dependency</span>
                  ) : (
                    dependencies
                      .filter((dependency) => dependency.asset_name === selected.name || dependency.depends_on_name === selected.name)
                      .map((dependency) => {
                        const other = dependency.asset_name === selected.name ? dependency.depends_on_name : dependency.asset_name;
                        return (
                          <span key={dependency.id} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700/40 text-slate-300">
                            {other} · {dependency.dependency_type?.replace("_", " ")}
                          </span>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Highest-risk exposure</p>
              {highestRisk ? (
                <>
                  <p className="text-sm font-bold text-white">{highestRisk.name}</p>
                  <p className="text-[11px] text-slate-400">Risk {highestRisk.risk_score ?? "—"} · {highestRisk.open_findings ?? 0} open finding(s)</p>
                  <button onClick={() => setSelectedName(highestRisk.name)} className="text-[11px] text-blue-400 hover:text-blue-300 font-medium">Inspect this node</button>
                </>
              ) : (
                <p className="text-[11px] text-slate-500">Pick a node to see what it exposes.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}