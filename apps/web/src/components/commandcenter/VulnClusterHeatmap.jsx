import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Grid3x3, Wrench, X, ChevronRight } from "lucide-react";

const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };
const TYPE_LABEL = { compute: "Compute", storage: "Storage", database: "Database", ai_model: "AI model", api: "API", container: "Container", serverless: "Serverless", unmapped: "Unmapped" };

function cellColor(severity, count, max) {
  if (count === 0) return "rgba(30,41,59,0.35)";
  const intensity = 0.18 + (count / Math.max(1, max)) * 0.62;
  return hexToRgba(SEV_COLOR[severity] || SEV_COLOR.info, intensity);
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function VulnClusterHeatmap({ findings }) {
  const [assets, setAssets] = useState([]);
  const [links, setLinks] = useState([]);
  const [cluster, setCluster] = useState(null);
  const [assetName, setAssetName] = useState(null);

  useEffect(() => {
    (async () => {
      const [assetRows, linkRows] = await Promise.all([
        base44.entities.Asset.list("-created_date", 300).catch(() => []),
        base44.entities.AssetDependency.list("-created_date", 400).catch(() => []),
      ]);
      setAssets(assetRows || []);
      setLinks(linkRows || []);
    })();
  }, []);

  const typeByName = useMemo(() => Object.fromEntries(assets.map((asset) => [asset.name, asset.type])), [assets]);

  const enriched = useMemo(
    () => findings.map((finding) => ({
      ...finding,
      severity: finding.severity || finding.normalized_severity || "info",
      assetType: typeByName[finding.asset_name] || finding.asset_type || "unmapped",
    })),
    [findings, typeByName]
  );

  const rows = useMemo(() => [...new Set(enriched.map((f) => f.assetType))].sort(), [enriched]);
  const matrix = useMemo(() => {
    const map = new Map();
    enriched.forEach((finding) => {
      const key = `${finding.assetType}|${finding.severity}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(finding);
    });
    return map;
  }, [enriched]);
  const max = useMemo(() => Math.max(1, ...[...matrix.values()].map((rowsList) => rowsList.length)), [matrix]);

  const clusterFindings = cluster ? matrix.get(`${cluster.type}|${cluster.severity}`) || [] : [];
  const clusterAssets = useMemo(() => {
    const map = new Map();
    clusterFindings.forEach((finding) => {
      const key = finding.asset_name || "unattributed";
      const row = map.get(key) || { name: key, count: 0, maxCvss: 0 };
      row.count += 1;
      row.maxCvss = Math.max(row.maxCvss, finding.cvss_score || 0);
      map.set(key, row);
    });
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [clusterFindings]);

  const dependentOn = useMemo(() => {
    const map = new Map();
    links.forEach((link) => {
      if (!map.has(link.depends_on_name)) map.set(link.depends_on_name, []);
      map.get(link.depends_on_name).push(link.asset_name);
    });
    return map;
  }, [links]);

  function blastRadius(name) {
    const seen = new Set();
    const queue = [...(dependentOn.get(name) || [])];
    while (queue.length) {
      const next = queue.shift();
      if (!next || next === name || seen.has(next)) continue;
      seen.add(next);
      queue.push(...(dependentOn.get(next) || []));
    }
    return [...seen];
  }

  const selectedAsset = assetName ? assets.find((asset) => asset.name === assetName) : null;
  const assetFindings = assetName ? enriched.filter((finding) => finding.asset_name === assetName) : [];
  const assetBlast = assetName ? blastRadius(assetName) : [];

  if (enriched.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-1">Vulnerability clusters</p>
        <p className="text-xs text-slate-500 py-6 text-center">No open findings to cluster.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <Grid3x3 size={15} className="text-blue-400" />
          <p className="text-sm font-bold text-white">Vulnerability clusters</p>
          <span className="text-[10px] text-slate-500">by asset type × severity — click a cell</span>
        </div>
        {(cluster || assetName) && (
          <button
            onClick={() => { setCluster(null); setAssetName(null); }}
            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200"
          >
            <X size={11} /> Reset
          </button>
        )}
      </div>

      <div className="p-3 overflow-x-auto">
        <div className="min-w-[440px]">
          <div className="grid" style={{ gridTemplateColumns: "110px repeat(5, minmax(0, 1fr))", gap: 4 }}>
            <div />
            {SEVERITIES.map((severity) => (
              <p key={severity} className="text-[9px] font-bold uppercase text-center" style={{ color: SEV_COLOR[severity] }}>{severity}</p>
            ))}
            {rows.map((type) => (
              <React.Fragment key={type}>
                <button
                  onClick={() => { setCluster(null); setAssetName(null); }}
                  className="text-[10px] text-slate-300 text-left truncate pr-1 hover:text-white"
                >
                  {TYPE_LABEL[type] || type}
                </button>
                {SEVERITIES.map((severity) => {
                  const cellFindings = matrix.get(`${type}|${severity}`) || [];
                  const active = cluster?.type === type && cluster?.severity === severity;
                  return (
                    <button
                      key={`${type}-${severity}`}
                      onClick={() => {
                        setAssetName(null);
                        setCluster(cellFindings.length === 0 ? null : { type, severity });
                      }}
                      disabled={cellFindings.length === 0}
                      className="rounded-md h-9 flex items-center justify-center text-[11px] font-mono font-bold transition disabled:cursor-default"
                      style={{
                        background: cellColor(severity, cellFindings.length, max),
                        color: cellFindings.length ? "#f8fafc" : "#334155",
                        border: active ? `1px solid ${SEV_COLOR[severity]}` : "1px solid transparent",
                        boxShadow: active ? `0 0 10px ${hexToRgba(SEV_COLOR[severity], 0.5)}` : "none",
                        transform: active ? "scale(1.03)" : "none",
                      }}
                      title={`${TYPE_LABEL[type] || type} · ${severity}: ${cellFindings.length} finding(s)`}
                    >
                      {cellFindings.length || "·"}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {cluster && (
        <div className="border-t border-slate-800 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-white">
              {TYPE_LABEL[cluster.type] || cluster.type} · {cluster.severity} · {clusterFindings.length} finding(s)
            </p>
            {assetName && (
              <button onClick={() => setAssetName(null)} className="text-[10px] text-slate-400 hover:text-slate-200">Back to assets</button>
            )}
          </div>

          {!assetName ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
              {clusterAssets.map((asset) => (
                <button
                  key={asset.name}
                  onClick={() => setAssetName(asset.name)}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:border-blue-500/50 transition"
                  style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}
                >
                  <span className="text-[10px] text-slate-200 truncate">{asset.name}</span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[9px] font-mono text-slate-400">{asset.count}·{asset.maxCvss || "—"}</span>
                    <ChevronRight size={10} className="text-slate-600" />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold text-white">{assetName}</p>
                <span className="text-[10px] text-slate-500">{selectedAsset ? `${selectedAsset.type?.replace("_", " ")} · ${selectedAsset.cloud_provider} · risk ${selectedAsset.risk_score ?? "—"}` : "not in inventory"}</span>
                <span className="text-[10px] text-amber-300 ml-auto">{assetBlast.length} dependent asset(s) at risk</span>
              </div>

              <div className="space-y-1.5">
                {assetFindings.map((finding) => (
                  <div key={finding.id} className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937", borderLeft: `3px solid ${SEV_COLOR[finding.severity]}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] font-semibold text-slate-200">{finding.title}</p>
                      <span className="text-[9px] font-bold uppercase flex-shrink-0" style={{ color: SEV_COLOR[finding.severity] }}>{finding.severity}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">{[finding.cve_id, finding.cwe_id, finding.cvss_score ? `CVSS ${finding.cvss_score}` : null].filter(Boolean).join(" · ") || "no identifiers"}</p>
                    <p className="text-[9px] text-slate-400 mt-1 flex items-start gap-1">
                      <Wrench size={9} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{finding.remediation || "No remediation plan recorded."}</span>
                    </p>
                  </div>
                ))}
              </div>

              {assetBlast.length > 0 && (
                <p className="text-[10px] text-amber-300/90">Impact: {assetBlast.join(", ")}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}