import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { observeAgent } from "@/lib/agentObservation";
import { formatDistanceToNow } from "date-fns";
import { Brain, Bot, Shield, AlertTriangle, Zap } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff"; const WARN = "#eab308";
const CARD = "#111827"; const BORDER = "#1a1f2e";

function ScoreGauge({ score }) {
  const r = 52, cx = 68, cy = 72;
  const toXY = pct => ({ x: cx + r * Math.cos(Math.PI * (1 + pct)), y: cy + r * Math.sin(Math.PI * (1 + pct)) });
  const pct = (score || 0) / 100;
  const start = toXY(0), end = toXY(pct);
  const large = pct > 0.5 ? 1 : 0;
  const color = score >= 70 ? SUCCESS : score >= 40 ? WARN : DANGER;
  return (
    <svg width={136} height={88} viewBox="0 0 136 88">
      <path d={`M ${toXY(0).x} ${toXY(0).y} A ${r} ${r} 0 1 1 ${toXY(1).x} ${toXY(1).y}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} strokeLinecap="round" />
      {score > 0 && <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: "all 1s ease" }} />}
      <text x={cx} y={cy - 8} fill={color} fontSize={28} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
      <text x={cx} y={cx + 4} fill={color} fontSize={11} textAnchor="middle" fontWeight="700">/ 100</text>
    </svg>
  );
}

export default function AISPMOverviewPage() {
  const [agentF, setAgentF] = useState("all");
  const [modelF, setModelF] = useState("all");

  const { data: agents = [], isLoading: loadA } = useQuery({
    queryKey: ["ai-agents"],
    queryFn: () => base44.entities.Agent.list("-created_date", 200).then(rows => rows.map(a => observeAgent(a))).catch(() => []),
    initialData: [],
  });

  const { data: aiInsights = [] } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: () => base44.entities.AIInsight.list("-created_date", 50).catch(() => []),
    initialData: [],
  });

  const providers = [...new Set(agents.map(a => a.model || a.llm_model).filter(Boolean))];
  const statuses  = [...new Set(agents.map(a => a.status).filter(Boolean))];

  const filteredAgents = agents.filter(a => {
    if (agentF !== "all" && a.status !== agentF) return false;
    if (modelF !== "all" && (a.model || a.llm_model) !== modelF) return false;
    return true;
  });

  const agentRows = filteredAgents.map(a => {
    const sc = a.status === "online" ? WARN : "#64748b";
    return {
      _key: a.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{a.name || "—"}</span>,
        <span className="text-[9px] capitalize text-slate-400">{a.agent_type || a.type || "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-24 block">{a.role || "—"}</span>,
        <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: sc }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc }} />{a.status === "online" ? "Recent heartbeat only" : a.status === "stale" ? "Stale heartbeat" : "No valid heartbeat"}
        </span>,
        <span className="text-[9px] font-mono text-slate-400">{a.active_tasks ?? "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{a.findings_reviewed ?? "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{a.actions_taken ?? "—"}</span>,
        <span className="text-[9px] font-mono" style={{ color: (a.confidence_score||0) >= 80 ? SUCCESS : (a.confidence_score||0) >= 50 ? WARN : DANGER }}>{a.confidence_score == null ? "—" : `${a.confidence_score}%`}</span>,
        <span className="text-[9px] capitalize" style={{ color: a.escalation_status === "escalated" ? DANGER : "#64748b" }}>{a.escalation_status || "—"}</span>,
        <span className="text-[9px]" style={{ color: a.requires_human_approval === true ? WARN : "#64748b" }}>{a.requires_human_approval === true ? "⚠ Required" : a.requires_human_approval === false ? "Not required" : "Unspecified"}</span>,
        <span className="text-[9px] text-slate-500 truncate max-w-24 block">{a.last_action || "—"}</span>,
        <span className="text-[9px] text-slate-500">{a.last_action_at ? formatDistanceToNow(new Date(a.last_action_at), { addSuffix: true }) : "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{a.llm_model || a.model || "—"}</span>,
      ],
    };
  });

  const modelRows = aiInsights.map(m => ({
    _key: m.id,
    _cells: [
      <span className="text-[11px] font-semibold text-white">{m.model_name || m.title || "—"}</span>,
      <span className="text-[9px] text-slate-400">{m.provider || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-500">{m.version || "—"}</span>,
      <span className="text-[9px] capitalize text-slate-400">{m.deployment_type || "—"}</span>,
      <span className="text-[9px] text-slate-500 truncate max-w-24 block">{m.capabilities || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-400">{m.context_window ? `${(m.context_window/1000).toFixed(0)}k` : "—"}</span>,
      <span className="text-[9px] text-slate-500">{m.data_residency || "—"}</span>,
      <SevBadge sev={m.pii_training_risk} />,
      <StatusBadge status={m.status} />,
      <span className="text-[9px] font-mono" style={{ color: (m.risk_score||0)>70?DANGER:(m.risk_score||0)>40?WARN:SUCCESS }}>{m.risk_score ?? "—"}</span>,
    ],
  }));

  const aiScore = null;
  const shadowCount = agents.filter(a => a.is_approved === false).length;
  const violations = agents.filter(a => a.policy_violation === true).length;

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "AI Security" }, { label: "AI-SPM Overview" }]}
      title="AI Security Posture Management" subtitle="AGENT FLEET · LLM INVENTORY · SHADOW AI · PROMPT SECURITY"
      actions={
        <div className="flex items-center gap-2">
          {[["status", agentF, setAgentF, ["all",...statuses]], ["model", modelF, setModelF, ["all",...providers]]].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
        </div>
      }>

      {/* Score + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-1 rounded-2xl p-5 flex flex-col items-center justify-center"
          style={{ background: CARD, border: `1px solid rgba(239,68,68,0.25)` }}>
          <ScoreGauge score={aiScore} />
          <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">AI Security Score · unmeasured</p>
        </div>
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="AI Agents Tracked" value={agents.length} color={CYAN} icon={Bot} />
          <StatCard label="LLM Models" value={aiInsights.filter(i=>i.model_name).length} color="#a78bfa" icon={Brain} />
          <StatCard label="Shadow AI Apps (recorded)" value={shadowCount} color={WARN} icon={AlertTriangle} />
          <StatCard label="Policy Violations (recorded)" value={violations} color={DANGER} icon={Shield} />
        </div>
      </div>

      {/* Agent Fleet */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">AI Agent Fleet</h3>
        <p className="text-[10px] text-slate-500 mb-2">Stored heartbeat records. Tool execution and current capability are unverified.</p>
        <GDSTable
          columns={["Name","Type","Role","Status","Active Tasks","Findings","Actions","Confidence","Escalation","Human Approval","Last Action","Last Active","Model"]}
          rows={agentRows} isLoading={loadA}
          emptyText="No AI agents configured" />
      </div>

      {/* LLM Inventory */}
      {modelRows.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">LLM Model Inventory</h3>
          <GDSTable
            columns={["Model","Provider","Version","Deployment","Capabilities","Context","Data Residency","PII Risk","Status","Risk Score"]}
            rows={modelRows} isLoading={false}
            emptyText="No LLM models tracked" />
        </div>
      )}
    </GDSPageShell>
  );
}