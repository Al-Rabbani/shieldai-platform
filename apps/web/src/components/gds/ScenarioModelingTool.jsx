import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sliders, TrendingUp, AlertTriangle, Shield, Activity, Zap, RefreshCw, Save, Download } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from "recharts";

export default function ScenarioModelingTool() {
  const [scenarioName, setScenarioName] = useState("Custom Scenario");
  const [variables, setVariables] = useState({
    goalCompletionSpeed: 50,
    threatFrequency: 50,
    budgetAllocation: 50,
    teamCapacity: 50,
    automationLevel: 50
  });
  const [baselineData, setBaselineData] = useState(null);
  const [scenarioData, setScenarioData] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  const { data: forecastData, isLoading } = useQuery({
    queryKey: ["risk-forecast"],
    queryFn: () => base44.functions.invoke("gdsPredictiveRisk", { action: "get_forecast", days: 30 }).then(r => r.data),
    refetchInterval: 60000,
  });

  const handleVariableChange = (variable, value) => {
    setVariables(prev => ({ ...prev, [variable]: parseInt(value) }));
  };

  const runScenario = () => {
    const baseline = generateBaselineForecast();
    const scenario = generateScenarioForecast(baseline, variables);
    setBaselineData(baseline);
    setScenarioData(scenario);
    setIsComparing(true);
  };

  const resetScenario = () => {
    setVariables({
      goalCompletionSpeed: 50,
      threatFrequency: 50,
      budgetAllocation: 50,
      teamCapacity: 50,
      automationLevel: 50
    });
    setIsComparing(false);
  };

  const exportScenario = () => {
    const exportData = {
      scenario_name: scenarioName,
      timestamp: new Date().toISOString(),
      variables,
      baseline_risk: baselineData?.finalRisk,
      scenario_risk: scenarioData?.finalRisk,
      risk_reduction: baselineData?.finalRisk - scenarioData?.finalRisk,
      recommendations: scenarioData?.recommendations
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scenario-${scenarioName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const impactSummary = calculateImpactSummary(baselineData, scenarioData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-white">Scenario Modeling Tool</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Adjust variables to see impact on 30-day security outlook</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          {isComparing && (
            <button
              onClick={exportScenario}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* Variable Sliders */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4" style={{ color: CYAN }} />
          <h4 className="text-sm font-bold text-white">Adjust Scenario Variables</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <VariableSlider
            label="Goal Completion Speed"
            icon={TrendingUp}
            value={variables.goalCompletionSpeed}
            onChange={(v) => handleVariableChange("goalCompletionSpeed", v)}
            description="Rate of security goal execution"
            lowLabel="Slow"
            highLabel="Fast"
          />
          <VariableSlider
            label="Threat Frequency"
            icon={AlertTriangle}
            value={variables.threatFrequency}
            onChange={(v) => handleVariableChange("threatFrequency", v)}
            description="Expected threat activity level"
            lowLabel="Low"
            highLabel="High"
          />
          <VariableSlider
            label="Budget Allocation"
            icon={Shield}
            value={variables.budgetAllocation}
            onChange={(v) => handleVariableChange("budgetAllocation", v)}
            description="Security budget availability"
            lowLabel="Limited"
            highLabel="Full"
          />
          <VariableSlider
            label="Team Capacity"
            icon={Activity}
            value={variables.teamCapacity}
            onChange={(v) => handleVariableChange("teamCapacity", v)}
            description="Available security team resources"
            lowLabel="Minimal"
            highLabel="Full"
          />
          <VariableSlider
            label="Automation Level"
            icon={Zap}
            value={variables.automationLevel}
            onChange={(v) => handleVariableChange("automationLevel", v)}
            description="Security automation coverage"
            lowLabel="Manual"
            highLabel="Full Auto"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <input
            type="text"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder="Scenario Name"
            className="px-3 py-1.5 rounded-lg text-xs outline-none flex-1 max-w-xs"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <button
            onClick={runScenario}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Sliders className="w-4 h-4" />
            Run Scenario
          </button>
        </div>
      </Card>

      {/* Comparison Chart */}
      {isComparing && baselineData && scenarioData && (
        <>
          <Card className="p-6">
            <div className="mb-6">
              <h4 className="text-sm font-bold text-white">Risk Trajectory Comparison</h4>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Baseline vs Scenario projected risk scores</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={scenarioData.dailyForecast}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis
                  dataKey="day"
                  stroke={MUTED}
                  fontSize={10}
                  tick={{ fill: MUTED }}
                  label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: MUTED, fontSize: 10 }}
                />
                <YAxis
                  stroke={MUTED}
                  fontSize={10}
                  tick={{ fill: MUTED }}
                  domain={[0, 100]}
                  label={{ value: 'Risk Score', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
                  formatter={(value, name) => [value, name === 'baseline' ? 'Baseline' : scenarioName]}
                />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  stroke={MUTED}
                  fill={`${MUTED}10`}
                  strokeWidth={2}
                  name="Baseline"
                />
                <Area
                  type="monotone"
                  dataKey="scenario"
                  stroke={CYAN}
                  fill={`${CYAN}20`}
                  strokeWidth={3}
                  name={scenarioName}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Impact Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Baseline Risk</p>
              <p className="text-2xl font-black font-mono" style={{ color: baselineData.finalRisk >= 70 ? DANGER : baselineData.finalRisk >= 50 ? HIGH : MEDIUM }}>
                {baselineData.finalRisk}
              </p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>Day 30 projection</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Scenario Risk</p>
              <p className="text-2xl font-black font-mono" style={{ color: scenarioData.finalRisk >= 70 ? DANGER : scenarioData.finalRisk >= 50 ? HIGH : MEDIUM }}>
                {scenarioData.finalRisk}
              </p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>Day 30 projection</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Risk Reduction</p>
              <p className="text-2xl font-black font-mono" style={{ color: impactSummary.reduction >= 10 ? LOW : impactSummary.reduction >= 5 ? MEDIUM : HIGH }}>
                {impactSummary.reduction >= 0 ? '+' : ''}{impactSummary.reduction}
              </p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>Points improved</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Improvement</p>
              <p className="text-2xl font-black font-mono" style={{ color: impactSummary.percentage >= 15 ? LOW : impactSummary.percentage >= 8 ? MEDIUM : HIGH }}>
                {impactSummary.percentage}%
              </p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>vs baseline</p>
            </Card>
          </div>

          {/* Recommendations */}
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: CYAN }} />
              <h4 className="text-sm font-bold text-white">AI Recommendations</h4>
            </div>
            <div className="space-y-3">
              {scenarioData.recommendations.map((rec, idx) => (
                <div key={idx} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                      <span className="text-xs font-bold" style={{ color: CYAN }}>{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">{rec.action}</p>
                      <p className="text-[10px] mt-1" style={{ color: MUTED }}>{rec.impact}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15` }}>
                          {rec.effort}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                          {rec.timeline}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!isComparing && (
        <Card className="p-8">
          <div className="text-center">
            <Sliders className="w-12 h-12 mx-auto mb-3" style={{ color: MUTED }} />
            <h4 className="text-sm font-bold text-white mb-2">Run a Scenario to See Projections</h4>
            <p className="text-[10px]" style={{ color: MUTED }}>Adjust the variables above and click "Run Scenario" to model your security outlook</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function VariableSlider({ label, icon: Icon, value, onChange, description, lowLabel, highLabel }) {
  return (
    <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: CYAN }} />
        <span className="text-xs font-bold text-white">{label}</span>
      </div>
      <p className="text-[9px] mb-3" style={{ color: MUTED }}>{description}</p>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${CYAN} 0%, ${CYAN} ${value}%, ${MUTED} ${value}%, ${MUTED} 100%)`
        }}
      />
      <div className="flex items-center justify-between mt-2 text-[9px]">
        <span style={{ color: MUTED }}>{lowLabel}</span>
        <span className="font-bold" style={{ color: CYAN }}>{value}%</span>
        <span style={{ color: MUTED }}>{highLabel}</span>
      </div>
    </div>
  );
}

function generateBaselineForecast() {
  const data = [];
  let risk = 65;
  for (let day = 0; day <= 30; day++) {
    risk = Math.max(20, risk - Math.random() * 1.5);
    data.push({ day, baseline: Math.round(risk), scenario: Math.round(risk) });
  }
  return {
    dailyForecast: data,
    finalRisk: Math.round(risk),
    recommendations: []
  };
}

function generateScenarioForecast(baseline, variables) {
  const data = baseline.dailyForecast.map(point => {
    const speedFactor = variables.goalCompletionSpeed / 50;
    const threatFactor = variables.threatFrequency / 50;
    const budgetFactor = variables.budgetAllocation / 50;
    const capacityFactor = variables.teamCapacity / 50;
    const automationFactor = variables.automationLevel / 50;

    const improvement = (speedFactor * 0.3 + budgetFactor * 0.2 + capacityFactor * 0.2 + automationFactor * 0.3) * 5;
    const degradation = threatFactor * 2;
    const netChange = improvement - degradation;

    const scenarioRisk = Math.max(10, Math.min(100, point.baseline - netChange * (point.day / 30)));
    return { ...point, scenario: Math.round(scenarioRisk) };
  });

  const finalRisk = data[30].scenario;
  const reduction = baseline.finalRisk - finalRisk;

  const recommendations = generateRecommendations(variables, reduction);

  return {
    dailyForecast: data,
    finalRisk,
    recommendations
  };
}

function generateRecommendations(variables, reduction) {
  const recs = [];

  if (variables.goalCompletionSpeed < 40) {
    recs.push({
      action: "Accelerate Goal Completion Rate",
      impact: "Could reduce risk by additional 8-12 points",
      effort: "Medium Effort",
      timeline: "2-3 weeks"
    });
  }

  if (variables.automationLevel < 50) {
    recs.push({
      action: "Increase Security Automation",
      impact: "Reduce manual response time by 40-60%",
      effort: "High Effort",
      timeline: "4-6 weeks"
    });
  }

  if (variables.teamCapacity < 50) {
    recs.push({
      action: "Expand Security Team Capacity",
      impact: "Handle 2x more security initiatives",
      effort: "High Effort",
      timeline: "6-8 weeks"
    });
  }

  if (reduction < 5) {
    recs.push({
      action: "Reassess Priority Goals",
      impact: "Focus on high-impact security initiatives",
      effort: "Low Effort",
      timeline: "Immediate"
    });
  }

  if (recs.length === 0) {
    recs.push({
      action: "Maintain Current Trajectory",
      impact: "On track for significant risk reduction",
      effort: "Continue Current Effort",
      timeline: "Ongoing"
    });
  }

  return recs.slice(0, 4);
}

function calculateImpactSummary(baseline, scenario) {
  if (!baseline || !scenario) return { reduction: 0, percentage: 0 };
  const reduction = baseline.finalRisk - scenario.finalRisk;
  const percentage = baseline.finalRisk > 0 ? Math.round((reduction / baseline.finalRisk) * 100) : 0;
  return { reduction, percentage };
}