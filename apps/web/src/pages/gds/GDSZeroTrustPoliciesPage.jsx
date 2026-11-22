import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, FileText, Activity, CheckCircle, XCircle, Lock, Clock, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

const BUILTIN_POLICIES = [
  { type: 'critical', min_score: 80, deny_below: 50, approval_below: 70, require_mfa: true, require_device: true, jit: true, jea: true, blocked: ['CN','RU','KP','IR'] },
  { type: 'high', min_score: 70, deny_below: 40, approval_below: 60, require_mfa: true, require_device: true, jit: true, jea: true, blocked: ['CN','RU','KP'] },
  { type: 'medium', min_score: 60, deny_below: 30, approval_below: 50, require_mfa: true, require_device: false, jit: false, jea: true, blocked: ['CN','RU'] },
  { type: 'low', min_score: 50, deny_below: 20, approval_below: 40, require_mfa: false, require_device: false, jit: false, jea: false, blocked: [] },
];

const SCORE_GRADE_COLORS = { A: LOW, B: "#14b8a6", C: MEDIUM, D: HIGH, F: DANGER };

export default function GDSZeroTrustPoliciesPage() {
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ["zero-trust-policies"],
    queryFn: () => base44.entities.ZeroTrustPolicy.list('-created_date', 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ["zero-trust-conditional-rules"],
    queryFn: () => base44.entities.ConditionalAccessRule.list('-created_date', 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["zero-trust-audit"],
    queryFn: () => base44.entities.TrustAuditRecord.list('-created_date', 50).catch(() => []),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Zero Trust Policies & Audit" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Zero Trust Policies & Audit</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Conditional access rules, default policies, full audit trail</p>
          </div>
        </div>
      </div>

      {/* SECTION 1: ZT Policies */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5" style={{ color: CYAN }} />
          <h2 className="text-lg font-black text-white">Zero Trust Policies</h2>
        </div>
        
        {/* Built-in Defaults */}
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-bold text-white mb-4">Built-in Default Policies</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Type", "Min Score", "Deny Below", "Approval Below", "Require MFA", "Require Device", "JIT", "JEA", "Blocked Countries"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BUILTIN_POLICIES.map((policy, i) => {
                  const color = policy.type === 'critical' ? DANGER : policy.type === 'high' ? HIGH : policy.type === 'medium' ? MEDIUM : LOW;
                  return (
                    <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20`, background: policy.type === 'critical' ? `${DANGER}08` : policy.type === 'high' ? `${HIGH}08` : 'transparent' }}>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>{policy.type}</span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{policy.min_score}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: DANGER }}>{policy.deny_below}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: HIGH }}>{policy.approval_below}</td>
                      <td className="py-2 px-3">{policy.require_mfa ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                      <td className="py-2 px-3">{policy.require_device ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: MUTED }} />}</td>
                      <td className="py-2 px-3">{policy.jit ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "#14b8a6", background: "rgba(20,184,166,0.15)" }}>Yes</span> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-2 px-3">{policy.jea ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "#14b8a6", background: "rgba(20,184,166,0.15)" }}>Yes</span> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{policy.blocked.join(', ') || 'None'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Custom Policies */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Custom Policies</h3>
          {policiesLoading ? <Skeleton lines={4} /> : policies?.length === 0 ? (
            <EmptyState icon={FileText} title="No custom policies" description="Custom policies will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Policy Name", "Type", "Min Score", "MFA", "Device", "JIT", "JEA", "Blocked", "Evaluations", "Allow/Deny", "Status"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy, i) => (
                    <tr key={policy.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3">
                        <div>
                          <p className="text-white font-bold">{policy.policy_name}</p>
                          <p className="text-[9px]" style={{ color: MUTED }}>{policy.description}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{policy.policy_type}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${policy.min_trust_score}%`, background: policy.min_trust_score >= 75 ? LOW : policy.min_trust_score >= 50 ? MEDIUM : DANGER }} />
                          </div>
                          <span className="text-[9px] font-bold" style={{ color: TEXT }}>{policy.min_trust_score}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">{policy.require_mfa ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-2 px-3">{policy.require_device_trust ? <CheckCircle className="w-3.5 h-3.5" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-2 px-3">{policy.jit_required ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "#14b8a6", background: "rgba(20,184,166,0.15)" }}>Yes</span> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-2 px-3">{policy.jea_required ? <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "#14b8a6", background: "rgba(20,184,166,0.15)" }}>Yes</span> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{(policy.blocked_countries || []).join(', ') || 'None'}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{policy.evaluation_count || 0}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{policy.allow_count || 0}/{policy.deny_count || 0}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${policy.status === 'active' ? 'text-green-400' : 'text-gray-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {policy.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* SECTION 2: Conditional Access Rules */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5" style={{ color: CYAN }} />
          <h2 className="text-lg font-black text-white">Conditional Access Rules</h2>
        </div>
        {rulesLoading ? <Skeleton lines={4} /> : rules?.length === 0 ? (
          <EmptyState icon={Activity} title="No conditional rules" description="Conditional access rules will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Rule Name", "Type", "Applies To", "Condition", "Action", "Priority", "Evaluations", "Matches", "Last Matched", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((rule, i) => {
                  const actionColor = rule.action === 'allow' ? LOW : rule.action === 'deny' ? DANGER : rule.action === 'require_mfa' ? HIGH : "#f97316";
                  return (
                    <tr key={rule.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3">
                        <div>
                          <p className="text-white font-bold">{rule.rule_name}</p>
                          <p className="text-[9px]" style={{ color: MUTED }}>{rule.description}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{rule.rule_type}</span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rule.applies_to_entity_type}</td>
                      <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{rule.condition_field} {rule.condition_operator} {rule.condition_value}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold" style={{ color: actionColor, background: `${actionColor}15`, border: `1px solid ${actionColor}30` }}>{rule.action.replace('_', ' ')}</span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rule.priority}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rule.evaluation_count || 0}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{rule.match_count || 0}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{rule.last_matched ? timeAgo(rule.last_matched) : '—'}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${rule.status === 'active' ? 'text-green-400' : 'text-gray-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {rule.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* SECTION 3: Trust Audit Log */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5" style={{ color: CYAN }} />
          <h2 className="text-lg font-black text-white">Trust Audit Log</h2>
        </div>
        {auditLoading ? <Skeleton lines={6} /> : audit?.length === 0 ? (
          <EmptyState icon={Clock} title="No audit records" description="Trust audit records will appear after evaluations" />
        ) : (
          <div className="space-y-3">
            {audit.map((record, i) => {
              const decisionColor = record.decision === 'allow' ? LOW : record.decision === 'deny' ? DANGER : record.decision === 'approval_required' ? HIGH : "#f97316";
              const scoreColor = SCORE_GRADE_COLORS[record.score_grade] || MUTED;
              return (
                <div key={record.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${decisionColor}15`, border: `1px solid ${decisionColor}30` }}>
                        {record.decision === 'allow' ? <CheckCircle className="w-4 h-4" style={{ color: decisionColor }} /> : <XCircle className="w-4 h-4" style={{ color: decisionColor }} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${record.decision === 'allow' ? 'text-green-400' : record.decision === 'deny' ? 'text-red-400' : 'text-amber-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                            {record.decision?.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ color: scoreColor, background: `${scoreColor}15`, border: `1px solid ${scoreColor}30` }}>{record.score_grade || 'C'}</span>
                        </div>
                        <p className="text-xs font-bold text-white mt-1">{record.actor_id}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{record.actor_type} · {record.action_requested} → {record.resource}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold mb-1" style={{ color: scoreColor }}>Trust Score: {record.trust_score}</p>
                      <p className="text-[9px]" style={{ color: MUTED }}>{timeAgo(record.created_date)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {(record.deny_reasons || []).map((reason, idx) => (
                      <span key={idx} className="px-2 py-1 rounded flex items-center gap-1" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                        <XCircle className="w-3 h-3" />
                        {reason}
                      </span>
                    ))}
                    {(record.risk_signals || []).map((signal, idx) => (
                      <span key={idx} className="px-2 py-1 rounded flex items-center gap-1" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                        <AlertTriangle className="w-3 h-3" />
                        {signal}
                      </span>
                    ))}
                    {record.mfa_verified && <span className="px-2 py-1 rounded flex items-center gap-1" style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}><Lock className="w-3 h-3" />MFA</span>}
                    {record.device_trusted && <span className="px-2 py-1 rounded flex items-center gap-1" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}><Shield className="w-3 h-3" />Device</span>}
                    {record.jit_applied && <span className="px-2 py-1 rounded flex items-center gap-1" style={{ color: "#14b8a6", background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)" }}><Clock className="w-3 h-3" />JIT</span>}
                    {record.jea_applied && <span className="px-2 py-1 rounded flex items-center gap-1" style={{ color: "#14b8a6", background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)" }}><Lock className="w-3 h-3" />JEA</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[9px]" style={{ color: MUTED }}>
                    <span>Evaluation: {record.evaluation_ms || 0}ms</span>
                    <span>Stage: {record.pipeline_stage || 0}/16</span>
                    {record.correlation_id && <span className="font-mono">Correlation: {record.correlation_id}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}