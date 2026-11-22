import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, ShieldOff } from "lucide-react";

const MATURITY = {
  weaponized: { label: "Weaponized", color: "#ef4444" },
  functional: { label: "Functional exploit", color: "#f97316" },
  poc: { label: "Proof of concept", color: "#eab308" },
  unproven: { label: "Unproven", color: "#64748b" },
};

const SEV = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

export default function CVEImpactPanel({ cve, affected }) {
  if (!cve) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm text-slate-400">Select a CVE to see exploit maturity and which of your assets it touches.</p>
      </div>
    );
  }

  const maturity = MATURITY[cve.exploit_maturity] || { label: "Unknown", color: "#64748b" };
  const exploited = cve.active_exploitation || cve.kev_listed;

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white font-mono">{cve.cve_id}</p>
          <p className="text-[11px] text-slate-500">
            {cve.severity ? `${cve.severity.toUpperCase()} · ` : ""}CVSS {cve.cvss_score ?? "—"} · EPSS {cve.epss_score != null ? `${(cve.epss_score * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
        {cve.nvd_url && (
          <a href={cve.nvd_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 flex-shrink-0">
            NVD <ArrowUpRight size={11} />
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] font-bold px-2 py-1 rounded border" style={{ color: maturity.color, borderColor: `${maturity.color}66`, background: `${maturity.color}18` }}>
          {maturity.label}
        </span>
        {exploited && (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-red-500/15 text-red-300 border border-red-500/40">
            <AlertTriangle size={10} /> Actively exploited
          </span>
        )}
        {cve.kev_listed && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-500/15 text-purple-300 border border-purple-500/40">CISA KEV</span>
        )}
        {cve.ransomware_use && (
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-orange-500/15 text-orange-300 border border-orange-500/40">Ransomware use</span>
        )}
      </div>

      {cve.description && <p className="text-xs text-slate-400 leading-relaxed">{cve.description}</p>}

      <div>
        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
          Impact on your assets · {affected.length}
        </p>
        {affected.length === 0 ? (
          <p className="text-[11px] text-slate-600 flex items-center gap-1"><ShieldOff size={11} /> No open finding references this CVE.</p>
        ) : (
          <div className="space-y-1">
            {affected.map((finding) => (
              <div key={finding.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: SEV[finding.severity] || "#64748b" }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-white truncate">{finding.asset_name || "Unassigned asset"}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {finding.severity} · {finding.status} {finding.owner_team ? `· ${finding.owner_team}` : ""}
                  </p>
                </div>
                <Link to="/triage" className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex-shrink-0">Triage</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}