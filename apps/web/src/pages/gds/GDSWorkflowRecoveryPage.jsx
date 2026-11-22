import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RotateCcw, ArrowLeftRight, AlertTriangle, CheckCircle, Clock, Activity, TrendingUp, Shield } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSWorkflowRecoveryPage() {
  const qc = useQueryClient();
  const [selectedRun, setSelectedRun] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState("retry"); // 'retry' or 'rollback'

  const { data: failedRunsData } = useQuery({
    queryKey: ["workflow-failed-runs"],
    queryFn: () => base44.entities.WorkflowRun.filter({ status: "failed" }, "-created_date", 50).catch(() => []),
  });

  const { data: rollbackRunsData } = useQuery({
    queryKey: ["workflow-rollback-runs"],
    queryFn: () => base44.entities.WorkflowRun.filter({ status: "rolled_back" }, "-created_date", 50).catch(() => []),
  });

  const { data: recoveryStats } = useQuery({
    queryKey: ["workflow-recovery-stats"],
    queryFn: () => base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "recovery_stats" }).then(r => r.data).catch(() => ({})),
    refetchInterval: 30000,
  });

  const retryMutation = useMutation({
    mutationFn: async (runId) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "retry_run", run_id: runId });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-failed-runs"]);
      qc.invalidateQueries(["workflow-recovery-stats"]);
    }
  });

  const rollbackMutation = useMutation({
    mutationFn: async (runId) => {
      const response = await base44.functions.invoke("gdsWorkflowIntelligenceEngine", { action: "rollback_run", run_id: runId });
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(["workflow-failed-runs"]);
      qc.invalidateQueries(["workflow-rollback-runs"]);
      qc.invalidateQueries(["workflow-recovery-stats"]);
    }
  });

  const failedRuns = failedRunsData || [];
  const rollbackRuns = rollbackRunsData || [];
  const stats = recoveryStats || {};

  const formatDuration = (ms) => {
    if (!ms) return "—";
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  const getFailureReason = (run) => {
    if (run.error_message) return run.error_message;
    if (run.failed_step) return `Failed at step #${run.failed_step}`;
    return "Unknown error";
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Workflows", path: "/workflows" }, { label: "Workflow Recovery" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <RotateCcw className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Workflow Recovery</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-008 v1.0</span>
        </div>
      </div>

      {/* Recovery Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            <h3 className="text-sm font-bold text-white">Failed Runs</h3>
          </div>
          <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{failedRuns.length}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Require recovery action</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight className="w-4 h-4" style={{ color: HIGH }} />
            <h3 className="text-sm font-bold text-white">Rolled Back</h3>
          </div>
          <p className="text-3xl font-black font-mono" style={{ color: HIGH }}>{rollbackRuns.length}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Successfully reverted</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
            <h3 className="text-sm font-bold text-white">Recovery Success</h3>
          </div>
          <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{stats.success_rate_pct ?? 0}%</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Last 30 days</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Avg Recovery Time</h3>
          </div>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{formatDuration(stats.avg_recovery_time_ms)}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Time to resolution</p>
        </Card>
      </div>

      {/* Recovery Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Failed Runs Recovery */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Failed Runs - Recovery Options</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Retry from failure point or rollback to last known good state</p>
          </div>
          {failedRuns.length === 0 ? (
            <EmptyState icon={CheckCircle} title="No failed runs" description="All workflows are running successfully" />
          ) : (
            <div className="space-y-3">
              {failedRuns.map((run, idx) => (
                <div
                  key={run.run_id || idx}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedRun?.run_id === run.run_id ? "scale-[1.02]" : ""}`}
                  style={{
                    background: selectedRun?.run_id === run.run_id ? `${DANGER}10` : "rgba(255,255,255,0.02)",
                    borderColor: selectedRun?.run_id === run.run_id ? DANGER + "40" : BORDER,
                  }}
                  onClick={() => setSelectedRun(run)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-white truncate">{run.run_id?.slice(0, 24)}...</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">FAILED</span>
                      </div>
                      <p className="text-[10px] text-white mb-1">{run.workflow_name || "Unknown Workflow"}</p>
                      <p className="text-[10px] truncate" style={{ color: MUTED }}>{getFailureReason(run)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-[9px]" style={{ color: MUTED }}>Failed at</p>
                        <p className="text-xs font-bold" style={{ color: TEXT }}>{run.failed_at ? new Date(run.failed_at).toLocaleString() : "—"}</p>
                      </div>
                    </div>
                  </div>
                  {selectedRun?.run_id === run.run_id && (
                    <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                      <button
                        onClick={() => setRecoveryMode("retry")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${recoveryMode === "retry" ? "ring-2" : ""}`}
                        style={{
                          background: recoveryMode === "retry" ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${recoveryMode === "retry" ? CYAN + "40" : BORDER}`,
                          color: recoveryMode === "retry" ? CYAN : MUTED,
                          ringColor: CYAN
                        }}>
                        <RotateCcw className="w-3.5 h-3.5" />
                        Retry Run
                      </button>
                      <button
                        onClick={() => setRecoveryMode("rollback")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${recoveryMode === "rollback" ? "ring-2" : ""}`}
                        style={{
                          background: recoveryMode === "rollback" ? `${HIGH}15` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${recoveryMode === "rollback" ? HIGH + "40" : BORDER}`,
                          color: recoveryMode === "rollback" ? HIGH : MUTED,
                          ringColor: HIGH
                        }}>
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        Rollback
                      </button>
                      <button
                        onClick={() => {
                          if (recoveryMode === "retry") {
                            retryMutation.mutate(run.run_id);
                          } else {
                            rollbackMutation.mutate(run.run_id);
                          }
                        }}
                        disabled={retryMutation.isPending || rollbackMutation.isPending}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
                        style={{
                          background: recoveryMode === "retry" ? `${CYAN}15` : `${HIGH}15`,
                          border: `1px solid ${recoveryMode === "retry" ? CYAN + "40" : HIGH + "40"}`,
                          color: recoveryMode === "retry" ? CYAN : HIGH
                        }}>
                        {recoveryMode === "retry" ? "Retry Now" : "Rollback Now"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Rollback History */}
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Recent Rollbacks</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Successfully reverted workflow runs</p>
          </div>
          {rollbackRuns.length === 0 ? (
            <EmptyState icon={ArrowLeftRight} title="No rollbacks" description="No rollback operations recorded" />
          ) : (
            <div className="space-y-3">
              {rollbackRuns.slice(0, 8).map((run, idx) => (
                <div key={run.run_id || idx} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-white truncate">{run.run_id?.slice(0, 24)}...</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">ROLLED BACK</span>
                      </div>
                      <p className="text-[10px] text-white">{run.workflow_name || "Unknown Workflow"}</p>
                    </div>
                    <Shield className="w-4 h-4 flex-shrink-0" style={{ color: LOW }} />
                  </div>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span style={{ color: MUTED }}>Rolled back: {run.rolled_back_at ? new Date(run.rolled_back_at).toLocaleString() : "—"}</span>
                    {run.rollback_reason && (
                      <span className="truncate" style={{ color: TEXT }}>Reason: {run.rollback_reason}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recovery Recommendations */}
      {stats.recommendations && stats.recommendations.length > 0 && (
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">AI Recovery Recommendations</h3>
          </div>
          <div className="space-y-3">
            {stats.recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 rounded-lg" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}20` }}>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                    <Activity className="w-3 h-3" style={{ color: CYAN }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white mb-1">{rec.title}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{rec.description}</p>
                    {rec.suggested_action && (
                      <p className="text-[10px] mt-2" style={{ color: CYAN }}>Suggested: {rec.suggested_action}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}