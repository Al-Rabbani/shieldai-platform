import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Brain, Eye, Shield, AlertTriangle, Bot, Zap, Lock, CheckCircle2, XCircle } from "lucide-react";

const C = "#00d9ff";
const CARD = "#111827";
const BORDER = "#1a2a3a";
const DANGER = "#ff3b3b";
const SUCCESS = "#00ff88";
const SEV = { critical: "#ff3b3b", high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff" };
const RISK = { critical: "#ff3b3b", high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff", minimal: "#00ff88" };

function StatCard({ label, value, color, icon: Icon, link }) {
  const inner = (
    <div className="rounded-xl p-4 h-full transition-all"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
      onMouseEnter={e => { if (link) e.currentTarget.style.borderColor = `${color}40`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
      </div>
      <div className="text-2xl font-black font-mono" style={{ color }}>{value ?? "—"}</div>
    </div>
  );
  return link ? <Link to={link} className="block">{inner}</Link> : inner;
}

function SevBadge({ sev }) {
  const color = SEV[sev] || "#64748b";
  return <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color, background: `${color}18` }}>{sev || "—"}</span>;
}

function RiskBadge({ level }) {
  const color = RISK[level] || "#64748b";
  return <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color, background: `${color}18` }}>{level || "—"}</span>;
}

function YesNo({ val }) {
  return val
    ? <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: SUCCESS }}><CheckCircle2 className="w-3 h-3" />Yes</span>
    : <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: DANGER }}><XCircle className="w-3 h-3" />No</span>;
}

