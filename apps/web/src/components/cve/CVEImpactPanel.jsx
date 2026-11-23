import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, ShieldOff, HelpCircle } from "lucide-react";

const SEV = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

/* This panel used to label a CVE with an exploit-maturity badge ("Weaponized", "Proof of concept", "Unproven") over a
 * field that is always absent, so every CVE read "Unknown". That badge is gone and exploit maturity is named as not
 * measured. The ransomware chip was removed with it on the same reasoning, and that part was WRONG: the CISA KEV
 * catalogue this platform already fetches carries knownRansomwareCampaignUse, and item 37 stored it per finding. The
 * chip is back, and it has three states because the flag does: flagged, checked and not flagged, never checked. */
export default function CVEImpactPanel({ cve, affected, notMeasured = {} }) {
  if (!cve) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm text-slate-400">Select a CVE to see what the register holds for it.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white font-mono">{cve.cve_id}</p>
          <p className="text-[11px] text-slate-500">
            {cve.severity ? `${cve.severity.toUpperCase()} · ` : ""}CVSS {cve.cvss_score ?? "—"} · EPSS{" "}
            {cve.epss_score != null ? `${(cve.epss_score * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
        {cve.nvd_url && (
          <a href={cve.nvd_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 flex-shrink-0">
            NVD <ArrowUpRight size={11} />
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {cve.kev_listed === true && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-500/15 text-purple-300 border border-purple-500/40">
            CISA KEV{cve.kev_date_added ? ` · added ${cve.kev_date_added}` : ""}
          </span>
        )}
        {cve.kev_listed === false && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            Checked against KEV · not listed
          </span>
        )}
        {cve.kev_listed == null && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-slate-700/40 text-slate-300 border border-slate-600">
            <HelpCircle size={10} /> Never checked against KEV · unknown
          </span>
        )}
        {cve.open_count > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/40">
            <AlertTriangle size={10} /> {cve.open_count} open finding{cve.open_count === 1 ? "" : "s"}
          </span>
        )}
        {cve.ransomware_known === true && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/40">
            CISA KEV: used in ransomware
          </span>
        )}
        {cve.ransomware_known === false && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Not flagged as ransomware use
          </span>
        )}
        {cve.ransomware_known == null && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-500 border border-slate-700">
            Ransomware use not checked
          </span>
        )}
        {cve.package_name && (
          <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {cve.package_name}
          </span>
        )}
      </div>

      {cve.description && <p className="text-xs text-slate-400 leading-relaxed">{cve.description}</p>}

      <div className="rounded-lg p-2.5 space-y-1" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
        <p className="text-[9px] uppercase font-bold text-slate-500">Not measured for this CVE</p>
        {["exploit_maturity", "public_exploit_count", "ransomware_leak_sites"].map((key) => (
          <p key={key} className="text-[10px] text-slate-500">
            <span className="text-slate-400 font-bold">{key.replace(/_/g, " ")}</span>
            {" — "}
            {notMeasured[key] || "No source on this platform records this."}
          </p>
        ))}
      </div>

      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
          Assets carrying this CVE · {cve.asset_count ?? affected.length}
          {cve.asset_count > affected.length ? ` (showing ${affected.length})` : ""}
        </p>
        {affected.length === 0 ? (
          <p className="text-[11px] text-slate-600 flex items-center gap-1">
            <ShieldOff size={11} /> No finding target is recorded for this CVE.
          </p>
        ) : (
          <div className="space-y-1">
            {affected.map((asset) => (
              <div
                key={asset.asset_name}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SEV[cve.severity] || "#64748b" }} />
                <p className="text-[11px] text-white truncate flex-1 font-mono">{asset.asset_name}</p>
                <Link to="/triage" className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex-shrink-0">Triage</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 border-t border-slate-800 pt-2">
        <span>Findings {cve.finding_count ?? "—"}</span>
        <span>First seen {cve.first_detected ? cve.first_detected.slice(0, 10) : "—"}</span>
        <span>Last seen {cve.last_detected ? cve.last_detected.slice(0, 10) : "—"}</span>
        {cve.scanners?.length ? <span>Seen by {cve.scanners.join(", ")}</span> : null}
      </div>
    </div>
  );
}
