import React from "react";
import { GitBranch } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, LOW, MUTED, TEXT, EmptyState, Card } from "@/components/gds/GDSOSShared";

function formatDuration(secs) {
  if (!secs) return "0s";
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ReasoningFlowchart({ plans }) {
  if (!plans || plans.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState icon={GitBranch} title="No active plans" description="Start a planning session to see the reasoning flow" />
      </Card>
    );
  }

  const selectedPlan = plans[0];
  const steps = selectedPlan.steps || [];
  const reasoningChain = selectedPlan.reasoning_chain || [];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-sm font-bold text-white">Reasoning Decision Flow</h3>
        <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Visual step-by-step logic behind {selectedPlan.plan_name || "current plan"}</p>
      </div>
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const reasoning = reasoningChain[idx] || {};
          const isCurrent = step.status === "in_progress";
          const isCompleted = step.status === "completed";
          const isDelayed = step.is_delayed || false;
          return (
            <div key={idx} className="relative">
              {idx < steps.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-8" style={{ background: isCompleted ? LOW : isDelayed ? DANGER : CYAN }} />
              )}
              <div className={`p-4 rounded-lg border-2 transition-all ${isCurrent ? "scale-105" : ""}`}
                style={{
                  background: isCurrent ? `${CYAN}10` : isCompleted ? `${LOW}05` : isDelayed ? `${DANGER}05` : "rgba(255,255,255,0.02)",
                  borderColor: isCurrent ? CYAN : isCompleted ? LOW : isDelayed ? DANGER : BORDER,
                }}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black`}
                    style={{
                      background: isCurrent ? CYAN : isCompleted ? LOW : isDelayed ? DANGER : MUTED,
                      color: isCurrent || isCompleted || isDelayed ? "#020817" : "#fff",
                    }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-white">{step.step_name || `Step ${idx + 1}`}</h4>
                      <span className="text-[10px] px-2 py-1 rounded uppercase"
                        style={{
                          color: isCurrent ? CYAN : isCompleted ? LOW : isDelayed ? DANGER : MUTED,
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${isCurrent ? CYAN : isCompleted ? LOW : isDelayed ? DANGER : BORDER}30`
                        }}>
                        {step.status || "pending"}
                      </span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: TEXT }}>{step.description || "No description"}</p>
                    {reasoning.decision_logic && (
                      <div className="p-3 rounded-lg" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}20` }}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: CYAN }}>Decision Logic</p>
                        <p className="text-xs" style={{ color: TEXT }}>{reasoning.decision_logic}</p>
                      </div>
                    )}
                    {reasoning.alternatives_considered && reasoning.alternatives_considered.length > 0 && (
                      <div className="mt-2 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                        <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Alternatives Considered</p>
                        <ul className="text-xs space-y-1" style={{ color: TEXT }}>
                          {reasoning.alternatives_considered.map((alt, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full" style={{ background: MUTED }} />
                              {alt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: MUTED }}>
                      <span>Est: {formatDuration(step.estimated_seconds)}</span>
                      {step.depends_on && step.depends_on.length > 0 && (
                        <span>Depends on: {step.depends_on.map(d => `#${d}`).join(", ")}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}