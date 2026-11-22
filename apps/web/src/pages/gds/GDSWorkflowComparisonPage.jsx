import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { GitBranch, TrendingUp, Clock, CheckCircle, AlertTriangle, Zap, BarChart3 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function GDSWorkflowComparisonPage() {
  const [selectedWorkflows, setSelectedWorkflows] = useState([]);
  const [comparisonMetric, setComparisonMetric] = useState("duration"); // 'duration', 'success_rate', 'steps'

  const { data: workflowsData } = useQuery({
    queryKey: ["workflows-list-all"],
    queryFn: () => base44.entities.Workflow.list("-created_date", 50).catch(() => []),
  });

  const { data: runsComparison } = useQuery({
    queryKey: ["workflow-runs-comparison", selectedWorkflows],
    queryFn: () => selectedWorkflows.length >= 2 
      ? base44.functions.invoke("gdsWorkflowIntelligenceEngine", { 
          action: "compare_workflows", 
          workflow_ids: selectedWorkflows 
        }).then(r => r.data)
      : Promise.resolve(null),
    enabled: selectedWorkflows.length >= 2,
  });

  const workflows = workflowsData || [];
  const comparison = runsComparison || null;

  const toggleWorkflowSelection = (workflowId) => {
    setSelectedWorkflows(prev => {
      if (prev.includes(workflowId)) {
        return prev.filter(id => id !== workflowId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), workflowId];
      }
      return [...prev, workflowId];
    });
  };

  const getMetricColor = (value, metric) => {
    if (metric === "duration") {
      return value < 60000 ? LOW : value < 120000 ? MEDIUM : DANGER;
    }
    if (metric === "success_rate") {
      return value >= 90 ? LOW : value >= 70 ? MEDIUM : DANGER;
    }
    return CYAN;
  };

  const prepareChartData = () => {
    if (!comparison?.workflows) return [];
    return comparison.workflows.map(wf => ({
      name: wf.name?.slice(0, 20) || "Workflow",
      avg_duration: Math.round((wf.avg_duration_ms || 0) / 1000),
      success_rate: wf.success_rate_pct || 0,
      total_steps: wf.avg_steps || 0,
      total_runs: wf.total_runs || 0
    }));
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Workflows", path: "/workflows" }, { label: "Pipeline Comparison" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <GitBranch className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Pipeline Comparison</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-008 v1.0</span>
        </div>
      </div>

      {/* Workflow Selection */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Select Workflows to Compare</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Choose 2-3 workflows for side-by-side analysis (currently: {selectedWorkflows.length} selected)</p>
        </div>
        {workflows.length === 0 ? (
          <EmptyState icon={GitBranch} title="No workflows" description="Create workflows to enable comparison" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {workflows.map((wf, idx) => {
              const isSelected = selectedWorkflows.includes(wf.workflow_id);
              return (
                <div
                  key={wf.workflow_id || idx}
                  onClick={() => toggleWorkflowSelection(wf.workflow_id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "scale-[1.02]" : ""}`}
                  style={{
                    background: isSelected ? `${CYAN}10` : "rgba(255,255,255,0.02)",
                    borderColor: isSelected ? CYAN + "40" : BORDER
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white truncate flex-1">{wf.name || "Untitled"}</span>
                    {isSelected && <CheckCircle className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: CYAN }} />}
                  </div>
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className="px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>
                      {wf.workflow_type || "general"}
                    </span>
                    <span style={{ color: MUTED }}>{wf.execution_count || 0} runs</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Comparison Results */}
      {comparison && comparison.workflows && comparison.workflows.length >= 2 ? (
        <>
          {/* Metrics Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparison.workflows.map((wf, idx) => {
              const avgDuration = wf.avg_duration_ms || 0;
              const successRate = wf.success_rate_pct || 0;
              const avgSteps = wf.avg_steps || 0;
              const isBest = comparison.best_performer?.workflow_id === wf.workflow_id;
              return (
                <Card key={wf.workflow_id || idx} className={`p-5 ${isBest ? "ring-2" : ""}`} style={{ ringColor: isBest ? LOW : "transparent" }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white truncate flex-1">{wf.name || "Workflow"}</h4>
                    {isBest && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">BEST</span>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Avg Duration</p>
                      <p className="text-xl font-black font-mono" style={{ color: getMetricColor(avgDuration, "duration") }}>
                        {Math.round(avgDuration / 1000)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Success Rate</p>
                      <p className="text-xl font-black font-mono" style={{ color: getMetricColor(successRate, "success_rate") }}>
                        {successRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Avg Steps</p>
                      <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{avgSteps}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold mb-1" style={{ color: MUTED }}>Total Runs</p>
                      <p className="text-lg font-bold" style={{ color: TEXT }}>{wf.total_runs || 0}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Performance Chart */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Performance Comparison</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Visual comparison across key metrics</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setComparisonMetric("duration")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${comparisonMetric === "duration" ? "text-cyan-400" : "text-slate-500"}`}
                  style={{ background: comparisonMetric === "duration" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${comparisonMetric === "duration" ? CYAN + "40" : BORDER}` }}>
                  Duration
                </button>
                <button
                  onClick={() => setComparisonMetric("success_rate")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${comparisonMetric === "success_rate" ? "text-cyan-400" : "text-slate-500"}`}
                  style={{ background: comparisonMetric === "success_rate" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${comparisonMetric === "success_rate" ? CYAN + "40" : BORDER}` }}>
                  Success Rate
                </button>
                <button
                  onClick={() => setComparisonMetric("steps")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${comparisonMetric === "steps" ? "text-cyan-400" : "text-slate-500"}`}
                  style={{ background: comparisonMetric === "steps" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${comparisonMetric === "steps" ? CYAN + "40" : BORDER}` }}>
                  Steps
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={prepareChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" stroke={MUTED} fontSize={10} />
                <YAxis stroke={MUTED} fontSize={10} />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
                />
                <Bar dataKey={comparisonMetric} radius={[4, 4, 0, 0]}>
                  {prepareChartData().map((entry, index) => (
                    <rect key={index} fill={getMetricColor(entry[comparisonMetric], comparisonMetric)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Efficiency Insights */}
          {comparison.insights && comparison.insights.length > 0 && (
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
                <h3 className="text-sm font-bold text-white">Efficiency Insights</h3>
              </div>
              <div className="space-y-3">
                {comparison.insights.map((insight, idx) => (
                  <div key={idx} className="p-3 rounded-lg" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}20` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                        <Zap className="w-3 h-3" style={{ color: CYAN }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white mb-1">{insight.title}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-[10px] mt-2" style={{ color: CYAN }}>Recommendation: {insight.recommendation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Detailed Comparison Table */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Detailed Metrics</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Side-by-side comparison of all metrics</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Metric", ...comparison.workflows.map(wf => wf.name || "Workflow")].map((h, idx) => (
                      <th key={idx} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Avg Duration", key: "avg_duration_ms", format: v => `${Math.round(v / 1000)}s` },
                    { label: "Success Rate", key: "success_rate_pct", format: v => `${v.toFixed(1)}%` },
                    { label: "Avg Steps", key: "avg_steps", format: v => `${v}` },
                    { label: "Total Runs", key: "total_runs", format: v => `${v}` },
                    { label: "Failure Rate", key: "failure_rate_pct", format: v => `${v.toFixed(1)}%` },
                    { label: "Avg Retry Count", key: "avg_retry_count", format: v => `${v.toFixed(2)}` }
                  ].map((metric, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-bold text-white">{metric.label}</td>
                      {comparison.workflows.map((wf, wfIdx) => {
                        const value = wf[metric.key] || 0;
                        const isBest = comparison.best_performer?.workflow_id === wf.workflow_id && (metric.key === "success_rate_pct" || metric.key === "avg_duration_ms");
                        return (
                          <td key={wfIdx} className={`py-2 px-3 ${isBest ? "font-bold" : ""}`} style={{ color: isBest ? LOW : TEXT }}>
                            {metric.format(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-6">
          <EmptyState 
            icon={BarChart3} 
            title={selectedWorkflows.length < 2 ? "Select workflows to compare" : "No comparison data"} 
            description={selectedWorkflows.length < 2 ? "Choose at least 2 workflows from the list above" : "Unable to load comparison data"} 
          />
        </Card>
      )}
    </div>
  );
}