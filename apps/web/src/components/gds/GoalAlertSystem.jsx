import React, { useState, useEffect } from "react";
import { Bell, AlertTriangle, AlertCircle, Info, X, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT } from "@/components/gds/GDSOSShared";

const ALERT_TYPE_CONFIG = {
  critical: { icon: AlertTriangle, color: DANGER, bg: `${DANGER}15`, border: `${DANGER}30`, label: "Critical" },
  high: { icon: AlertCircle, color: HIGH, bg: `${HIGH}15`, border: `${HIGH}30`, label: "High" },
  medium: { icon: Info, color: CYAN, bg: `${CYAN}15`, border: `${CYAN}30`, label: "Medium" },
  low: { icon: Bell, color: MUTED, bg: `${MUTED}15`, border: `${MUTED}30`, label: "Low" }
};

export default function GoalAlertSystem({ goals, plans, onDismissAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    const generatedAlerts = generateGoalAlerts(goals, plans);
    setAlerts(generatedAlerts);
  }, [goals, plans]);

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    onDismissAlert && onDismissAlert(alertId);
  };

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const highCount = alerts.filter(a => a.severity === "high").length;

  if (alerts.length === 0 && showPanel) {
    return (
      <div className="p-4 rounded-lg" style={{ background: `${LOW}05`, border: `1px solid ${LOW}30` }}>
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
          <div>
            <p className="text-sm font-bold" style={{ color: LOW }}>All Goals On Track</p>
            <p className="text-[10px]" style={{ color: MUTED }}>No prerequisite delays detected</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showPanel && (
        <div className="p-4 rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Goal Delay Alerts</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}15` }}>
                {alerts.length} active
              </span>
            </div>
            <button onClick={() => setShowPanel(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {(criticalCount > 0 || highCount > 0) && (
            <div className="flex items-center gap-4 mb-3 text-[10px]">
              {criticalCount > 0 && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>
                  <AlertTriangle className="w-3 h-3" /> {criticalCount} Critical
                </span>
              )}
              {highCount > 0 && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ color: HIGH, background: `${HIGH}15` }}>
                  <AlertCircle className="w-3 h-3" /> {highCount} High
                </span>
              )}
            </div>
          )}

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: "thin" }}>
            {alerts.map(alert => {
              const config = ALERT_TYPE_CONFIG[alert.severity] || ALERT_TYPE_CONFIG.low;
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg border transition-all hover:scale-[1.01]"
                  style={{ background: config.bg, border: `1px solid ${config.border}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: config.color }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                            style={{ color: config.color, background: "rgba(255,255,255,0.1)" }}>
                            {config.label}
                          </span>
                          <span className="text-[10px]" style={{ color: MUTED }}>{new Date(alert.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-bold" style={{ color: TEXT }}>{alert.title}</p>
                        <p className="text-[11px] mt-1" style={{ color: MUTED }}>{alert.message}</p>
                        {alert.impact && (
                          <div className="mt-2 p-2 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
                            <p className="text-[10px] font-bold mb-1" style={{ color: DANGER }}>Downstream Impact</p>
                            <p className="text-[10px]" style={{ color: TEXT }}>{alert.impact}</p>
                          </div>
                        )}
                        {alert.delay_days && (
                          <p className="text-[10px] mt-2" style={{ color: config.color }}>
                            Delay: {alert.delay_days} days behind schedule
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => dismissAlert(alert.id)} className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" style={{ color: MUTED }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function generateGoalAlerts(goals, plans) {
  const alerts = [];
  const now = new Date();

  goals.forEach(goal => {
    if (!goal.dependencies || goal.dependencies.length === 0) return;

    const plan = plans.find(p => p.goal_id === goal.goal_id);
    if (!plan) return;

    const completedSteps = plan.steps?.filter(s => s.status === "completed").length || 0;
    const totalSteps = plan.steps?.length || 0;
    const completionRate = totalSteps > 0 ? completedSteps / totalSteps : 0;

    const expectedCompletion = new Date(goal.created_date);
    const daysSinceCreation = Math.floor((now - new Date(goal.created_date)) / (1000 * 60 * 60 * 24));
    const expectedRate = daysSinceCreation / 30;

    if (completionRate < expectedRate * 0.5 && completionRate < 0.3) {
      const blockedGoals = goals.filter(g =>
        g.dependencies?.some(d => d.target_goal_id === goal.goal_id)
      );

      let severity = "medium";
      if (blockedGoals.length >= 3 || goal.priority === "P0") severity = "critical";
      else if (blockedGoals.length >= 2 || goal.priority === "P1") severity = "high";

      const delayDays = Math.round((expectedRate - completionRate) * 30);

      alerts.push({
        id: `delay-${goal.goal_id}`,
        severity,
        title: `Prerequisite Goal Delayed: ${goal.goal_statement?.slice(0, 40) || "Untitled"}`,
        message: `Goal is ${Math.round((1 - completionRate / expectedRate) * 100)}% behind expected completion rate`,
        impact: blockedGoals.length > 0
          ? `${blockedGoals.length} downstream goal${blockedGoals.length > 1 ? "s" : ""} may be impacted`
          : "No downstream dependencies affected",
        delay_days: delayDays,
        goal_id: goal.goal_id,
        created_at: now.toISOString()
      });
    }

    if (plan.steps) {
      plan.steps.forEach((step, idx) => {
        if (step.status !== "completed" && step.depends_on) {
          const blockedSteps = step.depends_on.filter(depId => {
            const depStep = plan.steps[depId - 1];
            return depStep && depStep.status !== "completed";
          });

          if (blockedSteps.length > 0) {
            alerts.push({
              id: `blocked-${goal.goal_id}-step-${idx}`,
              severity: "medium",
              title: `Step Blocked: ${step.step_name || `Step ${idx + 1}`}`,
              message: `Waiting on ${blockedSteps.length} prerequisite step${blockedSteps.length > 1 ? "s" : ""}`,
              impact: `Cannot proceed until dependencies are completed`,
              goal_id: goal.goal_id,
              created_at: now.toISOString()
            });
          }
        }
      });
    }
  });

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}