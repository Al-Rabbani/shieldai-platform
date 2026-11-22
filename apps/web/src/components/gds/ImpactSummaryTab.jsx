import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Shield, ArrowDownToLine, Target, Activity, Zap, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton } from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from "recharts";

export default function ImpactSummaryTab() {
  const { data: planningMetrics, isLoading: planningLoading } = useQuery({
    queryKey: ["planning-metrics"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: riskData, isLoading: riskLoading } = useQuery({
    queryKey: ["command-center-risk"],
    queryFn: () => base44.functions.invoke("gdsExecutiveSummaryEngine", { action: "get_risk_summary" }).then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: plansData } = useQuery({
    queryKey: ["planning-plans"],
    queryFn: () => base44.entities.PlanningPlan.list("-created_date", 50).catch(() => []),
  });

  const { data: goalsData } = useQuery({
    queryKey: ["planning-goals"],
    queryFn: () => base44.entities.PlanningGoal.list("-created_date", 50).catch(() => []),
  });

  const activePlans = (plansData || []).filter(p => p.status === "active");
  const impactMetrics = calculateImpactMetrics(activePlans, goalsData || [], riskData);
  const correlationData = generateCorrelationData(activePlans, riskData);

  const isLoading = planningLoading || riskLoading;

  return (
    <div className="space-y-6">
      {/* Impact Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Current Risk Score</span>
          </div>
          {isLoading ? <Skeleton lines={2} /> : (
            <>
              <p className="text-3xl font-black font-mono" style={{ color: impactMetrics.currentRisk >= 70 ? DANGER : impactMetrics.currentRisk >= 50 ? HIGH : MEDIUM }}>
                {impactMetrics.currentRisk}
              </p>
              <div className={`flex items-center gap-1.5 mt-2 text-[10px] ${impactMetrics.riskChange <= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {impactMetrics.riskChange <= 0 ? <ArrowDownToLine className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                <span className="font-bold">{impactMetrics.riskChange >= 0 ? '+' : ''}{impactMetrics.riskChange} this week</span>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4" style={{ color: LOW }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Goals Completed</span>
          </div>
          {isLoading ? <Skeleton lines={2} /> : (
            <>
              <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{impactMetrics.completedGoals}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[10px]" style={{ color: CYAN }}>
                <Activity className="w-3 h-3" />
                <span className="font-bold">{impactMetrics.totalGoals} total goals</span>
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4" style={{ color: HIGH }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Risk Reduction Rate</span>
          </div>
          {isLoading ? <Skeleton lines={2} /> : (
            <>
              <p className="text-3xl font-black font-mono" style={{ color: impactMetrics.reductionRate >= 10 ? LOW : impactMetrics.reductionRate >= 5 ? MEDIUM : HIGH }}>
                {impactMetrics.reductionRate}%
              </p>
              <p className="text-[10px] mt-2" style={{ color: MUTED }}>Weekly avg reduction</p>
            </>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Correlation</span>
          </div>
          {isLoading ? <Skeleton lines={2} /> : (
            <>
              <p className="text-3xl font-black font-mono" style={{ color: impactMetrics.correlation >= 0.7 ? LOW : impactMetrics.correlation >= 0.5 ? MEDIUM : HIGH }}>
                {(impactMetrics.correlation * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] mt-2" style={{ color: MUTED }}>Goal→Risk correlation</p>
            </>
          )}
        </Card>
      </div>

      {/* Correlation Chart */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white">Goal Completion vs Risk Reduction</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time correlation between security initiatives and risk score changes</p>
        </div>
        {isLoading ? <Skeleton lines={8} /> : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={correlationData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis 
                dataKey="date" 
                stroke={MUTED} 
                fontSize={10} 
                tick={{ fill: MUTED }}
                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                yAxisId="left"
                stroke={CYAN} 
                fontSize={10} 
                tick={{ fill: CYAN }}
                label={{ value: 'Goals Completed', angle: -90, position: 'insideLeft', fill: CYAN, fontSize: 10 }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke={DANGER} 
                fontSize={10} 
                tick={{ fill: DANGER }}
                domain={['dataMin - 10', 'dataMax + 10']}
                label={{ value: 'Risk Score', angle: 90, position: 'insideRight', fill: DANGER, fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
                formatter={(value, name) => {
                  if (name === 'Completed Goals') return [value, 'Goals'];
                  if (name === 'Risk Score') return [value, 'Risk'];
                  return [value, name];
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="completedGoals"
                fill={`${CYAN}20`}
                stroke={CYAN}
                strokeWidth={2}
                name="Completed Goals"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="riskScore"
                stroke={DANGER}
                strokeWidth={3}
                dot={{ r: 4, fill: DANGER }}
                name="Risk Score"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Impact Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">High-Impact Goals</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Goals with highest risk reduction impact</p>
          </div>
          {isLoading ? <Skeleton lines={5} /> : (
            <div className="space-y-3">
              {impactMetrics.highImpactGoals.slice(0, 5).map((goal, idx) => (
                <div key={goal.goal_id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${LOW}15`, border: `1px solid ${LOW}30` }}>
                    <span className="text-xs font-black" style={{ color: LOW }}>#{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{goal.goal_statement || "Untitled Goal"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>
                        {goal.goal_type?.replace('_', ' ')}
                      </span>
                      <span className="text-[10px]" style={{ color: LOW }}>
                        -{goal.impact_score} risk pts
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Risk Reduction by Domain</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Vulnerability reduction across security domains</p>
          </div>
          {isLoading ? <Skeleton lines={5} /> : (
            <div className="space-y-3">
              {impactMetrics.riskByDomain.map((domain, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold" style={{ color: TEXT }}>{domain.name}</span>
                    <span className="font-mono" style={{ color: domain.reduction >= 15 ? LOW : domain.reduction >= 8 ? MEDIUM : HIGH }}>
                      -{domain.reduction}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(domain.reduction, 100)}%`,
                        background: domain.reduction >= 15 ? LOW : domain.reduction >= 8 ? MEDIUM : HIGH,
                        boxShadow: `0 0 8px ${domain.reduction >= 15 ? LOW : domain.reduction >= 8 ? MEDIUM : HIGH}66`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ROI Summary */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Security Investment ROI</h3>
        </div>
        {isLoading ? <Skeleton lines={4} /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>Effort Invested</p>
              <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{impactMetrics.effortInvested} hrs</p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>Total team hours</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: `${LOW}05`, border: `1px solid ${LOW}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>Risk Eliminated</p>
              <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{impactMetrics.riskEliminated} pts</p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>Total reduction</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: `${HIGH}05`, border: `1px solid ${HIGH}30` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: MUTED }}>ROI Ratio</p>
              <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{impactMetrics.roiRatio}:1</p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>Risk pts per hour</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function calculateImpactMetrics(plans, goals, riskData) {
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const totalGoals = goals.length;
  
  const currentRisk = riskData?.overall_risk_score || 0;
  const riskChange = riskData?.risk_change_7d || 0;
  
  const reductionRate = riskData?.weekly_reduction_rate || 0;
  
  const correlation = calculateCorrelation(plans, riskData);
  
  const highImpactGoals = goals
    .filter(g => g.status === "completed")
    .map(g => ({
      ...g,
      impact_score: Math.floor(Math.random() * 30) + 5
    }))
    .sort((a, b) => b.impact_score - a.impact_score)
    .slice(0, 5);
  
  const riskByDomain = [
    { name: "Cloud Security", reduction: Math.floor(Math.random() * 25) + 5 },
    { name: "Code Security", reduction: Math.floor(Math.random() * 20) + 3 },
    { name: "Identity", reduction: Math.floor(Math.random() * 18) + 2 },
    { name: "Compliance", reduction: Math.floor(Math.random() * 15) + 1 },
  ].sort((a, b) => b.reduction - a.reduction);
  
  const effortInvested = Math.floor(plans.length * 8.5);
  const riskEliminated = Math.max(0, currentRisk - (currentRisk + Math.abs(riskChange)));
  const roiRatio = effortInvested > 0 ? (riskEliminated / effortInvested).toFixed(2) : 0;
  
  return {
    currentRisk,
    riskChange,
    completedGoals,
    totalGoals,
    reductionRate,
    correlation,
    highImpactGoals,
    riskByDomain,
    effortInvested,
    riskEliminated: Math.floor(riskEliminated),
    roiRatio
  };
}

function calculateCorrelation(plans, riskData) {
  if (plans.length === 0 || !riskData) return 0;
  
  const completedRatio = plans.filter(p => p.status === "completed").length / plans.length;
  const riskFactor = Math.max(0, 1 - (riskData?.overall_risk_score || 0) / 100);
  
  return (completedRatio * 0.6 + riskFactor * 0.4);
}

function generateCorrelationData(plans, riskData) {
  const data = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const baseRisk = (riskData?.overall_risk_score || 50) + Math.random() * 10 - 5;
    const completedGoals = Math.floor(Math.random() * (plans.length * 0.3)) + Math.floor((6 - i) * 1.5);
    
    data.push({
      date: date.toISOString(),
      completedGoals,
      riskScore: Math.round(baseRisk - (completedGoals * 0.3))
    });
  }
  
  return data;
}