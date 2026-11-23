import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Shield, Lock, CheckCircle, AlertTriangle, X } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, EmptyState, AnimatedArc } from "@/components/gds/GDSOSShared";

const CONFIDENCE_LEVEL_COLORS = { very_high: LOW, high: "#14b8a6", medium: MEDIUM, low: HIGH, very_low: DANGER };

export default function GDSReasoningViewerPage() {
  const [question, setQuestion] = useState("");
  const [planId, setPlanId] = useState("");
  const [context, setContext] = useState("");
  const [options, setOptions] = useState([{ text: "", confidence: 50, rationale: "" }]);
  const [result, setResult] = useState(null);

  const { data: history } = useQuery({
    queryKey: ["decision-history"],
    queryFn: () => base44.entities.DecisionRecord.list("-created_date", 10).catch(() => []),
  });

  const reasoningMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "reason", ...payload }),
    onSuccess: (res) => setResult(res.data),
  });

  const updateOption = (idx, field, value) => {
    const newOpts = [...options];
    newOpts[idx] = { ...newOpts[idx], [field]: value };
    setOptions(newOpts);
  };

  const addOption = () => {
    if (options.length >= 5) return;
    setOptions([...options, { text: "", confidence: 50, rationale: "" }]);
  };

  const removeOption = (idx) => {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleRun = () => {
    if (!question.trim()) return;
    reasoningMutation.mutate({
      question,
      plan_id: planId || undefined,
      context: context || undefined,
      options: options.filter(o => o.text.trim()).map(o => ({ text: o.text, confidence_score: o.confidence, rationale: o.rationale })),
    });
  };

  const confColor = result?.confidence_level ? CONFIDENCE_LEVEL_COLORS[result.confidence_level] || MUTED : MUTED;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Reasoning & Decision Engine" }]} />
      
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Reasoning & Decision Engine</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>13-Stage Explainable AI Reasoning</p>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Reasoning Query</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Question</label>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
              placeholder="What is the best response to this incident?"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "12px", fontSize: 14, width: "100%", outline: "none", resize: "none" }} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Plan ID (optional)</label>
              <input value={planId} onChange={e => setPlanId(e.target.value)} placeholder="plan-123..."
                style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none" }} />
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Context (optional)</label>
              <input value={context} onChange={e => setContext(e.target.value)} placeholder="Additional context..."
                style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold" style={{ color: MUTED }}>Options (up to 5)</label>
              <button onClick={addOption} disabled={options.length >= 5}
                className="text-[10px] px-2 py-1 rounded" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN, opacity: options.length >= 5 ? 0.5 : 1 }}>
                + Add Option
              </button>
            </div>
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={idx} className="p-3 rounded-lg space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold" style={{ color: MUTED }}>Option {idx + 1}</span>
                    <button onClick={() => removeOption(idx)} className="p-1 rounded hover:bg-white/10" style={{ color: MUTED }}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input value={opt.text} onChange={e => updateOption(idx, "text", e.target.value)} placeholder="Option text..."
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "6px 10px", fontSize: 12, width: "100%", outline: "none" }} />
                  <div className="flex items-center gap-3">
                    <label className="text-[10px]" style={{ color: MUTED }}>Confidence: {opt.confidence}%</label>
                    <input type="range" min="0" max="100" value={opt.confidence} onChange={e => updateOption(idx, "confidence", Number(e.target.value))} className="flex-1" />
                  </div>
                  <input value={opt.rationale} onChange={e => updateOption(idx, "rationale", e.target.value)} placeholder="Rationale..."
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "6px 10px", fontSize: 12, width: "100%", outline: "none" }} />
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleRun} disabled={reasoningMutation.isPending || !question.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {reasoningMutation.isPending ? "Running Reasoning..." : "Run Reasoning"}
          </button>
        </div>
      </Card>

      {result && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-bold text-white">Result</h3>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: MUTED }}>Confidence:</span>
                  <span className="text-lg font-black px-3 py-1.5 rounded" style={{ color: confColor, background: `${confColor}18`, border: `1px solid ${confColor}30` }}>
                    {result.confidence_score ?? 0}%
                  </span>
                </span>
                <span className="text-[10px] px-2 py-1 rounded uppercase" style={{ color: confColor, background: `${confColor}18`, border: `1px solid ${confColor}30` }}>
                  {result.confidence_level || "unknown"}
                </span>
              </div>
            </div>
            {result.requires_human_review && (
              <div className="mb-4 p-4 rounded-lg flex items-center gap-3" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}30` }}>
                <AlertTriangle className="w-5 h-5" style={{ color: HIGH }} />
                <span className="text-sm font-bold" style={{ color: HIGH }}>Requires Human Review</span>
              </div>
            )}
            <div className="p-4 rounded-lg mb-4" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
              <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Selected Option</p>
              <p className="text-sm font-bold text-white mb-2">{result.selected_option?.text || "—"}</p>
              <p className="text-xs" style={{ color: MUTED }}>{result.selected_option?.rationale || "—"}</p>
            </div>
            {result.explainability_text && (
              <div className="mb-4">
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Explainability</p>
                <div className="p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  {result.explainability_text}
                </div>
              </div>
            )}
            {result.reasoning_chain && result.reasoning_chain.length > 0 && (
              <div>
                <p className="text-[10px] font-bold mb-2" style={{ color: MUTED }}>Reasoning Chain</p>
                <div className="space-y-2">
                  {result.reasoning_chain.map((step, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: CYAN, color: "#020817" }}>{i + 1}</span>
                        <span className="text-xs font-bold" style={{ color: MUTED }}>{step.step_name || `Step ${i + 1}`}</span>
                      </div>
                      <p className="text-xs" style={{ color: TEXT }}>{step.description || step.output || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {result.options_evaluated && result.options_evaluated.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
                <h3 className="text-sm font-bold text-white">Options Evaluated</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Option", "Confidence", "Rationale"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.options_evaluated.map((opt, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 text-white">{opt.text || "—"}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${opt.confidence_score || 0}%`, background: CONFIDENCE_LEVEL_COLORS[opt.confidence_level] || MUTED }} />
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: CONFIDENCE_LEVEL_COLORS[opt.confidence_level] || MUTED }}>{opt.confidence_score ?? 0}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{opt.rationale || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Recent Decisions</h3>
        </div>
        {history && history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Type", "Question", "Selected", "Verdict", "Confidence", "Review", "Time"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{h.decision_type || "reasoning"}</td>
                    <td className="py-2 px-3 max-w-[150px]"><p className="truncate text-white">{h.question || "—"}</p></td>
                    <td className="py-2 px-3 max-w-[150px]"><p className="truncate text-white">{h.selected_option || "—"}</p></td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: h.policy_verdict === "approved" ? LOW : h.policy_verdict === "rejected" ? DANGER : HIGH, background: "rgba(255,255,255,0.04)" }}>
                        {h.policy_verdict || "pending"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: h.confidence_score >= 70 ? LOW : h.confidence_score >= 50 ? MEDIUM : DANGER }}>{h.confidence_score ?? 0}%</td>
                    <td className="py-2 px-3">{h.requires_human_review ? <AlertTriangle className="w-4 h-4" style={{ color: HIGH }} /> : <CheckCircle className="w-4 h-4" style={{ color: LOW }} />}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{new Date(h.created_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Brain} title="No decisions yet" description="Run reasoning queries to see history" />
        )}
      </Card>
    </div>
  );
}