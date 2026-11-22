import React from "react";

const RISK_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", safe: "#22c55e" };
const RISK_SCORE = { critical: 90, high: 70, medium: 40, low: 20, safe: 0 };
const TOP_RISK_PACKAGES = ["axios", "lodash", "jsonwebtoken"];

export default function DependencyRiskTable({ risks }) {
  if (risks.length === 0) {
    return <p className="text-sm text-slate-500 p-4">No dependency risks detected.</p>;
  }
  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            {["Package", "Version", "Ecosystem", "Risk Level", "Risk Score", "EOL", "Details"].map(h => (
              <th key={h} className="text-left p-2 text-[10px] text-slate-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {risks.map((r, i) => {
            const featured = TOP_RISK_PACKAGES.includes((r.package_name || "").toLowerCase());
            return (
              <tr key={r.id || i} className={`border-b border-slate-800/60 hover:bg-white/5 ${featured ? "bg-red-500/5" : ""}`}>
                <td className="p-2 text-white font-medium">
                  {r.package_name}
                  {featured && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">EXPLOITED CVE</span>}
                </td>
                <td className="p-2 text-slate-400">{r.version}</td>
                <td className="p-2 text-slate-400 uppercase">{r.registry}</td>
                <td className="p-2"><span className="font-bold uppercase" style={{ color: RISK_COLOR[r.risk_level] || "#94a3b8" }}>{r.risk_level}</span></td>
                <td className="p-2 text-slate-300">{RISK_SCORE[r.risk_level] ?? "—"}</td>
                <td className="p-2">{r.is_eol ? <span className="text-red-400 text-[10px] font-bold">EOL</span> : <span className="text-slate-600 text-[10px]">No</span>}</td>
                <td className="p-2 text-slate-500 truncate max-w-[280px]">{r.risk_reason || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}