import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Shield, CheckCircle, AlertTriangle, TrendingUp, Clock3, Target, FileText, GitBranch, Calendar, X, Users, Activity, FolderOpen, Network, Download, DollarSign } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, AnimatedArc } from "@/components/gds/GDSOSShared";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import ReasoningFlowchart from "@/components/gds/ReasoningFlowchart";
import ResourceTracker from "@/components/gds/ResourceTracker";
import GoalDependencyMap from "@/components/gds/GoalDependencyMap";
import GoalAlertSystem from "@/components/gds/GoalAlertSystem";
import ProgressOverviewTab from "@/components/gds/ProgressOverviewTab";
import ImpactSummaryTab from "@/components/gds/ImpactSummaryTab";
import PriorityRankingSystem from "@/components/gds/PriorityRankingSystem";
import GoalTimelineView from "@/components/gds/GoalTimelineView";
import BudgetBurnRateMonitor from "@/components/gds/BudgetBurnRateMonitor";

const GOAL_TYPE_COLORS = {
  security_scan: "#3b82f6", threat_hunt: DANGER, incident_response: HIGH,
  compliance_audit: LOW, remediation: "#f59e0b", risk_assessment: "#6366f1",
  executive_report: "#14b8a6", agent_orchestration: "#a855f7"
};

const POLICY_VERDICT_COLORS = { approved: LOW, rejected: DANGER, conditional: HIGH, pending: MUTED };

