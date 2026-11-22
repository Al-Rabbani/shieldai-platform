import React, { useMemo } from "react";
import { Wrench, X, AlertTriangle, Link2 } from "lucide-react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

export default function FixDetailPanel({ finding, assets, links, onClose }) {
  const asset = assets.find((row) => row.name === finding.asset_name);

  const dependents = useMemo(() => {
    const map = new Map();
    links.forEach((link) => {
      if (!map.has(link.depends_on_name)) map.set(link.depends_on_name, []);
      map.get(link.depends_on_name).push(link.asset_name);
    });
    const seen = new Set();
    const queue = [...(map.get(finding.asset_name) || [])];
    while (queue.length) {
      const next = queue.shift();
      if (!next || next === finding.asset_name || seen.has(next)) continue;
      seen.add(next);
      queue.push(...(map.get(next) || []));
    }
    return [...seen];
  }, [links, finding.asset_name]);

  const severity = finding.severity || finding.normalized_severity || "info";

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: SEV_COLOR[severity], background: `${SEV_COLOR[severity]}22` }}>{severity}</span>
          <p className="text-xs font-bold text-white mt-1 break-words">{finding.title}</p>
          <p className="text-[10px] text-slate-500">
            {finding.asset_name || "no asset"}
            {asset ? ` · ${asset.type?.replace("_", " ")} · ${asset.cloud_provider} · risk ${asset.risk_score ?? "—"}` : ""}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close fix detail" className="text-slate-500 hover:text-slate-200"><X size={13} /></button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[9px] uppercase text-slate-500">CVSS</p>
          <p className="text-sm font-bold font-mono text-white">{finding.cvss_score ?? "—"}</p>
        </div>
        <div className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[9px] uppercase text-slate-500">EPSS</p>
          <p className="text-sm font-bold font-mono text-white">{finding.epss_score != null ? `${Math.round(finding.epss_score * 100)}%` : "—"}</p>
        </div>
        <div className="rounded-lg p-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
          <p className="text-[9px] uppercase text-slate-500">Status</p>
          <p className="text-[11px] font-bold text-white capitalize">{(finding.status || "open").replace(/_/g, " ")}</p>
        </div>
      </div>

      <div>
        <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Identifiers</p>
        <p className="text-[10px] font-mono text-slate-400">{[finding.cve_id, finding.cwe_id, finding.package_name].filter(Boolean).join(" · ") || "none recorded"}</p>
      </div>

      <div>
        <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1"><Wrench size={9} className="text-emerald-400" /> Remediation plan</p>
        <p className="text-[10px] text-slate-300">{finding.remediation || "No remediation plan recorded for this finding."}</p>
        {finding.next_action_item && <p className="text-[10px] text-blue-300/90 mt-1">Next action: {finding.next_action_item}</p>}
        {finding.fixed_version && <p className="text-[10px] text-slate-500 mt-1">Fixed in: {finding.fixed_version}</p>}
      </div>

      {finding.description && (
        <div>
          <p className="text-[9px] uppercase font-bold text-slate-500 mb-1">Description</p>
          <p className="text-[10px] text-slate-400 line-clamp-4">{finding.description}</p>
        </div>
      )}

      <div>
        <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1"><Link2 size={9} className="text-amber-400" /> Asset impact</p>
        {dependents.length === 0 ? (
          <p className="text-[10px] text-slate-500">Nothing declares a dependency on this asset.</p>
        ) : (
          <p className="text-[10px] text-amber-300 flex items-start gap-1">
            <AlertTriangle size={9} className="mt-0.5 flex-shrink-0" /> {dependents.join(", ")}
          </p>
        )}
      </div>

      {finding.assigned_to && <p className="text-[10px] text-slate-500">Owner: {finding.assigned_to}</p>}
    </div>
  );
}