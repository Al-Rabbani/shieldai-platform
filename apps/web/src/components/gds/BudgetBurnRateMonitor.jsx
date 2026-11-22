import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, AlertTriangle, TrendingUp, DollarSign, X, Check, Shield, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

export default function BudgetBurnRateMonitor({ plans, sessions }) {
  const qc = useQueryClient();
  const [showAlerts, setShowAlerts] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const { data: budgetMetrics } = useQuery({
    queryKey: ["budget-burn-metrics"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "budget_metrics" }).then(r => r.data),
    refetchInterval: 300000,
  });

  const { data: alerts } = useQuery({
    queryKey: ["budget-alerts"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "get_budget_alerts" }).then(r => r.data),
    refetchInterval: 60000,
  });

  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId) => {
      await base44.functions.invoke("gdsPlanningReasoningEngine", {
        action: "dismiss_budget_alert",
        alert_id: alertId
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["budget-alerts"]);
    }
  });

  const activeAlerts = (alerts?.alerts || []).filter(a => !dismissedAlerts.includes(a.alert_id));
  const totalBudget = budgetMetrics?.total_monthly_budget || 0;
  const currentSpend = budgetMetrics?.current_month_spend || 0;
  const burnRate = budgetMetrics?.burn_rate_percentage || 0;
  const projectedOverrun = budgetMetrics?.projected_overrun || 0;

  useEffect(() => {
    if (activeAlerts.length > 0 && showAlerts) {
      const timer = setTimeout(() => {
        setShowAlerts(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeAlerts.length]);

  const handleDismiss = (alertId) => {
    setDismissedAlerts(prev => [...prev, alertId]);
    dismissAlertMutation.mutate(alertId);
  };

  if (!showAlerts && activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Budget Overview Widget */}
      <Card className="p-5 border-l-4" style={{ borderLeftColor: burnRate > 80 ? DANGER : burnRate > 60 ? HIGH : CYAN }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: burnRate > 80 ? `${DANGER}20` : burnRate > 60 ? `${HIGH}20` : `${CYAN}20` }}>
              <DollarSign className="w-5 h-5" style={{ color: burnRate > 80 ? DANGER : burnRate > 60 ? HIGH : CYAN }} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Budget Burn Rate Monitor</h4>
              <p className="text-[10px]" style={{ color: MUTED }}>Real-time spending vs monthly limits</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${
              burnRate > 80 ? "text-red-400" : burnRate > 60 ? "text-orange-400" : "text-blue-400"
            }`} style={{ background: "rgba(255,255,255,0.04)" }}>
              {burnRate > 80 ? "🔴 Critical" : burnRate > 60 ? "🟠 Warning" : "🔵 Normal"}
            </span>
            <button onClick={() => setShowAlerts(!showAlerts)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all" style={{ color: MUTED }}>
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: TEXT }}>Monthly Budget Usage</span>
            <span className="text-xs font-bold" style={{ color: burnRate > 80 ? DANGER : burnRate > 60 ? HIGH : CYAN }}>
              ${currentSpend.toLocaleString()} / ${totalBudget.toLocaleString()} ({burnRate}%)
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, burnRate)}%`,
                background: burnRate > 80 ? DANGER : burnRate > 60 ? HIGH : CYAN,
                boxShadow: `0 0 10px ${burnRate > 80 ? DANGER : burnRate > 60 ? HIGH : CYAN}60`
              }} />
          </div>
          {projectedOverrun > 0 && (
            <p className="text-[10px] mt-2" style={{ color: DANGER }}>
              ⚠️ Projected to exceed budget by ${projectedOverrun.toLocaleString()} this month
            </p>
          )}
        </div>

        {/* Burn Rate Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Daily Burn</p>
            <p className="text-lg font-black" style={{ color: TEXT }}>${Math.round(currentSpend / 24).toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Projected Month-End</p>
            <p className="text-lg font-black" style={{ color: projectedOverrun > 0 ? DANGER : TEXT }}>
              ${(currentSpend + projectedOverrun).toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: MUTED }}>Days Remaining</p>
            <p className="text-lg font-black" style={{ color: TEXT }}>{30 - new Date().getDate()}</p>
          </div>
        </div>
      </Card>

      {/* Active Alerts */}
      {showAlerts && activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold" style={{ color: TEXT }}>Active Budget Alerts</h4>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>
              {activeAlerts.length} alert{activeAlerts.length > 1 ? "s" : ""}
            </span>
          </div>
          {activeAlerts.map((alert, idx) => (
            <Card key={alert.alert_id || idx} className="p-4 border-l-4" style={{ borderLeftColor: DANGER }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${DANGER}20`, border: `1px solid ${DANGER}30` }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="text-sm font-bold text-white">{alert.title}</h5>
                    <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold"
                      style={{ color: DANGER, background: `${DANGER}15` }}>
                      {alert.severity || "HIGH"}
                    </span>
                  </div>
                  <p className="text-[11px]" style={{ color: MUTED }}>{alert.message}</p>
                  <div className="flex items-center gap-4 mt-2 text-[10px]">
                    <span style={{ color: MUTED }}>
                      Plan: <span style={{ color: TEXT }}>{alert.plan_name || "Unknown"}</span>
                    </span>
                    <span style={{ color: MUTED }}>
                      Burn Rate: <span style={{ color: DANGER }}>{alert.burn_rate}%</span>
                    </span>
                    <span style={{ color: MUTED }}>
                      Triggered: <span style={{ color: TEXT }}>{new Date(alert.created_at).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(alert.alert_id)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-all flex-shrink-0"
                  style={{ color: MUTED }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Plan-Level Breakdown */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: CYAN }} />
          <h4 className="text-sm font-bold text-white">Plan Budget Breakdown</h4>
        </div>
        <div className="space-y-3">
          {(plans || []).slice(0, 5).map((plan, idx) => {
            const planBudget = plan.budget_allocated || 0;
            const planSpend = plan.budget_used || 0;
            const planBurnRate = planBudget > 0 ? Math.round((planSpend / planBudget) * 100) : 0;
            const isOverBudget = planBurnRate > 100;

            return (
              <div key={plan.id || idx} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white">{plan.plan_name || `Plan #${idx + 1}`}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isOverBudget ? "text-red-400" : planBurnRate > 80 ? "text-orange-400" : "text-blue-400"
                  }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                    {planBurnRate}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.min(100, planBurnRate)}%`, background: isOverBudget ? DANGER : planBurnRate > 80 ? HIGH : CYAN }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: TEXT }}>
                    ${planSpend.toLocaleString()} / ${planBudget.toLocaleString()}
                  </span>
                </div>
                {isOverBudget && (
                  <p className="text-[9px] mt-1.5" style={{ color: DANGER }}>
                    ⚠️ Over budget by ${(planSpend - planBudget).toLocaleString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}