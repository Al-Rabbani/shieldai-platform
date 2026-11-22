import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const call = (payload) =>
  base44.functions.invoke("gdsLiveAgentEngine", payload).then((r) => r.data);

const TIER_COLOR = {
  sovereign: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40",
  command:   "bg-blue-500/20 text-blue-400 border border-blue-500/40",
  specialist:"bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
  restricted:"bg-red-500/20 text-red-400 border border-red-500/40",
};

const GRADE_COLOR = { A: "bg-emerald-500/20 text-emerald-400", B: "bg-teal-500/20 text-teal-400", C: "bg-amber-500/20 text-amber-400", D: "bg-orange-500/20 text-orange-400", F: "bg-destructive/20 text-destructive" };

const MISSIONS = [
  { label: "🔍 Full Threat Hunt",      name: "Full Threat Hunt",      agents: ["gds-threat-hunter","gds-soc-director","gds-dark-web-monitor"] },
  { label: "☁️ Cloud Security Sweep",  name: "Cloud Security Sweep",  agents: ["gds-cloud-director","gds-ciem-director","gds-vuln-director"] },
  { label: "📋 Compliance Audit",      name: "Compliance Audit",      agents: ["gds-compliance-director","gds-risk-director","gds-exec-advisor"] },
  { label: "🚨 Incident Response",     name: "Incident Response",     agents: ["gds-incident-commander","gds-soc-director","gds-ir-director"] },
];

const FEED_TYPE_ICON = { agent_session: "⚡", agent_action: "🔧", approval_required: "⏳" };
const FEED_STATUS_COLOR = { completed: "text-emerald-500", running: "text-amber-500 animate-pulse", pending: "text-orange-400", failed: "text-destructive" };

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function StatusDot({ status }) {
  if (status === "online")  return <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse mr-1" />;
  if (status === "working") return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse mr-1" />;
  if (status === "idle")    return <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block mr-1" />;
  return <span className="w-2 h-2 rounded-full bg-destructive inline-block mr-1" />;
}

function StatusLabel({ status }) {
  const map = { online: "text-emerald-500", working: "text-amber-400", idle: "text-muted-foreground", error: "text-destructive" };
  const labels = { online: "● Online", working: "⚡ Working", idle: "○ Idle", error: "✕ Error" };
  return <span className={`text-[11px] ${map[status] || "text-muted-foreground"}`}>{labels[status] || status}</span>;
}

// ── Platform Intel Card ───────────────────────────────────────────────────────
function PlatformIntelCard() {
  const [intel, setIntel] = useState(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await call({ action: "platform_intel" });
      setIntel(d); setErr(false);
    } catch { setErr(true); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  if (err) return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-destructive">⚠ Could not load — retrying...</p></div>;

  if (!intel) return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-20" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" />
    </div>
  );

  const { risk = {}, security = {}, compliance = {} } = intel;
  const scoreColor = risk.score >= 80 ? "text-emerald-400" : risk.score >= 60 ? "text-amber-400" : "text-destructive";

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Global Risk</p>
      <div className="flex items-end gap-2 mb-1">
        <span className={`text-3xl font-bold ${scoreColor}`}>{risk.score ?? "—"}/100</span>
        <span className={`text-[11px] rounded px-1.5 py-0.5 ${GRADE_COLOR[risk.grade] || "bg-muted text-muted-foreground"}`}>
          Grade {risk.grade ?? "?"}
        </span>
      </div>
      <p className={`text-[12px] mb-3 ${risk.trend === "improving" ? "text-emerald-400" : risk.trend === "degrading" ? "text-destructive" : "text-muted-foreground"}`}>
        {risk.trend === "improving" ? "↗ Improving" : risk.trend === "degrading" ? "↘ Degrading" : "→ Stable"}
      </p>
      <div className="space-y-1.5 text-[12px]">
        <div className="flex justify-between"><span className="text-muted-foreground">☁️ Cloud Misconfigs</span><span>{security.cloud_findings ?? 0} ({security.cloud_critical ?? 0} critical)</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">🔎 Vulnerabilities</span><span>{security.vuln_total ?? 0} ({security.vuln_critical ?? 0} critical)</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">🚨 Active Incidents</span><span>{security.active_incidents ?? 0}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">📋 Compliance</span><span>{compliance.avg_score ?? 0}% avg</span></div>
      </div>
    </div>
  );
}

