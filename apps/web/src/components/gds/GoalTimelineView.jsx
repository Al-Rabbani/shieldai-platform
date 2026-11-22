import React, { useState } from "react";
import { Calendar, TrendingDown, Target, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

export default function GoalTimelineView({ goals, plans }) {
  const [timeRange, setTimeRange] = useState("30d");

  const timelineData = generateTimelineData(goals, plans, timeRange);
  const upcomingMilestones = getUpcomingMilestones(goals, plans);
  const vulnerabilityTargets = getVulnerabilityTargets(goals);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-white">Goal Completion Timeline</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Map goal completions against vulnerability reduction targets</p>
        </div>
        <div className="flex items-center gap-2">
          {["7d", "14d", "30d", "60d", "90d"].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: timeRange === range ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${timeRange === range ? CYAN + "40" : BORDER}`,
                color: timeRange === range ? CYAN : MUTED
              }}>
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Main Timeline Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-white">Projected Goal Completions & Vulnerability Reduction</h4>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Cumulative goals completed vs risk reduction over time</p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis
              dataKey="date"
              stroke={MUTED}
              fontSize={10}
              tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            />
            <YAxis
              yAxisId="left"
              stroke={CYAN}
              fontSize={10}
              label={{ value: 'Goals Completed', angle: -90, position: 'insideLeft', fill: CYAN, fontSize: 10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={DANGER}
              fontSize={10}
              domain={[0, 100]}
              label={{ value: 'Risk Reduction %', angle: 90, position: 'insideRight', fill: DANGER, fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
              formatter={(value, name) => [value, name === 'goalsCompleted' ? 'Goals Completed' : 'Risk Reduction %']}
              labelFormatter={(val) => new Date(val).toLocaleDateString()}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="goalsCompleted"
              stroke={CYAN}
              fill={`${CYAN}20`}
              strokeWidth={2}
              name="Goals Completed"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="riskReduction"
              stroke={DANGER}
              strokeWidth={3}
              dot={{ r: 4, fill: DANGER }}
              name="Risk Reduction %"
            />
            {timelineData.filter(d => d.milestone).map((d, idx) => (
              <ReferenceLine
                key={idx}
                x={d.date}
                stroke={LOW}
                strokeDasharray="3 3"
                label={{ value: d.milestone, angle: -90, fill: LOW, fontSize: 9 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Upcoming Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: CYAN }} />
            <h4 className="text-sm font-bold text-white">Upcoming Goal Completions</h4>
          </div>
          <div className="space-y-3">
            {upcomingMilestones.length === 0 ? (
              <p className="text-[11px]" style={{ color: MUTED }}>No upcoming milestones scheduled</p>
            ) : (
              upcomingMilestones.slice(0, 6).map((milestone, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                    <CheckCircle className="w-5 h-5" style={{ color: CYAN }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{milestone.goal}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3" style={{ color: MUTED }} />
                      <span className="text-[10px]" style={{ color: MUTED }}>
                        {new Date(milestone.date).toLocaleDateString()} · {milestone.daysUntil} days
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-bold px-2 py-1 rounded"
                      style={{ color: milestone.impact >= 70 ? LOW : milestone.impact >= 50 ? MEDIUM : HIGH, background: "rgba(255,255,255,0.04)" }}>
                      {milestone.impact}% impact
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Vulnerability Reduction Targets */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: DANGER }} />
            <h4 className="text-sm font-bold text-white">Vulnerability Reduction Targets</h4>
          </div>
          <div className="space-y-3">
            {vulnerabilityTargets.map((target, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border-l-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderLeftColor: target.status === "achieved" ? LOW : target.status === "on_track" ? CYAN : HIGH
                }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white">{target.target}% Risk Reduction</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded uppercase ${
                    target.status === "achieved" ? "text-emerald-400" :
                    target.status === "on_track" ? "text-blue-400" : "text-orange-400"
                  }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                    {target.status === "achieved" ? "✓ Achieved" : target.status === "on_track" ? "On Track" : "At Risk"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${target.progress}%`, background: target.status === "achieved" ? LOW : target.status === "on_track" ? CYAN : HIGH }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: TEXT }}>{target.progress}%</span>
                </div>
                <p className="text-[9px] mt-2" style={{ color: MUTED }}>
                  Target date: {new Date(target.targetDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Critical Path Analysis */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" style={{ color: CYAN }} />
          <h4 className="text-sm font-bold text-white">Critical Path Analysis</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>On Track</p>
            </div>
            <p className="text-2xl font-black" style={{ color: LOW }}>{timelineData.filter(d => d.onTrack).length}</p>
            <p className="text-[9px] mt-1" style={{ color: MUTED }}>Goals meeting targets</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} />
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>At Risk</p>
            </div>
            <p className="text-2xl font-black" style={{ color: HIGH }}>{timelineData.filter(d => !d.onTrack && d.riskReduction > 0).length}</p>
            <p className="text-[9px] mt-1" style={{ color: MUTED }}>Goals needing attention</p>
          </div>
          <div className="p-4 rounded-lg" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" style={{ color: CYAN }} />
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Target Date</p>
            </div>
            <p className="text-2xl font-black" style={{ color: CYAN }}>
              {timelineData.filter(d => d.riskReduction >= 50).length > 0
                ? new Date(timelineData.find(d => d.riskReduction >= 50)?.date || new Date()).toLocaleDateString()
                : "TBD"}
            </p>
            <p className="text-[9px] mt-1" style={{ color: MUTED }}>50% risk reduction</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function generateTimelineData(goals, plans, timeRange) {
  const days = parseInt(timeRange.replace("d", ""));
  const data = [];
  const today = new Date();
  
  let cumulativeGoals = 0;
  let currentRiskReduction = 0;
  
  for (let i = 0; i <= days; i += 3) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    
    const goalsCompletedByDate = goals.filter(g => {
      if (!g.estimated_completion_date) return false;
      return new Date(g.estimated_completion_date) <= date;
    }).length;
    
    cumulativeGoals = goalsCompletedByDate;
    
    const totalImpact = goals
      .filter(g => g.estimated_completion_date && new Date(g.estimated_completion_date) <= date)
      .reduce((sum, g) => sum + (g.vulnerability_reduction || 0), 0);
    
    currentRiskReduction = Math.min(100, totalImpact);
    
    const milestone = goals.find(g => 
      g.estimated_completion_date && 
      new Date(g.estimated_completion_date).toISOString().split("T")[0] === dateStr
    );
    
    data.push({
      date: dateStr,
      goalsCompleted: cumulativeGoals,
      riskReduction: Math.round(currentRiskReduction),
      milestone: milestone ? milestone.goal_statement?.slice(0, 20) + "..." : null,
      onTrack: currentRiskReduction >= (i / days) * 50
    });
  }
  
  return data;
}

