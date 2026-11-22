import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, Plus } from "lucide-react";
import AssetDependencyPanel from "./AssetDependencyPanel";

const KIND_COLOR = {
  asset: "#38bdf8",
  service: "#a78bfa",
  database: "#2dd4bf",
  api: "#f59e0b",
  storage: "#f472b6",
  external: "#94a3b8",
};

const KIND_LABEL = {
  asset: "Cloud asset",
  service: "Service",
  database: "Database",
  api: "API",
  storage: "Storage",
  external: "External dependency",
};

function layout(nodes) {
  const cx = 400;
  const cy = 250;
  const rx = 315;
  const ry = 190;
  return nodes.map((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    return { ...node, x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });
}

export default function AssetDependencyMap({ assets = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["asset-dependencies"],
    queryFn: () => base44.entities.AssetDependency.list("-created_date", 500),
    initialData: [],
  });

  // Open vulnerabilities carried by each asset, so a blast zone shows what actually breaks.
  const { data: impact = {} } = useQuery({
    queryKey: ["asset-finding-impact"],
    queryFn: async () => {
      const [all, crit] = await Promise.all([
        base44.entities.TriagedFinding.aggregate({
          query: { status: { $in: ["open", "in_remediation"] } },
          groupBy: "asset_name",
        }),
        base44.entities.TriagedFinding.aggregate({
          query: { status: { $in: ["open", "in_remediation"] }, severity: "critical" },
          groupBy: "asset_name",
        }),
      ]);
      const map = {};
      (all?.rows || []).forEach((row) => {
        map[row.asset_name] = { open: row.count || 0, critical: 0 };
      });
      (crit?.rows || []).forEach((row) => {
        map[row.asset_name] = { ...(map[row.asset_name] || { open: row.count || 0 }), critical: row.count || 0 };
      });
      return map;
    },
    initialData: {},
  });

  const nodes = useMemo(() => {
    const map = new Map();
    assets.forEach((asset) => {
      map.set(asset.name, {
        id: asset.name,
        kind: "asset",
        type: asset.type,
        provider: asset.cloud_provider,
        region: asset.region,
        risk: asset.risk_score || 0,
      });
    });
    links.forEach((link) => {
      if (!map.has(link.depends_on_name)) {
        map.set(link.depends_on_name, { id: link.depends_on_name, kind: link.depends_on_kind || "external" });
      }
      if (!map.has(link.asset_name)) map.set(link.asset_name, { id: link.asset_name, kind: "external" });
    });
    return [...map.values()];
  }, [assets, links]);

  const positioned = useMemo(() => layout(nodes), [nodes]);
  const positionById = useMemo(() => Object.fromEntries(positioned.map((n) => [n.id, n])), [positioned]);

  const edges = useMemo(
    () => links.filter((link) => positionById[link.asset_name] && positionById[link.depends_on_name]),
    [links, positionById]
  );

  // Live graph: re-read links and finding counts the moment either changes.
  useEffect(() => {
    const offLinks = base44.entities.AssetDependency.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["asset-dependencies"] });
    });
    const offFindings = base44.entities.TriagedFinding.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["asset-finding-impact"] });
    });
    return () => {
      offLinks();
      offFindings();
    };
  }, [queryClient]);

  // Blast radius = every asset that transitively depends on the selected one, with its cascade hop.
  const { blastIds, hops } = useMemo(() => {
    if (!selectedId) return { blastIds: [], hops: {} };
    const dependents = new Map();
    edges.forEach((edge) => {
      if (!dependents.has(edge.depends_on_name)) dependents.set(edge.depends_on_name, []);
      dependents.get(edge.depends_on_name).push(edge.asset_name);
    });
    const depth = {};
    let frontier = [selectedId];
    let hop = 0;
    while (frontier.length) {
      hop += 1;
      const next = [];
      frontier.forEach((node) => {
        (dependents.get(node) || []).forEach((name) => {
          if (name === selectedId || depth[name]) return;
          depth[name] = hop;
          next.push(name);
        });
      });
      frontier = next;
    }
    return { blastIds: Object.keys(depth), hops: depth };
  }, [edges, selectedId]);

  const selected = positionById[selectedId] || null;
  const touched = useMemo(
    () =>
      new Set(
        edges
          .filter((edge) => edge.asset_name === selectedId || edge.depends_on_name === selectedId)
          .flatMap((edge) => [edge.asset_name, edge.depends_on_name])
      ),
    [edges, selectedId]
  );

  async function createLink(payload) {
    await base44.entities.AssetDependency.create(payload);
    await queryClient.invalidateQueries({ queryKey: ["asset-dependencies"] });
  }

  async function deleteLink(id) {
    await base44.entities.AssetDependency.delete(id);
    await queryClient.invalidateQueries({ queryKey: ["asset-dependencies"] });
  }

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dependency &amp; Blast-Radius Map</p>
          <span className="text-[10px] text-muted-foreground">{nodes.length} nodes · {edges.length} declared links · live</span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition"
        >
          <Plus size={12} /> Declare link
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="lg:col-span-2 relative p-2">
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-primary border-white/10 rounded-full animate-spin" />
            </div>
          ) : (
            <svg viewBox="0 0 800 500" className="w-full h-auto" role="img" aria-label="Asset dependency map">
              <defs>
                <marker id="dep-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const from = positionById[edge.asset_name];
                const to = positionById[edge.depends_on_name];
                const active = !selectedId || edge.asset_name === selectedId || edge.depends_on_name === selectedId;
                // Failure travels along an edge when the downstream side is hit and this asset already failed.
                const inCascade = !!selectedId
                  && (edge.depends_on_name === selectedId || (hops[edge.depends_on_name] || 0) > 0)
                  && ((hops[edge.asset_name] || 0) > 0);
                return (
                  <line
                    key={edge.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={inCascade ? "#f59e0b" : edge.is_critical ? "#ef4444" : "#3b82f6"}
                    strokeWidth={inCascade ? 2.2 : edge.is_critical ? 1.8 : 1.2}
                    strokeOpacity={inCascade || active ? (selectedId ? 0.95 : 0.45) : 0.07}
                    strokeDasharray={inCascade ? "6 3" : edge.is_critical ? "0" : "4 3"}
                    className={inCascade ? "animate-dash" : undefined}
                    markerEnd="url(#dep-arrow)"
                  />
                );
              })}

              {positioned.map((node) => {
                const isSelected = node.id === selectedId;
                const hop = hops[node.id] || 0;
                const inBlast = hop > 0;
                const hopColor = hop === 1 ? "#ef4444" : hop === 2 ? "#f97316" : "#f59e0b";
                const related = !selectedId || isSelected || touched.has(node.id);
                const fill = KIND_COLOR[node.kind] || KIND_COLOR.external;
                const openVulns = impact[node.id]?.open || 0;
                const criticalVulns = impact[node.id]?.critical || 0;
                return (
                  <g
                    key={node.id}
                    onClick={() => setSelectedId(isSelected ? null : node.id)}
                    className="cursor-pointer"
                    opacity={related ? 1 : 0.28}
                  >
                    <title>{`${node.id} · ${KIND_LABEL[node.kind] || KIND_LABEL.external}${openVulns ? ` · ${openVulns} open finding(s), ${criticalVulns} critical` : ""}`}</title>
                    {openVulns > 0 && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={11}
                        fill="none"
                        stroke={criticalVulns > 0 ? "#ef4444" : "#f59e0b"}
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                      />
                    )}
                    {isSelected && <circle cx={node.x} cy={node.y} r={15} fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" className="animate-pulse" />}
                    {inBlast && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={13 + Math.min(hop, 3) * 2}
                        fill="none"
                        stroke={hopColor}
                        strokeWidth="1.4"
                        strokeOpacity={0.9}
                        className="animate-pulse"
                      />
                    )}
                    {inBlast && (
                      <text x={node.x - 20} y={node.y - 9} fontSize="7" fontWeight="700" fill={hopColor}>
                        H{hop}
                      </text>
                    )}
                    <circle cx={node.x} cy={node.y} r={node.kind === "asset" ? 7 : 6} fill={fill} stroke="#0a0f1e" strokeWidth="1.5" />
                    {criticalVulns > 0 && (
                      <text x={node.x + 9} y={node.y - 8} fontSize="8" fontWeight="700" fill="#ef4444">
                        {criticalVulns}
                      </text>
                    )}
                    <text
                      x={node.x}
                      y={node.y + 20}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isSelected ? "#f8fafc" : "#94a3b8"}
                      fontWeight={isSelected ? 700 : 400}
                    >
                      {node.id.length > 22 ? `${node.id.slice(0, 21)}…` : node.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {!isLoading && edges.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center px-6 pb-2">
              No dependency links recorded yet. Assets are shown, but there are no declared asset-to-asset edges to draw —
              add the first link to build the blast-radius view.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 px-2 pb-2 text-[10px] text-muted-foreground">
            {Object.entries(KIND_LABEL).map(([kind, label]) => (
              <span key={kind} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: KIND_COLOR[kind] }} /> {label}
              </span>
            ))}
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-dashed" style={{ borderColor: "#ef4444" }} /> Open vulns (count = critical)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: "#ef4444" }} /> Critical link</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: "#ef4444" }} /> 1 hop</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: "#f97316" }} /> 2 hops</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: "#f59e0b" }} /> 3+ hops</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed" style={{ borderColor: "#f59e0b" }} /> Cascade path</span>
          </div>
        </div>

        <div className="border-t lg:border-t-0 lg:border-l border-border">
          <AssetDependencyPanel
            node={selected}
            links={links}
            blastRadius={blastIds}
            impact={impact}
            assets={assets}
            allNames={nodes.map((n) => n.id)}
            onCreate={createLink}
            onDelete={deleteLink}
            showForm={showForm}
            setShowForm={setShowForm}
          />
        </div>
      </div>
    </div>
  );
}