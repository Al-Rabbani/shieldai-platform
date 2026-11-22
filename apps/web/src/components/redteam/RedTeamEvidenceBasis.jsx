import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * What the offensive side of this platform holds, and what it does not.
 *
 * Red Team Command used to render four counters that were all fetched-array lengths over entity names with no store
 * (CloudAttackPath, AttackSimulation, PentestCampaign, AttackFinding), so each printed 0 next to a real risk score.
 * GET /red-team/overview returns the real counts (2 authorized targets, 1 safety latch, 0 authorizations, 0
 * engagements) and names the absent stores, so the page can say which is which.
 */
export default function RedTeamEvidenceBasis({ onLoad }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    base44.entities.RedTeamOverview.list()
      .then((rows) => {
        if (!live) return;
        const row = rows[0] || null;
        setOverview(row);
        if (onLoad) onLoad(row);
      })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [onLoad]);

  if (error) return <p className="text-[10px] text-amber-400">{error}</p>;
  if (!overview) return null;

  const absent = Object.entries(overview.not_served || {});

  return (
    <div className="rounded-xl p-3 space-y-1" style={{ background: "#0f172a", border: "1px solid #1F2937" }}>
      <p className="text-[10px] text-slate-400">
        {overview.targets_active} active of {overview.targets_total} authorized target(s) · emergency stop{" "}
        {overview.emergency_stop_engaged ? "ENGAGED" : "not engaged"} · {overview.authorizations_total} pentest
        authorisation(s) ever issued · {overview.engagements_total} engagement(s) · {overview.agreements_total} agreement(s)
      </p>
      <p className="text-[10px] text-slate-500">
        {overview.authorization_path_exercised
          ? "The authorisation path has been exercised on this platform."
          : "The authorisation path has never been exercised here: no pentest has been requested, approved or run, so there is no offensive finding to show. The zeros below are that absence, not a clean result."}
      </p>
      {absent.length > 0 && (
        <p className="text-[10px] text-slate-600">
          Not recorded on this platform: {absent.map(([name, why]) => `${name} — ${why}`).join(" ")}
        </p>
      )}
    </div>
  );
}
