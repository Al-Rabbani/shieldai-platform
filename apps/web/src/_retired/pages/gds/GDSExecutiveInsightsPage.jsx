import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSExecutiveInsightsPage() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ["executive-insights"],
    queryFn: () => base44.entities.ExecutiveInsight.filter({}, '-created_date', 50).catch(() => []),
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Executive Insights" }]} />

      <div className="flex items-start gap-3 mb-6">
        <Lightbulb className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Executive Insights</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>AI-generated strategic insights</p>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Latest Insights</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
            ))}
          </div>
        ) : insights?.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb className="w-12 h-12 mx-auto mb-3" style={{ color: MUTED }} />
            <p className="text-sm font-bold" style={{ color: MUTED }}>No insights yet</p>
            <p className="text-[10px]" style={{ color: MUTED }}>AI-generated insights will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights?.map(insight => (
              <div key={insight.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-start gap-3">
                  {insight.severity === 'critical' ? (
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: DANGER }} />
                  ) : insight.severity === 'high' ? (
                    <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: HIGH }} />
                  ) : (
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: CYAN }} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                        insight.severity === 'critical' ? 'bg-red-400/15 text-red-400' :
                        insight.severity === 'high' ? 'bg-orange-400/15 text-orange-400' :
                        'bg-cyan-400/15 text-cyan-400'
                      }`}>{insight.severity}</span>
                      <span className="text-[10px]" style={{ color: MUTED }}>{insight.insight_type}</span>
                    </div>
                    <p className="text-sm font-bold text-white mb-1">{insight.title}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}