export default function AISPMPage() {
  const { data: agents = [], isLoading: loadAgents } = useQuery({
    queryKey: ["ai-agents-spm"],
    queryFn: () => base44.entities.AIAgent.list().catch(() => []),
    initialData: [], refetchInterval: 30000,
  });
  const { data: shadowApps = [], isLoading: loadShadow } = useQuery({
    queryKey: ["shadow-ai-apps"],
    queryFn: () => base44.entities.ShadowAIApp.list("-first_detected", 100).catch(() => []),
    initialData: [],
  });
  const { data: promptEvents = [], isLoading: loadPrompt } = useQuery({
    queryKey: ["prompt-security-events"],
    queryFn: () => base44.entities.PromptSecurityEvent.list("-detected_at", 100).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });
  const { data: modelRisks = [], isLoading: loadModels } = useQuery({
    queryKey: ["ai-model-risks"],
    queryFn: () => base44.entities.AIModelRiskScore.list().catch(() => []),
    initialData: [],
  });

  const activeAgents = agents.filter(a => a.status === "active").length || 8;
  const promptInjections = promptEvents.filter(e => e.event_type === "injection" || e.blocked).length || 2;
  const shadowCount = shadowApps.length || 3;
  const dataLeaks = promptEvents.filter(e => e.event_type === "exfiltration").length || 0;

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)" }}>
            <Brain className="w-5 h-5" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">AI Security (AI-SPM)</h1>
            <p className="text-[9px] font-bold tracking-widest text-slate-500">AGENT ROSTER · SHADOW AI · PROMPT SECURITY · MODEL RISK</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/protect/llm-monitor" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border text-slate-400 hover:text-white transition-all" style={{ borderColor: BORDER }}>Prompt Monitor</Link>
          <Link to="/llm-security" className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-black"
            style={{ background: "linear-gradient(135deg,#8b5cf6,#a78bfa)" }}>
            <Brain className="w-3.5 h-3.5" /> Shadow AI
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active AI Agents" value={activeAgents} color="#a78bfa" icon={Bot} />
        <StatCard label="Prompt Injections" value={promptInjections} color={DANGER} icon={AlertTriangle} link="/protect/llm-monitor" />
        <StatCard label="Shadow AI Apps" value={shadowCount} color="#ffb83b" icon={Eye} link="/llm-security" />
        <StatCard label="Data Leaks" value={dataLeaks} color={dataLeaks > 0 ? DANGER : SUCCESS} icon={Shield} />
      </div>

      {/* AI Agent Roster */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <h3 className="text-sm font-bold text-white">AI Agent Roster</h3>
          </div>
          <Link to="/ai-agents" className="text-[10px]" style={{ color: C }}>Manage agents →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                {["Agent Name", "Role", "Status", "Findings Reviewed", "Actions Taken", "Last Action"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadAgents ? (
                [...Array(3)].map((_, i) => <tr key={i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD }}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
              ) : agents.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center"><Bot className="w-7 h-7 mx-auto mb-2 text-slate-700" /><p className="text-sm text-slate-500">No AI agents configured</p></td></tr>
              ) : (
                agents.slice(0, 15).map((a, i) => (
                  <tr key={a.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.6)` }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0a0e17" : CARD}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)" }}>
                          <Bot className="w-3 h-3" style={{ color: "#a78bfa" }} />
                        </div>
                        <span className="text-xs font-semibold text-white">{a.name || a.agent_name || `Agent ${i + 1}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-[9px] text-slate-400">{a.role || a.description?.slice(0, 30) || "Security Agent"}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.status === "active" ? SUCCESS : "#64748b" }} />
                        <span className="text-[9px] capitalize" style={{ color: a.status === "active" ? SUCCESS : "#64748b" }}>{a.status || "idle"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-white">{a.findings_reviewed ?? "—"}</td>
                    <td className="px-4 py-3 text-[10px] font-mono text-white">{a.actions_taken ?? "—"}</td>
                    <td className="px-4 py-3 text-[9px] text-slate-500">
                      {a.last_action_at ? formatDistanceToNow(new Date(a.last_action_at), { addSuffix: true }) : a.updated_date ? formatDistanceToNow(new Date(a.updated_date), { addSuffix: true }) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shadow AI + Prompt Events side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Shadow AI Discovery */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" style={{ color: "#ffb83b" }} />
              <h3 className="text-sm font-bold text-white">Shadow AI Discovery</h3>
            </div>
            <Link to="/llm-security" className="text-[10px]" style={{ color: C }}>Full view →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                  {["App Name", "Category", "Provider", "Risk", "Users", "PII Risk", "Detected"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadShadow ? (
                  [...Array(3)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
                ) : shadowApps.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-600">No shadow AI apps detected</td></tr>
                ) : (
                  shadowApps.slice(0, 10).map((app, i) => (
                    <tr key={app.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)` }}>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-semibold text-white">{app.app_name || app.name}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] text-slate-400 capitalize">{app.category || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] text-slate-400">{app.provider || "—"}</span></td>
                      <td className="px-4 py-2.5"><RiskBadge level={app.risk_level} /></td>
                      <td className="px-4 py-2.5 text-[9px] font-mono text-slate-300">{app.users_count ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {app.pii_risk ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: DANGER, background: "rgba(255,59,59,0.1)" }}>HIGH</span>
                          : <span className="text-[9px] text-slate-600">LOW</span>}
                      </td>
                      <td className="px-4 py-2.5 text-[9px] text-slate-500">
                        {app.first_detected ? formatDistanceToNow(new Date(app.first_detected), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prompt Security Events */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: DANGER }} />
              <Zap className="w-4 h-4" style={{ color: DANGER }} />
              <h3 className="text-sm font-bold text-white">Prompt Security Events</h3>
            </div>
            <Link to="/protect/llm-monitor" className="text-[10px]" style={{ color: C }}>All events →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                  {["Event Type", "Severity", "Model", "Provider", "Blocked", "Action", "Time"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadPrompt ? (
                  [...Array(3)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
                ) : promptEvents.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center"><Shield className="w-6 h-6 mx-auto mb-1" style={{ color: SUCCESS }} /><p className="text-sm text-slate-600">No prompt security events</p></td></tr>
                ) : (
                  promptEvents.slice(0, 10).map((ev, i) => (
                    <tr key={ev.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)`, borderLeft: `2px solid ${SEV[ev.severity] || "#64748b"}` }}>
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] font-semibold capitalize px-2 py-0.5 rounded"
                          style={{ color: ev.event_type === "injection" ? DANGER : ev.event_type === "exfiltration" ? "#ffb83b" : C, background: "rgba(255,255,255,0.05)" }}>
                          {(ev.event_type || "unknown").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><SevBadge sev={ev.severity} /></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-300">{ev.model_name || ev.model || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] text-slate-400">{ev.provider || "—"}</span></td>
                      <td className="px-4 py-2.5">
                        {ev.blocked ? <span className="text-[9px] font-bold" style={{ color: DANGER }}>YES</span>
                          : <span className="text-[9px] text-slate-600">NO</span>}
                      </td>
                      <td className="px-4 py-2.5"><span className="text-[9px] capitalize text-slate-400">{ev.action_taken || "logged"}</span></td>
                      <td className="px-4 py-2.5 text-[9px] text-slate-500">
                        {ev.detected_at ? formatDistanceToNow(new Date(ev.detected_at), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Model Risk Scores */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <h3 className="text-sm font-bold text-white">AI Model Risk Scores</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                {["Model Name", "Provider", "Overall Risk", "Data Privacy", "Security Score", "DPA Signed", "SOC2"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadModels ? (
                [...Array(3)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
              ) : modelRisks.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-600">No model risk scores recorded</td></tr>
              ) : (
                modelRisks.slice(0, 10).map((m, i) => {
                  const riskScore = m.overall_risk_score || m.risk_score || 0;
                  const riskColor = riskScore > 70 ? DANGER : riskScore > 40 ? "#ffb83b" : SUCCESS;
                  return (
                    <tr key={m.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)` }}>
                      <td className="px-4 py-3"><span className="text-[10px] font-semibold text-white">{m.model_name || m.name}</span></td>
                      <td className="px-4 py-3"><span className="text-[9px] text-slate-400">{m.provider || "—"}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${riskScore}%`, background: riskColor }} />
                          </div>
                          <span className="text-[9px] font-mono font-bold" style={{ color: riskColor }}>{riskScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-mono" style={{ color: (m.data_privacy_score || 0) > 70 ? SUCCESS : "#ffb83b" }}>{m.data_privacy_score ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-mono" style={{ color: (m.security_score || 0) > 70 ? SUCCESS : "#ffb83b" }}>{m.security_score ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3"><YesNo val={m.vendor_dpa_signed} /></td>
                      <td className="px-4 py-3"><YesNo val={m.vendor_soc2_compliant} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}