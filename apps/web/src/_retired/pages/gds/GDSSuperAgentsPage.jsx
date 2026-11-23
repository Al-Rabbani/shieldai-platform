import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Cpu, Plus, Activity, Zap, Users, DollarSign, CheckCircle, XCircle, Pause, Play, Handshake, X, Search, GitBranch, Bell, Settings, CheckSquare, RefreshCw, Shield, FileText } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG
} from "@/components/gds/GDSOSShared";
import GDSPageShell from "@/components/gds/GDSPageShell";
import AgentDependencyFlowChart from "@/components/gds/AgentDependencyFlowChart";
import SuperAgentBudgetAlerts from "@/components/gds/SuperAgentBudgetAlerts";
import SuperAgentHealthMonitor from "@/components/gds/SuperAgentHealthMonitor";
import SuperAgentRBAC from "@/components/gds/SuperAgentRBAC";
import SuperAgentAuditLog from "@/components/gds/SuperAgentAuditLog";

const AGENT_CLASS_COLORS = {
  SOC: DANGER,
  ThreatHunter: HIGH,
  IncidentResponse: DANGER,
  CloudSecurity: "#60a5fa",
  IdentitySecurity: "#a855f7",
  Compliance: LOW,
  ExecutiveIntelligence: "#fbbf24",
  DevSecOps: CYAN,
  RiskIntelligence: "#14b8a6",
  DigitalTransformation: "#6366f1",
};

const PRIORITY_COLORS = { P0: DANGER, P1: HIGH, P2: "#60a5fa", P3: MUTED };

function AgentClassBadge({ cls }) {
  const color = AGENT_CLASS_COLORS[cls] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {cls || "—"}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const color = PRIORITY_COLORS[priority] || MUTED;
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {priority || "—"}
    </span>
  );
}

