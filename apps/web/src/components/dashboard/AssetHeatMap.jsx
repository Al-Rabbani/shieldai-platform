import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Flame, ExternalLink } from "lucide-react";

const ENV_ORDER = ["production", "staging", "development"];
const TYPE_ORDER = ["repository", "vm", "cloud", "api", "container", "domain"];
const PROVIDER_COLORS = { aws: "#f97316", gcp: "#3b82f6", azure: "#06b6d4", other: "#8b5cf6" };

function heatColor(score) {
  if (score >= 80) return { bg: "rgba(239,68,68,0.85)",  border: "#ef4444", text: "#fff" };
  if (score >= 60) return { bg: "rgba(249,115,22,0.75)", border: "#f97316", text: "#fff" };
  if (score >= 40) return { bg: "rgba(234,179,8,0.65)",  border: "#eab308", text: "#0A0E1A" };
  if (score >= 20) return { bg: "rgba(99,102,241,0.55)", border: "#6366f1", text: "#fff" };
  return            { bg: "rgba(34,197,94,0.25)",        border: "#22c55e", text: "#22c55e" };
}

// Synthetic demo grid when no real assets
const DEMO_ASSETS = [
  { id: "d1", name: "prod-api-gateway", asset_type: "api",        environment: "production",  risk_score: 92, critical_count: 3, provider: "aws" },
  { id: "d2", name: "prod-db-postgres",  asset_type: "vm",         environment: "production",  risk_score: 78, critical_count: 2, provider: "aws" },
  { id: "d3", name: "auth-service",      asset_type: "repository", environment: "production",  risk_score: 65, critical_count: 1, provider: "aws" },
  { id: "d4", name: "cdn-edge",          asset_type: "domain",     environment: "production",  risk_score: 34, critical_count: 0, provider: "azure" },
  { id: "d5", name: "k8s-cluster-prod",  asset_type: "container",  environment: "production",  risk_score: 71, critical_count: 2, provider: "gcp" },
  { id: "d6", name: "staging-api",       asset_type: "api",        environment: "staging",     risk_score: 55, critical_count: 1, provider: "aws" },
  { id: "d7", name: "staging-db",        asset_type: "vm",         environment: "staging",     risk_score: 40, critical_count: 0, provider: "aws" },
  { id: "d8", name: "frontend-stg",      asset_type: "repository", environment: "staging",     risk_score: 28, critical_count: 0, provider: "gcp" },
  { id: "d9", name: "ci-runner",         asset_type: "vm",         environment: "development", risk_score: 18, critical_count: 0, provider: "aws" },
  { id: "d10", name: "dev-sandbox",      asset_type: "cloud",      environment: "development", risk_score: 22, critical_count: 0, provider: "azure" },
];

function AssetCell({ asset, onHover, isHovered }) {
  const c = heatColor(asset.risk_score || 0);
  const size = asset.critical_count > 0
    ? asset.critical_count >= 3 ? "lg" : "md"
    : "sm";
  const dims = { lg: "min-h-[72px]", md: "min-h-[56px]", sm: "min-h-[44px]" };

  return (
    <div
      className={`relative rounded-lg p-2 cursor-pointer transition-all duration-200 ${dims[size]} ${isHovered ? "scale-105 z-10" : ""}`}
      style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: isHovered ? `0 0 16px ${c.border}88` : "none" }}
      onMouseEnter={() => onHover(asset)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="text-[10px] font-bold truncate" style={{ color: c.text }}>{asset.name}</div>
      <div className="text-[9px] mt-0.5 font-mono font-black" style={{ color: c.text }}>
        {asset.risk_score || 0}
        {asset.critical_count > 0 && <span className="ml-1">· {asset.critical_count}🔴</span>}
      </div>
    </div>
  );
}

