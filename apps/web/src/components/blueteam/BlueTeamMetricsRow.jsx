import React from "react";

function Tile({ label, value, color }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className={`text-2xl font-bold ${color || "text-white"}`}>{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

export default function BlueTeamMetricsRow({ activeIncidents, autoRemediated, remediationPlans, containmentActions }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Tile label="Incidents Active" value={activeIncidents} color={activeIncidents > 0 ? "text-red-400" : "text-white"} />
      <Tile label="Auto-Remediated" value={autoRemediated} color="text-emerald-400" />
      <Tile label="Remediation Plans" value={remediationPlans} color="text-blue-400" />
      <Tile label="Containment Actions" value={containmentActions} color="text-blue-400" />
    </div>
  );
}