import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

export default function CIEMFindingsTable({ findings, onRemediate }) {
  if (findings.length === 0) return <p className="text-sm text-slate-500">No CIEM findings.</p>;
  return (
    <div className="space-y-1.5">
      {findings.map((f, i) => (
        <div key={f.id || i} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-xs" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <span className="text-white col-span-2 truncate">{f.identity_name}</span>
          <span className="text-slate-400">{f.identity_type}</span>
          <span className="text-slate-300 col-span-2 truncate">{f.title}</span>
          <span className={`font-bold uppercase px-1.5 py-0.5 rounded w-fit ${SEV_COLOR[f.severity] || SEV_COLOR.low}`}>{f.severity}</span>
          <span className={`font-bold uppercase ${f.blast_radius === "full_account" ? "text-red-400" : "text-slate-400"}`}>{f.blast_radius}</span>
          <span className="text-slate-400">{f.days_inactive ?? 0}d</span>
          <span className="text-slate-500 col-span-2 truncate">{f.permissions_granted || "—"}</span>
          <button onClick={() => onRemediate(f)} className="px-2 py-1 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition justify-self-end">
            Remediate
          </button>
        </div>
      ))}
    </div>
  );
}