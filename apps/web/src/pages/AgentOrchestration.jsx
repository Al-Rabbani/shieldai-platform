import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { observeAgent } from "@/lib/agentObservation";
import { base44 } from "@/api/base44Client";
import {
  Plus, Activity, Cpu, Zap, CheckCircle2, XCircle, AlertTriangle,
  Clock, RefreshCw, Terminal, MoreVertical, Play, Square, Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS = {
  online:   { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", dot: "#eab308", label: "RECENT HEARTBEAT ONLY" },
  stale:    { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", dot: "#eab308", label: "STALE" },
  degraded: { color: "#eab308", bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.3)",   dot: "#eab308", label: "DEGRADED" },
  starting: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)",  dot: "#3b82f6", label: "STARTING" },
  stopped:  { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   dot: "#ef4444", label: "STOPPED"  },
  offline:  { color: "#475569", bg: "rgba(71,85,105,0.1)",   border: "rgba(71,85,105,0.3)",   dot: "#475569", label: "OFFLINE"  },
};

const TYPE_ICON  = { orchestrator: "🧠", executor: "⚡", monitor: "👁️", auditor: "🔍", custom: "🔧" };
const TYPE_COLOR = { orchestrator: "#8b5cf6", executor: "#3b82f6", monitor: "#06b6d4", auditor: "#10b981", custom: "#f97316" };

// This page displays registry observations. Only the runtime may emit a heartbeat or task receipt.

function HealthRing({ score, size = 44 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const dash = ((score || 0) / 100) * c;
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#eab308" : "#ef4444";
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(30,58,95,0.4)" strokeWidth="4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize="10" fill={color} fontFamily="JetBrains Mono" fontWeight="bold">
        {score ?? "?"}
      </text>
    </svg>
  );
}

function AgentCard({ agent, selected, onSelect }) {
  const st = STATUS[agent.status] || STATUS.offline;
  const tc = TYPE_COLOR[agent.type] || "#475569";
  return (
    <div
      onClick={() => onSelect(agent)}
      className="rounded-xl p-4 cursor-pointer card-hover relative overflow-hidden"
      style={{
        background: selected ? "rgba(59,130,246,0.08)" : "#0a0f1e",
        border: `1px solid ${selected ? "rgba(59,130,246,0.4)" : "rgba(30,58,95,0.4)"}`,
        borderLeft: `3px solid ${st.color}`,
      }}>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ background: `${tc}15`, border: `1px solid ${tc}30` }}>
          {TYPE_ICON[agent.type] || "🤖"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate font-mono">{agent.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] px-1.5 py-0.5 rounded capitalize font-semibold"
              style={{ color: tc, background: `${tc}15` }}>{agent.type}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
              {st.label}
            </span>
          </div>
        </div>
        <HealthRing score={agent.health_score} />
      </div>

      <p className="text-[11px] text-slate-500 mb-3 line-clamp-2 leading-relaxed">{agent.description || "No description provided."}</p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Tasks", value: agent.tasks_completed ?? 0, color: "#3b82f6" },
          { label: "Sessions", value: agent.sessions_count ?? 0, color: "#8b5cf6" },
          { label: "Version", value: agent.version || "—", color: "#64748b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg p-2 text-center" style={{ background: "#030712" }}>
            <p className="text-xs font-bold font-mono" style={{ color }}>{value}</p>
            <p className="text-[9px] text-slate-600 uppercase">{label}</p>
          </div>
        ))}
      </div>

      {agent.capabilities?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 3).map(c => (
            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ color: tc, background: `${tc}10`, border: `1px solid ${tc}20` }}>{c}</span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded text-slate-600" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.3)" }}>+{agent.capabilities.length - 3}</span>
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-500 mt-3 pt-3" style={{ borderTop: "1px solid rgba(30,58,95,0.4)" }}>Last heartbeat: {agent.last_heartbeat || "None"} · Tool execution unverified</p>
    </div>
  );
}