// ── Mission Launcher ──────────────────────────────────────────────────────────
function MissionLauncher({ onFeedRefresh }) {
  const [loading, setLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const launch = async (m) => {
    setLoading(m.name);
    try {
      const r = await call({ action: "launch_mission", mission: m.name, agent_ids: m.agents });
      setToast(`Mission complete — ${r.combined_status}`);
      setTimeout(() => setToast(null), 4000);
      onFeedRefresh?.();
    } catch (e) {
      setToast("Mission failed — " + e.message);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[11px] uppercase text-muted-foreground mb-2">Launch Mission</p>
      {MISSIONS.map((m) => (
        <button key={m.name} onClick={() => launch(m)} disabled={!!loading}
          className="w-full text-left text-xs border rounded-lg px-3 py-2 hover:bg-accent mb-1.5 flex items-center gap-2 transition disabled:opacity-50">
          {loading === m.name
            ? <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60 20" /></svg> Launching...</>
            : m.label}
        </button>
      ))}
      {toast && (
        <div className="mt-2 text-[11px] rounded-lg px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          ✅ {toast}
        </div>
      )}
    </div>
  );
}

// ── Agent Card ────────────────────────────────────────────────────────────────
function AgentCard({ agent, selected, onSelect }) {
  return (
    <div onClick={() => onSelect(agent)}
      className={`rounded-xl border bg-card p-3 cursor-pointer transition-all hover:border-primary/50 ${selected ? "border-primary/70 bg-primary/5" : ""}`}>
      <div className="flex items-start justify-between mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[10px] rounded px-1.5 py-0.5 shrink-0 ${TIER_COLOR[agent.tier] || "bg-muted text-muted-foreground"}`}>{agent.tier}</span>
          <span className="font-semibold text-sm truncate">{agent.name}</span>
        </div>
        <StatusLabel status={agent.status} />
      </div>
      <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{agent.domain}</p>
      {agent.status === "working" && agent.current_task && (
        <div className="mt-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded px-2 py-0.5">
          ▶ {agent.current_task.slice(0, 40)}...
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">Health {agent.health_score}%</span>
        <span className="text-[11px] text-primary hover:underline">Assign Task →</span>
      </div>
    </div>
  );
}

// ── Task Assignment Panel ─────────────────────────────────────────────────────
function TaskPanel({ agent, onTaskComplete }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => { setSelectedTask(null); setCustomInput(""); setResult(null); setErr(null); }, [agent?.id]);

  const execute = async () => {
    if (!selectedTask || executing) return;
    setExecuting(true); setResult(null); setErr(null);
    try {
      const r = await call({ action: "assign_task", agent_id: agent.id, task: selectedTask, input: customInput || selectedTask, priority: "high" });
      setResult(r);
    } catch (e) {
      setErr(e.message);
    } finally {
      setExecuting(false);
    }
  };

  if (!agent) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center justify-center h-48">
        <p className="text-sm text-muted-foreground">← Select an agent to assign a task</p>
      </div>
    );
  }

  const res = result?.result;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] rounded px-1.5 py-0.5 ${TIER_COLOR[agent.tier]}`}>{agent.tier}</span>
            <span className="font-semibold text-sm truncate">{agent.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{agent.description}</p>
        </div>
      </div>

      <p className="text-[11px] uppercase text-muted-foreground mt-3 mb-2">Assign Task</p>
      <div className="grid grid-cols-1 gap-1.5">
        {(agent.capabilities || []).map((cap) => (
          <button key={cap} onClick={() => setSelectedTask(cap)}
            className={`text-xs border rounded-lg px-3 py-2 text-left transition capitalize ${selectedTask === cap ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary hover:text-primary-foreground"}`}>
            {cap.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <textarea value={customInput} onChange={(e) => setCustomInput(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-xs mt-2 resize-none h-16 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
        placeholder="Optional context for this task..." />

      {executing ? (
        <div className="w-full rounded-lg py-2 mt-2 flex items-center justify-center gap-2 border">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60 20" /></svg>
          <span className="text-amber-500 text-sm">Agent working...</span>
        </div>
      ) : (
        <button onClick={execute} disabled={!selectedTask}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold mt-2 hover:bg-primary/90 disabled:opacity-40 transition">
          ▶ Execute Task
        </button>
      )}

      {err && <p className="text-[11px] text-destructive mt-2">⚠ {err}</p>}

      {res && (
        <div className={`rounded-lg border p-3 mt-3 ${res.status === "CRITICAL" ? "border-destructive/40 bg-destructive/5" : "bg-accent"}`}>
          <p className="text-sm font-semibold text-emerald-600">✅ Task Complete</p>
          <p className="text-[11px] text-muted-foreground">{agent.name} · {result.duration_ms}ms</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{res.summary}</p>
          {(res.top_findings || res.frameworks || []).slice(0, 3).map((f, i) => (
            <p key={i} className="text-[11px] text-muted-foreground mt-0.5">• {f.title} [{f.service}]</p>
          ))}
          {res.status === "CRITICAL" && (
            <div className="mt-2 rounded px-2 py-1 bg-destructive/10 border border-destructive/30 text-[11px] text-destructive font-semibold">
              🔴 CRITICAL — Immediate action required
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Live Feed ─────────────────────────────────────────────────────────────────
function LiveFeed({ refreshSignal }) {
  const [feed, setFeed] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await call({ action: "live_feed" });
      setFeed(d.feed || []); setPendingApprovals(d.pending_approvals || 0); setErr(false);
    } catch { setErr(true); }
  }, []);

  useEffect(() => { load(); }, [refreshSignal, load]);
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  return (
    <div className="rounded-xl border bg-card p-4 flex-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase text-muted-foreground">Live Command Feed</p>
        {pendingApprovals > 0 && <span className="text-[11px] bg-destructive/10 text-destructive border border-destructive/30 rounded-full px-2 py-0.5">⏳ {pendingApprovals} pending</span>}
      </div>
      {err && <p className="text-xs text-destructive">⚠ Could not load — retrying...</p>}
      <div className="flex-1 overflow-y-auto space-y-0 divide-y divide-border/50">
        {feed.length === 0 && !err && (
          <div className="space-y-2 pt-1">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        )}
        {feed.map((item) => (
          <div key={item.id} className="flex items-start gap-2 py-2 text-[11px]">
            <span className="flex-shrink-0 mt-0.5">{FEED_TYPE_ICON[item.type] || "⚡"}</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium">{item.agent_name}</span>
              <span className="text-muted-foreground"> · {item.action?.slice(0, 50)}</span>
            </div>
            <span className={`flex-shrink-0 ${FEED_STATUS_COLOR[item.status] || "text-muted-foreground"}`}>
              {item.status}
            </span>
            <span className="flex-shrink-0 text-muted-foreground ml-1">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GDSAgentCommandCenterPage() {
  const [agents, setAgents] = useState([]);
  const [agentStats, setAgentStats] = useState({ online: 0, working: 0, idle: 0 });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentErr, setAgentErr] = useState(false);
  const [approvalCount, setApprovalCount] = useState(0);
  const [feedRefresh, setFeedRefresh] = useState(0);

  const loadAgents = useCallback(async () => {
    try {
      const d = await call({ action: "get_agents" });
      setAgents(d.agents || []); setAgentStats({ online: d.online || 0, working: d.working || 0, idle: d.idle || 0 }); setAgentErr(false);
    } catch { setAgentErr(true); }
  }, []);

  const loadApprovals = useCallback(async () => {
    try {
      const d = await call({ action: "live_feed" });
      setApprovalCount(d.pending_approvals || 0);
    } catch {}
  }, []);

  useEffect(() => { loadAgents(); loadApprovals(); }, []);
  useEffect(() => { const t = setInterval(loadAgents, 5000); return () => clearInterval(t); }, [loadAgents]);
  useEffect(() => { const t = setInterval(loadApprovals, 10000); return () => clearInterval(t); }, [loadApprovals]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="h-16 border-b bg-card px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base flex-shrink-0">⚡</div>
          <span className="text-xl font-bold">GDS Agentic Command Center</span>
          <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5 animate-pulse">● LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs border rounded-full px-3 py-1 text-emerald-500 border-emerald-500/30">● {agentStats.online} Online</span>
          <span className="text-xs border rounded-full px-3 py-1 text-amber-400 border-amber-400/30">⚡ {agentStats.working} Working</span>
          <span className="text-xs border rounded-full px-3 py-1 text-muted-foreground">○ {agentStats.idle} Idle</span>
          {approvalCount > 0 && <span className="text-xs border rounded-full px-3 py-1 text-destructive border-destructive/30">⏳ {approvalCount} Approvals</span>}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-4rem)] overflow-hidden">
        {/* LEFT */}
        <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
          <PlatformIntelCard />
          <MissionLauncher onFeedRefresh={() => setFeedRefresh(r => r + 1)} />
        </div>

        {/* CENTER */}
        <div className="col-span-6 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <p className="text-sm font-bold mb-3">AI AGENTS — LIVE STATUS</p>
            {agentErr && <p className="text-xs text-destructive mb-2">⚠ Could not load agents — retrying...</p>}
            {agents.length === 0 && !agentErr ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} selected={selectedAgent?.id === agent.id} onSelect={setSelectedAgent} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-span-3 flex flex-col gap-3 overflow-y-auto">
          <TaskPanel agent={selectedAgent} />
          <LiveFeed refreshSignal={feedRefresh} />
        </div>
      </div>
    </div>
  );
}