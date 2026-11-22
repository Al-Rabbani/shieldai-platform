import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Shield, Lock, CheckCircle, AlertTriangle, TrendingUp, Clock3, Target, FileText, X } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, AnimatedArc } from "@/components/gds/GDSOSShared";

const GOAL_TYPE_COLORS = { security_scan: "#3b82f6", threat_hunt: DANGER, incident_response: HIGH, compliance_audit: LOW, remediation: "#f59e0b", risk_assessment: "#6366f1", executive_report: "#14b8a6", agent_orchestration: "#a855f7" };
const POLICY_VERDICT_COLORS = { approved: LOW, rejected: DANGER, conditional: HIGH, pending: MUTED };

export default function GDSGoalAnalyzerPage() {
  const [goalStatement, setGoalStatement] = useState("");
  const [priority, setPriority] = useState("P2");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [result, setResult] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "analyze_goal", ...payload }),
    onSuccess: (res) => setResult(res.data),
  });

  const handleAnalyze = () => {
    if (!goalStatement.trim()) return;
    analyzeMutation.mutate({ goal_statement: goalStatement, priority, success_criteria: successCriteria });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const confidenceColor = (score) => score >= 70 ? LOW : score >= 50 ? MEDIUM : DANGER;
  const riskColor = (score) => score >= 70 ? DANGER : score >= 50 ? HIGH : LOW;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Goal Analyzer" }]} />
      
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Goal Analyzer</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>18-Stage AI Planning Pipeline</p>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Goal Input</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Describe your security goal...</label>
            <textarea value={goalStatement} onChange={e => setGoalStatement(e.target.value)} rows={4}
              placeholder="Example: Hunt for threat actor lateral movement following CVE-2026-44494 on AWS. Check CISA KEV, correlate dark web intel, triage all findings."
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "12px", fontSize: 14, width: "100%", outline: "none", resize: "none" }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none" }}>
                <option value="P0">P0 (Critical)</option>
                <option value="P1">P1 (High)</option>
                <option value="P2">P2 (Medium)</option>
                <option value="P3">P3 (Low)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Success Criteria (optional)</label>
              <input value={successCriteria} onChange={e => setSuccessCriteria(e.target.value)} placeholder="Define success metrics..."
                style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none" }} />
            </div>
          </div>
          <button onClick={handleAnalyze} disabled={analyzeMutation.isPending || !goalStatement.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {analyzeMutation.isPending ? "Analyzing Goal..." : "Analyze Goal"}
          </button>
        </div>
      </Card>

      {result && (
        <>
          <Card className="p-6">
            <h3 className="text-sm font-bold text-white mb-4">Goal Classification</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {[
                { label: "Goal Type", value: result.goal_type, color: GOAL_TYPE_COLORS[result.goal_type] || MUTED },
                { label: "Intent Type", value: result.intent_type, color: CYAN },
                { label: "Sensitivity", value: result.sensitivity, color: MUTED },
                { label: "Complexity", value: result.complexity, color: result.complexity === "high" ? DANGER : result.complexity === "medium" ? HIGH : LOW },
                { label: "Domain", value: result.security_domain, color: "#a855f7" },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>{label}</p>
                  <p className="text-xs font-bold" style={{ color }}>{value || "—"}</p>
                </div>
              ))}
            </div>
            <div className="mb-4">
              <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Entities Found</p>
              <div className="flex flex-wrap gap-2">
                {result.entities_found?.cve?.map((e, i) => (<span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>{e}</span>))}
                {result.entities_found?.mitre_techniques?.map((e, i) => (<span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: HIGH, background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>{e}</span>))}
                {result.entities_found?.frameworks?.map((e, i) => (<span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>{e}</span>))}
                {result.entities_found?.assets?.map((e, i) => (<span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: "#60a5fa", background: "#60a5fa15", border: `1px solid #60a5fa30` }}>{e}</span>))}
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(255,140,0,0.1)", border: `1px solid ${HIGH}30` }}>
              <Shield className="w-4 h-4" style={{ color: HIGH }} />
              <span className="text-xs font-bold" style={{ color: HIGH }}>Requires Approval: {result.approval_level || "single"}</span>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold text-white mb-4">Execution Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Plan Name</p>
                <p className="text-sm font-bold text-white">{result.plan?.plan_name || "—"}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Strategy</p>
                <span className="text-xs px-2 py-1 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{result.plan?.strategy || "—"}</span>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Total Steps</p>
                <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{result.plan?.total_steps || 0}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Est. Duration</p>
                <p className="text-lg font-bold text-white">{formatDuration(result.plan?.estimated_duration_seconds)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Policy Verdict</p>
                <span className="text-sm font-black px-3 py-1.5 rounded uppercase"
                  style={{ color: POLICY_VERDICT_COLORS[result.plan?.policy_verdict] || MUTED, background: `${POLICY_VERDICT_COLORS[result.plan?.policy_verdict] || MUTED}18`, border: `1px solid ${POLICY_VERDICT_COLORS[result.plan?.policy_verdict] || MUTED}30` }}>
                  {result.plan?.policy_verdict || "pending"}
                </span>
              </div>
              <div className="p-4 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <AnimatedArc score={result.plan?.confidence_score || 0} size={100} strokeWidth={10} />
              </div>
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Risk Level</p>
                <span className="text-sm font-black px-3 py-1.5 rounded uppercase"
                  style={{ color: riskColor(result.plan?.risk_level_score), background: `${riskColor(result.plan?.risk_level_score)}18`, border: `1px solid ${riskColor(result.plan?.risk_level_score)}30` }}>
                  {result.plan?.risk_level || "unknown"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold text-white mb-4">Plan Steps</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Step", "Name", "Type", "Agent", "Tool", "Depends On", "Parallel", "Est.", "Approval"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.plan?.steps?.map((step, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-white">{i + 1}</td>
                      <td className="py-2 px-3 text-white">{step.step_name || "—"}</td>
                      <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{step.type || "—"}</span></td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{step.agent || "—"}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{step.tool || "—"}</td>
                      <td className="py-2 px-3"><div className="flex gap-1">{step.depends_on?.map((d, di) => (<span key={di} className="text-[9px] px-1 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)"}}>#{d}</span>))}</div></td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: step.parallel_group ? CYAN : MUTED }}>{step.parallel_group ? `Group ${step.parallel_group}` : "—"}</td>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{formatDuration(step.estimated_seconds)}</td>
                      <td className="py-2 px-3">{step.requires_approval && <Lock className="w-3.5 h-3.5" style={{ color: HIGH }} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold text-white mb-4">Risk Estimate</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Overall Risk</p>
                <span className="text-sm font-black px-3 py-1.5 rounded uppercase" style={{ color: riskColor(result.risk_estimate?.overall_risk_score), background: `${riskColor(result.risk_estimate?.overall_risk_score)}18`, border: `1px solid ${riskColor(result.risk_estimate?.overall_risk_score)}30` }}>
                  {result.risk_estimate?.overall_risk || "unknown"}
                </span>
              </div>
              <div className="p-4 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <AnimatedArc score={result.risk_estimate?.overall_risk_score || 0} size={100} strokeWidth={10} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Operational", value: result.risk_estimate?.operational_risk },
                { label: "Security", value: result.risk_estimate?.security_risk },
                { label: "Compliance", value: result.risk_estimate?.compliance_risk },
                { label: "Business", value: result.risk_estimate?.business_impact },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>{label}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full" style={{ width: `${value || 0}%`, background: riskColor(value) }} />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: riskColor(value) }}>{value ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Failure Probability</p>
                <p className="text-lg font-bold" style={{ color: DANGER }}>{result.risk_estimate?.failure_probability || 0}%</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Blast Radius</p>
                <span className="text-xs px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{result.risk_estimate?.blast_radius || "—"}</span>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Rollback Difficulty</p>
                <span className="text-xs px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>{result.risk_estimate?.rollback_difficulty || "—"}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Risk Factors</p>
                <ul className="space-y-1">
                  {result.risk_estimate?.risk_factors?.map((f, i) => (
                    <li key={i} className="text-xs flex items-center gap-2" style={{ color: TEXT }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: DANGER }} />{f}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Mitigations</p>
                <ul className="space-y-1">
                  {result.risk_estimate?.mitigations?.map((m, i) => (
                    <li key={i} className="text-xs flex items-center gap-2" style={{ color: LOW }}>
                      <CheckCircle className="w-3 h-3" />{m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold text-white mb-4">Rollback Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Failure Response Path</p>
                <span className="text-xs px-2 py-1 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{result.rollback_plan?.failure_response_path || "manual"}</span>
              </div>
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Can Auto-Execute</p>
                <span className="text-xs px-2 py-1 rounded" style={{ color: result.rollback_plan?.can_auto_execute ? LOW : MUTED, background: result.rollback_plan?.can_auto_execute ? `${LOW}15` : "rgba(255,255,255,0.04)" }}>
                  {result.rollback_plan?.can_auto_execute ? "Yes" : "No"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Trigger Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {result.rollback_plan?.trigger_conditions?.map((c, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: HIGH, background: `${HIGH}15`, border: `1px solid ${HIGH}30` }}>{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Safe Stop Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {result.rollback_plan?.safe_stop_conditions?.map((c, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded" style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}