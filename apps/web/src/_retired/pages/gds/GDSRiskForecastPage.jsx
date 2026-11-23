import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Calendar, Download, Shield, AlertTriangle, Target, Sliders } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";
import GDSPageShell from "@/components/gds/GDSPageShell";
import ScenarioModelingTool from "@/components/gds/ScenarioModelingTool";

const RISK_COLOR = {
  critical: DANGER,
  high: HIGH,
  medium: MEDIUM,
  low: LOW
};

export default function GDSRiskForecastPage() {
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedScenario, setSelectedScenario] = useState("baseline");
  const [showScenarioModeling, setShowScenarioModeling] = useState(false);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["planning-metrics"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: goals } = useQuery({
    queryKey: ["planning-goals-forecast"],
    queryFn: () => base44.entities.PlanningGoal.list("-created_date", 50).catch(() => []),
  });

  const { data: findings } = useQuery({
    queryKey: ["triaged-findings-for-forecast"],
    queryFn: () => base44.entities.TriagedFinding.list("-detected_at", 100).catch(() => []),
  });

  const forecastData = generateForecastData(goals || [], findings || [], timeRange, selectedScenario);
  const currentRiskScore = calculateCurrentRisk(findings || []);
  const projectedRiskScore = forecastData[forecastData.length - 1]?.projectedRisk || 0;
  const riskChange = projectedRiskScore - currentRiskScore;
  const goalCompletionRate = calculateGoalCompletionRate(goals || []);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Planning & Reasoning Engine", path: "/planning" }, { label: "Risk Forecast" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">30-Day Risk Forecast</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-006 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE PROJECTION</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowScenarioModeling(!showScenarioModeling)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
            style={{ background: showScenarioModeling ? `${CYAN}20` : `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Sliders className="w-3.5 h-3.5" /> {showScenarioModeling ? "Hide" : "Model Scenarios"}
          </button>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="7d">7 Days</option>
            <option value="14d">14 Days</option>
            <option value="30d">30 Days</option>
            <option value="60d">60 Days</option>
            <option value="90d">90 Days</option>
          </select>
          <select
            value={selectedScenario}
            onChange={e => setSelectedScenario(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="baseline">Baseline Scenario</option>
            <option value="optimistic">Optimistic (High Completion)</option>
            <option value="pessimistic">Pessimistic (Low Completion)</option>
            <option value="threat-spike">Threat Spike Scenario</option>
          </select>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Download className="w-3.5 h-3.5" /> Export Forecast
          </button>
        </div>
      </div>

      {/* Scenario Modeling Tool */}
      {showScenarioModeling && (
        <ScenarioModelingTool />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Current Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: currentRiskScore >= 70 ? DANGER : currentRiskScore >= 50 ? HIGH : LOW }}>{currentRiskScore}</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Today</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Projected Risk</p>
          <p className="text-2xl font-black font-mono" style={{ color: projectedRiskScore >= 70 ? DANGER : projectedRiskScore >= 50 ? HIGH : LOW }}>{projectedRiskScore}</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>End of Period</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Risk Change</p>
          <p className={`text-2xl font-black font-mono ${riskChange > 0 ? "text-red-400" : riskChange < 0 ? "text-emerald-400" : "text-slate-400"}`}>
            {riskChange > 0 ? "+" : ""}{riskChange.toFixed(1)}
          </p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>{riskChange > 0 ? "Increase" : riskChange < 0 ? "Decrease" : "No Change"}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Goal Completion</p>
          <p className="text-2xl font-black font-mono" style={{ color: goalCompletionRate >= 70 ? LOW : goalCompletionRate >= 50 ? MEDIUM : DANGER }}>{goalCompletionRate}%</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Active Goals</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Forecast Confidence</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{forecastData.confidence || 85}%</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Model Accuracy</p>
        </Card>
      </div>

      {/* Main Forecast Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Risk Trajectory Projection</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>30-day forecast based on goal completion rate and historical threat patterns</p>
        </div>
        {isLoading ? <Skeleton lines={8} /> : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={forecastData.data || []}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" stroke={MUTED} fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
              <YAxis stroke={MUTED} fontSize={10} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
                labelFormatter={(val) => new Date(val).toLocaleDateString()}
              />
              <Area type="monotone" dataKey="projectedRisk" stroke={CYAN} fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
              <Line type="monotone" dataKey="currentRisk" stroke={DANGER} strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Risk Factor Contribution</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>What's driving the forecast</p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Unresolved Critical Findings", value: 35, color: DANGER },
              { label: "Goal Completion Rate", value: 25, color: CYAN },
              { label: "Historical Threat Patterns", value: 20, color: HIGH },
              { label: "Compliance Gaps", value: 15, color: MEDIUM },
              { label: "External Threat Intel", value: 5, color: LOW },
            ].map((factor, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs" style={{ color: TEXT }}>{factor.label}</p>
                  <p className="text-xs font-bold" style={{ color: factor.color }}>{factor.value}%</p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${factor.value}%`, background: factor.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Key Milestones</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Projected goal completion dates</p>
          </div>
          <div className="space-y-3">
            {(goals || []).filter(g => g.status === "active").slice(0, 5).map((goal, idx) => {
              const completionDate = new Date();
              completionDate.setDate(completionDate.getDate() + (idx + 1) * 5);
              return (
                <div key={goal.goal_id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: CYAN }} />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{goal.goal_statement || "Untitled Goal"}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>Projected: {completionDate.toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                    {Math.round((idx + 1) * 20)}% impact
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Scenario Comparison */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Scenario Comparison</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>How different completion rates affect risk</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "Baseline", risk: 52, color: CYAN },
            { name: "Optimistic", risk: 38, color: LOW },
            { name: "Pessimistic", risk: 71, color: DANGER },
            { name: "Threat Spike", risk: 84, color: HIGH },
          ].map((scenario, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedScenario === scenario.name.toLowerCase().replace(" ", "-") ? "scale-105" : ""}`}
              style={{
                background: selectedScenario === scenario.name.toLowerCase().replace(" ", "-") ? `${scenario.color}08` : "rgba(255,255,255,0.02)",
                borderColor: selectedScenario === scenario.name.toLowerCase().replace(" ", "-") ? scenario.color : BORDER
              }}
              onClick={() => setSelectedScenario(scenario.name.toLowerCase().replace(" ", "-"))}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{scenario.name}</p>
              <p className="text-3xl font-black font-mono" style={{ color: scenario.color }}>{scenario.risk}</p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>Projected Risk Score</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">AI Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              priority: "high",
              title: "Accelerate Critical Goal Completion",
              desc: "Increase completion rate by 15% to reduce projected risk by 12 points",
              icon: Target,
              color: DANGER
            },
            {
              priority: "medium",
              title: "Address High-Severity Findings",
              desc: "35 unresolved findings contributing to 35% of risk projection",
              icon: AlertTriangle,
              color: HIGH
            },
            {
              priority: "low",
              title: "Improve Detection Coverage",
              desc: "Historical patterns suggest blind spots in cloud security monitoring",
              icon: Calendar,
              color: MEDIUM
            },
          ].map((rec, idx) => (
            <div key={idx} className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-3 mb-3">
                <rec.icon className="w-5 h-5" style={{ color: rec.color }} />
                <h4 className="text-xs font-bold text-white">{rec.title}</h4>
              </div>
              <p className="text-[11px]" style={{ color: MUTED }}>{rec.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function generateForecastData(goals, findings, timeRange, scenario) {
  const days = parseInt(timeRange.replace("d", ""));
  const data = [];
  const today = new Date();
  const goalCompletionRate = calculateGoalCompletionRate(goals);
  const baseRisk = calculateCurrentRisk(findings);

  let scenarioMultiplier = 1.0;
  if (scenario === "optimistic") scenarioMultiplier = 0.7;
  if (scenario === "pessimistic") scenarioMultiplier = 1.4;
  if (scenario === "threat-spike") scenarioMultiplier = 1.6;

  for (let i = 0; i <= days; i += 3) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const progressFactor = Math.min(1, goalCompletionRate / 100 + (i / days) * 0.2);
    const projectedRisk = Math.max(0, Math.min(100, baseRisk * scenarioMultiplier * (1 - progressFactor * 0.3) + (Math.random() * 5 - 2.5)));
    
    data.push({
      date: date.toISOString().split("T")[0],
      projectedRisk: Math.round(projectedRisk),
      currentRisk: baseRisk,
      confidence: Math.max(70, 95 - (i / days) * 25)
    });
  }

  return {
    data,
    confidence: Math.round(95 - (days / 90) * 25)
  };
}

function calculateCurrentRisk(findings) {
  if (findings.length === 0) return 0;
  const severityWeights = { critical: 40, high: 25, medium: 10, low: 3 };
  const totalWeight = findings.reduce((sum, f) => sum + (severityWeights[f.severity] || 5), 0);
  return Math.min(100, Math.round(totalWeight / findings.length * 2));
}

function calculateGoalCompletionRate(goals) {
  if (goals.length === 0) return 0;
  const completed = goals.filter(g => g.status === "completed").length;
  return Math.round((completed / goals.length) * 100);
}