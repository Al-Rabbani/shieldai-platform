import React, { useMemo, useState } from "react";
import { Network, GitBranch, Zap, Clock3, AlertCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const INTENT_COLORS = {
  scan: DANGER, remediate: HIGH, investigate: MEDIUM,
  report: "#60a5fa", approve: "#8b5cf6", configure: "#06b6d4",
  query: LOW, orchestrate: "#f472b6",
};

// Define typical workflow chains based on security operations
const WORKFLOW_CHAINS = {
  "Full Security Audit": ["scan", "investigate", "report"],
  "Incident Response": ["investigate", "remediate", "report"],
  "Compliance Check": ["scan", "approve", "report"],
  "Threat Hunting": ["scan", "investigate", "remediate"],
  "Automated Remediation": ["scan", "remediate"],
  "Executive Reporting": ["query", "report"],
  "System Configuration": ["configure", "approve"],
  "Full Orchestration": ["scan", "investigate", "remediate", "approve", "report"],
};

function findChains(sessions) {
  // Group sessions by actor to find sequences
  const byActor = {};
  sessions.forEach(s => {
    const actor = s.actor_id || "unknown";
    if (!byActor[actor]) byActor[actor] = [];
    byActor[actor].push(s);
  });

  const chains = [];
  Object.entries(byActor).forEach(([actor, actorSessions]) => {
    // Sort by time
    const sorted = actorSessions.sort((a, b) => 
      new Date(a.created_date || a.started_at || 0) - new Date(b.created_date || b.started_at || 0)
    );
    
    // Find sequences where sessions are within 30 min of each other
    let currentChain = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevEnd = new Date(prev.created_date || prev.started_at || 0).getTime() + (prev.duration_ms || 0);
      const currStart = new Date(curr.created_date || curr.started_at || 0).getTime();
      
      if (currStart - prevEnd < 30 * 60 * 1000) {
        currentChain.push(curr);
      } else {
        if (currentChain.length > 1) chains.push(currentChain);
        currentChain = [curr];
      }
    }
    if (currentChain.length > 1) chains.push(currentChain);
  });

  return chains;
}