function getUpcomingMilestones(goals, plans) {
  const today = new Date();
  return goals
    .filter(g => g.estimated_completion_date && g.status !== "completed")
    .map(g => {
      const completionDate = new Date(g.estimated_completion_date);
      const daysUntil = Math.ceil((completionDate - today) / (1000 * 60 * 60 * 24));
      return {
        goal: g.goal_statement || "Untitled Goal",
        date: g.estimated_completion_date,
        daysUntil: Math.max(0, daysUntil),
        impact: g.vulnerability_reduction || 0
      };
    })
    .filter(m => m.daysUntil >= 0 && m.daysUntil <= 90)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function getVulnerabilityTargets(goals) {
  const totalPotentialReduction = goals.reduce((sum, g) => sum + (g.vulnerability_reduction || 0), 0);
  const currentReduction = goals.filter(g => g.status === "completed").reduce((sum, g) => sum + (g.vulnerability_reduction || 0), 0);
  
  const targets = [
    { target: 25, targetDate: addDays(new Date(), 30) },
    { target: 50, targetDate: addDays(new Date(), 60) },
    { target: 75, targetDate: addDays(new Date(), 90) },
    { target: 100, targetDate: addDays(new Date(), 120) }
  ];
  
  return targets.map(t => {
    const progress = Math.min(100, Math.round((currentReduction / totalPotentialReduction) * 100));
    const achieved = currentReduction >= t.target;
    const onTrack = progress >= (t.target / 100) * 100;
    
    return {
      target: t.target,
      targetDate: t.targetDate,
      progress: achieved ? 100 : progress,
      status: achieved ? "achieved" : onTrack ? "on_track" : "at_risk"
    };
  }).filter(t => t.target <= totalPotentialReduction);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}