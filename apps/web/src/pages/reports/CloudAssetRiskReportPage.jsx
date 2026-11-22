import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Box, Cloud, Database, RefreshCw, Server, ShieldAlert, Zap } from "lucide-react";

const TYPE_META = {
  database: { label: "Database", icon: Database },
  container: { label: "Container", icon: Box },
  ai_model: { label: "AI model", icon: Zap },
  compute: { label: "Compute", icon: Server },
  storage: { label: "Storage", icon: Database },
  api: { label: "API", icon: Cloud },
  serverless: { label: "Serverless", icon: Cloud },
};

const FILTERS = [
  { key: "all", label: "All assets" },
  { key: "database", label: "Databases" },
  { key: "container", label: "Containers" },
  { key: "ai_model", label: "AI models" },
  { key: "storage", label: "Storage" },
];

const BAND = {
  critical: { color: "#ef4444", label: "Critical" },
  high: { color: "#f97316", label: "High" },
  medium: { color: "#eab308", label: "Medium" },
  low: { color: "#22c55e", label: "Low" },
};

function bandFor(score) {
  if (score >= 85) return BAND.critical;
  if (score >= 70) return BAND.high;
  if (score >= 40) return BAND.medium;
  return BAND.low;
}

function RiskBar({ score }) {
  const band = bandFor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "#1F2937" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, score)}%`, background: band.color }} />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color: band.color }}>{score}</span>
    </div>
  );
}

function HighlightTile({ title, asset, icon: Icon, accent }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} style={{ color: accent }} />
        <p className="text-[10px] uppercase tracking-wide text-slate-500">{title}</p>
      </div>
      {asset ? (
        <>
          <p className="text-sm font-bold text-white truncate" title={asset.name}>{asset.name}</p>
          <p className="text-[10px] text-slate-500">
            Risk <span className="font-mono font-bold" style={{ color: bandFor(asset.risk_score || 0).color }}>{asset.risk_score ?? "—"}</span>
            {" · "}{asset.cloud_provider || "—"}{asset.region ? ` · ${asset.region}` : ""}
          </p>
        </>
      ) : (
        <p className="text-[11px] text-slate-600">No assets of this type</p>
      )}
    </div>
  );
}

export default function CloudAssetRiskReportPage() {
  const [assets, setAssets] = useState([]);
  const [findings, setFindings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [assetRows, findingRows] = await Promise.all([
      base44.entities.Asset.filter({ status: { $ne: "archived" } }, "-risk_score", 300).catch(() => []),
      base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 500).catch(() => []),
    ]);
    setAssets(assetRows || []);
    setFindings(findingRows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openByAsset = useMemo(() => {
    const counts = {};
    findings.forEach((finding) => {
      const key = (finding.asset_name || "").trim().toLowerCase();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [findings]);

  const byRisk = useMemo(
    () => [...assets].sort((a, b) => (b.risk_score ?? -1) - (a.risk_score ?? -1)),
    [assets]
  );

  const topOf = (type) => byRisk.find((asset) => asset.type === type) || null;

  const rows = useMemo(
    () => byRisk.filter((asset) => filter === "all" || asset.type === filter),
    [byRisk, filter]
  );

  const atRisk = assets.filter((asset) => (asset.risk_score ?? 0) >= 70).length;
  const withFindings = assets.filter((asset) => (openByAsset[(asset.name || "").toLowerCase()] || 0) > 0).length;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert size={22} className="text-red-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">RPT-009 | CLOUD RISK</span>
            <h1 className="text-xl font-bold text-white mt-1">Cloud assets × risk scores</h1>
            <p className="text-xs text-slate-500">Every discovered asset against its weighted risk score, so the riskiest databases and containers surface first.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/assets" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition">
            Asset inventory
          </Link>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <HighlightTile title="Highest risk asset" asset={byRisk[0]} icon={ShieldAlert} accent="#ef4444" />
        <HighlightTile title="Highest risk database" asset={topOf("database")} icon={Database} accent="#a855f7" />
        <HighlightTile title="Highest risk container" asset={topOf("container")} icon={Box} accent="#3b82f6" />
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #f59e0b" }}>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Portfolio</p>
          <p className="text-xl font-bold text-white">{assets.length}</p>
          <p className="text-[10px] text-slate-500">
            {atRisk} at high risk or above · {withFindings} with open findings
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            onClick={() => setFilter(option.key)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
              filter === option.key
                ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
                : "bg-transparent text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500">{rows.length} asset{rows.length === 1 ? "" : "s"}</span>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {loading ? (
          <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-12" />
        ) : rows.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-12">No assets match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500" style={{ borderBottom: "1px solid #1F2937" }}>
                  <th className="text-left py-2 px-3 font-medium">#</th>
                  <th className="text-left py-2 px-3 font-medium">Asset</th>
                  <th className="text-left py-2 px-3 font-medium">Type</th>
                  <th className="text-left py-2 px-3 font-medium">Provider</th>
                  <th className="text-left py-2 px-3 font-medium">Region</th>
                  <th className="text-left py-2 px-3 font-medium">Risk score</th>
                  <th className="text-left py-2 px-3 font-medium">Band</th>
                  <th className="text-left py-2 px-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((asset, index) => {
                  const score = asset.risk_score ?? 0;
                  const band = bandFor(score);
                  const open = openByAsset[(asset.name || "").toLowerCase()] || asset.open_findings || 0;
                  const meta = TYPE_META[asset.type] || { label: asset.type || "—", icon: Server };
                  const Icon = meta.icon;
                  return (
                    <tr key={asset.id} className="hover:bg-white/[0.03] transition" style={{ borderBottom: "1px solid #1F2937" }}>
                      <td className="py-2 px-3 text-slate-600 font-mono">{index + 1}</td>
                      <td className="py-2 px-3">
                        <span className="flex items-center gap-1.5 text-white font-medium">
                          <Icon size={12} className="text-slate-500" />
                          <span className="truncate max-w-[180px]" title={asset.name}>{asset.name}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 capitalize">{(meta.label || "").toLowerCase()}</td>
                      <td className="py-2 px-3 text-slate-400">{asset.cloud_provider || "—"}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{asset.region || "—"}</td>
                      <td className="py-2 px-3"><RiskBar score={score} /></td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: band.color, borderColor: `${band.color}55`, background: `${band.color}18` }}>
                          {band.label}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono" style={{ color: open > 0 ? "#ef4444" : "#22c55e" }}>{open}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600">
        Scores are the weighted values stored on each asset. Adjust the type weights and bands in Asset Risk Scoring.
      </p>
    </div>
  );
}