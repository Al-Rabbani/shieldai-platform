import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Send, RefreshCw, ArrowRight } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, EmptyState, Skeleton, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";
import GDSPageShell from "@/components/gds/GDSPageShell";

const MESSAGE_TYPE_COLORS = {
  task_delegation: "#0ea5e9",
  escalation: "#ef4444",
  context_sync: "#14b8a6",
  status_update: "#6b7280",
  result_share: "#10b981",
};

function MessageBadge({ type }) {
  const color = MESSAGE_TYPE_COLORS[type] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {type?.replace(/_/g, " ")}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    delivered: [LOW, "Delivered"],
    failed: [DANGER, "Failed"],
    pending: [MEDIUM, "Pending"],
    sent: [CYAN, "Sent"],
  };
  const [color, label] = map[status?.toLowerCase()] || [MUTED, status];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

export default function GDSAgentCommsPage() {
  const [showModal, setShowModal] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState(null);
  const [formData, setFormData] = useState({
    from_agent_id: "", to_agent_id: "", message_type: "status_update",
    subject: "", payload: "", priority: "medium", delivery_mode: "direct",
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["agent-messages"],
    queryFn: () => Promise.all([
      base44.functions.invoke("gdsAgentRuntime", { action: "telemetry" }).then(r => r.data),
      base44.entities.AgentMessage?.list('-created_date', 100).catch(() => []),
    ]).then(([telemetry, messages]) => ({ telemetry, messages })),
    refetchInterval: 30000,
  });

  const sendMessage = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsAgentRuntime", { action: "message", ...payload }),
    onSuccess: () => {
      refetch();
      setShowModal(false);
      setFormData({ from_agent_id: "", to_agent_id: "", message_type: "status_update", subject: "", payload: "", priority: "medium", delivery_mode: "direct" });
      alert("Message sent!");
    },
  });

  const messages = data?.messages || [];
  const sessions = data?.telemetry?.sessions || [];

  // Extract agents from sessions for dropdowns
  const agentIds = useMemo(() => {
    const ids = new Set();
    sessions.forEach(s => { if (s.agent_id) ids.add(s.agent_id); });
    return Array.from(ids);
  }, [sessions]);

  // Stats
  const delivered = messages.filter(m => m.status === "delivered").length;
  const failed = messages.filter(m => m.status === "failed").length;
  const pending = messages.filter(m => m.status === "pending").length;
  
  const fromCounts = {};
  const toCounts = {};
  messages.forEach(m => {
    if (m.from_agent_id) fromCounts[m.from_agent_id] = (fromCounts[m.from_agent_id] || 0) + 1;
    if (m.to_agent_id) toCounts[m.to_agent_id] = (toCounts[m.to_agent_id] || 0) + 1;
  });
  const topSender = Object.entries(fromCounts).sort((a, b) => b[1] - a[1])[0];
  const topReceiver = Object.entries(toCounts).sort((a, b) => b[1] - a[1])[0];

  const handleSubmit = () => {
    if (!formData.from_agent_id || !formData.to_agent_id || !formData.message_type) {
      alert("Please fill in required fields");
      return;
    }
    sendMessage.mutate(formData);
  };

  return (
    <GDSPageShell
      title="Agent Communications"
      breadcrumbs={[{ label: "Agent Runtime", path: "/agents" }, { label: "Communications" }]}
      version="EDP-003 v1.0"
      live
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Agent Communication Monitor</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded"
            style={{ color: CYAN, background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}>
            {messages.length} messages
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Send className="w-4 h-4" />
            Send Message
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Messages", value: messages.length, color: CYAN },
          { label: "Delivered", value: delivered, color: LOW },
          { label: "Failed", value: failed, color: DANGER },
          { label: "Pending", value: pending, color: MEDIUM },
          { label: "Top Sender", value: topSender ? topSender[0].slice(0, 12) : "—", color: "#60a5fa", sub: topSender ? `${topSender[1]} msgs` : "" },
          { label: "Top Receiver", value: topReceiver ? topReceiver[0].slice(0, 12) : "—", color: "#10b981", sub: topReceiver ? `${topReceiver[1]} msgs` : "" },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-lg font-black font-mono truncate" style={{ color }}>{value}</p>
            {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
          </Card>
        ))}
      </div>

      {/* Message Feed */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">Message Feed</h3>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />)}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No messages yet" description="Agent communications will appear here" />
        ) : (
          <div className="divide-y" style={{ borderColor: BORDER }}>
            {messages.map((m, i) => (
              <div key={m.message_id || i} className="p-3 hover:bg-white/[0.02] transition-all">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono" style={{ color: MUTED }}>{(m.message_id || "").slice(0, 16)}…</span>
                    <span className="text-[10px] font-bold" style={{ color: CYAN }}>{m.from_agent_id || "unknown"}</span>
                    <ArrowRight className="w-3 h-3" style={{ color: MUTED }} />
                    <span className="text-[10px] font-bold" style={{ color: LOW }}>{m.to_agent_id || "unknown"}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <MessageBadge type={m.message_type} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      m.priority === "critical" ? "text-red-400 bg-red-500/15" :
                      m.priority === "high" ? "text-orange-400 bg-orange-500/15" :
                      "text-gray-400 bg-gray-500/15"
                    }`}>
                      {m.priority || "normal"}
                    </span>
                    <StatusBadge status={m.status} />
                    <span className="text-[10px]" style={{ color: MUTED }}>{timeAgo(m.created_date)}</span>
                  </div>
                </div>
                {m.subject && (
                  <p className="text-xs font-bold text-white mb-1">{m.subject}</p>
                )}
                {m.payload && (
                  <button onClick={() => setExpandedMsg(expandedMsg === m.message_id ? null : m.message_id)}
                    className="text-[10px] font-mono" style={{ color: MUTED }}>
                    {expandedMsg === m.message_id ? "Hide payload" : "Show payload ▼"}
                  </button>
                )}
                {expandedMsg === m.message_id && m.payload && (
                  <div className="mt-2 p-3 rounded-lg font-mono text-[10px] whitespace-pre-wrap"
                    style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: TEXT }}>
                    {typeof m.payload === "string" ? m.payload : JSON.stringify(m.payload, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Send Message Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
              <h2 className="text-sm font-black text-white">Send Agent Message</h2>
              <button onClick={() => setShowModal(false)} style={{ color: MUTED }} className="hover:text-white">
                <span className="text-xl">×</span>
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>From Agent</label>
                  <select value={formData.from_agent_id} onChange={e => setFormData({ ...formData, from_agent_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                    <option value="">Select sender…</option>
                    {agentIds.map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>To Agent</label>
                  <select value={formData.to_agent_id} onChange={e => setFormData({ ...formData, to_agent_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                    <option value="">Select receiver…</option>
                    {agentIds.map(id => <option key={id} value={id}>{id}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Message Type</label>
                <select value={formData.message_type} onChange={e => setFormData({ ...formData, message_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="status_update">status_update</option>
                  <option value="task_delegation">task_delegation</option>
                  <option value="escalation">escalation</option>
                  <option value="context_sync">context_sync</option>
                  <option value="result_share">result_share</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Subject</label>
                <input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Optional subject…"
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="critical">critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Delivery Mode</label>
                  <select value={formData.delivery_mode} onChange={e => setFormData({ ...formData, delivery_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                    style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                    <option value="direct">direct</option>
                    <option value="queue">queue</option>
                    <option value="broadcast">broadcast</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Payload (JSON)</label>
                <textarea value={formData.payload} onChange={e => setFormData({ ...formData, payload: e.target.value })}
                  placeholder='{"key": "value"}'
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none font-mono"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT, resize: "none" }} />
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t" style={{ borderColor: BORDER }}>
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={sendMessage.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {sendMessage.isPending ? "Sending…" : "Send Message"}
              </button>
            </div>
          </div>
        </div>
      )}
    </GDSPageShell>
  );
}