export default function GDSPlanningPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [comparePlanId, setComparePlanId] = useState("");
  const [showGantt, setShowGantt] = useState(false);
  const [selectedPlanForGantt, setSelectedPlanForGantt] = useState(null);
  const [selectedPlanForAudit, setSelectedPlanForAudit] = useState(null);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["planning-metrics"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: statusData } = useQuery({
    queryKey: ["planning-status"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "status", limit: 10 }).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: plansData } = useQuery({
    queryKey: ["planning-plans"],
    queryFn: () => base44.entities.PlanningPlan.list("-created_date", 20).catch(() => []),
  });

  const { data: comparisonData } = useQuery({
    queryKey: ["planning-compare", comparePlanId],
    queryFn: () => comparePlanId ? base44.functions.invoke("gdsPlanningReasoningEngine", { action: "compare_versions", plan_id: comparePlanId }).then(r => r.data) : Promise.resolve(null),
    enabled: !!comparePlanId,
  });

  const { data: auditData } = useQuery({
    queryKey: ["planning-audit", selectedPlanForAudit],
    queryFn: () => selectedPlanForAudit ? base44.functions.invoke("gdsPlanningReasoningEngine", { action: "get_audit_trail", plan_id: selectedPlanForAudit }).then(r => r.data) : Promise.resolve(null),
    enabled: !!selectedPlanForAudit,
  });

  const m = metrics || {};
  const goals = statusData?.recent_goals || [];
  const byVerdict = m.plans?.by_verdict || {};
  const plans = plansData || [];
  const activePlans = plans.filter(p => p.status === "active");

  // Calculate Impact Score for each goal
  const goalsWithImpact = goals.map(goal => {
    const plan = activePlans.find(p => p.goal_id === goal.goal_id);
    const completionRate = plan ? (plan.steps?.filter(s => s.status === "completed").length || 0) / (plan.steps?.length || 1) : 0;
    const vulnReduction = goal.vulnerability_reduction || 0;
    const impactScore = Math.round((completionRate * 0.6 + (vulnReduction > 0 ? Math.min(vulnReduction / 100, 1) * 0.4 : 0)) * 100);
    return { ...goal, impactScore, completionRate, vulnReduction };
  });

  const avgImpactScore = goalsWithImpact.length > 0 ? Math.round(goalsWithImpact.reduce((sum, g) => sum + g.impactScore, 0) / goalsWithImpact.length) : 0;
  const impactColor = avgImpactScore >= 70 ? LOW : avgImpactScore >= 50 ? MEDIUM : DANGER;

  const confidenceScore = m.reasoning?.avg_confidence || 0;
  const confidenceColor = confidenceScore >= 70 ? LOW : confidenceScore >= 50 ? MEDIUM : DANGER;
  const riskScore = m.risk?.avg_risk_score || 0;
  const riskColorVal = riskScore >= 70 ? DANGER : riskScore >= 50 ? HIGH : LOW;

  const verdictData = Object.entries(byVerdict).map(([verdict, count]) => ({
    name: verdict.charAt(0).toUpperCase() + verdict.slice(1), value: count, color: POLICY_VERDICT_COLORS[verdict] || MUTED
  }));

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Planning & Reasoning Engine" }]} />
      
      <GoalAlertSystem goals={goalsWithImpact} plans={activePlans} />
      
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Brain className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Planning & Reasoning Engine</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-006 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>18-stage planning · 13-stage reasoning · Zero Trust · Explainable AI</span>
          <button onClick={() => setShowGantt(true)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Calendar className="w-3.5 h-3.5" /> Gantt Chart
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: BORDER }}>
        {[
          { id: "overview", label: "Overview", icon: Brain },
          { id: "impact", label: "Impact Summary", icon: Activity },
          { id: "priority", label: "Priority Ranking", icon: Target },
          { id: "timeline", label: "Timeline View", icon: Calendar },
          { id: "budget", label: "Budget Monitor", icon: DollarSign },
          { id: "progress", label: "Progress Overview", icon: TrendingUp },
          { id: "heatmap", label: "Activity Heatmap", icon: Calendar },
          { id: "templates", label: "Templates", icon: FolderOpen },
          { id: "dependencies", label: "Dependency Map", icon: Network },
          { id: "flowchart", label: "Reasoning Flow", icon: GitBranch },
          { id: "resources", label: "Resources", icon: Activity },
          { id: "compare", label: "Compare Versions", icon: GitBranch },
          { id: "audit", label: "Audit Trail", icon: Activity },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap"
            style={{
              color: activeTab === id ? CYAN : MUTED,
              borderBottomColor: activeTab === id ? CYAN : "transparent",
              background: activeTab === id ? `${CYAN}06` : "transparent",
            }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Comparison View */}
      {activeTab === "compare" && (
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Plan Version Comparison</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Compare current plan with previous versions</p>
            </div>
            <select value={comparePlanId} onChange={e => setComparePlanId(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="">Select a plan to compare...</option>
              {plans.map(p => (<option key={p.id} value={p.id}>{p.plan_name || p.plan_id}</option>))}
            </select>
          </div>
          {comparisonData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${CYAN}30` }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: CYAN }}>Current Version</h4>
                <div className="space-y-2 text-xs">
                  <p><span style={{ color: MUTED }}>Confidence:</span> <span style={{ color: comparisonData.current?.confidence_score >= 70 ? LOW : comparisonData.current?.confidence_score >= 50 ? MEDIUM : DANGER }}>{comparisonData.current?.confidence_score ?? 0}%</span></p>
                  <p><span style={{ color: MUTED }}>Risk Score:</span> <span style={{ color: comparisonData.current?.risk_score >= 70 ? DANGER : comparisonData.current?.risk_score >= 50 ? HIGH : LOW }}>{comparisonData.current?.risk_score ?? 0}</span></p>
                  <p><span style={{ color: MUTED }}>Total Steps:</span> <span style={{ color: TEXT }}>{comparisonData.current?.total_steps ?? 0}</span></p>
                  <p><span style={{ color: MUTED }}>Est. Duration:</span> <span style={{ color: TEXT }}>{formatDuration(comparisonData.current?.estimated_duration_seconds)}</span></p>
                  <p><span style={{ color: MUTED }}>Policy Verdict:</span> <span className="px-2 py-0.5 rounded uppercase text-[10px]" style={{ color: comparisonData.current?.policy_verdict === "approved" ? LOW : comparisonData.current?.policy_verdict === "rejected" ? DANGER : HIGH, background: "rgba(255,255,255,0.04)" }}>{comparisonData.current?.policy_verdict || "pending"}</span></p>
                </div>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: MUTED }}>Previous Version</h4>
                <div className="space-y-2 text-xs">
                  <p><span style={{ color: MUTED }}>Confidence:</span> <span style={{ color: comparisonData.previous?.confidence_score >= 70 ? LOW : comparisonData.previous?.confidence_score >= 50 ? MEDIUM : DANGER }}>{comparisonData.previous?.confidence_score ?? 0}%</span></p>
                  <p><span style={{ color: MUTED }}>Risk Score:</span> <span style={{ color: comparisonData.previous?.risk_score >= 70 ? DANGER : comparisonData.previous?.risk_score >= 50 ? HIGH : LOW }}>{comparisonData.previous?.risk_score ?? 0}</span></p>
                  <p><span style={{ color: MUTED }}>Total Steps:</span> <span style={{ color: TEXT }}>{comparisonData.previous?.total_steps ?? 0}</span></p>
                  <p><span style={{ color: MUTED }}>Est. Duration:</span> <span style={{ color: TEXT }}>{formatDuration(comparisonData.previous?.estimated_duration_seconds)}</span></p>
                  <p><span style={{ color: MUTED }}>Policy Verdict:</span> <span className="px-2 py-0.5 rounded uppercase text-[10px]" style={{ color: comparisonData.previous?.policy_verdict === "approved" ? LOW : comparisonData.previous?.policy_verdict === "rejected" ? DANGER : HIGH, background: "rgba(255,255,255,0.04)" }}>{comparisonData.previous?.policy_verdict || "pending"}</span></p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={GitBranch} title="Select a plan" description="Choose a plan to compare versions" />
          )}
          {comparisonData?.changes && comparisonData.changes.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold mb-3" style={{ color: MUTED }}>Key Changes</h4>
              <div className="space-y-2">
                {comparisonData.changes.map((change, i) => (
                  <div key={i} className="p-3 rounded-lg text-xs" style={{ background: change.type === "added" ? `${LOW}10` : change.type === "removed" ? `${DANGER}10` : `${CYAN}10`, border: `1px solid ${change.type === "added" ? LOW + "30" : change.type === "removed" ? DANGER + "30" : CYAN + "30"}` }}>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mr-2" style={{ color: change.type === "added" ? LOW : change.type === "removed" ? DANGER : CYAN, background: "rgba(255,255,255,0.1)" }}>{change.type}</span>
                    <span style={{ color: TEXT }}>{change.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Reasoning Flowchart Tab */}
      {activeTab === "flowchart" && (
        <ReasoningFlowchart plans={activePlans} />
      )}

      {/* Resources Tab */}
      {activeTab === "resources" && (
        <ResourceTracker plans={activePlans} />
      )}

      {/* Reasoning Flowchart Tab */}
      {activeTab === "flowchart" && (
        <ReasoningFlowchart plans={activePlans} />
      )}

      {/* Progress Overview Tab */}
      {activeTab === "progress" && (
        <ProgressOverviewTab />
      )}

      {/* Goal Alerts */}
      <GoalAlertSystem
        goals={goalsWithImpact}
        plans={activePlans}
        onDismissAlert={(alertId) => console.log("Dismissed alert:", alertId)}
      />

      {/* Dependency Map Tab */}
      {activeTab === "dependencies" && (
        <GoalDependencyMap
          goals={goalsWithImpact}
          onAddDependency={async (dep) => {
            try {
              const goal = goalsWithImpact.find(g => g.goal_id === dep.from_goal_id);
              const updatedDeps = [...(goal.dependencies || []), { target_goal_id: dep.to_goal_id, type: dep.type }];
              await base44.entities.PlanningGoal.update(goal.id, { dependencies: updatedDeps });
              qc.invalidateQueries(["planning-metrics"]);
              qc.invalidateQueries(["planning-plans"]);
            } catch (e) { console.error(e); }
          }}
          onDeleteDependency={async (fromId, toId) => {
            try {
              const goal = goalsWithImpact.find(g => g.goal_id === fromId);
              const updatedDeps = (goal.dependencies || []).filter(d => d.target_goal_id !== toId);
              await base44.entities.PlanningGoal.update(goal.id, { dependencies: updatedDeps });
              qc.invalidateQueries(["planning-metrics"]);
              qc.invalidateQueries(["planning-plans"]);
            } catch (e) { console.error(e); }
          }}
        />
      )}

      {/* Resources Tab */}
      {activeTab === "resources" && (
        <ResourceTracker plans={activePlans} />
      )}

      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Plan Audit Trail</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Track all plan modifications and reasoning changes</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportAuditData(auditData, selectedPlanForAudit)}
                disabled={!selectedPlanForAudit || !auditData?.trail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                <Download className="w-3.5 h-3.5" /> Export All
              </button>
              <select value={selectedPlanForAudit || ""} onChange={e => setSelectedPlanForAudit(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="">Select a plan...</option>
                {plans.map(p => (<option key={p.id} value={p.id}>{p.plan_name || p.plan_id}</option>))}
              </select>
            </div>
          </div>
          {auditData?.trail && auditData.trail.length > 0 ? (
            <div className="space-y-3">
              {auditData.trail.map((entry, idx) => (
                <div key={idx} className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                        <Users className="w-4 h-4" style={{ color: CYAN }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{entry.changed_by || "System"}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{new Date(entry.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded uppercase" style={{ color: entry.change_type === "critical" ? DANGER : entry.change_type === "major" ? HIGH : CYAN, background: `${entry.change_type === "critical" ? DANGER : entry.change_type === "major" ? HIGH : CYAN}15`, border: `1px solid ${entry.change_type === "critical" ? DANGER : entry.change_type === "major" ? HIGH : CYAN}30` }}>
                      {entry.change_type || "minor"}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Change Description</p>
                      <p style={{ color: TEXT }}>{entry.description}</p>
                    </div>
                    {entry.reasoning_shift && (
                      <div className="p-3 rounded" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}20` }}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: CYAN }}>Reasoning Logic Shift</p>
                        <p style={{ color: TEXT }}>{entry.reasoning_shift}</p>
                      </div>
                    )}
                    {entry.metrics_before && entry.metrics_after && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Before</p>
                          <div className="space-y-1 text-[10px]">
                            <p><span style={{ color: MUTED }}>Confidence:</span> <span style={{ color: TEXT }}>{entry.metrics_before.confidence}%</span></p>
                            <p><span style={{ color: MUTED }}>Risk:</span> <span style={{ color: TEXT }}>{entry.metrics_before.risk}</span></p>
                          </div>
                        </div>
                        <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.03)" }}>
                          <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>After</p>
                          <div className="space-y-1 text-[10px]">
                            <p><span style={{ color: MUTED }}>Confidence:</span> <span style={{ color: TEXT }}>{entry.metrics_after.confidence}%</span></p>
                            <p><span style={{ color: MUTED }}>Risk:</span> <span style={{ color: TEXT }}>{entry.metrics_after.risk}</span></p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : selectedPlanForAudit ? (
            <EmptyState icon={Activity} title="No audit trail" description="No modifications recorded for this plan" />
          ) : (
            <EmptyState icon={Activity} title="Select a plan" description="Choose a plan to view its audit trail" />
          )}
        </Card>
      )}

      {/* Impact Summary Tab */}
      {activeTab === "impact" && (
        <ImpactSummaryTab />
      )}

      {/* Priority Ranking Tab */}
      {activeTab === "priority" && (
        <PriorityRankingSystem goals={goalsWithImpact} />
      )}

      {/* Timeline View Tab */}
      {activeTab === "timeline" && (
        <GoalTimelineView goals={goalsWithImpact} plans={activePlans} />
      )}

      {/* Budget Monitor Tab */}
      {activeTab === "budget" && (
        <BudgetBurnRateMonitor plans={activePlans} />
      )}

      {/* Progress Overview Tab */}
      {activeTab === "progress" && (
        <ProgressOverviewTab goals={goalsWithImpact} plans={activePlans} />
      )}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {[
          { label: "Total Goals", value: m.goals?.total || 0, color: CYAN },
          { label: "Active Plans", value: m.plans?.total || 0, color: LOW },
          { label: "Total Plan Steps", value: m.plans?.steps_total || 0, color: "#60a5fa" },
          { label: "Avg Confidence", value: `${confidenceScore}%`, color: confidenceColor, sub: confidenceScore >= 70 ? "High" : confidenceScore >= 50 ? "Medium" : "Low" },
          { label: "Avg Risk Score", value: riskScore, color: riskColorVal, sub: riskScore >= 70 ? "Critical" : riskScore >= 50 ? "High" : "Low" },
          { label: "Avg Impact Score", value: `${avgImpactScore}`, color: impactColor, sub: avgImpactScore >= 70 ? "High Impact" : avgImpactScore >= 50 ? "Medium" : "Low" },
          { label: "Rollback Ready", value: m.rollback?.ready || 0, color: "#14b8a6" },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            {sub && <p className="text-[9px] mt-1" style={{ color: MUTED }}>{sub}</p>}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Recent Goals</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Latest planning requests</p>
          </div>
          {isLoading ? <Skeleton lines={5} /> : goals.length === 0 ? (
            <EmptyState icon={Brain} title="No goals yet" description="Analyze a new goal to get started" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Type", "Goal Statement", "Impact Score", "Sensitivity", "Priority", "Approval", "Status", "Created"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {goalsWithImpact.map((goal, i) => {
                    const typeColor = GOAL_TYPE_COLORS[goal.goal_type] || MUTED;
                    const impactColorGoal = goal.impactScore >= 70 ? LOW : goal.impactScore >= 50 ? MEDIUM : DANGER;
                    return (
                      <tr key={goal.goal_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30` }}>
                            {(goal.goal_type || "unknown").replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-2 px-3 max-w-[200px]"><p className="truncate text-white">{goal.goal_statement || "Untitled"}</p></td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: impactColorGoal, background: `${impactColorGoal}18`, border: `1px solid ${impactColorGoal}30` }}>{goal.impactScore}</span>
                            <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${goal.impactScore}%`, background: impactColorGoal }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{goal.sensitivity || "internal"}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${goal.priority === "P0" ? "text-red-400" : goal.priority === "P1" ? "text-orange-400" : goal.priority === "P2" ? "text-blue-400" : "text-slate-400"}`} style={{ background: "rgba(255,255,255,0.04)" }}>{goal.priority || "P2"}</span>
                        </td>
                        <td className="py-2 px-3">{goal.requires_approval && <Shield className="w-3.5 h-3.5" style={{ color: HIGH }} />}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: goal.status === "completed" ? LOW : goal.status === "failed" ? DANGER : MUTED, background: "rgba(255,255,255,0.04)" }}>{goal.status || "pending"}</span>
                        </td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{goal.created_date ? new Date(goal.created_date).toLocaleDateString() : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Plans by Policy Verdict</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Approval distribution</p>
          </div>
          {verdictData.length === 0 ? (
            <EmptyState icon={Shield} title="No plan data" description="Plans will appear here after analysis" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={verdictData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {verdictData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      </>
      )}

      {/* Gantt Chart Modal */}
      {showGantt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-6xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Plan Timeline - Gantt Chart</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Visualize task dependencies and delays</p>
              </div>
              <button onClick={() => { setShowGantt(false); setSelectedPlanForGantt(null); }} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-4">
              <select value={selectedPlanForGantt || ""} onChange={e => setSelectedPlanForGantt(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="">Select an active plan...</option>
                {activePlans.map(p => (<option key={p.id} value={p.id}>{p.plan_name || p.plan_id}</option>))}
              </select>
            </div>
            {selectedPlanForGantt && activePlans.find(p => p.id === selectedPlanForGantt) && (
              <GanttChart plan={activePlans.find(p => p.id === selectedPlanForGantt)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDuration(secs) {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function exportAuditData(auditData, planId) {
  if (!auditData || !auditData.trail) return;
  
  const exportContent = {
    export_date: new Date().toISOString(),
    plan_id: planId,
    total_entries: auditData.trail.length,
    audit_trail: auditData.trail.map(entry => ({
      timestamp: entry.timestamp,
      changed_by: entry.changed_by,
      change_type: entry.change_type,
      description: entry.description,
      reasoning_shift: entry.reasoning_shift,
      metrics_before: entry.metrics_before,
      metrics_after: entry.metrics_after
    }))
  };

  const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `planning-audit-${planId}-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function GanttChart({ plan }) {
  if (!plan) return null;
  const steps = plan.steps || [];
  const now = new Date();
  const startDate = plan.created_date ? new Date(plan.created_date) : now;
  const totalDuration = steps.reduce((sum, s) => sum + (s.estimated_seconds || 0), 0);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div><p style={{ color: MUTED }}>Total Steps:</p><p className="text-lg font-bold" style={{ color: TEXT }}>{steps.length}</p></div>
          <div><p style={{ color: MUTED }}>Est. Duration:</p><p className="text-lg font-bold" style={{ color: CYAN }}>{formatDuration(totalDuration)}</p></div>
          <div><p style={{ color: MUTED }}>Started:</p><p className="text-lg font-bold" style={{ color: TEXT }}>{startDate.toLocaleDateString()}</p></div>
          <div><p style={{ color: MUTED }}>Status:</p><span className="text-lg font-bold px-2 py-0.5 rounded" style={{ color: plan.status === "active" ? LOW : MUTED, background: plan.status === "active" ? `${LOW}15` : "rgba(255,255,255,0.04)" }}>{plan.status || "pending"}</span></div>
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const stepDuration = step.estimated_seconds || 0;
          const prevStepsDuration = steps.slice(0, idx).reduce((sum, s) => sum + (s.estimated_seconds || 0), 0);
          const stepStart = new Date(startDate.getTime() + prevStepsDuration * 1000);
          const stepEnd = new Date(stepStart.getTime() + stepDuration * 1000);
          const isDelayed = step.is_delayed || (stepEnd < now && step.status !== "completed");
          const progress = step.progress || 0;
          const parallelGroup = step.parallel_group;
          return (
            <div key={idx} className={`p-3 rounded-lg ${isDelayed ? "border-2" : ""}`} style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${isDelayed ? DANGER : BORDER}` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold" style={{ color: TEXT }}>Step {idx + 1}: {step.step_name || "Untitled"}</span>
                  {parallelGroup && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>Group {parallelGroup}</span>}
                  {isDelayed && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>DELAYED</span>}
                </div>
                <div className="flex items-center gap-4 text-[10px]" style={{ color: MUTED }}>
                  <span>{stepStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span>→</span>
                  <span>{stepEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
              <div className="relative h-6 rounded-lg overflow-hidden mb-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                <div className="absolute top-0 bottom-0 rounded" style={{ left: `${(prevStepsDuration / (totalDuration || 1)) * 100}%`, width: `${((stepDuration) / (totalDuration || 1)) * 100}%`, background: isDelayed ? DANGER : parallelGroup ? "#a855f7" : CYAN, opacity: 0.6 }} />
                <div className="absolute top-0 bottom-0 rounded" style={{ left: `${(prevStepsDuration / (totalDuration || 1)) * 100}%`, width: `${((stepDuration) / (totalDuration || 1)) * (progress / 100) * 100}%`, background: isDelayed ? DANGER : LOW, opacity: 0.9 }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span style={{ color: MUTED }}>Progress: {progress}%</span>
                <div className="flex items-center gap-2">
                  {step.depends_on && step.depends_on.length > 0 && (
                    <span className="text-[9px]" style={{ color: MUTED }}>Depends: {step.depends_on.map(d => `#${d}`).join(", ")}</span>
                  )}
                  <span style={{ color: isDelayed ? DANGER : MUTED }}>{step.status || "pending"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}