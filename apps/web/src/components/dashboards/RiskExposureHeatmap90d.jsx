import React, { useCallback, useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import ExposureAssetDrawer from "@/components/dashboards/ExposureAssetDrawer";
import { Flame } from "lucide-react";

const WEEKS = 13;
const DAY = 86400000;

const LABEL = {
  compute: "Compute",
  storage: "Storage",
  database: "Database",
  ai_model: "AI model",
  api: "API",
  container: "Container",
  serverless: "Serverless",
  vm: "Virtual machine",
  cloud: "Cloud account",
  repository: "Repository",
  domain: "Domain",
  unknown: "Unclassified",
};

function weekBounds(index, now) {
  const end = now - (WEEKS - index - 1) * 7 * DAY;
  return { from: end - 7 * DAY, to: end, label: new Date(end - 7 * DAY).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) };
}

export default function RiskExposureHeatmap90d() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState(null);

  const load = useCallback(async () => {
    const rows = await base44.entities.TriagedFinding.list("-cvss_score", 500).catch(() => []);
    setFindings(rows || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = useMemo(() => Date.now(), []);
  const buckets = useMemo(() => Array.from({ length: WEEKS }, (_, index) => weekBounds(index, now)), [now]);

  const dated = useMemo(
    () => findings
      .map((finding) => ({ ...finding, at: new Date(finding.detected_at || finding.created_date).getTime() }))
      .filter((finding) => Number.isFinite(finding.at)),
    [findings]
  );

  const { rows, max } = useMemo(() => {
    const grid = {};
    dated.forEach((finding) => {
      const type = finding.asset_type || "unknown";
      const index = buckets.findIndex((bucket) => finding.at > bucket.from && finding.at <= bucket.to);
      if (index === -1) return;
      grid[type] = grid[type] || Array(WEEKS).fill(0);
      grid[type][index] += 1;
    });
    const sorted = Object.entries(grid)
      .map(([type, cells]) => ({ type, cells, total: cells.reduce((sum, value) => sum + value, 0) }))
      .sort((a, b) => b.total - a.total);
    const highest = sorted.reduce((peak, row) => Math.max(peak, ...row.cells), 0);
    return { rows: sorted, max: highest || 1 };
  }, [dated, buckets]);

  const rangeLabel = `${new Date(now - WEEKS * 7 * DAY).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${new Date(now).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
  const totalInWindow = rows.reduce((sum, row) => sum + row.total, 0);

  if (loading) return <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-10" />;

  if (rows.length === 0) {
    return <p className="text-xs text-slate-500 py-8 text-center">No findings carry a discovery date in the last 90 days yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          {totalInWindow} finding{totalInWindow === 1 ? "" : "s"} across {rows.length} asset types · {rangeLabel}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span>low</span>
          {[0.15, 0.35, 0.55, 0.8, 1].map((step) => (
            <span key={step} className="w-3.5 h-3.5 rounded-sm border border-slate-800" style={{ background: `rgba(59,130,246,${step})` }} />
          ))}
          <span>high</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: "2px", minWidth: 620 }}>
          <thead>
            <tr>
              <th className="text-left text-[10px] font-medium text-slate-500 pb-1 pl-1">Asset type</th>
              {buckets.map((bucket) => (
                <th key={bucket.label} className="text-[9px] font-medium text-slate-600 pb-1 text-center whitespace-nowrap">{bucket.label}</th>
              ))}
              <th className="text-[9px] font-medium text-slate-600 pb-1 text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.type}>
                <td className="text-[11px] text-slate-300 pr-2 whitespace-nowrap">{LABEL[row.type] || row.type}</td>
                {row.cells.map((count, index) => {
                  const intensity = count === 0 ? 0 : 0.15 + 0.85 * (count / max);
                  const bucket = buckets[index];
                  return (
                    <td key={index} className="p-0">
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => setSelection({ assetType: row.type, from: bucket.from, to: bucket.to, label: bucket.label })}
                        title={count === 0 ? "No findings" : `${count} finding${count === 1 ? "" : "s"} · click to review`}
                        className={`w-full h-8 rounded-sm text-[10px] font-bold transition ${count === 0 ? "cursor-default" : "hover:ring-2 hover:ring-blue-400/60"}`}
                        style={{
                          background: count === 0 ? "#0d1421" : `rgba(59,130,246,${intensity})`,
                          color: count === 0 ? "#334155" : "#eff6ff",
                          border: "1px solid #1F2937",
                        }}
                      >
                        {count === 0 ? "" : count}
                      </button>
                    </td>
                  );
                })}
                <td className="text-center text-[11px] font-bold text-white">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
        <Flame size={11} className="text-blue-400" /> Click any cell to open the assets behind it, then an asset to see the vulnerabilities found on it.
      </p>

      {selection && (
        <ExposureAssetDrawer
          selection={selection}
          findings={dated}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}