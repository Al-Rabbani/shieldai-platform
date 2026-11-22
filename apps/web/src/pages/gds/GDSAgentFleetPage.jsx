import React, { useState, useEffect, useCallback } from "react";
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

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function StatusDot({ status }) {
  const colors = { online: "bg-emerald-500 animate-pulse", working: "bg-amber-400 animate-pulse", idle: "bg-muted-foreground", error: "bg-destructive" };
  return <span className={`w-2.5 h-2.5 rounded-full inline-block ${colors[status] || "bg-muted-foreground"}`} />;
}

export default function GDSAgentFleetPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({ online: 0, working: 0, idle: 0, total: 0 });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await call({ action: "get_agents" });
      setAgents(d.agents || []); setStats({ online: d.online || 0, working: d.working || 0, idle: d.idle || 0, total: d.total || 0 }); setErr(false);
    } catch { setErr(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tiers = ["all", "sovereign", "command", "specialist", "restricted"];
  const filtered = filter === "all" ? agents : agents.filter(a => a.tier === filter);

  return (
    <div className="p-6 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">AI Agent Role Catalog — {stats.total} Declared</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Declared roles. Live worker and tool execution have not been verified.</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs border rounded-full px-3 py-1 text-muted-foreground">{stats.online} Verified online</span>
          <span className="text-xs border rounded-full px-3 py-1 text-amber-400 border-amber-400/30">⚡ {stats.working} Working</span>
          <span className="text-xs border rounded-full px-3 py-1 text-muted-foreground">○ {stats.idle} Idle</span>
          <span className="text-xs border rounded-full px-3 py-1">{stats.total} Total</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-5">
        {tiers.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`text-xs px-4 py-1.5 rounded-lg border capitalize transition ${filter === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
            {t === "all" ? `All (${agents.length})` : `${t} (${agents.filter(a => a.tier === t).length})`}
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-destructive mb-4">⚠ Could not load agents — retrying...</p>}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <div key={agent.id} className="rounded-xl border bg-card p-5 flex flex-col">
              {/* Top */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] rounded px-1.5 py-0.5 ${TIER_COLOR[agent.tier] || "bg-muted text-muted-foreground"}`}>{agent.tier}</span>
                <div className="flex items-center gap-1.5">
                  <StatusDot status={agent.status} />
                  <span className={`text-[11px] ${agent.status === "online" ? "text-emerald-500" : agent.status === "working" ? "text-amber-400" : "text-muted-foreground"}`}>
                    {agent.status}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold mt-1 leading-tight">{agent.name}</h3>
              <p className="text-sm text-muted-foreground capitalize mt-0.5">{agent.domain}</p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed flex-1">{agent.description}</p>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1 mt-3">
                {(agent.capabilities || []).map((cap) => (
                  <span key={cap} className="text-[10px] bg-muted text-muted-foreground rounded px-2 py-0.5 capitalize">
                    {cap.replace(/_/g, " ")}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                  <p className="text-[11px] text-muted-foreground">Health</p>
                  <p className="text-sm font-semibold text-muted-foreground">{agent.health_score == null ? 'Unmeasured' : `${agent.health_score}%`}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Tasks</p>
                  <p className="text-sm font-semibold">{agent.executions_total == null ? 'Unverified' : agent.executions_total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Success</p>
                  <p className="text-sm font-semibold text-muted-foreground">{agent.success_rate == null ? 'Unmeasured' : `${agent.success_rate}%`}</p>
                </div>
              </div>

              <button
                onClick={() => navigate("/agent-command-center")}
                className="w-full border rounded-lg py-1.5 text-xs hover:bg-accent mt-3 transition">
                Assign Task →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}