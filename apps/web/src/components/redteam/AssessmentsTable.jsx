import React from "react";

function duration(start, end) {
  if (!start) return "—";
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

export default function AssessmentsTable({ campaigns }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-4 pt-3 pb-2">Recent Assessments</p>
      {campaigns.length === 0 ? (
        <p className="text-sm text-slate-500 px-4 pb-4">No assessments run yet. Launch a pentest to populate this list.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase text-slate-500 border-t border-slate-800">
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Findings</th>
              <th className="text-left px-4 py-2">Critical</th>
              <th className="text-left px-4 py-2">Coverage</th>
              <th className="text-left px-4 py-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => (
              <tr key={c.id} className="border-t border-slate-800/60 hover:bg-white/5">
                <td className="px-4 py-2 font-medium text-white">{c.name}</td>
                <td className="px-4 py-2 text-slate-400 capitalize">{c.type}</td>
                <td className="px-4 py-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${c.status === "active" ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-slate-700/40 text-slate-300"}`}>{c.status}</span>
                </td>
                <td className="px-4 py-2 text-slate-300">{c.total_findings || 0}</td>
                <td className="px-4 py-2 text-red-400 font-bold">{c.critical_findings || 0}</td>
                <td className="px-4 py-2 text-slate-300">{c.coverage_percent != null ? `${c.coverage_percent}%` : "—"}</td>
                <td className="px-4 py-2 text-slate-500">{duration(c.start_date, c.end_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}