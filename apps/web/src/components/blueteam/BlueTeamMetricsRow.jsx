import React from "react";

function Tile({ label, value, color, absent }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      {absent ? (
        <p className="text-sm font-semibold text-slate-500 leading-tight">not recorded here</p>
      ) : (
        <p className={`text-2xl font-bold ${color || "text-white"}`}>{value}</p>
      )}
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

/* A null value means this platform has no store behind the number. It is rendered as an absence, never as 0: an
   unserved read returns an empty list, and painting that as a zero claims a measurement nobody took. */
export default function BlueTeamMetricsRow({
  activeIncidents,
  autoRemediated,
  remediationPlans,
  containmentActions,
  basis,
}) {
  const absent = (v) => v === null || v === undefined;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Incidents Active" value={activeIncidents}
              color={!absent(activeIncidents) && activeIncidents > 0 ? "text-red-400" : "text-white"}
              absent={absent(activeIncidents)} />
        <Tile label="Auto-Remediated" value={autoRemediated} color="text-emerald-400" absent={absent(autoRemediated)} />
        <Tile label="Remediation Plans" value={remediationPlans} color="text-blue-400" absent={absent(remediationPlans)} />
        <Tile label="Containment Actions" value={containmentActions} color="text-blue-400" absent={absent(containmentActions)} />
      </div>
      {basis ? <p className="text-[11px] text-slate-500 leading-relaxed">{basis}</p> : null}
    </div>
  );
}