function matchWorkflow(chain) {
  const types = chain.map(s => s.intent_type);
  let bestMatch = null;
  let bestScore = 0;
  
  Object.entries(WORKFLOW_CHAINS).forEach(([name, pattern]) => {
    let score = 0;
    let pi = 0;
    types.forEach(t => {
      if (pi < pattern.length && t === pattern[pi]) {
        score++;
        pi++;
      }
    });
    const ratio = score / Math.max(pattern.length, types.length);
    if (ratio > bestScore) {
      bestScore = ratio;
      bestMatch = { name, pattern, score: ratio };
    }
  });
  
  return bestMatch && bestMatch.score >= 0.5 ? bestMatch : null;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function KernelDependencyGraph({ sessions = [] }) {
  const [selectedChain, setSelectedChain] = useState(null);
  const [viewMode, setViewMode] = useState("chains"); // chains | workflows

  const chains = useMemo(() => findChains(sessions), [sessions]);
  
  const workflowStats = useMemo(() => {
    const stats = {};
    chains.forEach(chain => {
      const match = matchWorkflow(chain);
      if (match) {
        if (!stats[match.name]) stats[match.name] = { count: 0, total_ms: 0, success: 0 };
        stats[match.name].count++;
        stats[match.name].total_ms += chain.reduce((a, b) => a + (b.duration_ms || 0), 0);
        const lastStatus = chain[chain.length - 1]?.status;
        if (lastStatus === "completed") stats[match.name].success++;
      }
    });
    return Object.entries(stats).map(([name, d]) => ({
      name, ...d, avg_ms: Math.round(d.total_ms / d.count), success_rate: Math.round((d.success / d.count) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [chains]);

  const chainData = useMemo(() => {
    return chains.map((chain, i) => {
      const match = matchWorkflow(chain);
      const totalMs = chain.reduce((a, b) => a + (b.duration_ms || 0), 0);
      return {
        id: i,
        chain,
        workflow: match?.name || "Custom",
        steps: chain.length,
        total_ms: totalMs,
        status: chain[chain.length - 1]?.status || "unknown",
        actor: chain[0]?.actor_id || "unknown",
        time: chain[0]?.created_date,
      };
    }).sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 50);
  }, [chains]);

  return (
    <Card className="p-5 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Task Dependency Graph</h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded"
            style={{ color: CYAN, background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}>
            Workflow Chains
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setViewMode("chains")}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: viewMode === "chains" ? `${CYAN}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${viewMode === "chains" ? CYAN + "50" : BORDER}`,
              color: viewMode === "chains" ? CYAN : MUTED,
            }}>
            <GitBranch className="w-3 h-3 inline mr-1" />
            Session Chains
          </button>
          <button onClick={() => setViewMode("workflows")}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: viewMode === "workflows" ? `${CYAN}18` : "rgba(255,255,255,0.04)",
              border: `1px solid ${viewMode === "workflows" ? CYAN + "50" : BORDER}`,
              color: viewMode === "workflows" ? CYAN : MUTED,
            }}>
            <Zap className="w-3 h-3 inline mr-1" />
            Workflow Patterns
          </button>
        </div>
      </div>

      {viewMode === "workflows" ? (
        /* Workflow Patterns View */
        <div className="space-y-4">
          {workflowStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <GitBranch className="w-8 h-8 mb-3" style={{ color: MUTED }} />
              <p className="text-sm font-bold text-white mb-1">No workflow patterns detected</p>
              <p className="text-xs" style={{ color: MUTED }}>Run multiple related sessions to see dependency chains</p>
            </div>
          ) : (
            <>
              {/* Workflow summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {workflowStats.slice(0, 4).map(wf => (
                  <div key={wf.name} className="p-3 rounded-xl"
                    style={{ background: `${INTENT_COLORS.scan}08`, border: `1px solid ${INTENT_COLORS.scan}20` }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{wf.name}</p>
                    <p className="text-lg font-black text-white">{wf.count}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{wf.avg_ms}ms avg · {wf.success_rate}% success</p>
                  </div>
                ))}
              </div>

              {/* Workflow chain diagrams */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Workflow Patterns</p>
                <div className="space-y-3">
                  {workflowStats.map(wf => {
                    const pattern = WORKFLOW_CHAINS[wf.name] || [];
                    return (
                      <div key={wf.name} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{wf.name}</span>
                          <span className="text-[10px]" style={{ color: MUTED }}>{wf.count} occurrences</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {pattern.map((step, i) => (
                            <React.Fragment key={i}>
                              <span className="text-[10px] font-bold px-2 py-1 rounded capitalize"
                                style={{ 
                                  background: `${INTENT_COLORS[step] || CYAN}20`, 
                                  color: INTENT_COLORS[step] || CYAN,
                                  border: `1px solid ${INTENT_COLORS[step] || CYAN}30`
                                }}>
                                {step}
                              </span>
                              {i < pattern.length - 1 && (
                                <span style={{ color: MUTED }}>→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-[10px]" style={{ color: MUTED }}>
                            <Clock3 className="w-3 h-3" /> {wf.avg_ms}ms avg
                          </span>
                          <span className="flex items-center gap-1 text-[10px]" style={{ color: wf.success_rate >= 80 ? LOW : HIGH }}>
                            <AlertCircle className="w-3 h-3" /> {wf.success_rate}% success
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Session Chains View */
        <div className="space-y-3">
          {chainData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Network className="w-8 h-8 mb-3" style={{ color: MUTED }} />
              <p className="text-sm font-bold text-white mb-1">No dependency chains found</p>
              <p className="text-xs" style={{ color: MUTED }}>Related sessions will appear here as chains are detected</p>
            </div>
          ) : (
            chainData.map(chain => (
              <div key={chain.id} 
                className="p-3 rounded-xl cursor-pointer transition-all hover:opacity-80"
                style={{ 
                  background: selectedChain === chain.id ? `${CYAN}08` : "rgba(255,255,255,0.02)", 
                  border: `1px solid ${selectedChain === chain.id ? CYAN + "40" : BORDER}` 
                }}
                onClick={() => setSelectedChain(selectedChain === chain.id ? null : chain.id)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded"
                      style={{ color: CYAN, background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}>
                      {chain.workflow}
                    </span>
                    <span className="text-[10px]" style={{ color: MUTED }}>{chain.steps} steps</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono" style={{ color: MUTED }}>{formatDuration(chain.total_ms)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      chain.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                      chain.status === "failed" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {chain.status}
                    </span>
                  </div>
                </div>
                
                {/* Chain visualization */}
                <div className="flex items-center gap-1 flex-wrap">
                  {chain.chain.map((session, i) => (
                    <React.Fragment key={i}>
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: INTENT_COLORS[session.intent_type] || CYAN }} />
                        <div>
                          <p className="text-[9px] font-bold capitalize" style={{ color: INTENT_COLORS[session.intent_type] || CYAN }}>
                            {session.intent_type}
                          </p>
                          <p className="text-[8px]" style={{ color: MUTED }}>{formatDuration(session.duration_ms || 0)}</p>
                        </div>
                      </div>
                      {i < chain.chain.length - 1 && (
                        <span style={{ color: MUTED }} className="text-lg">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Expanded details */}
                {selectedChain === chain.id && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2" style={{ borderColor: BORDER }}>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Actor</p>
                      <p className="text-[11px] font-mono text-white">{chain.actor}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Started</p>
                      <p className="text-[11px]" style={{ color: MUTED }}>{new Date(chain.time).toLocaleString()}</p>
                    </div>
                    {chain.chain.map((s, i) => (
                      <div key={i} className="col-span-2 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold capitalize" style={{ color: INTENT_COLORS[s.intent_type] || CYAN }}>
                            Step {i + 1}: {s.intent_type}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: MUTED }}>{formatDuration(s.duration_ms || 0)}</span>
                        </div>
                        <p className="text-[10px]" style={{ color: MUTED }}>{s.intent?.slice(0, 80)}{s.intent?.length > 80 ? "..." : ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}