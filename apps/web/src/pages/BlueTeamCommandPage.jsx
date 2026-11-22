import React, { useState, useEffect, useCallback } from "react";
import { base44, unavailableEntities } from "@/api/base44Client";
import BlueTeamMetricsRow from "@/components/blueteam/BlueTeamMetricsRow";
import BlueTeamCapabilityTiles from "@/components/blueteam/BlueTeamCapabilityTiles";
import BlueTeamAdvisorPanel from "@/components/blueteam/BlueTeamAdvisorPanel";

/* An incident is active until it reaches one of these. Counting only "investigating" reported 0 active incidents over
   two real ones, because this platform stores them as "open". */
const TERMINAL_INCIDENT_STATUSES = new Set(["closed", "resolved", "recovered", "eradicated"]);

export default function BlueTeamCommandPage() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [healingEvents, setHealingEvents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [actions, setActions] = useState([]);
  const [served, setServed] = useState({ healing: false, containment: false, plans: false });

  const load = useCallback(async () => {
    setLoading(true);
    const [inc, heal, rp, ca] = await Promise.all([
      base44.entities.Incident.list("-opened_at", 50).catch(() => []),
      base44.entities.SelfHealingEvent.list("-triggered_at", 50).catch(() => []),
      base44.entities.RemediationPlan.list("-created_date", 50).catch(() => []),
      base44.entities.ContainmentAction.list("-executed_at", 50).catch(() => []),
    ]);
    /* Ask the adapter which of those names this API actually serves. A name it refuses has no store here. */
    const missing = new Set(unavailableEntities());
    setServed({
      healing: !missing.has("SelfHealingEvent"),
      containment: !missing.has("ContainmentAction"),
      plans: !missing.has("RemediationPlan"),
    });
    setIncidents(inc); setHealingEvents(heal); setPlans(rp); setActions(ca);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeIncidents = incidents.filter(
    (i) => !TERMINAL_INCIDENT_STATUSES.has(String(i.status || "").toLowerCase())
  ).length;
  const autoRemediated = served.healing ? healingEvents.filter((h) => h.success).length : null;
  const remediationPlans = served.plans ? plans.length : null;
  const containmentActions = served.containment ? actions.length : null;

  const basis = [
    `${incidents.length} incident${incidents.length === 1 ? "" : "s"} on this platform, ${activeIncidents} not yet closed.`,
    served.plans
      ? `${plans.length} remediation plan${plans.length === 1 ? "" : "s"} stored.`
      : "Remediation plans have no store here.",
    served.healing
      ? `${healingEvents.length} self-healing events recorded.`
      : "Self-healing events have no store here, so that tile reads \u201Cnot recorded here\u201D rather than 0.",
    served.containment
      ? `${actions.length} containment actions recorded.`
      : "Containment actions have no store here either.",
  ].join(" ");

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🛡️ Blue Team Command</h1>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Defensive Operations — Containment · Self-Healing · Zero Trust</span>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <BlueTeamMetricsRow
            activeIncidents={activeIncidents}
            autoRemediated={autoRemediated}
            remediationPlans={remediationPlans}
            containmentActions={containmentActions}
            basis={basis}
          />
          <BlueTeamCapabilityTiles />
          <BlueTeamAdvisorPanel />
        </>
      )}
    </div>
  );
}
