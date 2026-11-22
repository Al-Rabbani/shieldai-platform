import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, AlertTriangle, Lock, Unlock, Activity, Zap, TrendingUp, Clock } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

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

export default function GDSZeroTrustEvaluatePage() {
  const [formData, setFormData] = useState({
    actor_id: '',
    actor_type: 'user',
    actor_role: 'analyst',
    resource: '',
    resource_type: '',
    action_requested: 'read',
    country: 'US',
    mfa_verified: false,
    device_trusted: false,
    is_managed_device: false,
    resource_sensitivity: 'internal',
    privilege_level: 'medium',
    session_risk_score: 30,
    recent_failures: 0,
    policy_violations: 0,
    active_risk_signals: 0,
    service_cert_valid: true,
    agent_healthy: true
  });

  const [result, setResult] = useState(null);

  const evaluateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsZeroTrustPlatform", { action: "evaluate", ...data }),
    onSuccess: (res) => setResult(res.data),
    onError: (err) => alert("Evaluation failed: " + err.message)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    evaluateMutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const decisionColor = result ? DECISION_COLORS[result.decision] || MUTED : CYAN;
  const scoreColor = result ? SCORE_GRADE_COLORS[result.score_grade] || MUTED : CYAN;
  const avgScore = result?.trust_score || 0;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Zero Trust Evaluation Console</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time 16-stage continuous verification</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evaluation Form */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Access Request Parameters</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Actor ID</label>
                <input type="text" value={formData.actor_id} onChange={e => handleChange('actor_id', e.target.value)} required
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Actor Type</label>
                <select value={formData.actor_type} onChange={e => handleChange('actor_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="user">User</option>
                  <option value="agent">Agent</option>
                  <option value="service">Service</option>
                  <option value="connector">Connector</option>
                  <option value="api_key">API Key</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Actor Role</label>
                <select value={formData.actor_role} onChange={e => handleChange('actor_role', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="viewer">Viewer</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Resource</label>
                <input type="text" value={formData.resource} onChange={e => handleChange('resource', e.target.value)} required
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Resource Type</label>
                <input type="text" value={formData.resource_type} onChange={e => handleChange('resource_type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Action Requested</label>
                <input type="text" value={formData.action_requested} onChange={e => handleChange('action_requested', e.target.value)} required
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Country</label>
                <input type="text" value={formData.country} onChange={e => handleChange('country', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Sensitivity</label>
                <select value={formData.resource_sensitivity} onChange={e => handleChange('resource_sensitivity', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential</option>
                  <option value="restricted">Restricted</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Privilege Level</label>
                <select value={formData.privilege_level} onChange={e => handleChange('privilege_level', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold mb-2 block" style={{ color: MUTED }}>Session Risk Score: {formData.session_risk_score}</label>
              <input type="range" min="0" max="100" value={formData.session_risk_score} onChange={e => handleChange('session_risk_score', parseInt(e.target.value))}
                className="w-full" />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Recent Failures</label>
                <input type="number" min="0" value={formData.recent_failures} onChange={e => handleChange('recent_failures', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Policy Violations</label>
                <input type="number" min="0" value={formData.policy_violations} onChange={e => handleChange('policy_violations', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Active Risk Signals</label>
                <input type="number" min="0" value={formData.active_risk_signals} onChange={e => handleChange('active_risk_signals', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                <input type="checkbox" checked={formData.mfa_verified} onChange={e => handleChange('mfa_verified', e.target.checked)} />
                <span>MFA Verified</span>
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                <input type="checkbox" checked={formData.device_trusted} onChange={e => handleChange('device_trusted', e.target.checked)} />
                <span>Device Trusted</span>
              </label>
              <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                <input type="checkbox" checked={formData.is_managed_device} onChange={e => handleChange('is_managed_device', e.target.checked)} />
                <span>Managed Device</span>
              </label>
              {formData.actor_type === 'service' && (
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input type="checkbox" checked={formData.service_cert_valid} onChange={e => handleChange('service_cert_valid', e.target.checked)} />
                  <span>Cert Valid</span>
                </label>
              )}
              {formData.actor_type === 'agent' && (
                <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                  <input type="checkbox" checked={formData.agent_healthy} onChange={e => handleChange('agent_healthy', e.target.checked)} />
                  <span>Agent Healthy</span>
                </label>
              )}
            </div>

            <button type="submit" disabled={evaluateMutation.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40 mt-4"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {evaluateMutation.isPending ? "Evaluating..." : "Evaluate Now"}
            </button>
          </form>
        </Card>

        {/* Result Panel */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Evaluation Result</h3>
          {!result ? (
            <EmptyState icon={Shield} title="No evaluation yet" description="Submit the form to evaluate trust" />
          ) : (
            <div className="space-y-4">
              {/* Decision Banner */}
              <div className="p-4 rounded-xl text-center" style={{ background: `${decisionColor}15`, border: `2px solid ${decisionColor}40` }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {result.decision === 'allow' ? <CheckCircle className="w-6 h-6" style={{ color: decisionColor }} /> : <XCircle className="w-6 h-6" style={{ color: decisionColor }} />}
                  <span className="text-lg font-black" style={{ color: decisionColor }}>{result.decision?.replace('_', ' ').toUpperCase()}</span>
                </div>
                <p className="text-[10px]" style={{ color: MUTED }}>{result.policy_applied || 'Default Policy'}</p>
              </div>

              {/* Trust Score */}
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Trust Score</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-black" style={{ color: scoreColor, background: `${scoreColor}15`, border: `1px solid ${scoreColor}30` }}>{result.score_grade || 'C'}</span>
                </div>
                <div className="text-4xl font-black font-mono text-center" style={{ color: scoreColor }}>{avgScore}<span className="text-lg">/100</span></div>
              </div>

              {/* Contributing Factors */}
              {result.contributing_factors && result.contributing_factors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.contributing_factors.map((factor, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: factor.impact > 0 ? LOW : DANGER, background: factor.impact > 0 ? `${LOW}15` : `${DANGER}15`, border: `1px solid ${factor.impact > 0 ? LOW + '30' : DANGER + '30'}` }}>
                      {factor.impact > 0 ? '+' : ''}{factor.impact} {factor.factor}
                    </span>
                  ))}
                </div>
              )}

              {/* Risk Signals */}
              {result.risk_signals && result.risk_signals.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {result.risk_signals.map((signal, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded flex items-center gap-1" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                      <AlertTriangle className="w-3 h-3" />
                      {signal}
                    </span>
                  ))}
                </div>
              )}

              {/* Allow/Deny Lists */}
              {result.allow_conditions && result.allow_conditions.length > 0 && (
                <div className="space-y-1">
                  {result.allow_conditions.map((condition, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: LOW }}>
                      <CheckCircle className="w-3 h-3" />
                      <span>{condition}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.deny_reasons && result.deny_reasons.length > 0 && (
                <div className="space-y-1">
                  {result.deny_reasons.map((reason, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: DANGER }}>
                      <XCircle className="w-3 h-3" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* JIT/JEA */}
              <div className="flex items-center gap-2 pt-2">
                {result.jit_applied && (
                  <span className="text-[10px] px-2 py-1 rounded flex items-center gap-1" style={{ color: "#14b8a6", background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)" }}>
                    <Clock className="w-3 h-3" />
                    JIT: {result.jit_duration_minutes}min
                  </span>
                )}
                {result.jea_applied && (
                  <span className="text-[10px] px-2 py-1 rounded flex items-center gap-1" style={{ color: "#14b8a6", background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.3)" }}>
                    <Lock className="w-3 h-3" />
                    JEA Applied
                  </span>
                )}
              </div>

              {/* Pipeline Progress */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold" style={{ color: MUTED }}>Pipeline Stages</span>
                  <span className="text-[10px]" style={{ color: TEXT }}>{result.pipeline_stages_complete || 16}/16</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${((result.pipeline_stages_complete || 16) / 16) * 100}%`, background: CYAN }} />
                </div>
              </div>

              {/* Evaluation Time */}
              <div className="text-[10px] text-right" style={{ color: MUTED }}>
                Evaluation: {result.evaluation_ms || 0}ms
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {Icon && <Icon className="w-12 h-12 mb-4" style={{ color: MUTED }} />}
      <h3 className="text-sm font-bold text-white mb-2">{title}</h3>
      <p className="text-xs max-w-sm" style={{ color: MUTED }}>{description}</p>
    </div>
  );
}