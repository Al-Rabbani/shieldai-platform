import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Building2, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import RiskTrendChart from "@/components/home/RiskTrendChart";

const CARD = { background: "#111827", border: "1px solid #1F2937" };

function scoreColor(score) {
  if (score >= 85) return "#22c55e";
  if (score >= 70) return "#3b82f6";
  if (score >= 55) return "#f59e0b";
  return "#ef4444";
}

export default function AdminDashboardView({ scores, findings, assets, incidents }) {
  const latest = scores[0] || null;
  const previous = scores[1] || null;
  const score = latest ? Number(latest.overall_score) || 0 : 0;
  const delta = previous ? score - (Number(previous.overall_score) || 0) : 0;

  const tiles = useMemo(() => [
    { label: "Posture score", value: latest ? `${score} ${latest.grade || ""}` : "—", color: scoreColor(score) },
    { label: "Critical findings", value: findings.filter((f) => f.severity === "critical").length, color: "#ef4444" },
    { label: "SLA breached", value: findings.filter((f) => f.sla_breached).length, color: "#f59e0b" },
    { label: "Business-critical assets", value: assets.filter((a) => a.business_criticality === "critical" && a.status !== "archived").length, color: "#a855f7" },
  ], [latest, score, findings, assets]);

  const criticalAssets = assets
    .filter((asset) => ["critical", "high"].includes(asset.business_criticality) && asset.status !== "archived")
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl p-3" style={{ ...CARD, borderLeft: `3px solid ${tile.color}` }}>
            <p className="text-lg font-bold font-mono text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RiskTrendChart />

        <div className="rounded-xl p-3" style={CARD}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Exposure & compliance</p>
            {delta !== 0 && (
              <span className={`flex items-center gap-1 text-[10px] font-bold ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {delta > 0 ? "+" : ""}{delta} pts
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Open findings", value: findings.length },
              { label: "High severity", value: findings.filter((f) => f.severity === "high").length },
              { label: "Exploited in the wild", value: findings.filter((f) => f.exploited_in_wild).length },
              { label: "Compliance average", value: latest?.compliance_avg_score != null ? `${latest.compliance_avg_score}%` : "—" },
              { label: "Assets protected", value: latest?.assets_protected ?? assets.filter((a) => a.status === "active").length },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{row.label}</span>
                <span className="font-mono font-bold text-white">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={CARD}>
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 size={13} className="text-purple-400" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Business-critical exposure</p>
            <Link to="/assets" className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300">Asset inventory →</Link>
          </div>
          {criticalAssets.length === 0 ? (
            <p className="text-[11px] text-slate-600">No business-critical assets rated yet.</p>
          ) : (
            <div className="space-y-1.5">
              {criticalAssets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${asset.business_criticality === "critical" ? "text-red-300 border-red-500/40 bg-red-500/10" : "text-orange-300 border-orange-500/40 bg-orange-500/10"}`}>
                    {asset.business_criticality}
                  </span>
                  <span className="text-slate-200 truncate">{asset.name}</span>
                  <span className="ml-auto font-mono text-slate-400">{asset.risk_score ?? "—"}</span>
                  <span className="font-mono text-red-400">{asset.open_findings || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-3" style={CARD}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={13} className="text-orange-400" />
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Latest incidents</p>
            <Link to="/incidents" className="ml-auto text-[10px] font-bold text-blue-400 hover:text-blue-300">All incidents →</Link>
          </div>
          {incidents.length === 0 ? (
            <p className="text-[11px] text-slate-600">No incidents recorded.</p>
          ) : (
            <div className="space-y-1.5">
              {incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${incident.severity === "critical" ? "bg-red-500" : incident.severity === "high" ? "bg-orange-500" : "bg-slate-500"}`} />
                  <span className="text-slate-200 truncate">{incident.title}</span>
                  <span className="ml-auto text-[10px] text-slate-500 capitalize">{(incident.status || "").replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-600 flex items-center gap-1">
        <ShieldCheck size={11} /> Admin view — org-wide posture, exposure and compliance only.
      </p>
    </div>
  );
}