function HealthBar({ score }) {
  const color = score >= 80 ? LOW : score >= 50 ? MEDIUM : DANGER;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color, boxShadow: `0 0 4px ${color}55` }} />
      </div>
      <span className="text-[10px] font-mono font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function NewAgentModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "", super_agent_id: "", agent_class: "SOC", mission: "",
    capabilities: "", priority: "P2", autonomy_level: "semi_autonomous"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none"
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.super_agent_id.trim()) {
      setError("Name and Super Agent ID are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await base44.functions.invoke("gdsSuperAgentFramework", {
        action: "create",
        ...formData,
        capabilities: formData.capabilities.split(",").map(c => c.trim()).filter(Boolean)
      });
      onSuccess && onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Create Super Agent</h2>
          <button onClick={onClose} className="hover:text-white transition-colors" style={{ color: MUTED }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Display Name</label>
            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sentinel Prime" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Super Agent ID</label>
            <input value={formData.super_agent_id} onChange={e => setFormData({ ...formData, super_agent_id: e.target.value })}
              placeholder="e.g., SENTINEL_PRIME" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Agent Class</label>
              <select value={formData.agent_class} onChange={e => setFormData({ ...formData, agent_class: e.target.value })} style={inputStyle}>
                {Object.keys(AGENT_CLASS_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Priority</label>
              <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} style={inputStyle}>
                {["P0", "P1", "P2", "P3"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Mission</label>
            <textarea value={formData.mission} onChange={e => setFormData({ ...formData, mission: e.target.value })}
              rows={3} placeholder="Describe the agent's primary mission..."
              style={{ ...inputStyle, resize: "none" }} />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Capabilities (comma-separated)</label>
            <input value={formData.capabilities} onChange={e => setFormData({ ...formData, capabilities: e.target.value })}
              placeholder="threat_detection, incident_response, ..." style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Autonomy Level</label>
            <select value={formData.autonomy_level} onChange={e => setFormData({ ...formData, autonomy_level: e.target.value })} style={inputStyle}>
              {["manual", "semi_autonomous", "autonomous", "full_autonomous"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-xs" style={{ color: DANGER }}>{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {loading ? "Creating…" : "Create Agent"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Bulk Reconfigure Modal ───────────────────────────────────────────────── */
function ReconfigureModal({ count, onApply, onClose }) {
  const [priority, setPriority] = useState("");
  const [autonomy, setAutonomy] = useState("");
  const [agentClass, setAgentClass] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none"
  };

  const handleApply = async () => {
    const patch = {};
    if (priority)   patch.priority       = priority;
    if (autonomy)   patch.autonomy_level = autonomy;
    if (agentClass) patch.agent_class    = agentClass;
    if (Object.keys(patch).length === 0) return;
    setLoading(true);
    await onApply(patch);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Reconfigure Agents</h2>
            <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>{count} agent{count > 1 ? "s" : ""} selected — leave a field blank to keep current value</p>
          </div>
          <button onClick={onClose} className="hover:text-white transition-colors" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
              <option value="">— Keep current —</option>
              {["P0", "P1", "P2", "P3"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Autonomy Level</label>
            <select value={autonomy} onChange={e => setAutonomy(e.target.value)} style={inputStyle}>
              <option value="">— Keep current —</option>
              {["manual", "semi_autonomous", "autonomous", "full_autonomous"].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Agent Class</label>
            <select value={agentClass} onChange={e => setAgentClass(e.target.value)} style={inputStyle}>
              <option value="">— Keep current —</option>
              {Object.keys(AGENT_CLASS_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
          <button onClick={handleApply} disabled={loading || (!priority && !autonomy && !agentClass)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {loading ? "Applying…" : `Apply to ${count} Agent${count > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Floating Bulk Action Bar ─────────────────────────────────────────────── */
function BulkActionBar({ selected, onStart, onStop, onReconfigure, onClear, busy }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
      style={{ background: "#0a1628", border: `1px solid ${CYAN}50`, boxShadow: `0 0 30px rgba(0,212,255,0.15)` }}>
      <CheckSquare className="w-4 h-4" style={{ color: CYAN }} />
      <span className="text-sm font-bold text-white">{selected.size} selected</span>
      <div className="w-px h-5 mx-1" style={{ background: BORDER }} />
      <button onClick={onStart} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: `${LOW}20`, border: `1px solid ${LOW}40`, color: LOW }}>
        <Play className="w-3.5 h-3.5" /> Start All
      </button>
      <button onClick={onStop} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}35`, color: HIGH }}>
        <Pause className="w-3.5 h-3.5" /> Stop All
      </button>
      <button onClick={onReconfigure} disabled={busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
        style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", color: "#8b5cf6" }}>
        <Settings className="w-3.5 h-3.5" /> Reconfigure
      </button>
      <button onClick={onClear} className="ml-1 p-1 rounded-lg hover:bg-white/10 transition-all" style={{ color: MUTED }}>
        <X className="w-3.5 h-3.5" />
      </button>
      {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: CYAN }} />}
    </div>
  );
}

export default function GDSSuperAgentsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [activeTab, setActiveTab] = useState("agents"); // "agents" | "flowchart" | "budget"
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showReconfigure, setShowReconfigure] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["super-agents-status"],
    queryFn: () => base44.functions.invoke("gdsSuperAgentFramework", { action: "status" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: listData } = useQuery({
    queryKey: ["super-agents-list"],
    queryFn: () => base44.functions.invoke("gdsSuperAgentFramework", { action: "list" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: kernelData } = useQuery({
    queryKey: ["kernel-status-for-budget"],
    queryFn: () => base44.functions.invoke("gdsKernelGateway", { action: "status" }).then(r => r.data),
    refetchInterval: 60000,
  });

  const d = data || {};
  const agents = listData?.agents || [];
  const activeCollabs = d.active_collaborations_detail || d.active_collaborations || [];
  const kernelSessions = kernelData?.recent_sessions || [];

  const filteredAgents = agents.filter(a => {
    const matchesSearch = !search.trim() || (a.name || "").toLowerCase().includes(search.toLowerCase()) || (a.mission || "").toLowerCase().includes(search.toLowerCase());
    const matchesClass = filterClass === "all" || a.agent_class === filterClass;
    return matchesSearch && matchesClass;
  });

  const toggleAgent = async (agentId, currentStatus) => {
    try {
      await base44.functions.invoke("gdsSuperAgentFramework", {
        action: currentStatus === "active" ? "suspend" : "activate",
        super_agent_id: agentId
      });
      qc.invalidateQueries(["super-agents-status"]);
      qc.invalidateQueries(["super-agents-list"]);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const allIds = filteredAgents.map(a => a.super_agent_id).filter(Boolean);
    setSelected(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  };

  const bulkAction = async (action) => {
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map(id =>
        base44.functions.invoke("gdsSuperAgentFramework", { action, super_agent_id: id })
      ));
      qc.invalidateQueries(["super-agents-status"]);
      qc.invalidateQueries(["super-agents-list"]);
      setSelected(new Set());
    } catch (e) { console.error(e); }
    finally { setBulkBusy(false); }
  };

  const bulkReconfigure = async (patch) => {
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map(id =>
        base44.functions.invoke("gdsSuperAgentFramework", { action: "update", super_agent_id: id, ...patch })
      ));
      qc.invalidateQueries(["super-agents-list"]);
      setSelected(new Set());
      setShowReconfigure(false);
    } catch (e) { console.error(e); }
    finally { setBulkBusy(false); }
  };

  return (
    <div style={{ ...PAGE_BG }}>
      {showModal && <NewAgentModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); qc.invalidateQueries(); }} />}
      {showReconfigure && (
        <ReconfigureModal
          count={selected.size}
          onApply={bulkReconfigure}
          onClose={() => setShowReconfigure(false)}
        />
      )}
      {selected.size > 0 && (
        <BulkActionBar
          selected={selected}
          onStart={() => bulkAction("activate")}
          onStop={() => bulkAction("suspend")}
          onReconfigure={() => setShowReconfigure(true)}
          onClear={() => setSelected(new Set())}
          busy={bulkBusy}
        />
      )}
      <Breadcrumb items={[{ label: "Super Agents" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Cpu className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Super Agent Framework</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded"
            style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            EDP-004 v1.0
          </span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" />
            Create Super Agent
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Agents", value: d.total_agents ?? 0, color: CYAN },
          { label: "Active", value: d.active_agents ?? 0, color: LOW },
          { label: "Executing", value: d.executing_sessions ?? 0, color: HIGH },
          { label: "Collaborations", value: d.active_collaborations ?? 0, color: "#60a5fa" },
          { label: "Marketplace", value: d.marketplace_listings ?? 0, color: "#14b8a6" },
          { label: "MRR Potential", value: `$${(d.mrr_potential ?? 0).toLocaleString()}`, color: "#fbbf24" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: BORDER }}>
        {[
          { id: "agents",    label: "Agents",          icon: Cpu },
          { id: "health",    label: "Health Monitor",  icon: Activity },
          { id: "audit",     label: "Audit Log",       icon: FileText },
          { id: "rbac",      label: "Access Control",  icon: Shield },
          { id: "flowchart", label: "Dependency Flow", icon: GitBranch },
          { id: "budget",    label: "Budget Alerts",   icon: Bell },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap"
            style={{
              color: activeTab === id ? CYAN : MUTED,
              borderBottomColor: activeTab === id ? CYAN : "transparent",
              background: activeTab === id ? `${CYAN}06` : "transparent",
            }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Health Monitor */}
      {activeTab === "health" && (
        <SuperAgentHealthMonitor agents={agents} isLoading={isLoading} />
      )}

      {/* Audit Log */}
      {activeTab === "audit" && (
        <SuperAgentAuditLog
          agents={agents}
          collaborations={Array.isArray(activeCollabs) ? activeCollabs : []}
          isLoading={isLoading}
        />
      )}

      {/* RBAC */}
      {activeTab === "rbac" && (
        <SuperAgentRBAC />
      )}

      {/* Dependency Flow Chart */}
      {activeTab === "flowchart" && (
        <AgentDependencyFlowChart
          agents={agents}
          activeCollabs={Array.isArray(activeCollabs) ? activeCollabs : []}
          isLoading={isLoading}
        />
      )}

      {/* Budget Alerts */}
      {activeTab === "budget" && (
        <SuperAgentBudgetAlerts agents={agents} sessions={kernelSessions} />
      )}

      {/* Agents list */}
      {activeTab === "agents" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-lg transition-all"
              style={{ background: selected.size > 0 ? `${CYAN}10` : "rgba(255,255,255,0.04)", border: `1px solid ${selected.size > 0 ? CYAN + "40" : BORDER}` }}>
              <input
                type="checkbox"
                checked={filteredAgents.length > 0 && filteredAgents.every(a => selected.has(a.super_agent_id))}
                onChange={selectAll}
                className="w-3.5 h-3.5 rounded accent-cyan-400"
              />
              <span className="text-[11px] font-bold" style={{ color: selected.size > 0 ? CYAN : MUTED }}>
                {selected.size > 0 ? `${selected.size} selected` : "Select all"}
              </span>
            </label>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: MUTED }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search agents by name or mission…"
                className="w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px] outline-none"
                style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
            </div>
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
              style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterClass !== "all" ? CYAN : MUTED }}>
              <option value="all">All Classes</option>
              {Object.keys(AGENT_CLASS_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Agent grid */}
          {isLoading ? <Skeleton lines={6} /> : filteredAgents.length === 0 ? (
            <EmptyState icon={Cpu} title={search || filterClass !== "all" ? "No matching agents" : "No super agents yet"} description={search || filterClass !== "all" ? "Try adjusting your filters" : "Create your first super agent"} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAgents.map((agent, i) => {
                const color = AGENT_CLASS_COLORS[agent.agent_class] || MUTED;
                const capabilities = agent.capabilities || [];
                return (
                  <Card key={agent.super_agent_id || i} className="p-5" glow
                    style={selected.has(agent.super_agent_id) ? { border: `1px solid ${CYAN}60`, background: `${CYAN}05` } : {}}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selected.has(agent.super_agent_id)}
                          onChange={() => toggleSelect(agent.super_agent_id)}
                          onClick={e => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded mt-1 flex-shrink-0 accent-cyan-400 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-black text-white truncate">{agent.name || "Unknown"}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <AgentClassBadge cls={agent.agent_class} />
                            <PriorityBadge priority={agent.priority} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Health</span>
                        <div className="mt-1"><HealthBar score={agent.health_score ?? 0} /></div>
                      </div>
                    </div>
                    <p className="text-[11px] mb-3 line-clamp-2" style={{ color: MUTED }}>{agent.mission || "No mission defined"}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mb-4">
                      {capabilities.slice(0, 3).map((cap, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>
                          {cap}
                        </span>
                      ))}
                      {capabilities.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>
                          +{capabilities.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: BORDER }}>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ color: agent.status === "active" ? LOW : MUTED, background: agent.status === "active" ? `${LOW}15` : "rgba(255,255,255,0.04)", border: `1px solid ${agent.status === "active" ? LOW + "30" : BORDER}` }}>
                        {agent.status || "inactive"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleAgent(agent.super_agent_id, agent.status)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                          style={{ background: agent.status === "active" ? `${HIGH}15` : `${LOW}15`, border: `1px solid ${agent.status === "active" ? HIGH + "30" : LOW + "30"}`, color: agent.status === "active" ? HIGH : LOW }}>
                          {agent.status === "active" ? <><Pause className="w-3 h-3" /> Suspend</> : <><Play className="w-3 h-3" /> Activate</>}
                        </button>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                          <Handshake className="w-3 h-3" /> Collaborate
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}