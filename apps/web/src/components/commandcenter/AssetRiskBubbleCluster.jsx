import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CircleDot, X } from "lucide-react";

const PROVIDERS = ["AWS", "GCP", "Azure"];
const PROVIDER_ACCENT = { AWS: "#f97316", GCP: "#3b82f6", Azure: "#0ea5e9" };
const TYPE_LABEL = {
  compute: "Compute",
  storage: "Storage",
  database: "Database",
  ai_model: "AI model",
  api: "API",
  container: "Container",
  serverless: "Serverless",
};

function severityOf(finding) {
  return (finding.severity || finding.normalized_severity || "info").toLowerCase();
}

export default function AssetRiskBubbleCluster({ findings, cloudFindings }) {
  const [assets, setAssets] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Asset.list("-created_date", 400).then((rows) => setAssets(rows || [])).catch(() => setAssets([]));
  }, []);

  const openByAsset = useMemo(() => {
    const map = new Map();
    const add = (name, severity, critical) => {
      if (!name) return;
      const row = map.get(name) || { total: 0, critical: 0, high: 0 };
      row.total += 1;
      if (critical) row.critical += 1;
      if (severity === "high") row.high += 1;
      map.set(name, row);
    };
    (findings || []).forEach((finding) => add(finding.asset_name, severityOf(finding), severityOf(finding) === "critical"));
    (cloudFindings || []).forEach((finding) => {
      if (finding.status && finding.status !== "open") return;
      const name = finding.resource_name || finding.asset_name;
      add(name, (finding.severity || "").toLowerCase(), (finding.severity || "").toLowerCase() === "critical");
    });
    return map;
  }, [findings, cloudFindings]);

  const clusters = useMemo(() => {
    const map = new Map();
    assets.forEach((asset) => {
      const provider = PROVIDERS.includes(asset.cloud_provider) ? asset.cloud_provider : "Other";
      const type = asset.type || "unmapped";
      const key = `${provider}|${type}`;
      const row = map.get(key) || {
        key,
        provider,
        type,
        assets: 0,
        findings: 0,
        critical: 0,
        high: 0,
        riskSum: 0,
        samples: [],
      };
      const open = openByAsset.get(asset.name) || { total: 0, critical: 0, high: 0 };
      row.assets += 1;
      row.findings += open.total;
      row.critical += open.critical;
      row.high += open.high;
      row.riskSum += asset.risk_score || 0;
      if (open.total > 0 && row.samples.length < 5) {
        row.samples.push({ name: asset.name, open: open.total, critical: open.critical, lastScanned: asset.last_scanned });
      }
      map.set(key, row);
    });
    return [...map.values()].map((row) => ({
      ...row,
      avgRisk: row.assets ? Math.round(row.riskSum / row.assets) : 0,
      density: row.assets ? row.findings / row.assets : 0,
    }));
  }, [assets, openByAsset]);

  const maxDensity = Math.max(0.01, ...clusters.map((cluster) => cluster.density));
  const groups = useMemo(() => {
    const byProvider = new Map();
    clusters.forEach((cluster) => {
      if (!byProvider.has(cluster.provider)) byProvider.set(cluster.provider, []);
      byProvider.get(cluster.provider).push(cluster);
    });
    return [...byProvider.entries()]
      .map(([provider, rows]) => ({
        provider,
        rows: rows.sort((a, b) => b.density - a.density),
      }))
      .sort((a, b) => PROVIDERS.indexOf(a.provider) - PROVIDERS.indexOf(b.provider));
  }, [clusters]);

  // Bubble colour follows the cluster's current risk score band; size shows how many assets sit in it.
  function bubbleColor(cluster) {
    const intensity = 0.3 + (cluster.avgRisk / 100) * 0.6;
    if (cluster.avgRisk >= 85) return `rgba(239,68,68,${intensity})`;
    if (cluster.avgRisk >= 70) return `rgba(249,115,22,${intensity})`;
    if (cluster.avgRisk >= 40) return `rgba(234,179,8,${intensity})`;
    return `rgba(34,197,94,${Math.max(0.25, intensity * 0.7)})`;
  }

  function riskBand(cluster) {
    if (cluster.avgRisk >= 85) return "critical risk";
    if (cluster.avgRisk >= 70) return "high risk";
    if (cluster.avgRisk >= 40) return "medium risk";
    return "low risk";
  }

  function bubbleSize(cluster) {
    return 34 + Math.min(46, Math.sqrt(cluster.assets) * 16);
  }

  const selectedCluster = selected ? clusters.find((cluster) => cluster.key === selected) : null;

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <CircleDot size={15} className="text-blue-400" />
          <p className="text-sm font-bold text-white">Cloud asset risk clusters</p>
          <span className="text-[10px] text-slate-500">bubble size = assets · colour = cluster risk score</span>
        </div>
        {selectedCluster && (
          <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white">
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {clusters.length === 0 ? (
        <p className="text-xs text-slate-500 py-8 text-center">No cloud assets discovered yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 px-4 py-4">
            {groups.map((group) => (
              <div key={group.provider} className="flex-1 min-w-[150px]">
                <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: PROVIDER_ACCENT[group.provider] || "#64748b" }}>
                  {group.provider}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  {group.rows.map((cluster) => {
                    const size = bubbleSize(cluster);
                    return (
                      <button
                        key={cluster.key}
                        onClick={() => setSelected(selected === cluster.key ? null : cluster.key)}
                        title={`${TYPE_LABEL[cluster.type] || cluster.type}: ${cluster.assets} assets · risk ${cluster.avgRisk} (${riskBand(cluster)}) · ${cluster.findings} open findings`}
                        className={`rounded-full flex flex-col items-center justify-center transition ${selected === cluster.key ? "ring-2 ring-blue-400" : "hover:brightness-125"}`}
                        style={{
                          width: size,
                          height: size,
                          background: bubbleColor(cluster),
                          border: "1px solid rgba(148,163,184,0.25)",
                        }}
                      >
                        <span className="text-[9px] font-bold text-white leading-none text-center px-1">
                          {TYPE_LABEL[cluster.type] || cluster.type}
                        </span>
                        <span className="text-[10px] font-mono text-white/90 leading-tight">{cluster.findings}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedCluster ? (
            <div className="px-4 pb-4">
              <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <p className="text-xs font-bold text-white">
                  {selectedCluster.provider} · {TYPE_LABEL[selectedCluster.type] || selectedCluster.type}
                </p>
                <p className="text-[10px] text-slate-500 mb-2">
                  {selectedCluster.assets} assets · {selectedCluster.findings} open findings ({selectedCluster.critical} critical,{" "}
                  {selectedCluster.high} high) · avg risk {selectedCluster.avgRisk}
                </p>
                {selectedCluster.samples.length === 0 ? (
                  <p className="text-[11px] text-emerald-400">No open findings in this segment.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedCluster.samples.map((sample) => (
                      <div key={sample.name} className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-300 truncate flex-1">{sample.name}</span>
                        <span className="font-mono text-slate-400">{sample.open} open</span>
                        {sample.critical > 0 && <span className="text-red-400 font-bold">{sample.critical} crit</span>}
                        <span className="text-slate-600">{sample.lastScanned ? "scanned" : "never scanned"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="px-4 pb-3 text-[10px] text-slate-600">Click a bubble to see the assets behind it.</p>
          )}
        </>
      )}
    </div>
  );
}