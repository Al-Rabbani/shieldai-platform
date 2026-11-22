import React from "react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };
const BLAST_COLOR = { full_account: "bg-red-500/20 text-red-400", service_wide: "bg-orange-500/20 text-orange-400", resource_specific: "bg-yellow-500/20 text-yellow-400", minimal: "bg-emerald-500/20 text-emerald-400" };

export default function CIEMFindingsFullTable({ findings, onRightSize }) {
  if (findings.length === 0) {
    return <p className="text-sm text-slate-500 p-4">No CIEM findings detected — identity posture is clean.</p>;
  }
  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            {["Identity", "Type", "Finding", "Severity", "Permissions Granted", "Inactive Days", "Blast Radius", "Action"].map(h => (
              <th key={h} className="text-left p-2 text-[10px] text-slate-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {findings.map((f, i) => {
            const flagged = f.identity_name === "root" || f.finding_type === "overprivileged" || f.finding_type === "admin_access";
            return (
              <tr key={f.id || i} className={`border-b border-slate-800/60 hover:bg-white/5 ${flagged ? "bg-red-500/5" : ""}`}>
                <td className="p-2 text-white font-medium truncate max-w-[140px]">
                  {f.identity_name}
                  {f.identity_name === "root" && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">ROOT</span>}
                </td>
                <td className="p-2 text-slate-400 uppercase whitespace-nowrap">{f.identity_type}</td>
                <td className="p-2 text-slate-300 truncate max-w-[220px]">{f.title}</td>
                <td className="p-2"><span className="font-bold uppercase" style={{ color: SEV_COLOR[f.severity] || "#94a3b8" }}>{f.severity}</span></td>
                <td className="p-2 text-slate-500 truncate max-w-[160px]">{f.permissions_granted || "—"}</td>
                <td className="p-2 text-slate-400 whitespace-nowrap">{f.days_inactive ? `${f.days_inactive}d` : "—"}</td>
                <td className="p-2"><span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${BLAST_COLOR[f.blast_radius] || "bg-slate-500/20 text-slate-400"}`}>{f.blast_radius}</span></td>
                <td className="p-2">
                  <button onClick={() => onRightSize(f)} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition whitespace-nowrap">
                    🤖 Right-Size
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}