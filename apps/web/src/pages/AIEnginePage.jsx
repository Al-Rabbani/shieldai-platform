import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const SEV_BG = { critical: "rgba(239,68,68,0.1)", high: "rgba(249,115,22,0.1)", medium: "rgba(234,179,8,0.1)", low: "rgba(59,130,246,0.1)" };
const TYPE_COLOR = { sast: "#8b5cf6", sca: "#3b82f6", secret: "#ef4444", cloud_misconfiguration: "#f97316", runtime_threat: "#ef4444", pentest: "#ec4899", dast: "#06b6d4" };
const ACT_LABEL = { fix_immediately: "🚨 Fix Now", fix_within_24h: "⚡ Fix < 24h", fix_within_week: "📅 Fix < 1 Week", monitor: "👁️ Monitor", accept_risk: "✓ Accept Risk", false_positive: "✗ False Positive" };
const ACT_COLOR = { fix_immediately: "#ef4444", fix_within_24h: "#f97316", fix_within_week: "#eab308", monitor: "#3b82f6", accept_risk: "#475569", false_positive: "#10b981" };
const INSIGHT_ICON = { trend_alert: "📈", anomaly_detected: "🔍", pattern_match: "🧩", risk_spike: "💥", improvement: "✅", prediction: "🔮" };

function PriorityBar({ score }) {
  const color = score >= 75 ? "#ef4444" : score >= 40 ? "#eab308" : "#10b981";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "#1e293b" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score || 0}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono font-bold" style={{ color }}>{score || 0}</span>
    </div>
  );
}

