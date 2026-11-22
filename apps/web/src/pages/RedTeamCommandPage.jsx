import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import OffensiveMetricsRow from "@/components/redteam/OffensiveMetricsRow";
import HermesCapabilityTiles from "@/components/redteam/HermesCapabilityTiles";
import AssessmentsTable from "@/components/redteam/AssessmentsTable";
import RedTeamAdvisorPanel from "@/components/redteam/RedTeamAdvisorPanel";

export default function RedTeamCommandPage() {
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [attackFindings, setAttackFindings] = useState([]);
  const [attackPaths, setAttackPaths] = useState([]);
  const [simulations, setSimulations] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [riskList, camp, findings, paths, sims] = await Promise.all([
      base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
      base44.entities.PentestCampaign.list("-created_date", 10).catch(() => []),
      base44.entities.AttackFinding.list("-detected_at", 200).catch(() => []),
      base44.entities.CloudAttackPath.list("-detected_at", 30).catch(() => []),
      base44.entities.AttackSimulation.list("-started_at", 10).catch(() => []),
    ]);
    setRisk(riskList[0] || null);
    setCampaigns(camp);
    setAttackFindings(findings);
    setAttackPaths(paths);
    setSimulations(sims);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeAssessments = campaigns.filter(c => c.status === "active").length;
  const exploitsValidated = attackFindings.filter(f => f.exploited === true).length;
  const exploitsPending = attackFindings.filter(f => f.status === "in_review").length;

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">🔴 Red Team Command</h1>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Hermes Offensive Security Engine — AI-Powered Continuous Security Testing</span>
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-red-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : (
        <>
          <OffensiveMetricsRow
            attackSurfaceScore={risk?.cloud_score}
            activeAssessments={activeAssessments}
            attackPaths={attackPaths.length}
            exploitsValidated={exploitsValidated}
          />

          <HermesCapabilityTiles
            activeScans={campaigns.filter(c => c.status === "active").length}
            pathsMapped={attackPaths.length}
            exploitsPending={exploitsPending}
            simsRun={simulations.length}
          />

          <AssessmentsTable campaigns={campaigns} />

          <RedTeamAdvisorPanel />
        </>
      )}
    </div>
  );
}