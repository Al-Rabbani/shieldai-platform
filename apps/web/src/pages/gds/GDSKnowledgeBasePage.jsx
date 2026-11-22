import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Book, Search, Plus, X, FileText, Tag, Link as LinkIcon } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

const DOC_TYPE_COLORS = { policy: "#60a5fa", playbook: "#14b8a6", incident_report: DANGER, compliance_framework: LOW, threat_intel: HIGH, runbook: "#a855f7", sop: "#fbbf24" };

export default function GDSKnowledgeBasePage() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("security");
  const [filterDocType, setFilterDocType] = useState("all");
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [ingestData, setIngestData] = useState({ title: "", content: "", doc_type: "policy", data_classification: "internal", retention_policy: "3y", tags: "" });

  const { data: searchData, isLoading: loadSearch } = useQuery({
    queryKey: ["knowledge-search", searchQuery],
    queryFn: () => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "knowledge_search", query: searchQuery }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: sourcesData } = useQuery({
    queryKey: ["knowledge-sources"],
    queryFn: () => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "sources" }).then(r => r.data),
    refetchInterval: 60000,
  });

  const ingestMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "ingest", ...payload }),
    onSuccess: () => { qc.invalidateQueries(["knowledge-search"]); qc.invalidateQueries(["knowledge-sources"]); setShowIngestModal(false); },
  });

  const docs = searchData?.documents || [];
  const sources = sourcesData?.sources || [];
  const filteredDocs = filterDocType === "all" ? docs : docs.filter(d => d.doc_type === filterDocType);

  const inputStyle = { background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none" };
  const handleIngest = () => { if (!ingestData.title.trim() || !ingestData.content.trim()) return; ingestMutation.mutate({ ...ingestData, tags: ingestData.tags.split(",").map(t => t.trim()).filter(Boolean) }); };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Knowledge Base" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Book className="w-6 h-6" style={{ color: CYAN }} />
          <h1 className="text-2xl font-black text-white">Knowledge Base</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            {searchData?.documents?.length || 0} docs · {searchData?.chunks?.length || 0} chunks
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowIngestModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" /> Ingest Document
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: MUTED }} />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search knowledge base..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {["all", "policy", "playbook", "incident_report", "compliance_framework", "threat_intel", "runbook", "sop"].map(type => (
          <button key={type} onClick={() => setFilterDocType(type)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{ background: filterDocType === type ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${filterDocType === type ? CYAN + "40" : BORDER}`, color: filterDocType === type ? CYAN : MUTED }}>
            {type === "all" ? "All" : type.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loadSearch ? <Skeleton lines={4} /> : filteredDocs.length === 0 ? (
          <EmptyState icon={Book} title="No documents found" description="Try a different search or ingest new documents" />
        ) : (
          filteredDocs.map((doc, i) => {
            const color = DOC_TYPE_COLORS[doc.doc_type] || MUTED;
            const expanded = expandedDoc === doc.doc_id;
            return (
              <Card key={doc.doc_id || i} className="p-5" glow>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>{doc.doc_type?.replace("_", " ") || "document"}</span>
                      {doc.graph_linked && <LinkIcon className="w-3.5 h-3.5" style={{ color: CYAN }} />}
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">{doc.title || "Untitled"}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] mb-3" style={{ color: MUTED }}>
                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {doc.chunk_count || 0} chunks</span>
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {(doc.tags || []).length} tags</span>
                </div>
                {expanded && doc.chunks && doc.chunks.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: BORDER }}>
                    <p className="text-[10px] font-bold" style={{ color: MUTED }}>Matching Chunks:</p>
                    {doc.chunks.slice(0, 3).map((chunk, ci) => (
                      <div key={ci} className="p-2 rounded-lg text-xs" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${CYAN}20` }}>
                        <p className="text-[11px]" style={{ color: TEXT }}>{chunk.text?.slice(0, 150)}...</p>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setExpandedDoc(expanded ? null : doc.doc_id)} className="text-[10px] font-bold mt-3" style={{ color: CYAN }}>
                  {expanded ? "Show less" : "View chunks →"}
                </button>
              </Card>
            );
          })
        )}
      </div>

      {showIngestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Ingest Document</h2>
              <button onClick={() => setShowIngestModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Title</label>
                <input value={ingestData.title} onChange={e => setIngestData({ ...ingestData, title: e.target.value })} placeholder="Document title" style={inputStyle} /></div>
              <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Content</label>
                <textarea value={ingestData.content} onChange={e => setIngestData({ ...ingestData, content: e.target.value })} rows={6} placeholder="Document content..." style={{ ...inputStyle, resize: "none" }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Document Type</label>
                  <select value={ingestData.doc_type} onChange={e => setIngestData({ ...ingestData, doc_type: e.target.value })} style={inputStyle}>
                    {Object.keys(DOC_TYPE_COLORS).map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select></div>
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Classification</label>
                  <select value={ingestData.data_classification} onChange={e => setIngestData({ ...ingestData, data_classification: e.target.value })} style={inputStyle}>
                    <option value="public">Public</option><option value="internal">Internal</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option>
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Retention</label>
                  <select value={ingestData.retention_policy} onChange={e => setIngestData({ ...ingestData, retention_policy: e.target.value })} style={inputStyle}>
                    <option value="1y">1 year</option><option value="3y">3 years</option><option value="7y">7 years</option><option value="permanent">Permanent</option>
                  </select></div>
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Tags (comma-separated)</label>
                  <input value={ingestData.tags} onChange={e => setIngestData({ ...ingestData, tags: e.target.value })} placeholder="tag1, tag2" style={inputStyle} /></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowIngestModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
              <button onClick={handleIngest} disabled={ingestMutation.isPending || !ingestData.title.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {ingestMutation.isPending ? "Ingesting..." : "Ingest Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}