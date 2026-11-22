import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Flame, ChevronRight, X, Link2 } from "lucide-react";

const TYPE_LABEL = { compute: "Compute", storage: "Storage", database: "Database", ai_model: "AI model", api: "API", container: "Container", serverless: "Serverless", other: "Other" };
const SEV_WEIGHT = { critical: 5, high: 3, medium: 2, low: 1, info: 0.5 };

function riskColor(avgRisk) {
  if (avgRisk >= 80) return "#ef4444";
  if (avgRisk >= 60) return "#f97316";
  if (avgRisk >= 40) return "#eab308";
  return "#22c55e";
}

export default function AssetRiskSectorHeatmap({ assets, onSelect }) {
  const [findings, setFindings] = useState([]);
  const [links, setLinks] = useState([]);
  const [sector, setSector] = useState(null);

  useEffect(() => {
    (async () => {
      const [findingRows, linkRows] = await Promise.all([
        base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 500).catch(() => []),
        base44.entities.AssetDependency.list("-created_date", 400).catch(() => []),
      ]);
      setFindings(findingRows || []);
      setLinks(linkRows || []);
    })();
  }, []);

  const dependents = useMemo(() => {
    const map = new Map();
    links.forEach((link) => {
      if (!map.has(link.depends_on_name)) map.set(link.depends_on_name, []);
      map.get(link.depends_on_name).push(link.asset_name);
    });
    return map;
  }, [links]);

  const findingsByAsset = useMemo(() => {
    const map = new Map();
    findings.forEach((finding) => {
      if (!map.has(finding.asset_name)) map.set(finding.asset_name, []);
      map.get(finding.asset_name).push(finding);
    });
    return map;
  }, [findings]);

  const sectors = useMemo(() => {
    const map = new Map();
    assets.forEach((asset) => {
      const key = asset.type || "other";
      const row = map.get(key) || { key, assets: [] };
      row.assets.push(asset);
      map.set(key, row);
    });

    return [...map.values()].map((row) => {
      const assetRows = row.assets.map((asset) => {
        const assetFindings = findingsByAsset.get(asset.name) || [];
        const critical = assetFindings.filter((f) => (f.severity || f.normalized_severity) === "critical").length;
        const high = assetFindings.filter((f) => (f.severity || f.normalized_severity) === "high").length;
        return {
          asset,
          findings: assetFindings.length,
          critical,
          high,
          dependents: (dependents.get(asset.name) || []).length,
          exposure: critical * 5 + high * 3 + assetFindings.length,
        };
      });
      const cumulativeRisk = assetRows.reduce((sum, item) => sum + (Number(item.asset.risk_score) || 0), 0);
      const exposure = assetRows.reduce((sum, item) => sum + item.exposure, 0);
      const avgRisk = assetRows.length ? Math.round(cumulativeRisk / assetRows.length) : 0;
      return {
        key: row.key,
        assetRows: assetRows.sort((a, b) => (b.asset.risk_score || 0) - (a.asset.risk_score || 0)),
        assetCount: assetRows.length,
        cumulativeRisk,
        exposure,
        avgRisk,
        findings: assetRows.reduce((sum, item) => sum + item.findings, 0),
        critical: assetRows.reduce((sum, item) => sum + item.critical, 0),
      };
    }).sort((a, b) => b.exposure - a.exposure);
  }, [assets, findingsByAsset, dependents]);

  const maxExposure = Math.max(1, ...sectors.map((row) => row.exposure));
  const selected = sectors.find((row) => row.key === sector);

  if (assets.length === 0) return null;

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <Flame size={15} className="text-orange-400" />
          <p className="text-sm font-bold text-white">Risk &amp; exposure by sector</p>
          <span className="text-[10px] text-slate-500">cumulative risk × open findings — click a sector</span>
        </div>
        {selected && (
          <button onClick={() => setSector(null)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200">
            <X size={11} /> Close sector
          </button>
        )}
      </div>

      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {sectors.map((row) => {
          const color = riskColor(row.avgRisk);
          const intensity = 0.16 + (row.exposure / maxExposure) * 0.5;
          return (
            <button
              key={row.key}
              onClick={() => setSector(sector === row.key ? null : row.key)}
              className="rounded-lg p-2.5 text-left transition"
              style={{
                background: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${intensity.toFixed(2)})`,
                border: sector === row.key ? `1px solid ${color}` : "1px solid #1F2937",
                boxShadow: sector === row.key ? `0 0 12px ${color}66` : "none",
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11px] font-bold text-white">{TYPE_LABEL[row.key] || row.key}</p>
                <span className="text-[9px] font-mono" style={{ color }}>{row.avgRisk}</span>
              </div>
              <p className="text-[9px] text-slate-300/80 mt-0.5">{row.assetCount} asset(s) · risk Σ {row.cumulativeRisk}</p>
              <div className="flex items-center gap-1.5 mt-1 text-[9px]">
                <span className="text-slate-200">{row.findings} finding(s)</span>
                {row.critical > 0 && <span className="text-red-300 font-bold">{row.critical}C</span>}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="border-t border-slate-800 px-3 py-3">
          <p className="text-[11px] font-bold text-white mb-2">
            {TYPE_LABEL[selected.key] || selected.key} · {selected.assetCount} asset(s) · avg risk {selected.avgRisk} · {selected.findings} open finding(s)
          </p>
          <div className="space-y-1">
            {selected.assetRows.map((row) => {
              const color = riskColor(row.asset.risk_score || 0);
              return (
                <button
                  key={row.asset.id}
                  onClick={() => onSelect(row.asset)}
                  className="w-full flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:border-blue-500/50 transition"
                  style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}
                >
                  <span className="w-1.5 h-6 rounded" style={{ background: color }} />
                  <span className="text-[11px] text-slate-200 flex-1 min-w-0 truncate">{row.asset.name}</span>
                  <span className="text-[10px] font-mono" style={{ color }}>risk {row.asset.risk_score ?? "—"}</span>
                  <span className="text-[10px] text-slate-400">{row.findings} vuln</span>
                  {row.critical > 0 && <span className="text-[10px] text-red-300 font-bold">{row.critical} crit</span>}
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-300"><Link2 size={9} />{row.dependents}</span>
                  <ChevronRight size={11} className="text-slate-600" />
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-600 mt-2">Open an asset for its vulnerabilities and remediation plan.</p>
        </div>
      )}
    </div>
  );
}