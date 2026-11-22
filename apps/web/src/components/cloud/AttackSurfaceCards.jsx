import React from "react";

const RISK_COLOR = { critical: "text-red-400 border-red-500/40", high: "text-orange-400 border-orange-500/40", medium: "text-yellow-400 border-yellow-500/40", low: "text-emerald-400 border-emerald-500/40", info: "text-slate-400 border-slate-500/40" };

/**
 * One card per cloud asset, with three states per field instead of two.
 *
 * This card used to render `a.is_internet_facing ? INTERNET-FACING : INTERNAL` and `a.finding_count ?? 0`.
 * Both are fabricated claims when the value is unknown: 72 of the 145 cloud assets have no exposure
 * measurement at all, and an unmeasured count is not a zero. A security panel that reports "INTERNAL, 0
 * findings" for an asset nobody measured is worse than a panel that says nothing.
 *
 * So a null now renders as an em dash, an unknown exposure says EXPOSURE UNKNOWN, and the counts are only
 * printed when a number actually arrived from /cloud/attack-surface.
 */
const DASH = "—";

export default function AttackSurfaceCards({ assets }) {
  if (!assets || assets.length === 0) return <p className="text-sm text-slate-500 p-4">No cloud assets found.</p>;
  return (
    <div className="grid grid-cols-3 gap-4">
      {assets.map((a, i) => (
        <div key={a.id || i} className={`rounded-xl p-4 border ${RISK_COLOR[a.risk_level]?.split(" ")[1] || "border-slate-700"}`} style={{ background: "#111827" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white truncate" title={a.name}>{a.name}</p>
            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${RISK_COLOR[a.risk_level]?.split(" ")[0] || "text-slate-400"} bg-white/5`}>
              {a.risk_level || DASH}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 uppercase mb-2">{a.asset_type || DASH}</p>
          {a.is_internet_facing === true ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">INTERNET-FACING</span>
          ) : a.is_internet_facing === false ? (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-700/40 text-slate-400">INTERNAL</span>
          ) : (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500/80" title="This asset has no exposure measurement. Unknown is not the same as internal.">EXPOSURE UNKNOWN</span>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
            <div>
              <p className="text-slate-500 text-[10px]">Findings</p>
              <p className="text-white font-semibold">{a.finding_count === null || a.finding_count === undefined ? DASH : a.finding_count}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[10px]">CVEs</p>
              <p className="text-white font-semibold" title="Cloud assets are not CVE-scanned; container CVEs are under Container Security.">{a.cve_count === null || a.cve_count === undefined ? DASH : a.cve_count}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 truncate">Tech: {a.technologies || DASH}</p>
        </div>
      ))}
    </div>
  );
}
