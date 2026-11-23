import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, AlertTriangle, Lock, Activity, Smartphone, Server, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const DECISION_COLORS = {
  allow: LOW,
  deny: DANGER,
  approval_required: HIGH,
  step_up_auth: "#f97316"
};

const SCORE_GRADE_COLORS = {
  A: LOW,
  B: "#14b8a6",
  C: MEDIUM,
  D: HIGH,
  F: DANGER
};

export default function GDSZeroTrustPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["zero-trust-metrics"],
    queryFn: () => base44.functions.invoke("gdsZeroTrustPlatform", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: decisions } = useQuery({
    queryKey: ["zero-trust-decisions"],
    queryFn: () => base44.entities.TrustDecision.list('-created_date', 15).catch(() => []),
    refetchInterval: 15000,
  });

  const m = metrics || {};
  const evaluations = m.evaluations || {};
  const trustScores = m.trust_scores || {};
  const jit = m.jit || {};
  const riskSignals = m.risk_signals || {};
  const devices = m.devices || {};

  const scoreDistribution = [
    { grade: 'A', count: trustScores.grade_a || 0, color: SCORE_GRADE_COLORS.A },
    { grade: 'B', count: trustScores.grade_b || 0, color: SCORE_GRADE_COLORS.B },
    { grade: 'C', count: trustScores.grade_c || 0, color: SCORE_GRADE_COLORS.C },
    { grade: 'D', count: trustScores.grade_d || 0, color: SCORE_GRADE_COLORS.D },
    { grade: 'F', count: trustScores.grade_f || 0, color: SCORE_GRADE_COLORS.F }
  ].filter(d => d.count > 0);

  const avgScore = trustScores.avg_score || 0;
  const avgScoreColor = avgScore >= 75 ? LOW : avgScore >= 50 ? HIGH : DANGER;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Zero Trust Security Platform" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Zero Trust Security Platform</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>16-stage pipeline · 13 trust factors · Continuous verification · Never trust, always verify</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#a855f7", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>EDP-012 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton lines={8} />
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Evaluations</p>
              <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{evaluations.total ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Allowed</p>
              <p className="text-xl font-black font-mono" style={{ color: LOW }}>{evaluations.allow ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Denied</p>
              <p className="text-xl font-black font-mono" style={{ color: DANGER }}>{evaluations.deny ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Step-Up</p>
              <p className="text-xl font-black font-mono" style={{ color: HIGH }}>{evaluations.step_up ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Trust Score</p>
              <p className="text-xl font-black font-mono" style={{ color: avgScoreColor }}>{avgScore}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>JIT Active</p>
              <p className="text-xl font-black font-mono" style={{ color: jit.active > 0 ? HIGH : MUTED }}>{jit.active ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Risk Signals</p>
              <p className="text-xl font-black font-mono" style={{ color: ((riskSignals.critical || 0) + (riskSignals.high || 0)) > 0 ? DANGER : MUTED }}>{((riskSignals.critical || 0) + (riskSignals.high || 0))}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Quarantined</p>
              <p className="text-xl font-black font-mono" style={{ color: devices.quarantined > 0 ? DANGER : MUTED }}>{devices.quarantined ?? 0}</p>
            </Card>
          </div>

          {/* Trust Score Distribution */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Trust Score Distribution</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Grade breakdown across all evaluated entities</p>
            </div>
            {scoreDistribution.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No score data" description="Trust scores will appear after evaluations" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scoreDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis type="number" stroke={MUTED} fontSize={10} />
                  <YAxis dataKey="grade" type="category" stroke={MUTED} fontSize={12} width={30} tick={{ fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                  <Bar dataKey="count" barSize={40} radius={[0, 4, 4, 0]}>
                    {scoreDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Recent Decisions */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Recent Trust Decisions</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Latest access evaluations and verdicts</p>
            </div>
            {decisions?.length === 0 ? (
              <EmptyState icon={Shield} title="No decisions yet" description="Trust decisions will appear after access requests" />
            ) : (
              <div className="space-y-2">
                {decisions.map((decision, i) => {
                  const decisionColor = DECISION_COLORS[decision.decision] || MUTED;
                  const scoreColor = SCORE_GRADE_COLORS[decision.score_grade] || MUTED;
                  return (
                    <div key={decision.id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${decisionColor}15`, border: `1px solid ${decisionColor}30` }}>
                          {decision.decision === 'allow' ? <CheckCircle className="w-4 h-4" style={{ color: decisionColor }} /> : <XCircle className="w-4 h-4" style={{ color: decisionColor }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{decision.actor_type || 'user'}</span>
                            <span className="text-xs font-bold text-white truncate max-w-[200px]">{decision.actor_id || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-[10px]" style={{ color: MUTED }}>{decision.action_requested || 'access_request'}</span>
                            <span style={{ color: MUTED }}>→</span>
                            <span className="text-[10px] font-mono truncate max-w-[150px]" style={{ color: TEXT }}>{decision.resource || 'resource'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-[9px] font-bold mb-0.5" style={{ color: scoreColor }}>Score: {decision.trust_score ?? 0}</div>
                          <div className="text-[10px] px-1.5 py-0.5 rounded font-black" style={{ color: scoreColor, background: `${scoreColor}15`, border: `1px solid ${scoreColor}30` }}>{decision.score_grade || 'C'}</div>
                        </div>
                        <span className="text-[10px] px-2 py-1 rounded font-bold" style={{ color: decisionColor, background: `${decisionColor}15`, border: `1px solid ${decisionColor}30` }}>
                          {decision.decision?.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(decision.created_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}