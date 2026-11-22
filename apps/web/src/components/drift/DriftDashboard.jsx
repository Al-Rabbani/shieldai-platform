import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldAlert, TrendingUp } from "lucide-react";

const DAY = 86400000;
const HISTORY_DAYS = 14;

const SEV_DOT = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-blue-400",
};

function dayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function riskColor(score) {
  if (score == null) return "#64748b";
  if (score >= 85) return "#ef4444";
  if (score >= 70) return "#f97316";
  if (score >= 40) return "#eab308";
  return "#22c55e";
}

export default function DriftDashboard({ drifts }) {
  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Asset.list("-created_date", 300),
    initialData: [],
  });

  const days = useMemo(
    () => Array.from({ length: HISTORY_DAYS }, (_, index) => new Date(Date.now() - (HISTORY_DAYS - 1 - index) * DAY).toISOString().slice(0, 10)),
    []
  );

  const perAsset = useMemo(() => {
    const map = new Map();
    drifts.forEach((drift) => {
      const key = drift.asset || "unassigned";
      if (!map.has(key)) map.set(key, { asset: key, total: 0, open: 0, critical: 0, latest: null, byDay: {} });
      const entry = map.get(key);
      entry.total += 1;
      if (drift.status !== "corrected" && drift.status !== "accepted") entry.open += 1;
      if (drift.severity === "critical" || drift.severity === "high") entry.critical += 1;
      const stamp = drift.detected_at || drift.created_date;
      if (stamp) {
        const key2 = dayKey(stamp);
        entry.byDay[key2] = (entry.byDay[key2] || 0) + 1;
        if (!entry.latest || new Date(stamp) > new Date(entry.latest)) entry.latest = stamp;
      }
    });
    return map;
  }, [drifts]);

  const ranked = useMemo(() => {
    const withRisk = assets
      .filter((asset) => asset.status !== "archived")
      .map((asset) => {
        const driftInfo = perAsset.get(asset.name) || { total: 0, open: 0, critical: 0, latest: null, byDay: {} };
        return { ...driftInfo, name: asset.name, risk: asset.risk_score, type: asset.type, status: asset.status };
      });
    return withRisk
      .filter((asset) => asset.total > 0 || (asset.risk || 0) >= 70)
      .sort((a, b) => (b.open * 10 + (b.risk || 0)) - (a.open * 10 + (a.risk || 0)))
      .slice(0, 8);
  }, [assets, perAsset]);

  const openDrifts = drifts.filter((drift) => drift.status !== "corrected" && drift.status !== "accepted");
  const assetsWithDrift = [...perAsset.values()].filter((entry) => entry.total > 0).length;
  const baselineClean = assets.filter((asset) => asset.status !== "archived").length
    ? Math.round(((assets.filter((asset) => asset.status !== "archived").length - [...perAsset.values()].filter((entry) => entry.open > 0).length) / assets.filter((asset) => asset.status !== "archived").length) * 100)
    : 100;

  const recent = drifts.slice(0, 6);

  if (drifts.length === 0) {
    return (
      <div className="rounded-xl py-12 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <ShieldAlert size={22} className="mx-auto text-slate-600 mb-2" />
        <p className="text-xs text-slate-500">No drift recorded yet — the dashboard fills in the moment an asset deviates from its baseline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "Assets with drift", value: assetsWithDrift, color: "#f59e0b" },
          { label: "Unauthorized changes open", value: openDrifts.length, color: "#ef4444" },
          { label: "Critical / high", value: openDrifts.filter((d) => d.severity === "critical" || d.severity === "high").length, color: "#f97316" },
          { label: "Assets on baseline", value: `${baselineClean}%`, color: "#22c55e" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${tile.color}` }}>
            <p className="text-lg font-bold font-mono text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500">{tile.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2937" }}>
          <TrendingUp size={13} className="text-red-400" />
          <p className="text-xs font-bold text-white">Most critical assets</p>
          <p className="ml-auto text-[10px] text-slate-500">last {HISTORY_DAYS} days</p>
        </div>
        <div className="divide-y divide-slate-800">
          {ranked.map((asset) => {
            const openCount = asset.open || 0;
            return (
              <div key={asset.name} className="px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: riskColor(asset.risk) }} />
                  <span className="text-[11px] font-semibold text-white truncate">{asset.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">risk {asset.risk ?? "—"}</span>
                  {openCount > 0 ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-red-300 border-red-500/40 bg-red-500/10">{openCount} open</span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-emerald-300 border-emerald-500/40 bg-emerald-500/10">on baseline</span>
                  )}
                  {asset.critical > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-orange-300 border-orange-500/40 bg-orange-500/10">{asset.critical} critical/high</span>
                  )}
                  <span className="ml-auto text-[10px] text-slate-600">
                    {asset.latest ? new Date(asset.latest).toLocaleDateString("en-GB") : "no drift"}
                  </span>
                </div>
                <div className="flex items-center gap-[3px] mt-1.5">
                  {days.map((day) => {
                    const count = asset.byDay?.[day] || 0;
                    return (
                      <div
                        key={day}
                        title={`${day}: ${count} drift${count === 1 ? "" : "s"}`}
                        className="flex-1 rounded-sm"
                        style={{
                          height: 10,
                          background: count === 0 ? "#1e293b" : count >= 3 ? "#ef4444" : count === 2 ? "#f97316" : "#eab308",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: "1px solid #1F2937" }}>
          <ShieldAlert size={13} className="text-amber-400" />
          <p className="text-xs font-bold text-white">Recent unauthorized changes</p>
        </div>
        <div className="divide-y divide-slate-800">
          {recent.map((drift) => (
            <div key={drift.id} className="px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[drift.severity] || SEV_DOT.low}`} />
                <span className="text-[11px] font-semibold text-white truncate">{drift.asset}</span>
                <span className="text-[10px] text-slate-500 uppercase">{String(drift.drift_type || "").replace(/_/g, " ")}</span>
                <span className="ml-auto text-[10px] text-slate-500">
                  {drift.detected_at ? new Date(drift.detected_at).toLocaleString("en-GB") : ""}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="text-[10px] font-mono text-emerald-300 truncate max-w-[46%]">{drift.expected_value || "—"}</span>
                <ArrowRight size={10} className="text-slate-600" />
                <span className="text-[10px] font-mono text-red-300 truncate max-w-[46%]">{drift.actual_value || "—"}</span>
                {drift.status === "corrected" && <span className="text-[9px] text-emerald-400 ml-auto">reverted</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}