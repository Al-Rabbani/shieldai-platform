import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Handshake, Plus, Users, Clock, Target, Zap, X, CheckCircle, LayoutDashboard } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";
import AgentWorkspaceView from "@/components/gds/AgentWorkspaceView";

const COLLAB_TYPE_COLORS = { mission_based: "#fbbf24", hierarchical: "#a855f7", one_to_many: "#60a5fa" };
const PROTOCOL_COLORS = { consensus: "#60a5fa", leader_follower: "#a855f7", peer_to_peer: "#14b8a6", hierarchical: "#f97316" };
const ROLE_COLORS = { monitor: MUTED, hunt: HIGH, respond: DANGER, scan: "#60a5fa", analyze: "#14b8a6" };

function CollabTypeBadge({ type }) {
  const color = COLLAB_TYPE_COLORS[type] || MUTED;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {type?.replace(/_/g, " ") || "—"}
    </span>
  );
}

function ProtocolBadge({ protocol }) {
  const color = PROTOCOL_COLORS[protocol] || MUTED;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {protocol?.replace(/_/g, " ") || "—"}
    </span>
  );
}

function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {role || "—"}
    </span>
  );
}

function NewCollaborationModal({ agents, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    initiator_agent_id: "", participant_agent_ids: [], mission: "",
    collaboration_type: "mission_based", coordination_protocol: "consensus"
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none"
  };

  const handleSubmit = async () => {
    if (!formData.initiator_agent_id || formData.participant_agent_ids.length === 0) {
      setError("Select initiator and at least one participant");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("gdsSuperAgentFramework", {
        action: "collaborate",
        ...formData
      });
      setResult(res.data);
      onSuccess && onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (agentId) => {
    setFormData(prev => ({
      ...prev,
      participant_agent_ids: prev.participant_agent_ids.includes(agentId)
        ? prev.participant_agent_ids.filter(id => id !== agentId)
        : [...prev.participant_agent_ids, agentId]
    }));
  };

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white">Collaboration Started</h2>
            <button onClick={onClose} className="hover:text-white transition-colors" style={{ color: MUTED }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 rounded-xl" style={{ background: `${LOW}08`, border: `1px solid ${LOW}30` }}>
            <p className="text-xs font-bold mb-2" style={{ color: LOW }}>Collaboration ID</p>
            <p className="text-sm font-mono text-white">{result.collaboration_id}</p>
          </div>
          {result.task_distribution && (
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Task Distribution</h3>
              <div className="space-y-2">
                {result.task_distribution.map((task, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                    <RoleBadge role={task.skill} />
                    <span className="text-sm font-semibold text-white">{task.agent_name}</span>
                    <span className="text-xs" style={{ color: MUTED }}>{task.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-bold"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Start Collaboration</h2>
          <button onClick={onClose} className="hover:text-white transition-colors" style={{ color: MUTED }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Initiator Agent</label>
            <select value={formData.initiator_agent_id} onChange={e => setFormData({ ...formData, initiator_agent_id: e.target.value })} style={inputStyle}>
              <option value="">Select initiator…</option>
              {agents.map(a => <option key={a.super_agent_id} value={a.super_agent_id}>{a.name} ({a.agent_class})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Participants</label>
            <div className="max-h-40 overflow-y-auto p-3 rounded-lg space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
              {agents.filter(a => a.super_agent_id !== formData.initiator_agent_id).map(a => (
                <label key={a.super_agent_id} className="flex items-center gap-2 cursor-pointer hover:bg-white/[0.02] p-2 rounded">
                  <input type="checkbox" checked={formData.participant_agent_ids.includes(a.super_agent_id)}
                    onChange={() => toggleParticipant(a.super_agent_id)}
                    className="w-4 h-4 rounded accent-cyan-400" />
                  <span className="text-sm text-white">{a.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}20` }}>{a.agent_class}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Mission</label>
            <textarea value={formData.mission} onChange={e => setFormData({ ...formData, mission: e.target.value })}
              rows={3} placeholder="Describe the collaborative mission…"
              style={{ ...inputStyle, resize: "none" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Collaboration Type</label>
              <select value={formData.collaboration_type} onChange={e => setFormData({ ...formData, collaboration_type: e.target.value })} style={inputStyle}>
                {Object.keys(COLLAB_TYPE_COLORS).map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Coordination Protocol</label>
              <select value={formData.coordination_protocol} onChange={e => setFormData({ ...formData, coordination_protocol: e.target.value })} style={inputStyle}>
                {Object.keys(PROTOCOL_COLORS).map(p => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
        </div>
        {error && <p className="text-xs" style={{ color: DANGER }}>{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {loading ? "Starting…" : "Start Collaboration"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GDSSuperAgentsCollaboratePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("workspace"); // "workspace" | "active" | "history"

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["super-agents-status"],
    queryFn: () => base44.functions.invoke("gdsSuperAgentFramework", { action: "status" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: listData } = useQuery({
    queryKey: ["super-agents-list"],
    queryFn: () => base44.functions.invoke("gdsSuperAgentFramework", { action: "list" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: collabsData } = useQuery({
    queryKey: ["super-agent-collaborations"],
    queryFn: () => base44.entities.SuperAgentCollaboration.list().then(r => r),
    refetchInterval: 30000,
  });

  const agents = listData?.agents || [];
  const activeCollabs = statusData?.active_collaborations || [];

  return (
    <div style={{ ...PAGE_BG }}>
      {showModal && <NewCollaborationModal agents={agents} onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); qc.invalidateQueries(); }} />}
      <Breadcrumb items={[{ label: "Super Agents", path: "/super-agents" }, { label: "Collaboration" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Handshake className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Agent Collaboration Center</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: "#60a5fa", background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            {activeCollabs.length} Active
          </span>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          Start Collaboration
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b" style={{ borderColor: BORDER }}>
        {[
          { id: "workspace", label: "Workspace", icon: LayoutDashboard },
          { id: "active",    label: "Active Collabs", icon: Handshake },
          { id: "history",   label: "History", icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px"
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

      {/* Workspace tab */}
      {activeTab === "workspace" && (
        <AgentWorkspaceView activeCollabs={activeCollabs} agents={agents} isLoading={isLoading} />
      )}

      {/* Active Collabs tab */}
      {activeTab === "active" && (
        isLoading ? <Skeleton lines={4} /> : activeCollabs.length === 0 ? (
          <EmptyState icon={Handshake} title="No active collaborations" description="Start a new collaboration to coordinate multiple agents" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeCollabs.map((collab, i) => (
              <Card key={collab.collaboration_id || i} className="p-5" glow>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CollabTypeBadge type={collab.collaboration_type} />
                      <ProtocolBadge protocol={collab.coordination_protocol} />
                    </div>
                    <p className="text-sm font-semibold text-white line-clamp-2">{collab.mission || "No mission"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] mb-3" style={{ color: MUTED }}>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {collab.participants_count || 0} participants</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(collab.started_at)}</span>
                  {collab.duration_ms && <span className="font-mono">{collab.duration_ms}ms</span>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: BORDER }}>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>
                    {collab.status || "active"}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: MUTED }}>
                    {(collab.initiator_agent_id || "").slice(0, 20)}…
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* History tab */}
      {activeTab === "history" && (
        collabsData && collabsData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Collaboration ID", "Type", "Initiator", "Participants", "Status", "Started"].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collabsData.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono text-[11px]" style={{ color: CYAN }}>{(c.collaboration_id || "").slice(0, 20)}…</td>
                    <td className="py-2 px-3"><CollabTypeBadge type={c.collaboration_type} /></td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: TEXT }}>{(c.initiator_agent_id || "").slice(0, 20)}…</td>
                    <td className="py-2 px-3 font-mono" style={{ color: MUTED }}>{c.participants_count || 0}</td>
                    <td className="py-2 px-3"><span className="text-[10px] capitalize" style={{ color: c.status === "active" ? LOW : MUTED }}>{c.status}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(c.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Clock} title="No history yet" description="Completed collaborations will appear here" />
        )
      )}
    </div>
  );
}