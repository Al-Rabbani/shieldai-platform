import React, { useMemo, useState } from "react";
import { Layers, ChevronRight, ShieldAlert, Wrench } from "lucide-react";

const WEIGHTS = { critical: 10, high: 5, medium: 2, low: 1, info: 0 };
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

function sectorLabel(value) {
  return value === "untyped" ? "Untyped targets" : `${value} sector`;
}

export default function SectorDrillDown({ findings = [] }) {
  const [sector, setSector] = useState(null);
  const [asset, setAsset] = useState(null);

  const sectors = useMemo(() => {
    const map = new Map();
    findings.forEach((f) => {
      const key = f.asset_type || "untyped";
      const entry = map.get(key) || { key, total: 0, critical: 0, high: 0, weight: 0, assets: new Map() };
      entry.total += 1;
      if (f.severity === "critical") entry.critical += 1;
      if (f.severity === "high") entry.high += 1;
      entry.weight += WEIGHTS[f.severity] ?? 0;
      const assetKey = f.asset_name || "unattributed";
      const assetEntry = entry.assets.get(assetKey) || { name: assetKey, findings: [], critical: 0, high: 0 };
      assetEntry.findings.push(f);
      if (f.severity === "critical") assetEntry.critical += 1;
      if (f.severity === "high") assetEntry.high += 1;
      entry.assets.set(assetKey, assetEntry);
      map.set(key, entry);
    });
    return [...map.values()]
      .map((entry) => ({
        ...entry,
        assetList: [...entry.assets.values()].sort(
          (a, b) => b.critical - a.critical || b.findings.length - a.findings.length
        ),
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [findings]);

  const knownAssets = useMemo(() => {
    const names = new Set();
    findings.forEach((f) => { if (f.asset_name) names.add(f.asset_name); });
    return names.size;
  }, [findings]);

  const activeSector = sectors.find((s) => s.key === sector) || null;
  const activeAsset = activeSector?.assetList.find((a) => a.name === asset) || null;
  const maxWeight = Math.max(1, ...sectors.map((s) => s.weight));

  return (
    <div className="rounded-xl" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-blue-400" />
          <h2 className="text-sm font-bold text-white">Sector Drill-Down</h2>
          <span className="text-[10px] text-slate-500">
            {sectors.length} sector(s) · {knownAssets} asset(s) · {findings.length} open finding(s)
          </span>
        </div>
        {(sector || asset) && (
          <button
            onClick={() => { setSector(null); setAsset(null); }}
            className="text-[10px] text-slate-500 hover:text-slate-300"
          >
            Reset
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {sectors.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No open findings to break down by sector.</p>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
            {sectors.map((s) => {
              const intensity = s.weight / maxWeight;
              const selected = sector === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => { setSector(selected ? null : s.key); setAsset(null); }}
                  className={`rounded-lg p-2.5 text-left transition hover:scale-[1.02] ${selected ? "ring-2 ring-blue-400" : ""}`}
                  style={{
                    background: s.critical > 0
                      ? `rgba(239,68,68,${0.16 + intensity * 0.6})`
                      : `rgba(59,130,246,${0.12 + intensity * 0.4})`,
                    border: "1px solid rgba(148,163,184,0.18)",
                  }}
                >
                  <span className="block text-[10px] font-semibold text-white/90 truncate">{sectorLabel(s.key)}</span>
                  <span className="block text-[9px] text-white/60">{s.assetList.length} asset(s)</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-white/85">
                    {s.critical > 0 && <span className="text-red-200">C{s.critical}</span>}
                    {s.high > 0 && <span className="text-orange-200">H{s.high}</span>}
                    <span className="text-white/50">{s.total}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeSector && (
          <div className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
            <p className="text-xs font-bold text-white mb-2">
              {sectorLabel(activeSector.key)}
              <span className="text-slate-500 font-normal"> · {activeSector.total} open finding(s)</span>
            </p>
            <div className="space-y-1">
              {activeSector.assetList.map((a) => {
                const isOpen = asset === a.name;
                return (
                  <button
                    key={a.name}
                    onClick={() => setAsset(isOpen ? null : a.name)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition ${isOpen ? "bg-blue-500/15" : "hover:bg-white/5"}`}
                  >
                    <ChevronRight size={12} className={`text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    <span className="flex-1 min-w-0 text-[11px] text-slate-200 truncate">{a.name}</span>
                    {a.critical > 0 && <span className="text-[9px] font-bold text-red-300">C{a.critical}</span>}
                    {a.high > 0 && <span className="text-[9px] font-bold text-orange-300">H{a.high}</span>}
                    <span className="text-[10px] font-mono text-slate-500">{a.findings.length}</span>
                  </button>
                );
              })}
            </div>

            {activeAsset && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <ShieldAlert size={11} /> {activeAsset.name} · vulnerabilities &amp; remediation
                </p>
                {activeAsset.findings.map((f) => (
                  <div key={f.id} className="rounded-lg p-2.5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold text-slate-100">{f.title}</p>
                      <span
                        className="text-[9px] font-bold uppercase flex-shrink-0"
                        style={{ color: SEV_COLOR[f.severity] || SEV_COLOR.info }}
                      >
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                      {[f.cve_id, f.cwe_id, f.package_name].filter(Boolean).join(" · ") || "no external id"}
                      {f.status ? ` · ${f.status.replace(/_/g, " ")}` : ""}
                      {f.assigned_to ? ` · owner ${f.assigned_to}` : ""}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1.5 flex items-start gap-1">
                      <Wrench size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{f.remediation || "No remediation plan recorded on this finding yet."}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {!activeAsset && (
              <p className="text-[10px] text-slate-500 mt-2">Pick an asset above to see its vulnerabilities and remediation plan.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}