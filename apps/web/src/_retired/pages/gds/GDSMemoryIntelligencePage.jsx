import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lightbulb, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, EmptyState, Skeleton
} from "@/components/gds/GDSOSShared";
import GDSPageShell from "@/components/gds/GDSPageShell";

const TREND_COLORS = {
  improving: LOW,
  stable: "#0ea5e9",
  deteriorating: HIGH,
  critical: DANGER,
};

function TrendBadge({ trend }) {
  const color = TREND_COLORS[trend] || MUTED;
  const Icon = trend === "improving" ? TrendingUp : trend === "deteriorating" || trend === "critical" ? TrendingDown : Minus;
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      <Icon className="w-3 h-3" />
      {trend}
    </span>
  );
}

function SummaryTypeBadge({ type }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ color: CYAN, background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}>
      {type?.replace(/_/g, " ")}
    </span>
  );
}

export default function GDSMemoryIntelligencePage() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentSummary, setCurrentSummary] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["memory-intelligence"],
    queryFn: () => Promise.all([
      base44.functions.invoke("gdsMemoryEngine", { action: "summarize", summary_type: "posture_trend" }).then(r => r.data),
      base44.entities.IntelligenceSummary?.list('-created_date', 50).catch(() => []),
    ]).then(([summarize, entities]) => ({ summarize, entities })),
    refetchInterval: 300000,
  });

  const summarizeMutation = useMutation({
    mutationFn: (summary_type) => base44.functions.invoke("gdsMemoryEngine", { action: "summarize", summary_type }).then(r => r.data),
    onSuccess: (data) => {
      setCurrentSummary(data.summary);
      refetch();
      setShowDropdown(false);
    },
  });

  const currentSum = currentSummary || (data?.summarize?.summary);
  const history = data?.entities || [];

  const SUMMARY_TYPES = ["posture_trend", "agent_performance", "threat_landscape", "compliance_drift", "risk_trajectory"];

  return (
    <GDSPageShell
      title="Intelligence Summaries"
      breadcrumbs={[{ label: "Memory", path: "/memory" }, { label: "Intelligence" }]}
      version="EDP-004 v1.0"
      live
    >
      {/* Generate Summary Dropdown */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Intelligence Summaries</h1>
        </div>
        <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Lightbulb className="w-4 h-4" />
            Generate Summary
            <ChevronDown className="w-3 h-3" />
          </button>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {SUMMARY_TYPES.map(type => (
                <button key={type} onClick={() => summarizeMutation.mutate(type)}
                  disabled={summarizeMutation.isPending}
                  className="w-full text-left px-4 py-2.5 text-xs transition-all hover:bg-white/5 disabled:opacity-50"
                  style={{ color: TEXT, borderBottom: `1px solid ${BORDER}20` }}>
                  {type.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Summary Card */}
      <Card className="mb-6 p-6" glow>
        {isLoading || !currentSum ? (
          <div className="space-y-3">
            <div className="h-8 w-3/4 rounded animate-pulse" style={{ background: "rgba(0,212,255,0.06)" }} />
            <div className="h-4 w-1/2 rounded animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
            <div className="space-y-2 pt-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-4 rounded animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <SummaryTypeBadge type={currentSum.summary_type} />
                  <TrendBadge trend={currentSum.trend} />
                </div>
                <h2 className="text-lg font-black text-white mb-2">{currentSum.headline}</h2>
                <div className="flex items-center gap-4 text-xs" style={{ color: MUTED }}>
                  <span>Period: <span className="font-bold" style={{ color: TEXT }}>{currentSum.period}</span></span>
                  <span>Confidence: <span className="font-bold" style={{ color: CYAN }}>{currentSum.confidence}%</span></span>
                  <span>Risk Delta: <span className={`font-bold ${currentSum.risk_delta > 0 ? "text-red-400" : currentSum.risk_delta < 0 ? "text-emerald-400" : ""}`}>
                    {currentSum.risk_delta > 0 ? "+" : ""}{currentSum.risk_delta}
                  </span></span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Findings */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Key Findings</h3>
                <ol className="space-y-2">
                  {(currentSum.key_findings || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-[10px] font-bold flex-shrink-0" style={{ color: CYAN }}>{i + 1}.</span>
                      <span style={{ color: TEXT }}>{f}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Recommendations</h3>
                <div className="space-y-2">
                  {(currentSum.recommendations || []).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg"
                      style={{ background: r.priority === "high" ? `${DANGER}08` : r.priority === "medium" ? `${HIGH}08` : `${MEDIUM}08`, border: `1px solid ${r.priority === "high" ? DANGER + "20" : r.priority === "medium" ? HIGH + "20" : MEDIUM + "20"}` }}>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        r.priority === "high" ? "text-red-400 bg-red-500/15" :
                        r.priority === "medium" ? "text-orange-400 bg-orange-500/15" :
                        "text-yellow-400 bg-yellow-500/15"
                      }`}>
                        {r.priority.toUpperCase()}
                      </span>
                      <span className="text-xs" style={{ color: TEXT }}>{r.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Historical Summaries Table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Summary History</h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
          </div>
        ) : history.length === 0 ? (
          <EmptyState icon={Lightbulb} title="No summary history" description="Generated summaries will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Type", "Headline", "Trend", "Risk Δ", "Confidence", "Period", "Generated", "Timestamp"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((s, i) => (
                  <tr key={s.summary_id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3"><SummaryTypeBadge type={s.summary_type} /></td>
                    <td className="py-2 px-3 max-w-[200px] truncate" style={{ color: TEXT }}>{s.headline}</td>
                    <td className="py-2 px-3"><TrendBadge trend={s.trend} /></td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      <span className={s.risk_delta > 0 ? "text-red-400" : s.risk_delta < 0 ? "text-emerald-400" : ""}>
                        {s.risk_delta > 0 ? "+" : ""}{s.risk_delta}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: CYAN }}>{s.confidence}%</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{s.period}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{s.generated_by?.slice(0, 15)}…</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{new Date(s.created_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </GDSPageShell>
  );
}