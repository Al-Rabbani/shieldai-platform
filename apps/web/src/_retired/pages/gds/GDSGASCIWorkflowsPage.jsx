import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Zap, Target, Cpu, Clock3 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const CATEGORY_COLORS = {
  threat_response: "#ef4444", threat_hunt: "#f97316", purple_team: "#a855f7",
  compliance: "#3b82f6", incident_response: "#10b981", vulnerability_mgmt: "#f59e0b"
};

export default function GDSGASCIWorkflowsPage() {
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["gasci-workflows"],
    queryFn: () => base44.entities.WorkflowTemplate.list("-created_at", 100).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Workflows" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Workflow Intelligence Library</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>AI-powered workflow templates</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : workflows.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No workflow templates</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Name", "Category", "Trigger", "Agents", "Tools", "Autonomy", "Success Rate", "Executions", "Duration", "Last Optimized"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workflows.map(wf => (
                  <tr key={wf.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-4"><p className="text-xs font-semibold text-white max-w-xs truncate">{wf.name}</p></td>
                    <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${CATEGORY_COLORS[wf.category] || MUTED}30`, color: CATEGORY_COLORS[wf.category] || MUTED }}>{wf.category?.replace(/_/g, " ")}</span></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{wf.trigger_conditions?.length || 0} conditions</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{wf.agent_assignments?.length || 0}</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{wf.required_tools?.length || 0}</p></td>
                    <td className="py-3 px-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${wf.autonomy_level >= 3 ? 'bg-green-400/20 text-green-400' : 'bg-yellow-400/20 text-yellow-400'}`}>Level {wf.autonomy_level}</span></td>
                    <td className="py-3 px-4"><p className={`text-xs font-bold ${wf.success_rate_percent >= 90 ? 'text-green-400' : wf.success_rate_percent >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{wf.success_rate_percent || 0}%</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{wf.execution_count || 0}</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{wf.avg_duration_minutes || 0}m</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{wf.last_optimized ? new Date(wf.last_optimized).toLocaleDateString() : '—'}</p></td>
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