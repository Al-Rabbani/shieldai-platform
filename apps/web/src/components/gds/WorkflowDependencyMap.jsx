import React, { useState, useMemo } from "react";
import { Network, GitBranch, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState } from "@/components/gds/GDSOSShared";

export default function WorkflowDependencyMap({ workflows }) {
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [viewMode, setViewMode] = useState("graph"); // 'graph' or 'list'

  // Build dependency graph from workflows
  const dependencyGraph = useMemo(() => {
    if (!workflows || workflows.length === 0) return { nodes: [], edges: [], bottlenecks: [] };

    const nodeMap = new Map();
    const edges = [];
    const bottlenecks = [];

    // Create nodes
    workflows.forEach(wf => {
      nodeMap.set(wf.workflow_id, {
        id: wf.workflow_id,
        name: wf.name || "Unknown",
        type: wf.workflow_type || "general",
        execution_count: wf.execution_count || 0,
        failure_rate: wf.failure_rate_pct || 0,
        avg_duration: wf.avg_duration_ms || 0,
        dependencies: wf.dependencies || [],
        dependents: []
      });
    });

    // Create edges and track dependents
    workflows.forEach(wf => {
      if (wf.dependencies && wf.dependencies.length > 0) {
        wf.dependencies.forEach(depId => {
          edges.push({ from: depId, to: wf.workflow_id, type: "depends_on" });
          if (nodeMap.has(depId)) {
            nodeMap.get(depId).dependents.push(wf.workflow_id);
          }
        });
      }
    });

    // Identify bottlenecks (workflows with many dependents)
    nodeMap.forEach((node, id) => {
      if (node.dependents.length >= 3) {
        bottlenecks.push({
          workflow_id: id,
          name: node.name,
          dependent_count: node.dependents.length,
          risk_level: node.dependents.length >= 5 ? "critical" : node.dependents.length >= 3 ? "high" : "medium"
        });
      }
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
      bottlenecks
    };
  }, [workflows]);

  const { nodes, edges, bottlenecks } = dependencyGraph;

  if (!workflows || workflows.length === 0) {
    return (
      <Card className="p-6">
        <EmptyState icon={Network} title="No workflows" description="Create workflows to see dependency mappings" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Workflow Dependency Map</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Visualize workflow relationships and identify bottlenecks</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("graph")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${viewMode === "graph" ? "text-cyan-400" : "text-slate-500"}`}
              style={{ background: viewMode === "graph" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${viewMode === "graph" ? CYAN + "40" : BORDER}` }}>
              <Network className="w-3.5 h-3.5" />
              Graph View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${viewMode === "list" ? "text-cyan-400" : "text-slate-500"}`}
              style={{ background: viewMode === "list" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${viewMode === "list" ? CYAN + "40" : BORDER}` }}>
              <GitBranch className="w-3.5 h-3.5" />
              List View
            </button>
          </div>
        </div>

        {/* Bottleneck Alerts */}
        {bottlenecks.length > 0 && (
          <div className="mb-4 p-3 rounded-lg" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
              <h4 className="text-xs font-bold" style={{ color: DANGER }}>Potential Bottlenecks Detected</h4>
            </div>
            <div className="space-y-2">
              {bottlenecks.map((bottle, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{bottle.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      bottle.risk_level === "critical" ? "bg-red-500/20 text-red-400" :
                      bottle.risk_level === "high" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {bottle.risk_level.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: MUTED }}>{bottle.dependent_count} workflows depend on this</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {viewMode === "graph" ? (
        <div className="relative min-h-[400px] p-4 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: `1px solid ${BORDER}` }}>
          {/* Simple node visualization */}
          <div className="flex flex-wrap gap-4 justify-center">
            {nodes.map((node, idx) => {
              const isSelected = selectedWorkflow?.workflow_id === node.id;
              const isBottleneck = bottlenecks.find(b => b.workflow_id === node.id);
              const nodeColor = isBottleneck ? DANGER : node.failure_rate > 20 ? HIGH : node.failure_rate > 10 ? MEDIUM : LOW;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedWorkflow(isSelected ? null : node)}
                  className={`relative p-4 rounded-xl cursor-pointer transition-all hover:scale-105 ${isSelected ? "ring-2" : ""}`}
                  style={{
                    background: isSelected ? `${nodeColor}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isSelected ? nodeColor + "60" : BORDER}`,
                    ringColor: nodeColor,
                    minWidth: "180px"
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: nodeColor }} />
                    <span className="text-xs font-bold text-white truncate">{node.name}</span>
                  </div>
                  <div className="space-y-1 text-[9px]">
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Type:</span>
                      <span style={{ color: TEXT }}>{node.type || "general"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Dependencies:</span>
                      <span style={{ color: TEXT }}>{node.dependencies.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Dependents:</span>
                      <span style={{ color: node.dependents.length > 0 ? CYAN : TEXT }}>{node.dependents.length}</span>
                    </div>
                    {isBottleneck && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t" style={{ borderColor: BORDER }}>
                        <AlertTriangle className="w-3 h-3" style={{ color: DANGER }} />
                        <span className="text-[8px] font-bold" style={{ color: DANGER }}>BOTTLENECK</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected workflow details */}
          {selectedWorkflow && (
            <div className="mt-6 p-4 rounded-lg" style={{ background: `${CYAN}05`, border: `1px solid ${CYAN}30` }}>
              <h4 className="text-xs font-bold mb-3" style={{ color: CYAN }}>Workflow Details: {selectedWorkflow.name}</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Dependencies</p>
                  {selectedWorkflow.dependencies.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedWorkflow.dependencies.map((depId, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: CYAN }} />
                          <span style={{ color: TEXT }}>{depId}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px]" style={{ color: MUTED }}>No dependencies</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Dependent Workflows</p>
                  {selectedWorkflow.dependents.length > 0 ? (
                    <ul className="space-y-1">
                      {selectedWorkflow.dependents.map((depId, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: LOW }} />
                          <span style={{ color: TEXT }}>{depId}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px]" style={{ color: MUTED }}>No dependents</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Workflow", "Type", "Dependencies", "Dependents", "Failure Rate", "Avg Duration", "Bottleneck"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodes.map((node, idx) => {
                const isBottleneck = bottlenecks.find(b => b.workflow_id === node.id);
                return (
                  <tr key={node.id || idx} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-bold text-white">{node.name}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{node.type || "general"}</span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{node.dependencies.length}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: node.dependents.length > 0 ? CYAN : TEXT }}>{node.dependents.length}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        node.failure_rate > 20 ? "text-red-400" :
                        node.failure_rate > 10 ? "text-orange-400" : "text-emerald-400"
                      }`} style={{ background: "rgba(255,255,255,0.04)" }}>
                        {node.failure_rate?.toFixed(1) || 0}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{node.avg_duration ? `${Math.floor(node.avg_duration / 1000)}s` : "—"}</td>
                    <td className="py-2 px-3">
                      {isBottleneck ? (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          isBottleneck.risk_level === "critical" ? "bg-red-500/20 text-red-400" :
                          isBottleneck.risk_level === "high" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {isBottleneck.risk_level.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-[10px]" style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}