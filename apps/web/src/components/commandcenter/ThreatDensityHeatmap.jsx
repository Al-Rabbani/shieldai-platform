import React, { useMemo, useState } from "react";
import { Flame, Filter } from "lucide-react";

const WEIGHTS = { critical: 10, high: 5, medium: 2, low: 1, info: 0 };
const SEV_TEXT = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
  info: "text-slate-400",
};

function typeLabel(value) {
  return value === "untyped" ? "untyped target" : value;
}

export default function ThreatDensityHeatmap({ findings = [] }) {
  const [assetType, setAssetType] = useState("all");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [selected, setSelected] = useState(null);

  const types = useMemo(
    () => [...new Set(findings.map((f) => f.asset_type || "untyped"))].sort(),
    [findings]
  );

  const scoped = useMemo(
    () =>
      findings.filter((f) => {
        if (assetType !== "all" && (f.asset_type || "untyped") !== assetType) return false;
        if (criticalOnly && f.severity !== "critical") return false;
        return true;
      }),
    [findings, assetType, criticalOnly]
  );

  const cells = useMemo(() => {
    const map = new Map();
    scoped.forEach((f) => {
      const key = f.asset_name || "unattributed";
      const cell =
        map.get(key) ||
        { name: key, type: f.asset_type || "untyped", critical: 0, high: 0, medium: 0, low: 0, total: 0, weight: 0, findings: [] };
      cell[f.severity] = (cell[f.severity] || 0) + 1;
      cell.total += 1;
      cell.weight += WEIGHTS[f.severity] ?? 0;
      cell.findings.push(f);
      map.set(key, cell);
    });
    return [...map.values()].sort((a, b) => b.weight - a.weight || b.critical - a.critical);
  }, [scoped]);

  const maxWeight = Math.max(1, ...cells.map((c) => c.weight));
  const selectedCell = cells.find((c) => c.name === selected) || null;
  const criticalTotal = scoped.filter((f) => f.severity === "critical").length;

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-red-400" />
          <h2 className="text-sm font-bold text-white">Threat Density Heatmap</h2>
          <span className="text-[10px] text-slate-500">
            {scoped.length} open finding(s) · {cells.length} target(s) · {criticalTotal} critical
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-500" />
          <select
            value={assetType}
            onChange={(e) => { setAssetType(e.target.value); setSelected(null); }}
            aria-label="Filter by asset type"
            className="bg-[#0a0f1e] border border-slate-700 rounded-lg text-[11px] text-slate-300 px-2 py-1.5 outline-none focus:border-blue-500"
          >
            <option value="all">All asset types</option>
            {types.map((t) => (
              <option key={t} value={t}>{typeLabel(t)}</option>
            ))}
          </select>
          <button
            onClick={() => setCriticalOnly((v) => !v)}
            aria-pressed={criticalOnly}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
              criticalOnly
                ? "bg-red-500/20 border-red-500/40 text-red-300"
                : "bg-transparent border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            Critical only
          </button>
        </div>
      </div>

      <div className="p-4">
        {cells.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">
            No findings match this filter. Heat intensity reflects open findings only.
          </p>
        ) : (
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(78px, 1fr))" }}
          >
            {cells.map((cell) => {
              const intensity = cell.weight / maxWeight;
              const bg = cell.critical > 0
                ? `rgba(239,68,68,${0.16 + intensity * 0.74})`
                : `rgba(245,158,11,${0.12 + intensity * 0.52})`;
              return (
                <button
                  key={cell.name}
                  onClick={() => setSelected(selected === cell.name ? null : cell.name)}
                  title={`${cell.name} · ${cell.total} open · ${cell.critical} critical, ${cell.high} high, ${cell.medium} medium, ${cell.low} low`}
                  aria-label={`${cell.name}, ${cell.total} open findings, ${cell.critical} critical`}
                  className={`rounded-md p-2 text-left transition hover:scale-[1.03] ${
                    selected === cell.name ? "ring-2 ring-blue-400" : ""
                  }`}
                  style={{ background: bg, border: "1px solid rgba(148,163,184,0.18)" }}
                >
                  <span className="block text-[10px] font-semibold text-white/90 truncate">{cell.name}</span>
                  <span className="block text-[9px] text-white/60 truncate">{typeLabel(cell.type)}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-white/85">
                    {cell.critical > 0 && <span className="text-red-200">C{cell.critical}</span>}
                    {cell.high > 0 && <span className="text-orange-200">H{cell.high}</span>}
                    <span className="text-white/50">{cell.total}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(245,158,11,0.5)" }} /> No critical
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(239,68,68,0.85)" }} /> Critical present
          </span>
          <span>Intensity = weighted density (critical 10 · high 5 · medium 2 · low 1)</span>
        </div>

        {selectedCell && (
          <div className="mt-4 rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-white truncate">
                {selectedCell.name} <span className="text-slate-500 font-normal">· {typeLabel(selectedCell.type)}</span>
              </p>
              <button onClick={() => setSelected(null)} className="text-[10px] text-slate-500 hover:text-slate-300">Close</button>
            </div>
            <div className="space-y-1.5">
              {selectedCell.findings.slice(0, 8).map((f) => (
                <div key={f.id} className="flex items-start justify-between gap-2">
                  <span className="text-[11px] text-slate-300 truncate">{f.title}</span>
                  <span className={`text-[10px] font-bold uppercase flex-shrink-0 ${SEV_TEXT[f.severity] || SEV_TEXT.info}`}>
                    {f.severity}
                  </span>
                </div>
              ))}
              {selectedCell.findings.length > 8 && (
                <p className="text-[10px] text-slate-500">and {selectedCell.findings.length - 8} more</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}