function ConfidenceRing({ val }) {
  const r = 10, c = 2 * Math.PI * r;
  const color = val >= 80 ? "#10b981" : val >= 60 ? "#eab308" : "#ef4444";
  return (
    <svg width="28" height="28" className="flex-shrink-0">
      <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(30,58,95,0.4)" strokeWidth="2.5" />
      <circle cx="14" cy="14" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${(val / 100) * c} ${c}`} strokeLinecap="round" transform="rotate(-90 14 14)" />
      <text x="14" y="17.5" textAnchor="middle" fontSize="7" fill={color} fontFamily="JetBrains Mono" fontWeight="bold">{val}%</text>
    </svg>
  );
}

function SeverityDelta({ raw, ai }) {
  const diff = SEV_ORDER[raw] - SEV_ORDER[ai];
  if (diff > 0) return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
      style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <TrendingUp className="w-2.5 h-2.5" /> UPGRADED
    </div>
  );
  if (diff < 0) return (
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
      style={{ color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
      <TrendingDown className="w-2.5 h-2.5" /> DOWNGRADED
    </div>
  );
  return <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] text-slate-500" style={{ border: "1px solid rgba(71,85,105,0.3)" }}><Minus className="w-2.5 h-2.5" /> SAME</div>;
}

export default function AIEnginePage() {
  const [selectedCard, setSelectedCard] = useState(null);
  const qc = useQueryClient();

  const { data: scorecards = [] } = useQuery({ queryKey: ["ai-scorecards"], queryFn: () => base44.entities.AIScoreCard.list("-scored_at", 30) });
  const { data: insights = [] } = useQuery({ queryKey: ["ai-insights"], queryFn: () => base44.entities.AIInsight.list("-generated_at", 20) });

  const ackInsight = useMutation({
    mutationFn: (id) => base44.entities.AIInsight.update(id, { status: "acknowledged" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-insights"] }),
  });

  const sorted = [...scorecards].sort((a, b) => (b.ai_priority_score || 0) - (a.ai_priority_score || 0));
  const upgrades = scorecards.filter(s => SEV_ORDER[s.raw_severity] - SEV_ORDER[s.ai_severity] > 0).length;
  const downgrades = scorecards.filter(s => SEV_ORDER[s.raw_severity] - SEV_ORDER[s.ai_severity] < 0).length;
  const avgPriority = Math.round(scorecards.reduce((a, b) => a + (b.ai_priority_score || 0), 0) / (scorecards.length || 1));
  const avgTriage = (scorecards.reduce((a, b) => a + (b.triage_time_seconds || 0), 0) / (scorecards.length || 1)).toFixed(1);

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Brain className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-black text-white font-mono tracking-tight">AI TRIAGE ENGINE</h1>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded text-violet-400"
              style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}>
              ShieldAI-Triage-v2.1
            </span>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-emerald-400">◉ PROCESSING</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Autonomous vulnerability scoring · context-aware · business-impact-driven</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-violet-400 btn-interactive transition-all"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)" }}
          onClick={() => qc.invalidateQueries()}>
          <RefreshCw className="w-4 h-4" /> Re-score All
        </button>
      </div>

      {/* Model stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          ["Triaged Today", scorecards.length || 0, "#e2e8f0"],
          ["Avg Triage", `${avgTriage}s`, "#8b5cf6"],
          ["Upgrades ↑", upgrades, "#ef4444"],
          ["Downgrades ↓", downgrades, "#10b981"],
          ["Avg Priority", avgPriority, "#eab308"],
        ].map(([l, v, c]) => (
          <div key={l} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500 mb-1">{l}</p>
            <p className="text-2xl font-black font-mono" style={{ color: c }}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Triage queue */}
        <div className="col-span-3 rounded-xl overflow-hidden flex flex-col" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
            <h3 className="text-sm font-semibold text-white">Triage Queue</h3>
            <span className="text-[10px] text-slate-500 font-mono">{sorted.length} findings · sorted by priority</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {sorted.map((sc, idx) => (
              <div key={sc.id}
                onClick={() => setSelectedCard(selectedCard?.id === sc.id ? null : sc)}
                className="px-4 py-3.5 cursor-pointer transition-all animate-slide-in-up"
                style={{
                  borderBottom: "1px solid rgba(30,58,95,0.3)",
                  background: selectedCard?.id === sc.id ? "rgba(139,92,246,0.06)" : "transparent",
                  borderLeft: selectedCard?.id === sc.id ? "3px solid #8b5cf6" : "3px solid transparent",
                  animationDelay: `${idx * 30}ms`
                }}>
                <div className="flex items-center gap-3">
                  {/* Priority position */}
                  <span className="text-[10px] font-mono text-slate-600 w-5 text-right flex-shrink-0">#{idx + 1}</span>

                  {/* Finding title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{sc.finding_title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded capitalize font-medium"
                        style={{ color: TYPE_COLOR[sc.finding_type] || "#475569", background: `${TYPE_COLOR[sc.finding_type] || "#475569"}18` }}>
                        {sc.finding_type?.replace(/_/g, " ")}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] px-1 py-0.5 rounded capitalize font-mono"
                          style={{ color: SEV_COLOR[sc.raw_severity], background: SEV_BG[sc.raw_severity], border: `1px solid ${SEV_COLOR[sc.raw_severity]}30` }}>
                          {sc.raw_severity}
                        </span>
                        <span className="text-slate-600 text-[10px]">→</span>
                        <span className="text-[9px] px-1 py-0.5 rounded capitalize font-mono"
                          style={{ color: SEV_COLOR[sc.ai_severity], background: SEV_BG[sc.ai_severity], border: `1px solid ${SEV_COLOR[sc.ai_severity]}30` }}>
                          {sc.ai_severity}
                        </span>
                      </div>
                      <SeverityDelta raw={sc.raw_severity} ai={sc.ai_severity} />
                    </div>
                  </div>

                  {/* Priority bar */}
                  <div className="flex-shrink-0">
                    <PriorityBar score={sc.ai_priority_score} />
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    <span className="text-[9px] font-medium"
                      style={{ color: ACT_COLOR[sc.recommended_action] || "#475569" }}>
                      {ACT_LABEL[sc.recommended_action] || "—"}
                    </span>
                  </div>

                  {/* Confidence ring */}
                  <ConfidenceRing val={sc.confidence || 0} />

                  {/* Triage time */}
                  <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">⚡ {sc.triage_time_seconds}s</span>
                </div>

                {/* Expanded detail */}
                {selectedCard?.id === sc.id && sc.ai_reasoning && (
                  <div className="mt-3 pl-8 animate-slide-in-up">
                    <p className="text-[10px] font-semibold text-violet-400 mb-1 font-mono">AI REASONING</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{sc.ai_reasoning}</p>
                    <div className="flex gap-4 mt-2 text-[10px] font-mono text-slate-500">
                      <span>Exploitability: <span className="text-white">{sc.exploitability_score}</span></span>
                      <span>Business Impact: <span className="text-white">{sc.business_impact_score}</span></span>
                      <span>Reachability: <span className="text-white">{sc.reachability_score}</span></span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Neural Activity / Insights */}
        <div className="col-span-2 rounded-xl overflow-hidden flex flex-col" style={{
          background: "linear-gradient(145deg, #0a0f1e, #0f172a)",
          border: "1px solid rgba(139,92,246,0.25)"
        }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(139,92,246,0.2)" }}>
            <h3 className="text-sm font-semibold text-white">AI Neural Activity</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-[10px] text-violet-400 font-mono">{insights.filter(i => i.status === "new").length} NEW</span>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {insights.map((ins, i) => {
              const isNew = ins.status === "new";
              const sev = ins.severity;
              const sevColor = SEV_COLOR[sev] || "#3b82f6";
              return (
                <div key={ins.id} className="rounded-xl p-4 card-hover animate-slide-in-right"
                  style={{
                    background: "rgba(15,23,42,0.7)",
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${sevColor}25`,
                    animationDelay: `${i * 50}ms`
                  }}>
                  <div className="flex items-start gap-2.5 mb-2">
                    <span className="text-xl flex-shrink-0">{INSIGHT_ICON[ins.insight_type] || "💡"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {isNew && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse"
                            style={{ color: "#60a5fa", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                            NEW
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-slate-500">{ins.confidence}% confidence</span>
                      </div>
                      <p className="text-xs font-semibold text-white leading-snug">{ins.title}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{ins.description}</p>
                  {isNew && (
                    <button onClick={() => ackInsight.mutate(ins.id)}
                      className="mt-2 text-[10px] px-2.5 py-1 rounded-lg text-slate-400 hover:text-white transition-all"
                      style={{ background: "#1e293b", border: "1px solid rgba(30,58,95,0.5)" }}>
                      Acknowledge →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}