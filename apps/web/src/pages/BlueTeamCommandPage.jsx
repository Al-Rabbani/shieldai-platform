import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import BlueTeamMetricsRow from "@/components/blueteam/BlueTeamMetricsRow";
import BlueTeamCapabilityTiles from "@/components/blueteam/BlueTeamCapabilityTiles";
import BlueTeamAdvisorPanel from "@/components/blueteam/BlueTeamAdvisorPanel";

export default function BlueTeamCommandPage() {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [healingEvents, setHealingEvents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [actions, setActions] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [inc, heal, rp, ca] = await Promise.all([
      base44.entities.Incident.list("-opened_at", 50).catch(() => []),
      base44.entities.SelfHealingEvent.list("-triggered_at", 50).catch(() => []),
      base44.entities.RemediationPlan.list("-created_date", 50).catch(() => []),
      base44.entities.ContainmentAction.list("-executed_at", 50).catch(() => []),
    ]);
    setIncidents(inc); setHealingEvents(heal); setPlans(rp); setActions(ca);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
            activeIncidents={incidents.filter(i => i.status === "investigating").length}
            autoRemediated={healingEvents.filter(h => h.success).length}
            remediationPlans={plans.length}
            containmentActions={actions.length}
          />
          <BlueTeamCapabilityTiles />
          <BlueTeamAdvisorPanel />
        </>
      )}
    </div>
  );
}