import React from "react";
import StatTile from "@/components/commandcenter/StatTile";

export default function IncidentMetricsRow({ incidents }) {
  const now = new Date();
  const thisMonth = incidents.filter(i => i.opened_at && new Date(i.opened_at).getMonth() === now.getMonth() && new Date(i.opened_at).getFullYear() === now.getFullYear()).length;
  const active = incidents.filter(i => ["investigating", "new", "open"].includes(i.status)).length;

  const detectDeltas = incidents.filter(i => i.detected_at && i.opened_at).map(i => (new Date(i.opened_at) - new Date(i.detected_at)) / 60000);
  const mttd = detectDeltas.length ? Math.round(detectDeltas.reduce((a, b) => a + b, 0) / detectDeltas.length) : null;

  const resolveDeltas = incidents.filter(i => i.status === "resolved" && i.opened_at && i.closed_at).map(i => (new Date(i.closed_at) - new Date(i.opened_at)) / 3600000);
  const mttr = resolveDeltas.length ? (resolveDeltas.reduce((a, b) => a + b, 0) / resolveDeltas.length).toFixed(1) : null;

  const totalImpact = incidents.reduce((s, i) => s + (i.financial_impact_usd || 0), 0);

  return (
    <div className="grid grid-cols-5 gap-4">
      <StatTile label="Incidents This Month" value={thisMonth} />
      <StatTile label="Active Now" value={active} danger={active > 0} pulse={active > 0} />
      <StatTile label="Avg MTTD" value={mttd !== null ? `${mttd}m` : "—"} />
      <StatTile label="Avg MTTR" value={mttr !== null ? `${mttr}h` : "—"} />
      <StatTile label="Financial Impact" value={`$${(totalImpact / 1000).toFixed(0)}K`} danger={totalImpact > 0} />
    </div>
  );
}