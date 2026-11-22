import React from "react";

function Tile({ label, value, color }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className={`text-2xl font-bold ${color || "text-white"}`}>{value === null || value === undefined ? "—" : value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

export default function OffensiveMetricsRow({ attackSurfaceScore, activeAssessments, attackPaths, exploitsValidated, mitreCoverage }) {
  return (
    <div className="grid grid-cols-5 gap-4">
      <Tile label="Attack Surface Score" value={attackSurfaceScore ?? "—"} color="text-orange-400" />
      <Tile label="Active Assessments" value={activeAssessments} color="text-blue-400" />
      <Tile label="Attack Paths Found" value={attackPaths} color={attackPaths > 0 ? "text-red-400" : "text-white"} />
      <Tile label="Exploits Validated" value={exploitsValidated} color={exploitsValidated > 0 ? "text-red-400" : "text-white"} />
      <Tile label="MITRE Coverage" value={mitreCoverage} color="text-amber-400" />
    </div>
  );
}