import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Search, X, CheckCircle, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

const MEMORY_TYPES = ["ThreatMemory", "IncidentMemory", "ComplianceMemory", "WorkingMemory", "LongTermMemory", "AssetMemory", "IdentityMemory", "ExecutiveMemory", "SessionMemory", "WorkflowMemory", "SemanticMemory"];

export default function GDSRAGConsolePage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState(["ThreatMemory", "IncidentMemory", "ComplianceMemory"]);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [topK, setTopK] = useState(5);
  const [result, setResult] = useState(null);

  const { data: metrics } = useQuery({
    queryKey: ["rag-metrics"],
    queryFn: () => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: history } = useQuery({
    queryKey: ["rag-history"],
    queryFn: () => base44.entities.RAGQuery.list("-created_date", 10).catch(() => []),
  });

  const ragMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsMemoryKnowledgePlatform", { action: "rag_query", ...payload }),
    onSuccess: (res) => setResult(res.data),
  });

  const toggleType = (type) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleQuery = () => {
    if (!query.trim()) return;
    ragMutation.mutate({ query, memory_types: selectedTypes, include_knowledge_docs: includeDocs, top_k: topK });
  };

  const inputStyle = { background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 10, padding: "8px 12px", fontSize: 13, width: "100%", outline: "none" };
  const riskColor = result?.hallucination_risk === "low" ? LOW : result?.hallucination_risk === "medium" ? MEDIUM : DANGER;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "RAG Console" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">RAG Query Console</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Retrieval Augmented Generation — Grounded AI Context</p>
        </div>
      </div>

      <Card className="p-6">
        <div className="mb-4">
          <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Query</label>
          <textarea value={query} onChange={e => setQuery(e.target.value)} rows={3} placeholder="Ask anything about threats, incidents, compliance, or assets..."
            style={{ ...inputStyle, resize: "none", fontSize: 14 }} />
        </div>
        <div className="mb-4">
          <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Memory Types</label>
          <div className="flex flex-wrap gap-2">
            {MEMORY_TYPES.map(type => (
              <label key={type} className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg text-[11px] font-bold"
                style={{ background: selectedTypes.includes(type) ? `${CYAN}10` : "rgba(255,255,255,0.04)", border: `1px solid ${selectedTypes.includes(type) ? CYAN + "40" : BORDER}` }}>
                <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} className="w-3.5 h-3.5 rounded accent-cyan-400" />
                <span style={{ color: selectedTypes.includes(type) ? CYAN : MUTED }}>{type.replace("Memory", "")}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeDocs} onChange={e => setIncludeDocs(e.target.checked)} className="w-4 h-4 rounded accent-cyan-400" />
            <span className="text-xs" style={{ color: MUTED }}>Include Knowledge Docs</span>
          </label>
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Top K: {topK}</label>
            <input type="range" min="1" max="20" value={topK} onChange={e => setTopK(Number(e.target.value))} className="w-full" />
          </div>
        </div>
        <button onClick={handleQuery} disabled={ragMutation.isPending || !query.trim()}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {ragMutation.isPending ? "Running RAG Query..." : "Run RAG Query"}
        </button>
      </Card>

      {result && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-sm font-bold text-white">Results</h3>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: MUTED }}>Hallucination Risk:</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase" style={{ color: riskColor, background: `${riskColor}18`, border: `1px solid ${riskColor}30` }}>{result.hallucination_risk || "unknown"}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: MUTED }}>Confidence:</span>
                <span className="text-lg font-black font-mono" style={{ color: result.confidence_score >= 70 ? LOW : result.confidence_score >= 40 ? MEDIUM : DANGER }}>{result.confidence_score ?? 0}%</span>
              </span>
            </div>
          </div>
          {result.grounded_context && (
            <div className="mb-4">
              <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Grounded Context</label>
              <div className="p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${CYAN}20`, color: TEXT }}>
                {result.grounded_context}
              </div>
            </div>
          )}
          {result.citations && result.citations.length > 0 && (
            <div className="mb-4">
              <label className="text-xs font-bold mb-2 block" style={{ color: MUTED }}>Citations</label>
              <div className="space-y-2">
                {result.citations.slice(0, 5).map((cit, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{cit.source_type || "memory"}</span>
                      <span className="text-[10px]" style={{ color: MUTED }}>Relevance: {(cit.relevance_score || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-white truncate">{cit.subject || cit.memory_type || "Untitled"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.explainability && (
            <div className="p-3 rounded-lg text-xs italic" style={{ background: "rgba(255,255,255,0.02)", color: MUTED }}>
              {result.explainability}
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">RAG History</h3>
        </div>
        {history && history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Query", "Type", "Results", "Risk", "Time"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={h.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 max-w-[200px]"><p className="truncate text-white">{h.query_text || "Query"}</p></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{h.query_type || "rag"}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: CYAN }}>{h.results_count || 0}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: h.hallucination_risk === "low" ? LOW : h.hallucination_risk === "medium" ? MEDIUM : DANGER, background: "rgba(255,255,255,0.04)" }}>
                        {h.hallucination_risk || "unknown"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(h.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Brain} title="No RAG history" description="Run queries to see history" />
        )}
      </Card>
    </div>
  );
}