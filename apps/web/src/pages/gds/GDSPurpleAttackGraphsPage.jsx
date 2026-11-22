import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Network, ArrowRight, AlertTriangle, Shield } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const OUTCOME_COLORS = {
  detected: LOW, prevented: "#3b82f6", missed: DANGER, partial: MEDIUM
};

export default function GDSPurpleAttackGraphsPage() {
  const [selectedGraph, setSelectedGraph] = useState(null);

  const { data: graphs = [], isLoading: loadG } = useQuery({
    queryKey: ["purple-attack-graphs"], queryFn: () => base44.entities.AttackGraph.list("", 50).catch(() => []),
  });

  const { data: steps = [], isLoading: loadS } = useQuery({
    queryKey: ["purple-attack-steps"], queryFn: () => base44.entities.AttackStep.list("", 200).catch(() => []),
  });

  const totalGraphs = graphs.length;
  const criticalPaths = graphs.reduce((sum, g) => sum + (g.critical_paths_count || 0), 0);
  const chokePoints = graphs.reduce((sum, g) => sum + (g.choke_points?.length || 0), 0);

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "Attack Graphs" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Network className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Attack Graph Explorer</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Visualize attack paths and identify security choke points</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Graphs</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{totalGraphs}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Paths</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{criticalPaths}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Choke Points</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{chokePoints}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Risk Score</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{graphs.length > 0 ? Math.round(graphs.reduce((s, g) => s + (g.risk_score || 0), 0) / graphs.length) : 0}</p>
        </Card>
      </div>

      {loadG ? <Skeleton lines={6} /> : graphs.length === 0 ? (
        <EmptyState icon={Network} title="No attack graphs" description="Run simulations to generate attack path data" />
      ) : (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Attack Graphs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Source → Target", "Total Paths", "Critical", "Choke Points", "Likelihood", "Impact", "Risk Score", "MITRE Tactics", "Nodes", "Edges"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {graphs.map((graph) => (
                  <tr key={graph.id} className="hover:bg-white/[0.02] cursor-pointer" style={{ borderBottom: `1px solid ${BORDER}20` }} onClick={() => setSelectedGraph(graph)}>
                    <td className="py-3 px-3"><p className="text-xs font-bold text-white">{graph.graph_name}</p></td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs" style={{ color: TEXT }}>{graph.source_node || 'Entry'}</span>
                        <ArrowRight className="w-3 h-3" style={{ color: DANGER }} />
                        <span className="text-xs font-bold" style={{ color: DANGER }}>{graph.target_node || 'Crown Jewel'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{graph.total_paths || 0}</td>
                    <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${DANGER}15`, color: DANGER }}>{graph.critical_paths_count || 0}</span></td>
                    <td className="py-3 px-3">
                      {graph.choke_points?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {graph.choke_points.slice(0, 2).map((cp, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${HIGH}15`, color: HIGH }}>{cp}</span>
                          ))}
                        </div>
                      ) : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(graph.likelihood_score || 0) * 100}%`, background: graph.likelihood_score >= 0.7 ? DANGER : graph.likelihood_score >= 0.4 ? MEDIUM : LOW }} />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(graph.impact_score || 0) * 100}%`, background: graph.impact_score >= 0.7 ? DANGER : graph.impact_score >= 0.4 ? MEDIUM : LOW }} />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-black ${graph.risk_score >= 80 ? 'text-red-400' : graph.risk_score >= 50 ? 'text-yellow-400' : 'text-green-400'}`}>{graph.risk_score || 0}</span>
                    </td>
                    <td className="py-3 px-3">
                      {graph.mitre_tactics_covered?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {graph.mitre_tactics_covered.slice(0, 2).map((t, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,212,255,0.08)", color: CYAN }}>{t}</span>
                          ))}
                        </div>
                      ) : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{graph.node_count || 0}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{graph.edge_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Attack Steps for Selected Graph */}
      {selectedGraph && (
        <Card className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Attack Steps: {selectedGraph.graph_name}</h3>
              <p className="text-xs" style={{ color: MUTED }}>{selectedGraph.source_node} → {selectedGraph.target_node}</p>
            </div>
            <button onClick={() => setSelectedGraph(null)} className="text-slate-400 hover:text-white"><span className="text-xl">×</span></button>
          </div>
          {loadS ? <Skeleton lines={4} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Step", "Technique", "Tactic", "Outcome", "Tool Used", "Alert Generated", "Response Time"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {steps.filter(s => s.attack_graph_id === selectedGraph.id).map((step, i) => {
                    const outcomeColor = OUTCOME_COLORS[step.outcome] || MUTED;
                    return (
                      <tr key={step.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{step.step_number || i + 1}</span></td>
                        <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{step.technique_id || '—'}</td>
                        <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,212,255,0.08)", color: CYAN }}>{step.tactic || '—'}</span></td>
                        <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${outcomeColor}15`, color: outcomeColor }}>{step.outcome}</span></td>
                        <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{step.tool_used || '—'}</td>
                        <td className="py-3 px-3">{step.alert_generated ? <Shield className="w-4 h-4" style={{ color: LOW }} /> : <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />}</td>
                        <td className="py-3 px-3 text-xs" style={{ color: step.response_time_seconds > 300 ? DANGER : MUTED }}>{step.response_time_seconds ? `${step.response_time_seconds}s` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}