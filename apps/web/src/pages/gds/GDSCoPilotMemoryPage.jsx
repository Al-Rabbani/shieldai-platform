import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Network, Link2, TrendingUp, AlertTriangle, Shield, Zap, FileText, Clock, Target, Mic } from "lucide-react";
import { CopilotBreadcrumb, CopilotBanner, CopilotStat, CopilotBadge, COPILOT_PAGE_BG, COPILOT_CARD, COPILOT_GRADIENT, COPILOT_ELECTRIC, COPILOT_BLUE, COPILOT_GREEN, COPILOT_RED, COPILOT_AMBER, COPILOT_PURPLE, COPILOT_ORANGE, BORDER, MUTED, TEXT, timeAgo } from "@/components/gds/CopilotShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCoPilotMemoryPage() {
  const { data: memories = [] } = useQuery({ 
    queryKey: ["copilot-memory"], 
    queryFn: () => base44.entities.CopilotMemoryReference.list("-retrieved_at", 200).catch(() => []) 
  });
  const { data: risks = [] } = useQuery({ 
    queryKey: ["copilot-risks"], 
    queryFn: () => base44.entities.CopilotRiskDecision.list("-created_date", 200).catch(() => []) 
  });

  const voiceCommands = memories.filter(m => m.retrieval_method === "voice_input");

  const stats = {
    total: memories.length,
    incident: memories.filter(m => m.memory_type === "incident_context").length,
    threat: memories.filter(m => m.memory_type === "threat_profile").length,
    remediation: memories.filter(m => m.memory_type === "remediation_history").length,
    useful: memories.filter(m => m.was_useful).length,
    influenced: memories.filter(m => m.influenced_decision).length,
    voice: voiceCommands.length,
  };

  const decisionImpact = memories.filter(m => m.influenced_decision).map(m => ({
    memory: m,
    relatedRisk: risks.find(r => r.created_by_id === m.created_by_id),
  })).filter(d => d.relatedRisk);

  return (
    <div style={COPILOT_PAGE_BG}>
      <CopilotBreadcrumb items={[{ label: "Memory & Decision Impact" }]} />
      <CopilotBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">MEMORY & DECISION IMPACT ANALYSIS</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>GDS CO-PILOT v7.0 · PAST DECISIONS → CURRENT RISKS</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
        <CopilotStat label="Total Memories" value={stats.total} sub="Retrieved" color={COPILOT_ELECTRIC} />
        <CopilotStat label="Voice Commands" value={stats.voice} sub="Recorded & saved" color={COPILOT_RED} pulse={stats.voice > 0} />
        <CopilotStat label="Incident Context" value={stats.incident} sub="Historical" color={COPILOT_ORANGE} />
        <CopilotStat label="Threat Profiles" value={stats.threat} sub="Active threats" color={COPILOT_PURPLE} />
        <CopilotStat label="Remediation History" value={stats.remediation} sub="Past fixes" color={COPILOT_GREEN} />
        <CopilotStat label="Useful Retrievals" value={stats.useful} sub="High relevance" color={COPILOT_BLUE} />
        <CopilotStat label="Decisions Influenced" value={stats.influenced} sub="Impactful" color={COPILOT_AMBER} pulse={stats.influenced > 0} />
      </div>

      {/* Voice Commands Panel */}
      <div className="mb-6" style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Mic className="w-4 h-4" style={{ color: COPILOT_RED }} />
            Voice Command History
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto" style={{ background: `${COPILOT_RED}20`, color: COPILOT_RED }}>
              {voiceCommands.length} recorded
            </span>
          </h3>
          {voiceCommands.length === 0 ? (
            <div className="flex items-center gap-3 py-6 text-center justify-center">
              <Mic className="w-5 h-5" style={{ color: MUTED }} />
              <p className="text-sm" style={{ color: MUTED }}>No voice commands recorded yet. Use the 🎤 mic button in the Co-Pilot chat to record your first command.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {voiceCommands.slice(0, 12).map((cmd, idx) => (
                <div key={cmd.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${COPILOT_RED}20` }}>
                  <div className="flex items-start gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                      style={{ background: `${COPILOT_RED}20`, color: COPILOT_RED }}>
                      {idx + 1}
                    </span>
                    <p className="text-xs text-white leading-relaxed flex-1">
                      {cmd.content_summary.replace("[VOICE COMMAND] ", "")}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${COPILOT_RED}15`, color: COPILOT_RED }}>🎤 VOICE</span>
                    <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(cmd.retrieved_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4" style={{ color: COPILOT_PURPLE }} /> Memory Retrieval Methods
            </h3>
            <div className="space-y-3">
              {Object.entries(memories.reduce((acc, m) => {
                acc[m.retrieval_method] = (acc[m.retrieval_method] || 0) + 1;
                return acc;
              }, {})).map(([method, count]) => (
                <div key={method} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase mb-1" style={{ color: MUTED }}>{method.replace(/_/g, " ")}</p>
                    <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / memories.length) * 100}%`, background: COPILOT_GRADIENT }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: COPILOT_ELECTRIC }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: COPILOT_GREEN }} /> Decision Impact Correlation
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Memories Influencing Decisions</span>
                  <span className="text-xs font-bold" style={{ color: COPILOT_AMBER }}>{stats.influenced}</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full" style={{ width: `${memories.length > 0 ? (stats.influenced / memories.length) * 100 : 0}%`, background: COPILOT_AMBER }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Avg Relevance Score</span>
                  <span className="text-xs font-bold" style={{ color: COPILOT_BLUE }}>{memories.length > 0 ? Math.round(memories.reduce((sum, m) => sum + (m.relevance_score || 0), 0) / memories.length) : 0}</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full" style={{ width: `${memories.length > 0 ? (memories.reduce((sum, m) => sum + (m.relevance_score || 0), 0) / memories.length) : 0}%`, background: COPILOT_BLUE }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Useful Retrievals</span>
                  <span className="text-xs font-bold" style={{ color: COPILOT_GREEN }}>{stats.useful}</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div className="h-full rounded-full" style={{ width: `${memories.length > 0 ? (stats.useful / memories.length) * 100 : 0}%`, background: COPILOT_GREEN }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6" style={COPILOT_CARD}>
        <div className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4" style={{ color: COPILOT_ELECTRIC }} /> Memory → Risk Decision Impact Flow
          </h3>
          {decisionImpact.length === 0 ? (
            <p className="text-xs" style={{ color: MUTED }}>No correlated memory-decision pairs found</p>
          ) : (
            <div className="space-y-4">
              {decisionImpact.slice(0, 8).map(({ memory, relatedRisk }, idx) => (
                <div key={idx} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4" style={{ color: COPILOT_PURPLE }} />
                        <span className="text-xs font-bold text-white">{memory.memory_type.replace(/_/g, " ")}</span>
                        <CopilotBadge color={COPILOT_BLUE}>{memory.retrieval_method.replace(/_/g, " ")}</CopilotBadge>
                      </div>
                      <p className="text-[11px] mb-2" style={{ color: MUTED }}>{memory.content_summary}</p>
                      <div className="flex items-center gap-4 text-[10px]" style={{ color: MUTED }}>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" /> Relevance: {memory.relevance_score}%
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeAgo(memory.retrieved_at)}
                        </span>
                        {memory.was_useful && <span className="flex items-center gap-1" style={{ color: COPILOT_GREEN }}>
                          <CheckCircle className="w-3 h-3" /> Useful
                        </span>}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <ArrowRight className="w-5 h-5" style={{ color: COPILOT_ELECTRIC }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4" style={{ color: COPILOT_RED }} />
                        <span className="text-xs font-bold text-white">Risk Decision</span>
                        <CopilotBadge color={relatedRisk.risk_level === "critical" ? COPILOT_RED : relatedRisk.risk_level === "high" ? COPILOT_ORANGE : relatedRisk.risk_level === "medium" ? COPILOT_AMBER : COPILOT_GREEN}>{relatedRisk.risk_level}</CopilotBadge>
                      </div>
                      <p className="text-[11px] mb-2" style={{ color: MUTED }}>{relatedRisk.action}</p>
                      <div className="flex items-center gap-4 text-[10px]" style={{ color: MUTED }}>
                        <span>Verdict: <span className="font-bold" style={{ color: COPILOT_ELECTRIC }}>{relatedRisk.verdict.replace(/_/g, " ")}</span></span>
                        <span>Risk Score: <span className="font-bold" style={{ color: COPILOT_RED }}>{relatedRisk.risk_score}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: COPILOT_BLUE }} /> Recent Memory Retrievals
            </h3>
            <div className="space-y-2">
              {memories.slice(0, 5).map(memory => (
                <div key={memory.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-xs font-bold text-white mb-1">{memory.memory_type.replace(/_/g, " ")}</p>
                  <p className="text-[10px] mb-2 truncate" style={{ color: MUTED }}>{memory.content_summary}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: MUTED }}>Relevance: {memory.relevance_score}%</span>
                    {memory.influenced_decision && <Zap className="w-3 h-3" style={{ color: COPILOT_AMBER }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: COPILOT_RED }} /> High-Risk Decisions
            </h3>
            <div className="space-y-2">
              {risks.filter(r => r.risk_level === "high" || r.risk_level === "critical").slice(0, 5).map(risk => (
                <div key={risk.id} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${risk.risk_level === "critical" ? COPILOT_RED : COPILOT_ORANGE}30` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-white">{risk.action}</p>
                    <CopilotBadge color={risk.risk_level === "critical" ? COPILOT_RED : COPILOT_ORANGE}>{risk.risk_level}</CopilotBadge>
                  </div>
                  <p className="text-[10px]" style={{ color: MUTED }}>Score: {risk.risk_score} · {risk.verdict.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={COPILOT_CARD}>
          <div className="p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Network className="w-4 h-4" style={{ color: COPILOT_PURPLE }} /> Memory Types Distribution
            </h3>
            <div className="space-y-3">
              {Object.entries(memories.reduce((acc, m) => {
                acc[m.memory_type] = (acc[m.memory_type] || 0) + 1;
                return acc;
              }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <span className="text-xs font-bold" style={{ color: MUTED }}>{type.replace(/_/g, " ")}</span>
                  <span className="text-sm font-black" style={{ color: COPILOT_PURPLE }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRight({ className, style }) {
  return (
    <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}

function CheckCircle({ className, style }) {
  return (
    <svg className={className} style={style} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}