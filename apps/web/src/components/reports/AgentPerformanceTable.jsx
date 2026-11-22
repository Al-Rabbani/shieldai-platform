import React from "react";

function tone(pct) {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-amber-400";
  return "text-red-400";
}

export default function AgentPerformanceTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl py-10 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-xs text-slate-500">No agent activity matches these filters.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-800">
              {["Agent", "Resolved", "Open", "Avg hours", "SLA met", "Breaches"].map((head) => (
                <th key={head} className="py-2 px-3 font-bold uppercase text-[9px] text-slate-500 whitespace-nowrap">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-slate-800/50 hover:bg-white/5">
                <td className="py-2 px-3 text-white font-medium">{row.name}</td>
                <td className="py-2 px-3 text-slate-300">{row.resolved}</td>
                <td className="py-2 px-3 text-slate-300">{row.open}</td>
                <td className="py-2 px-3 font-mono text-slate-300">{row.avgHours == null ? "—" : `${row.avgHours}h`}</td>
                <td className={`py-2 px-3 font-bold ${row.slaPct == null ? "text-slate-500" : tone(row.slaPct)}`}>
                  {row.slaPct == null ? "—" : `${row.slaPct}%`}
                </td>
                <td className={`py-2 px-3 font-mono ${row.breaches > 0 ? "text-red-400" : "text-slate-500"}`}>{row.breaches}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}