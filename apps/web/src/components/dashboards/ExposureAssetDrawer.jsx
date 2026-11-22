import React, { useMemo, useState } from "react";
import { ChevronRight, Server, X } from "lucide-react";

const SEV = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };
const STATUS = { open: "OPEN", in_remediation: "FIXING", fixed: "FIXED", accepted_risk: "ACCEPTED", false_positive: "FALSE +" };

export default function ExposureAssetDrawer({ selection, findings, onClose }) {
  const [openAsset, setOpenAsset] = useState(null);

  const assets = useMemo(() => {
    const inWindow = findings.filter((finding) => finding.at > selection.from && finding.at <= selection.to && (finding.asset_type || "unknown") === selection.assetType);
    const grouped = {};
    inWindow.forEach((finding) => {
      const key = finding.asset_name || "Unnamed asset";
      grouped[key] = grouped[key] || [];
      grouped[key].push(finding);
    });
    return Object.entries(grouped)
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0)),
        critical: items.filter((f) => (f.normalized_severity || f.severity) === "critical").length,
      }))
      .sort((a, b) => b.critical - a.critical || b.items.length - a.items.length);
  }, [findings, selection]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(2,6,23,0.6)" }} onClick={onClose}>
      <aside
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:w-[440px] h-full overflow-y-auto"
        style={{ background: "#0b1220", borderLeft: "1px solid #1F2937" }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 px-3 py-3" style={{ background: "#0b1220", borderBottom: "1px solid #1F2937" }}>
          <div>
            <p className="text-sm font-bold text-white">Exposure · week of {selection.label}</p>
            <p className="text-[11px] text-slate-500">{selection.assetType} · {assets.length} asset{assets.length === 1 ? "" : "s"} affected</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
        </div>

        <div className="p-3 space-y-2">
          {assets.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No assets recorded for this cell.</p>}
          {assets.map((asset) => (
            <div key={asset.name} className="rounded-lg overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
              <button
                onClick={() => setOpenAsset(openAsset === asset.name ? null : asset.name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition"
              >
                <Server size={13} className="text-slate-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-white truncate flex-1">{asset.name}</span>
                {asset.critical > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">{asset.critical} CRIT</span>}
                <span className="text-[10px] text-slate-500">{asset.items.length}</span>
                <ChevronRight size={13} className={`text-slate-600 transition-transform ${openAsset === asset.name ? "rotate-90" : ""}`} />
              </button>

              {openAsset === asset.name && (
                <div className="px-3 pb-2 space-y-1.5 border-t border-slate-800 pt-2">
                  {asset.items.map((finding) => {
                    const severity = finding.normalized_severity || finding.severity;
                    return (
                      <div key={finding.id} className="pl-2" style={{ borderLeft: `2px solid ${SEV[severity] || "#475569"}` }}>
                        <p className="text-[11px] text-slate-200 leading-tight">{finding.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-bold uppercase" style={{ color: SEV[severity] || "#94a3b8" }}>{severity}</span>
                          <span className="text-[9px] text-slate-500">{STATUS[finding.status] || finding.status}</span>
                          {finding.cve_id && <span className="text-[9px] font-mono text-slate-400">{finding.cve_id}</span>}
                          {finding.cvss_score != null && <span className="text-[9px] text-slate-500">CVSS {finding.cvss_score}</span>}
                          {finding.assigned_to && <span className="text-[9px] text-slate-500">→ {finding.assigned_to}</span>}
                          {finding.exploitability === "exploited_in_wild" && <span className="text-[8px] font-bold px-1 rounded bg-red-500/20 text-red-300">EXPLOITED</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}