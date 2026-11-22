import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, AlertTriangle, Clock, TrendingUp, X, Check, Settings2, Trash2 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

export default function WorkflowAlertSystem({ onDismissAlert }) {
  const qc = useQueryClient();
  const [showConfig, setShowConfig] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const { data: alerts } = useQuery({
    queryKey: ["workflow-alerts"],
    queryFn: () => base44.entities.WorkflowAlert.filter({ status: "active" }, "-created_date", 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: alertRules } = useQuery({
    queryKey: ["workflow-alert-rules"],
    queryFn: () => base44.entities.WorkflowAlertRule.list().catch(() => []),
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId) => {
      await base44.entities.WorkflowAlert.update(alertId, { status: "dismissed" });
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-alerts"]);
      onDismissAlert?.();
    },
  });

  const activeAlerts = alerts?.filter(a => a.status === "active") || [];
  const criticalAlerts = activeAlerts.filter(a => a.severity === "critical");
  const warningAlerts = activeAlerts.filter(a => a.severity === "warning");

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical": return DANGER;
      case "warning": return HIGH;
      case "info": return CYAN;
      default: return MUTED;
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IE", { 
      hour: "2-digit", 
      minute: "2-digit",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <>
      {/* Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-4 p-3 rounded-lg border-l-4" style={{ background: `${DANGER}10`, borderLeftColor: DANGER }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: DANGER }} />
              <div className="flex-1">
                <p className="text-sm font-bold text-white mb-1">
                  {criticalAlerts.length} Critical Workflow Alert{criticalAlerts.length > 1 ? "s" : ""}
                </p>
                <p className="text-[11px]" style={{ color: MUTED }}>
                  {criticalAlerts.slice(0, 2).map(a => a.message).join(", ")}
                  {criticalAlerts.length > 2 && ` +${criticalAlerts.length - 2} more`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowConfig(true)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
              style={{ background: `${DANGER}20`, border: `1px solid ${DANGER}40`, color: DANGER }}>
              <Settings2 className="w-3.5 h-3.5 inline mr-1.5" />
              Configure
            </button>
          </div>
        </div>
      )}

      {/* Alert Panel */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Workflow Alert Configuration</h2>
                <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>Manage alert rules and view active notifications</p>
              </div>
              <button onClick={() => setShowConfig(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Alerts */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Active Alerts</h3>
              {activeAlerts.length === 0 ? (
                <p className="text-[11px]" style={{ color: MUTED }}>No active alerts</p>
              ) : (
                <div className="space-y-2">
                  {activeAlerts.map((alert, idx) => (
                    <div
                      key={alert.id || idx}
                      className="p-3 rounded-lg border"
                      style={{
                        background: `${getSeverityColor(alert.severity)}08`,
                        borderColor: getSeverityColor(alert.severity) + "30"
                      }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: `${getSeverityColor(alert.severity)}20`, border: `1px solid ${getSeverityColor(alert.severity)}30` }}>
                            <AlertTriangle className="w-4 h-4" style={{ color: getSeverityColor(alert.severity) }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-white">{alert.alert_type || "Performance Alert"}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                                style={{ color: getSeverityColor(alert.severity), background: `${getSeverityColor(alert.severity)}15` }}>
                                {alert.severity}
                              </span>
                            </div>
                            <p className="text-[11px]" style={{ color: TEXT }}>{alert.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-[10px]">
                              <span style={{ color: MUTED }}>Workflow: <span className="font-mono" style={{ color: CYAN }}>{alert.workflow_name || "Unknown"}</span></span>
                              <span style={{ color: MUTED }}>Run: <span className="font-mono" style={{ color: TEXT }}>{alert.run_id?.slice(0, 16)}...</span></span>
                              <span style={{ color: MUTED }}>Triggered: {formatTime(alert.created_date)}</span>
                            </div>
                            {alert.actual_duration_ms && alert.threshold_ms && (
                              <div className="mt-2 p-2 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
                                <div className="flex items-center gap-2 text-[10px]">
                                  <Clock className="w-3 h-3" style={{ color: MUTED }} />
                                  <span style={{ color: MUTED }}>Duration:</span>
                                  <span style={{ color: DANGER }}>{formatDuration(alert.actual_duration_ms)}</span>
                                  <span style={{ color: MUTED }}>(threshold: {formatDuration(alert.threshold_ms)})</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => dismissMutation.mutate(alert.id)}
                          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                          style={{ color: MUTED }}>
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alert Rules */}
            <div className="space-y-3 pt-4 border-t" style={{ borderColor: BORDER }}>
              <h3 className="text-sm font-bold text-white">Alert Rules</h3>
              {alertRules?.length === 0 ? (
                <p className="text-[11px]" style={{ color: MUTED }}>No alert rules configured</p>
              ) : (
                <div className="space-y-2">
                  {alertRules.map((rule, idx) => (
                    <div key={rule.id || idx} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{rule.rule_name || "Performance Rule"}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>
                            Trigger when {rule.condition_type || "duration"} {rule.operator || ">"} {formatDuration(rule.threshold_ms)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${rule.enabled ? "text-emerald-400" : "text-slate-500"}`}
                            style={{ background: rule.enabled ? `${LOW}15` : "rgba(255,255,255,0.04)" }}>
                            {rule.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}