function LiveTerminal() {
  // No verified runtime log stream is connected.

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: "#020408", border: "1px solid rgba(30,58,95,0.4)", height: 280 }}>
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0" style={{ background: "#0a0f1e", borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[11px] font-mono font-semibold text-emerald-400">RUNTIME EVIDENCE</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] font-mono text-slate-400">UNVERIFIED</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 font-mono" style={{ scrollbarWidth: "none" }}>
        <p className="text-xs text-slate-400">No authenticated runtime log or tool receipts are connected. Registry entries alone do not prove execution.</p>
      </div>
    </div>
  );
}

export default function AgentOrchestration() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [form, setForm] = useState({ name: "", type: "executor", description: "", version: "1.0.0", endpoint: "", capabilities: "" });

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => base44.entities.Agent.list("-updated_date", 100),
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Agent.create({
      ...data,
      capabilities: data.capabilities ? data.capabilities.split(",").map(s => s.trim()).filter(Boolean) : [],
      status: "unknown", health_score: null, sessions_count: 0, tasks_completed: 0,
    }),
    onSuccess: () => {
      qc.invalidateQueries(["agents"]);
      setShowCreate(false);
      setForm({ name: "", type: "executor", description: "", version: "1.0.0", endpoint: "", capabilities: "" });
    },
  });

  const observedAgents = agents.map(a => observeAgent(a));

  const filtered = observedAgents.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    return true;
  });

  const stats = {
    total: agents.length,
    online: observedAgents.filter(a => a.status === "online").length,
    degraded: observedAgents.filter(a => a.status === "degraded").length,
    stale: observedAgents.filter(a => a.status === "stale").length,
  };

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-black text-white font-mono tracking-tight">AGENT ORCHESTRATION</h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: "rgba(71,85,105,0.1)", border: "1px solid rgba(71,85,105,0.3)" }}>
              <span className="text-[10px] font-mono font-bold text-slate-400">REGISTRY ONLY</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Stored agent registry and heartbeat observations · Tool execution unverified</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => qc.invalidateQueries(["agents"])}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-all"
            style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-400 transition-all hover:opacity-90"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)" }}>
            <Plus className="w-4 h-4" /> Register Agent
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "TOTAL AGENTS", val: stats.total, color: "#e2e8f0" },
          { label: "RECENT HEARTBEATS", val: stats.online, color: "#eab308" },
          { label: "DEGRADED", val: stats.degraded, color: "#eab308" },
          { label: "STALE", val: stats.stale, color: "#eab308" },
          { label: "CAPABILITY TESTED", val: "Unverified", color: "#64748b" },
        ].map(({ label, val, color, pulse }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />}
              <p className="text-[9px] font-mono font-semibold tracking-widest text-slate-500">{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "All", val: "all", key: "status" },
          { label: "Recent heartbeat", val: "online", key: "status" },
          { label: "🟡 Degraded", val: "degraded", key: "status" },
          { label: "⚫ Offline", val: "offline", key: "status" },
          { label: "🔴 Stopped", val: "stopped", key: "status" },
        ].map(({ label, val }) => (
          <button key={val} onClick={() => setFilterStatus(val)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all font-mono"
            style={{
              background: filterStatus === val ? "rgba(59,130,246,0.15)" : "#0a0f1e",
              color: filterStatus === val ? "#60a5fa" : "#64748b",
              border: `1px solid ${filterStatus === val ? "rgba(59,130,246,0.3)" : "rgba(30,58,95,0.4)"}`,
            }}>
            {label}
          </button>
        ))}
        <div className="h-5 w-px bg-slate-800 self-center mx-1" />
        {["all", "orchestrator", "executor", "monitor", "auditor"].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all capitalize font-mono"
            style={{
              background: filterType === t ? "rgba(139,92,246,0.12)" : "#0a0f1e",
              color: filterType === t ? "#a78bfa" : "#64748b",
              border: `1px solid ${filterType === t ? "rgba(139,92,246,0.25)" : "rgba(30,58,95,0.4)"}`,
            }}>
            {t === "all" ? "All Types" : t}
          </button>
        ))}
      </div>

      {/* Main layout: agent grid + live terminal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array(6).fill(0).map((_, i) => <div key={i} className="rounded-xl h-52 animate-pulse" style={{ background: "#0a0f1e" }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl p-20 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
              <Cpu className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-600">No agents match this filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(a => (
                <AgentCard key={a.id} agent={a} selected={selected?.id === a.id}
                  onSelect={setSelected} />
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <LiveTerminal />

          {/* Selected agent detail */}
          {selected && (
            <div className="rounded-xl p-4 space-y-3 animate-slide-in-up"
              style={{ background: "#0a0f1e", border: "1px solid rgba(59,130,246,0.3)" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white font-mono">AGENT DETAIL</p>
                <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white"><XCircle className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-2xl">{TYPE_ICON[selected.type] || "🤖"}</div>
                <div>
                  <p className="text-sm font-bold text-white">{selected.name}</p>
                  <p className="text-[11px] text-slate-500 capitalize">{selected.type} · v{selected.version || "?"}</p>
                </div>
                <HealthRing score={selected.health_score} size={40} />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{selected.description}</p>
              {selected.endpoint && (
                <p className="text-[10px] font-mono text-blue-400 truncate px-2 py-1.5 rounded" style={{ background: "#030712", border: "1px solid rgba(30,58,95,0.4)" }}>{selected.endpoint}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Last Heartbeat", value: selected.last_heartbeat ? new Date(selected.last_heartbeat).toLocaleString() : "—" },
                  { label: "Sessions", value: "Unverified" },
                  { label: "Tasks Done", value: "Unverified" },
                  { label: "Status", value: observeAgent(selected).status },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg p-2.5" style={{ background: "#030712", border: "1px solid rgba(30,58,95,0.3)" }}>
                    <p className="text-[9px] text-slate-600 uppercase font-mono">{label}</p>
                    <p className="text-xs font-semibold text-white mt-0.5 capitalize font-mono">{value}</p>
                  </div>
                ))}
              </div>
              {selected.capabilities?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selected.capabilities.map(c => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded font-mono text-blue-400" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Type breakdown */}
          <div className="rounded-xl p-4" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
            <p className="text-[10px] font-mono font-semibold text-slate-500 uppercase mb-3">AGENT TYPE BREAKDOWN</p>
            <div className="space-y-2">
              {["orchestrator", "executor", "monitor", "auditor", "custom"].map(type => {
                const count = agents.filter(a => a.type === type).length;
                const pct = agents.length ? Math.round((count / agents.length) * 100) : 0;
                const color = TYPE_COLOR[type];
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-[10px] w-20 text-slate-500 capitalize font-mono flex-shrink-0">{type}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(30,58,95,0.4)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[10px] font-mono w-6 text-right" style={{ color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent style={{ background: "#0f172a", border: "1px solid rgba(30,58,95,0.5)" }}>
          <DialogHeader><DialogTitle className="text-white font-mono">Register New Agent</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Agent name (e.g. VulnScanAgent-v2)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="text-white font-mono" style={{ background: "#030712", borderColor: "rgba(30,58,95,0.5)" }} />
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger style={{ background: "#030712", borderColor: "rgba(30,58,95,0.5)" }} className="text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#0f172a", borderColor: "rgba(30,58,95,0.5)" }}>
                {["orchestrator", "executor", "monitor", "auditor", "custom"].map(t => (
                  <SelectItem key={t} value={t} className="capitalize text-white">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Version (e.g. 1.0.0)" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })}
              className="text-white font-mono" style={{ background: "#030712", borderColor: "rgba(30,58,95,0.5)" }} />
            <Input placeholder="Endpoint URL (optional)" value={form.endpoint} onChange={e => setForm({ ...form, endpoint: e.target.value })}
              className="text-white font-mono" style={{ background: "#030712", borderColor: "rgba(30,58,95,0.5)" }} />
            <Input placeholder="Capabilities (comma-separated)" value={form.capabilities} onChange={e => setForm({ ...form, capabilities: e.target.value })}
              className="text-white font-mono" style={{ background: "#030712", borderColor: "rgba(30,58,95,0.5)" }} />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="text-white" style={{ background: "#030712", borderColor: "rgba(30,58,95,0.5)" }} />
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white"
                style={{ background: "#1e293b", border: "1px solid rgba(30,58,95,0.5)" }}>Cancel</button>
              <button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#3b82f6" }}>
                {createMutation.isPending ? "Registering..." : "Register Agent"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}