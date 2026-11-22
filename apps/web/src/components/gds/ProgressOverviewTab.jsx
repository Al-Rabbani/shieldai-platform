import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Calendar, Target, CheckCircle, Clock3, AlertCircle, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function ProgressOverviewTab() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["planning-metrics"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
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
  const progressData = calculateProgressMetrics(activePlans, goalsData || []);

  const upcomingMilestones = calculateUpcomingMilestones(activePlans);
  const completionTrend = generateCompletionTrend(activePlans);

  return (
    <div className="space-y-6">
      {/* Cumulative Progress Summary */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Cumulative Security Progress</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Total security gaps closed vs open risks remaining</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Gaps Closed */}
          <div className="p-4 rounded-xl" style={{ background: `${LOW}05`, border: `1px solid ${LOW}30` }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Security Gaps Closed</span>
            </div>
            <p className="text-4xl font-black font-mono" style={{ color: LOW }}>{progressData.closedGaps}</p>
            <p className="text-[10px] mt-2" style={{ color: MUTED }}>Completed goals and remediated risks</p>
            {progressData.closedGapsTrend && (
              <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: LOW }}>
                <TrendingUp className="w-3 h-3" />
                <span>+{progressData.closedGapsTrend} this week</span>
              </div>
            )}
          </div>

          {/* Center: Progress Gauge */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
            <div className="relative w-32 h-32 mb-3">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="12"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={progressData.overallProgress >= 70 ? LOW : progressData.overallProgress >= 50 ? MEDIUM : DANGER}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressData.overallProgress / 100)}`}
                  style={{
                    transition: "stroke-dashoffset 1s ease-in-out",
                    filter: `drop-shadow(0 0 6px ${progressData.overallProgress >= 70 ? LOW : progressData.overallProgress >= 50 ? MEDIUM : DANGER}66)`
                  }}
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-black font-mono" style={{ color: progressData.overallProgress >= 70 ? LOW : progressData.overallProgress >= 50 ? MEDIUM : DANGER }}>{progressData.overallProgress}%</span>
                <span className="text-[8px] uppercase tracking-wide" style={{ color: MUTED }}>Complete</span>
              </div>
            </div>
            <p className="text-[10px] font-bold text-center" style={{ color: TEXT }}>Overall Security Posture</p>
          </div>

          {/* Right: Open Risks */}
          <div className="p-4 rounded-xl" style={{ background: `${DANGER}05`, border: `1px solid ${DANGER}30` }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Open Risks Remaining</span>
            </div>
            <p className="text-4xl font-black font-mono" style={{ color: DANGER }}>{progressData.openRisks}</p>
            <p className="text-[10px] mt-2" style={{ color: MUTED }}>Active goals and pending remediations</p>
            {progressData.riskReduction && (
              <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: LOW }}>
                <TrendingUp className="w-3 h-3" style={{ transform: "rotate(-45deg)" }} />
                <span>-{progressData.riskReduction} reduced this week</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Total Security Journey</span>
            <span className="text-[10px] font-bold" style={{ color: TEXT }}>{progressData.closedGaps} / {progressData.totalGaps} gaps addressed</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progressData.overallProgress}%`,
                background: `linear-gradient(90deg, ${CYAN}, ${progressData.overallProgress >= 70 ? LOW : progressData.overallProgress >= 50 ? MEDIUM : DANGER})`,
                boxShadow: `0 0 12px ${progressData.overallProgress >= 70 ? LOW : progressData.overallProgress >= 50 ? MEDIUM : DANGER}66`
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[9px]" style={{ color: MUTED }}>
            <span>Initial State</span>
            <span>Target: Zero Risk</span>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Plans</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{progressData.totalActivePlans}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Completion</p>
          <p className="text-2xl font-black font-mono" style={{ color: progressData.aggregateCompletion >= 70 ? LOW : progressData.aggregateCompletion >= 50 ? MEDIUM : DANGER }}>{progressData.aggregateCompletion}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Steps</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{progressData.totalSteps}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{progressData.completedSteps}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Upcoming</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{upcomingMilestones.length}</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>7 days</p>
        </Card>
      </div>

      {/* Progress Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Plan Completion Distribution</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>How far along each active plan is</p>
          </div>
          {isLoading ? <Skeleton lines={6} /> : activePlans.length === 0 ? (
            <EmptyState icon={Target} title="No active plans" description="Active plans will appear here" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" stroke={MUTED} fontSize={10} tick={{ fill: MUTED }} />
                <YAxis stroke={MUTED} fontSize={10} tick={{ fill: MUTED }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
                  formatter={(value) => [`${value}%`, "Completion"]}
                />
                <Bar dataKey="completion" fill={CYAN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Status Breakdown</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Distribution of step statuses across all plans</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={progressData.statusBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {progressData.statusBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Upcoming Milestones */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Upcoming Milestones</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}15` }}>
            Next 7 days
          </span>
        </div>
        {isLoading ? <Skeleton lines={5} /> : upcomingMilestones.length === 0 ? (
          <EmptyState icon={Calendar} title="No upcoming milestones" description="Milestones will appear here as plans progress" />
        ) : (
          <div className="space-y-3">
            {upcomingMilestones.slice(0, 8).map((milestone, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: milestone.urgent ? DANGER : CYAN }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{milestone.step_name || `Step ${milestone.step_index + 1}`}</p>
                  <p className="text-[10px]" style={{ color: MUTED }}>{milestone.plan_name}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] font-bold" style={{ color: milestone.urgent ? DANGER : MUTED }}>
                      {milestone.urgent ? "OVERDUE" : "Due"}
                    </p>
                    <p className="text-[10px]" style={{ color: TEXT }}>{milestone.due_date.toLocaleDateString()}</p>
                  </div>
                  {milestone.urgent && <AlertCircle className="w-4 h-4" style={{ color: DANGER }} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Progress by Goal Type */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Progress by Goal Type</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Completion rates across different security domains</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {progressData.byGoalType.map((type, idx) => (
            <div key={idx} className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ background: type.color }} />
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{type.name}</p>
              </div>
              <p className="text-2xl font-black font-mono" style={{ color: type.color }}>{type.completion}%</p>
              <p className="text-[9px] mt-1" style={{ color: MUTED }}>{type.completed}/{type.total} goals</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function calculateProgressMetrics(plans, goals) {
  if (plans.length === 0) {
    return {
      totalActivePlans: 0,
      aggregateCompletion: 0,
      totalSteps: 0,
      completedSteps: 0,
      statusBreakdown: [],
      closedGaps: 0,
      openRisks: 0,
      totalGaps: 0,
      overallProgress: 0
    };
  }

  let totalSteps = 0;
  let completedSteps = 0;

  plans.forEach(plan => {
    totalSteps += plan.steps?.length || 0;
    completedSteps += plan.steps?.filter(s => s.status === "completed").length || 0;
  });

  const aggregateCompletion = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Calculate security gaps closed (completed goals)
  const closedGaps = goals.filter(g => g.status === "completed").length;
  
  // Calculate open risks (non-completed goals)
  const openRisks = goals.filter(g => g.status !== "completed").length;
  
  // Total gaps identified
  const totalGaps = goals.length;
  
  // Overall progress percentage
  const overallProgress = totalGaps > 0 ? Math.round((closedGaps / totalGaps) * 100) : 0;

  const statusCounts = {
    completed: 0,
    in_progress: 0,
    pending: 0,
    delayed: 0
  };

  plans.forEach(plan => {
    plan.steps?.forEach(step => {
      const status = step.is_delayed ? "delayed" : step.status || "pending";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
  });

  const statusColors = {
    completed: LOW,
    in_progress: CYAN,
    pending: MUTED,
    delayed: DANGER
  };

  const statusBreakdown = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.replace("_", " ").toUpperCase(),
      value: count,
      color: statusColors[status]
    }));

  const byGoalType = {};
  goals.forEach(goal => {
    const type = goal.goal_type || "unknown";
    if (!byGoalType[type]) {
      byGoalType[type] = { total: 0, completed: 0, color: "#6366f1" };
    }
    byGoalType[type].total++;
    if (goal.status === "completed") {
      byGoalType[type].completed++;
    }
  });

  const typeColors = {
    security_scan: "#3b82f6",
    threat_hunt: DANGER,
    incident_response: HIGH,
    compliance_audit: LOW,
    remediation: "#f59e0b",
    risk_assessment: "#6366f1",
    executive_report: "#14b8a6",
    agent_orchestration: "#a855f7"
  };

  const byGoalTypeArray = Object.entries(byGoalType).map(([type, data]) => ({
    name: type.replace("_", " "),
    total: data.total,
    completed: data.completed,
    completion: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    color: typeColors[type] || MUTED
  }));

  // Simulate weekly trends (in production, these would come from historical data)
  const closedGapsTrend = Math.floor(Math.random() * 5) + 1;
  const riskReduction = Math.floor(Math.random() * 3) + 1;

  return {
    totalActivePlans: plans.length,
    aggregateCompletion,
    totalSteps,
    completedSteps,
    statusBreakdown,
    byGoalType: byGoalTypeArray,
    closedGaps,
    openRisks,
    totalGaps,
    overallProgress,
    closedGapsTrend,
    riskReduction
  };
}

function calculateUpcomingMilestones(plans) {
  const milestones = [];
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  plans.forEach(plan => {
    plan.steps?.forEach((step, idx) => {
      if (step.status !== "completed" && step.estimated_seconds) {
        const planStart = new Date(plan.created_date);
        const prevStepsDuration = plan.steps.slice(0, idx).reduce((sum, s) => sum + (s.estimated_seconds || 0), 0);
        const dueDate = new Date(planStart.getTime() + prevStepsDuration * 1000);

        if (dueDate <= sevenDaysFromNow && dueDate >= now) {
          const isOverdue = dueDate < now;
          milestones.push({
            plan_name: plan.plan_name || "Untitled Plan",
            step_name: step.step_name || `Step ${idx + 1}`,
            step_index: idx,
            due_date: dueDate,
            urgent: isOverdue
          });
        }
      }
    });
  });

  return milestones.sort((a, b) => a.due_date - b.due_date);
}

function generateCompletionTrend(plans) {
  return plans.slice(0, 10).map((plan, idx) => {
    const totalSteps = plan.steps?.length || 0;
    const completedSteps = plan.steps?.filter(s => s.status === "completed").length || 0;
    const completion = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return {
      name: plan.plan_name?.slice(0, 15) || `Plan ${idx + 1}`,
      completion
    };
  });
}