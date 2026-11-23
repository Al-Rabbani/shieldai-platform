import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Activity, Brain } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const LEARNING_TYPE_COLORS = {
  decision_outcome: "#10b981", tool_effectiveness: "#3b82f6", pattern_detected: "#a855f7",
  strategy_improvement: "#f97316", error_correction: "#ef4444"
};

export default function GDSGASCILearningPage() {
  const { data: events = [], isLoading: loadE } = useQuery({
    queryKey: ["gasci-learning"],
    queryFn: () => base44.entities.LearningEvent.list("-applied_at", 100).catch(() => []),
  });

  const { data: summaries = [], isLoading: loadS } = useQuery({
    queryKey: ["gasci-summaries"],
    queryFn: () => base44.entities.IntelligenceSummary.list("-generated_at", 50).catch(() => []),
  });

  const { data: profiles = [], isLoading: loadP } = useQuery({
    queryKey: ["gasci-profiles"],
    queryFn: () => base44.entities.PerformanceProfile.list("-measured_at", 100).catch(() => []),
  });

  const stats = {
    total: events.length,
    avgDelta: events.length > 0 ? Math.round(events.reduce((sum, e) => sum + (e.confidence_delta || 0), 0) / events.length) : 0,
    positive: events.filter(e => (e.confidence_delta || 0) > 0).length
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Learning" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">AI Learning Center</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Learning events and performance analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Learning Events</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Confidence Delta</p>
          <p className={`text-2xl font-black ${stats.avgDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>{stats.avgDelta >= 0 ? '+' : ''}{stats.avgDelta}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Positive Improvements</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{stats.positive}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Summaries</p>
          <p className="text-2xl font-black" style={{ color: "#a855f7" }}>{summaries.length}</p>
        </Card>
      </div>

      {/* Learning Events */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Learning Events</h3>
        </div>
        <Card className="overflow-hidden">
          {loadE ? <Skeleton lines={5} /> : events.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>No learning events</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Type", "Session", "Before", "After", "Delta", "Applied At", "Outcome"].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${LEARNING_TYPE_COLORS[e.learning_type] || MUTED}30`, color: LEARNING_TYPE_COLORS[e.learning_type] || MUTED }}>{e.learning_type?.replace(/_/g, " ")}</span></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{e.trigger_session_id || '—'}</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }} className="max-w-xs truncate">{e.before_state}</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }} className="max-w-xs truncate">{e.after_state}</p></td>
                      <td className="py-3 px-4"><p className={`text-xs font-bold ${(e.confidence_delta || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{(e.confidence_delta || 0) >= 0 ? '+' : ''}{e.confidence_delta || 0}%</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{e.applied_at ? new Date(e.applied_at).toLocaleDateString() : '—'}</p></td>
                      <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded ${e.outcome === 'successful' ? 'bg-green-400/20 text-green-400' : e.outcome === 'failed' ? 'bg-red-400/20 text-red-400' : 'bg-gray-400/20 text-gray-400'}`}>{e.outcome}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Intelligence Summaries */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5" style={{ color: "#a855f7" }} />
          <h3 className="text-sm font-bold text-white">Intelligence Summaries</h3>
        </div>
        <Card className="overflow-hidden">
          {loadS ? <Skeleton lines={5} /> : summaries.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>No summaries</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Type", "Headline", "Confidence", "Trend", "Generated By", "Period"].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaries.map(s => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-4"><p className="text-xs font-semibold text-white">{s.summary_type}</p></td>
                      <td className="py-3 px-4"><p className="text-xs font-bold" style={{ color: TEXT }} className="max-w-xs truncate">{s.headline}</p></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${s.confidence_percent || 0}%`, background: LOW }} />
                          </div>
                          <span className="text-[9px]" style={{ color: MUTED }}>{s.confidence_percent || 0}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{s.trend}</span></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{s.generated_by}</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{s.period}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}