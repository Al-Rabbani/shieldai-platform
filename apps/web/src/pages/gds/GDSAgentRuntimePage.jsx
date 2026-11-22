import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cpu, Plus, Play, RefreshCw, Activity, Clock, CheckCircle, XCircle, Inbox, AlertCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";
import { useNavigate } from "react-router-dom";

const AGENT_TYPE_COLORS = {
  scanner: "#0ea5e9", triager: "#a855f7", hunter: "#f97316",
  responder: "#ef4444", soar: "#ef4444", compliance: "#10b981",
  devsecops: "#06b6d4", supply_chain: "#14b8a6", kernel: "#eab308", governance: "#6366f1",
};

function AgentTypeBadge({ type }) {
  const color = AGENT_TYPE_COLORS[type] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {type?.replace(/_/g, " ")}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    healthy: [LOW, "rgba(16,185,129,0.15)"],
    running: [CYAN, "rgba(6,182,212,0.15)"],
    executing: [CYAN, "rgba(6,182,212,0.15)"],
    queued: [HIGH, "rgba(255,140,0,0.15)"],
    pending: [HIGH, "rgba(255,140,0,0.15)"],
    failed: [DANGER, "rgba(239,68,68,0.15)"],
    completed: [LOW, "rgba(16,185,129,0.15)"],
  };
  const [color, bg] = map[status?.toLowerCase()] || [MUTED, "rgba(100,116,139,0.15)"];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
      style={{ color, background: bg }}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

function SourceBadge({ source }) {
  const color = source === "catalog" ? MUTED : LOW;
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {source}
    </span>
  );
}

function RegisterAgentModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    agent_id: "", name: "", agent_type: "scanner", description: "",
    runtime_class: "", priority: "medium", capabilities: "", tools_allowed: "",
    max_concurrency: 5, timeout_seconds: 300,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 8, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none",
  };

  const handleSubmit = async () => {
    if (!form.agent_id || !form.name) { setError("Agent ID and name required"); return; }
    setLoading(true); setError("");
    try {
      await base44.functions.invoke("gdsAgentRuntime", { action: "register", ...form });
      onSuccess();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
          <h2 className="text-sm font-black text-white">Register New Agent</h2>
          <button onClick={onClose} style={{ color: MUTED }} className="hover:text-white"><XCircle className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-xs" style={{ color: DANGER }}>{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Agent ID *</label>
              <input value={form.agent_id} onChange={e => setForm({ ...form, agent_id: e.target.value })} style={inputStyle} placeholder="unique_agent_id" />
            </div>
            <div>
              <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Display name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Agent Type</label>
              <select value={form.agent_type} onChange={e => setForm({ ...form, agent_type: e.target.value })} style={inputStyle}>
                {Object.keys(AGENT_TYPE_COLORS).map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
                {["critical", "high", "medium", "low"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Runtime Class</label>
              <input value={form.runtime_class} onChange={e => setForm({ ...form, runtime_class: e.target.value })} style={inputStyle} placeholder="e.g. ScannerAgent" />
            </div>
            <div>
              <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Max Concurrency</label>
              <input type="number" value={form.max_concurrency} onChange={e => setForm({ ...form, max_concurrency: parseInt(e.target.value) || 5 })} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Capabilities (comma-separated)</label>
            <input value={form.capabilities} onChange={e => setForm({ ...form, capabilities: e.target.value })} style={inputStyle} placeholder="cap1, cap2, cap3" />
          </div>
          <div>
            <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Tools Allowed (comma-separated)</label>
            <input value={form.tools_allowed} onChange={e => setForm({ ...form, tools_allowed: e.target.value })} style={inputStyle} placeholder="aws, gcp, llm" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: BORDER }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {loading ? "Registering…" : "Register Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GDSAgentRuntimePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showRegister, setShowRegister] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["agent-runtime-status"],
    queryFn: () => base44.functions.invoke("gdsAgentRuntime", { action: "status" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const startMutation = useMutation({
    mutationFn: (agent_id) => base44.functions.invoke("gdsAgentRuntime", { action: "start", agent_id }),
    onSuccess: () => refetch(),
  });

  const d = data || {};
  const agents = d.agents || [];

  return (
    <div style={{ ...PAGE_BG }}>
      {showRegister && <RegisterAgentModal onClose={() => setShowRegister(false)} onSuccess={() => { setShowRegister(false); refetch(); }} />}

      <Breadcrumb items={[{ label: "Agent Runtime" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Cpu className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Agent Runtime Platform</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded"
            style={{ color: "#a855f7", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
            EDP-003 v1.0
          </span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: MUTED }}>EXECUTION UNVERIFIED</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" />
            Register Agent
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Agents", value: d.total_agents ?? 0, color: CYAN, icon: Cpu },
          { label: "Running Sessions", value: d.running_sessions ?? 0, color: (d.running_sessions ?? 0) > 0 ? HIGH : MUTED, icon: Activity },
          { label: "Queued Jobs", value: d.queued_jobs ?? 0, color: "#0ea5e9", icon: Inbox },
          { label: "Recent Heartbeats", value: d.recent_heartbeat_count ?? 0, color: LOW, icon: CheckCircle },
          { label: "Failed Sessions", value: d.failed_sessions ?? 0, color: (d.failed_sessions ?? 0) > 0 ? DANGER : MUTED, icon: XCircle },
          { label: "Catalog Roles", value: d.catalog_count ?? 0, color: "#a855f7", icon: Clock },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>{label}</p>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Agent Fleet Table */}
      <Card className="mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Agent Fleet</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{agents.length} agents</span>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
          </div>
        ) : agents.length === 0 ? (
          <div className="p-8 text-center" style={{ color: MUTED }}>No agents registered</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Agent ID", "Name", "Type", "Status", "Health", "Source", "Capabilities"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                  <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a, i) => (
                  <tr key={a.agent_id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: TEXT }}>{a.agent_id}</td>
                    <td className="py-2 px-3 font-semibold text-white">{a.name}</td>
                    <td className="py-2 px-3"><AgentTypeBadge type={a.agent_type} /></td>
                    <td className="py-2 px-3"><StatusBadge status={a.status} /></td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-bold" style={{ color: MUTED }}>{a.health_score == null ? 'Unmeasured' : `${a.health_score}%`}</span>
                    </td>
                    <td className="py-2 px-3"><SourceBadge source={a.source} /></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{(a.capabilities || []).length} caps</td>
                    <td className="py-2 px-3">
                      <button onClick={() => startMutation.mutate(a.agent_id)} disabled={startMutation.isPending}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:opacity-80 disabled:opacity-50"
                        style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                        <Play className="w-3 h-3" /> Start
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent Sessions */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Recent Sessions</h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
          </div>
        ) : (d.recent_sessions || []).length === 0 ? (
          <div className="p-8 text-center" style={{ color: MUTED }}>No recent sessions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Session ID", "Agent", "Status", "Intent", "Stage", "Duration", "Time"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(d.recent_sessions || []).slice(0, 10).map((s, i) => (
                  <tr key={s.session_id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: TEXT }}>{(s.session_id || "").slice(0, 20)}…</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: MUTED }}>{(s.agent_id || "").slice(0, 16)}</td>
                    <td className="py-2 px-3"><StatusBadge status={s.status} /></td>
                    <td className="py-2 px-3 max-w-[160px] truncate" style={{ color: TEXT }}>{s.intent || "—"}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: CYAN }}>Stage {s.pipeline_stage || 1}</td>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: CYAN }}>{s.duration_ms || 0}ms</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(s.started_at || s.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}