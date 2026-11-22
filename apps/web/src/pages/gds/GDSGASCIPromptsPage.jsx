import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Shield, Zap, Clock3 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const CATEGORY_COLORS = {
  analysis: "#3b82f6", summarization: "#10b981", decision: "#a855f7",
  code_review: "#f97316", threat_detection: "#ef4444", compliance: "#06b6d4"
};

export default function GDSGASCIPromptsPage() {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["gasci-prompts"],
    queryFn: () => base44.entities.PromptTemplate.list("-created_at", 100).catch(() => []),
  });

  const stats = {
    active: templates.filter(t => t.is_active).length,
    avgSuccess: templates.length > 0 ? Math.round(templates.reduce((sum, t) => sum + (t.success_rate_percent || 0), 0) / templates.length) : 0,
    bestPerforming: templates.length > 0 ? templates.reduce((max, t) => (t.success_rate_percent || 0) > (max.success_rate_percent || 0) ? t : max, templates[0]) : null
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Prompts" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Prompt Engineering Center</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Prompt template management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Templates</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>{stats.active}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Success Rate</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{stats.avgSuccess}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Best Performing</p>
          <p className="text-lg font-black" style={{ color: HIGH }}>{stats.bestPerforming?.name || "—"}</p>
          <p className="text-[10px]" style={{ color: MUTED }}>{stats.bestPerforming?.success_rate_percent || 0}% success</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : templates.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No prompt templates</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Name", "Category", "Model", "Chain of Thought", "Hallucination Guard", "Success Rate", "Latency", "Cost", "Executions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-4"><p className="text-xs font-semibold text-white max-w-xs truncate">{t.name}</p></td>
                    <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[t.category] || MUTED}30`, color: CATEGORY_COLORS[t.category] || MUTED }}>{t.category}</span></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{t.model_preference || "—"}</p></td>
                    <td className="py-3 px-4">{t.chain_of_thought ? <Zap className="w-4 h-4" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                    <td className="py-3 px-4">{t.hallucination_guard ? <Shield className="w-4 h-4" style={{ color: LOW }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                    <td className="py-3 px-4"><p className={`text-xs font-bold ${t.success_rate_percent >= 90 ? 'text-green-400' : t.success_rate_percent >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{t.success_rate_percent || 0}%</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{t.avg_latency_ms || 0}ms</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>${t.avg_cost_usd || 0}</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{t.execution_count || 0}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}