export default function AssetHeatMap() {
  const [hovered, setHovered] = useState(null);
  const [envFilter, setEnvFilter] = useState("all");

  const { data: assets = [] } = useQuery({
    queryKey: ["heatmap-assets"],
    queryFn: () => base44.entities.ASPMAsset.list("-risk_score", 100).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const displayAssets = assets.length > 0 ? assets : DEMO_ASSETS;
  const filtered = envFilter === "all" ? displayAssets : displayAssets.filter(a => a.environment === envFilter);

  // Group by environment × asset_type
  const grid = ENV_ORDER.reduce((acc, env) => {
    acc[env] = TYPE_ORDER.reduce((tacc, type) => {
      tacc[type] = filtered.filter(a => a.environment === env && a.asset_type === type);
      return tacc;
    }, {});
    return acc;
  }, {});

  const topRisk = [...displayAssets].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 3);

  return (
    <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: "#1F2937" }}>
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-white">Asset Risk Heat Map</h3>
          <span className="text-[10px] text-slate-500">({displayAssets.length} assets · live)</span>
          {assets.length === 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">demo data</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-2 mr-3">
            {[{ label: "Critical 80+", color: "#ef4444" }, { label: "High 60+", color: "#f97316" }, { label: "Med 40+", color: "#eab308" }, { label: "Low", color: "#22c55e" }].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                <span className="text-[9px] text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
          {/* Env filter */}
          <select value={envFilter} onChange={e => setEnvFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg text-slate-300 outline-none"
            style={{ background: "#1F2937", border: "1px solid #374151" }}>
            <option value="all">All Envs</option>
            {ENV_ORDER.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <Link to="/aspm" className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
            Full View <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="flex gap-0">
        {/* Grid */}
        <div className="flex-1 overflow-x-auto p-4">
          {/* Column headers */}
          <div className="grid mb-2" style={{ gridTemplateColumns: `80px repeat(${TYPE_ORDER.length}, 1fr)`, gap: "4px" }}>
            <div />
            {TYPE_ORDER.map(t => (
              <div key={t} className="text-[9px] font-bold text-center text-slate-500 uppercase tracking-wider pb-1">{t}</div>
            ))}
          </div>

          {ENV_ORDER.filter(env => envFilter === "all" || env === envFilter).map(env => {
            const hasAny = TYPE_ORDER.some(t => (grid[env][t] || []).length > 0);
            if (!hasAny && envFilter !== "all") return null;
            return (
              <div key={env} className="grid mb-2 items-start" style={{ gridTemplateColumns: `80px repeat(${TYPE_ORDER.length}, 1fr)`, gap: "4px" }}>
                {/* Row label */}
                <div className="flex items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    env === "production" ? "text-red-400" : env === "staging" ? "text-yellow-400" : "text-blue-400"
                  }`}>{env}</span>
                </div>
                {TYPE_ORDER.map(type => {
                  const cells = grid[env][type] || [];
                  return (
                    <div key={type} className="flex flex-col gap-1 min-h-[44px]">
                      {cells.length === 0
                        ? <div className="rounded-lg min-h-[44px]" style={{ background: "#0d1220", border: "1px dashed #1F2937" }} />
                        : cells.map(asset => (
                            <AssetCell key={asset.id} asset={asset} onHover={setHovered} isHovered={hovered?.id === asset.id} />
                          ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Tooltip / top risks sidebar */}
        <div className="w-48 flex-shrink-0 border-l p-3 space-y-3" style={{ borderColor: "#1F2937", background: "#0d1220" }}>
          {hovered ? (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Detail</p>
              <div className="space-y-2">
                <p className="text-xs font-bold text-white break-words">{hovered.name}</p>
                <div style={{ color: heatColor(hovered.risk_score || 0).border }}>
                  <span className="text-2xl font-black">{hovered.risk_score || 0}</span>
                  <span className="text-[10px] ml-1">risk score</span>
                </div>
                {[
                  ["Type", hovered.asset_type],
                  ["Env", hovered.environment],
                  ["Provider", hovered.provider || hovered.linked_cloud_account || "—"],
                  ["Critical", hovered.critical_count || 0],
                  ["High", hovered.high_count || 0],
                  ["Total Findings", hovered.total_findings || 0],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[10px]">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-200 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Top Risk Assets</p>
              <div className="space-y-2">
                {topRisk.map((a, i) => {
                  const c = heatColor(a.risk_score || 0);
                  return (
                    <div key={a.id} className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-600">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white truncate">{a.name}</p>
                        <p className="text-[9px] text-slate-500">{a.environment}</p>
                      </div>
                      <span className="text-[10px] font-black" style={{ color: c.border }}>{a.risk_score || 0}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}