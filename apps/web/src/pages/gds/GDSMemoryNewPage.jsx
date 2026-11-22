import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Plus, X, Pin, Clock, Shield, Tag, RefreshCw, CheckCircle } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Skeleton, EmptyState, Breadcrumb, timeAgo
} from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MEMORY_TYPE_COLORS = {
  ThreatMemory: DANGER,
  IncidentMemory: HIGH,
  ComplianceMemory: LOW,
  WorkingMemory: "#60a5fa",
  LongTermMemory: "#a855f7",
  AssetMemory: "#14b8a6",
  IdentityMemory: "#a855f7",
  ExecutiveMemory: "#fbbf24",
  SessionMemory: MUTED,
  WorkflowMemory: CYAN,
  SemanticMemory: "#ec4899",
};

const CLASSIFICATION_COLORS = {
  public: MUTED,
  internal: "#60a5fa",
  confidential: HIGH,
  restricted: DANGER,
};

const ACTION_COLORS = {
  archive: "#60a5fa",
  delete: DANGER,
  review: HIGH,
  anonymize: "#a855f7",
};

export default function GDSMemoryPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterClassification, setFilterClassification] = useState("all");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [formData, setFormData] = useState({
    subject: "", content: "", memory_type: "WorkingMemory",
    data_classification: "internal", retention_policy: "1y", tags: "", is_pinned: false
  });

  const { data: metrics, isLoading: loadMetrics } = useQuery({
    queryKey: ["memory-metrics"],
    queryFn: () => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: memories, isLoading: loadMemories } = useQuery({
    queryKey: ["memory-retrieve"],
    queryFn: () => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "retrieve", limit: 20 }).then(r => r.data),
    refetchInterval: 15000,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "create", ...payload }),
    onSuccess: () => {
      qc.invalidateQueries(["memory-retrieve"]);
      qc.invalidateQueries(["memory-metrics"]);
      setShowModal(false);
    },
  });

  const m = metrics || {};
  const memoryList = memories?.memories || [];

  const filteredMemories = memoryList.filter(mem => {
    if (filterType !== "all" && mem.memory_type !== filterType) return false;
    if (filterClassification !== "all" && mem.data_classification !== filterClassification) return false;
    if (pinnedOnly && !mem.is_pinned) return false;
    return true;
  });

  const byTypeData = Object.entries(m.by_type || {}).map(([name, count]) => ({
    name: name.replace("Memory", ""),
    count,
    color: MEMORY_TYPE_COLORS[name] || MUTED,
  }));

  const inputStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none"
  };

  const handleSubmit = () => {
    if (!formData.subject.trim() || !formData.content.trim()) return;
    createMutation.mutate({
      ...formData,
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Memory & Knowledge Platform" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Brain className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Memory & Knowledge Platform</h1>
          <span className="text-[10px] font-black px-2 py-0.5 rounded"
            style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
            EDP-005 v1.0
          </span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
            style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>
            13-stage retrieval · 12-stage ingestion
          </span>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" />
            Create Memory
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Memory Records", value: m.memory?.total_records ?? 0, color: CYAN },
          { label: "Documents", value: m.knowledge?.documents ?? 0, color: LOW },
          { label: "Chunks", value: m.knowledge?.chunks ?? 0, color: "#60a5fa" },
          { label: "Graph Nodes", value: (m.graph?.nodes ?? 0) + (m.graph?.edges ?? 0), sub: `${m.graph?.nodes ?? 0} nodes · ${m.graph?.edges ?? 0} edges`, color: "#a855f7" },
          { label: "RAG Queries", value: m.rag?.total_queries ?? 0, color: "#14b8a6" },
          { label: "Access Grants", value: m.governance?.active_grants ?? 0, color: HIGH },
        ].map(({ label, value, color, sub }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            {sub && <p className="text-[9px] mt-1" style={{ color: MUTED }}>{sub}</p>}
          </Card>
        ))}
      </div>

      {/* Memory Type breakdown */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Memory Type Breakdown</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Records per memory type</p>
        </div>
        {loadMetrics ? <Skeleton lines={3} /> : byTypeData.length === 0 ? (
          <EmptyState icon={Brain} title="No memory data" description="Create memories to see breakdown" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byTypeData} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
              <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24}>
                {byTypeData.map((d, i) => (
                  <Cell key={i} fill={d.color} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterType !== "all" ? CYAN : MUTED }}>
          <option value="all">All Memory Types</option>
          {Object.keys(MEMORY_TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterClassification} onChange={e => setFilterClassification(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-[11px] outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: filterClassification !== "all" ? CYAN : MUTED }}>
          <option value="all">All Classifications</option>
          {Object.keys(CLASSIFICATION_COLORS).map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg text-[11px] font-bold"
          style={{ background: pinnedOnly ? `${CYAN}10` : "rgba(255,255,255,0.04)", border: `1px solid ${pinnedOnly ? CYAN + "40" : BORDER}` }}>
          <input type="checkbox" checked={pinnedOnly} onChange={e => setPinnedOnly(e.target.checked)} className="w-3.5 h-3.5 rounded accent-cyan-400" />
          <span style={{ color: pinnedOnly ? CYAN : MUTED }}>Pinned Only</span>
        </label>
        <span className="text-[10px] ml-auto" style={{ color: MUTED }}>
          {filteredMemories.length}{filteredMemories.length !== memoryList.length ? ` / ${memoryList.length}` : ""} memories
        </span>
      </div>

      {/* Memory Records table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
          <Brain className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Memory Records</h3>
        </div>
        {loadMemories ? <Skeleton lines={6} /> : filteredMemories.length === 0 ? (
          <EmptyState icon={Brain} title="No memories" description="Create your first memory record" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Type", "Subject", "Importance", "Classification", "Retention", "Pinned", "Source", "Expires"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMemories.map((mem, i) => {
                  const typeColor = MEMORY_TYPE_COLORS[mem.memory_type] || MUTED;
                  const classColor = CLASSIFICATION_COLORS[mem.data_classification] || MUTED;
                  const importanceColor = mem.importance_score >= 70 ? LOW : mem.importance_score >= 40 ? MEDIUM : DANGER;
                  return (
                    <tr key={mem.memory_id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase"
                          style={{ color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30` }}>
                          {mem.memory_type?.replace("Memory", "") || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 max-w-[200px]">
                        <p className="truncate text-white">{mem.subject || "Untitled"}</p>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${mem.importance_score || 0}%`, background: importanceColor }} />
                          </div>
                          <span className="text-[10px] font-mono" style={{ color: importanceColor }}>{mem.importance_score ?? 0}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                          style={{ color: classColor, background: `${classColor}15`, border: `1px solid ${classColor}30` }}>
                          {mem.data_classification || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{mem.retention_policy || "—"}</td>
                      <td className="py-2 px-3">
                        {mem.is_pinned && <Pin className="w-3.5 h-3.5" style={{ color: CYAN }} />}
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{mem.source_type || "—"}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(mem.expires_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Memory Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Create Memory Record</h2>
              <button onClick={() => setShowModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Subject</label>
                <input value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief subject line" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Content</label>
                <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })}
                  rows={4} placeholder="Memory content..." style={{ ...inputStyle, resize: "none" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Memory Type</label>
                  <select value={formData.memory_type} onChange={e => setFormData({ ...formData, memory_type: e.target.value })} style={inputStyle}>
                    {Object.keys(MEMORY_TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Classification</label>
                  <select value={formData.data_classification} onChange={e => setFormData({ ...formData, data_classification: e.target.value })} style={inputStyle}>
                    {Object.keys(CLASSIFICATION_COLORS).map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Retention Policy</label>
                  <select value={formData.retention_policy} onChange={e => setFormData({ ...formData, retention_policy: e.target.value })} style={inputStyle}>
                    <option value="1y">1 year</option>
                    <option value="3y">3 years</option>
                    <option value="7y">7 years</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Tags (comma-separated)</label>
                  <input value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="tag1, tag2, ..." style={inputStyle} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_pinned} onChange={e => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="w-4 h-4 rounded accent-cyan-400" />
                <span className="text-xs" style={{ color: MUTED }}>Pin this memory</span>
              </label>
            </div>
            {createMutation.isPending && <p className="text-xs" style={{ color: CYAN }}>Creating memory record...</p>}
            {createMutation.isSuccess && (
              <div className="p-3 rounded-lg" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
                <p className="text-xs font-bold" style={{ color: LOW }}>✓ Memory created successfully!</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
              <button onClick={handleSubmit} disabled={createMutation.isPending || !formData.subject.trim() || !formData.content.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {createMutation.isPending ? "Creating..." : "Create Memory"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}