import React from "react";

const SEV_COLOR = { critical: "bg-red-500/20 text-red-400", high: "bg-orange-500/20 text-orange-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-blue-500/20 text-blue-400" };

export default function IdentityThreatsTable({ threats }) {
  if (threats.length === 0) return <p className="text-sm text-slate-500">No identity threats detected.</p>;
  return (
    <div className="space-y-1.5">
      {threats.map((t, i) => (
        <div key={t.id || i} className="grid grid-cols-12 gap-2 items-center px-3 py-2 rounded-lg text-xs" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <span className="text-slate-400 col-span-2 uppercase">{t.threat_type}</span>
          <span className="text-white col-span-2 truncate">{t.identity_name}</span>
          <span className={`font-bold uppercase px-1.5 py-0.5 rounded w-fit ${SEV_COLOR[t.severity] || SEV_COLOR.low}`}>{t.severity}</span>
          <span className="text-slate-400">{t.source_ip || "—"}</span>
          <span className="text-slate-400">{t.country || "—"}</span>
          <span className="text-slate-400">ZT {t.zero_trust_score ?? "—"}</span>
          <span className="text-slate-500 col-span-4 truncate">{t.description}</span>
        </div>
      ))}
    </div>
  );
}