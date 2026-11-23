import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Database, FileText, Tag, Target, Hash } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function DocTypeBadge({ type }) {
  const colors = { incident: "#ef4444", threat_report: "#f97316", playbook: "#10b981", vulnerability: "#f59e0b", compliance: "#3b82f6", policy: "#a855f7", procedure: "#14b8a6", research: "#6b7280" };
  const color = colors[type] || MUTED;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}15` }}>{(type || "doc").replace(/_/g, " ")}</span>;
}

export default function GDSSemanticSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const { data: documents = [], isLoading: loadD } = useQuery({
    queryKey: ["semantic-docs"],
    queryFn: () => base44.entities.SemanticDocument.list("-indexed_at", 100).catch(() => []),
  });
  const { data: vectorIndexes = [], isLoading: loadV } = useQuery({
    queryKey: ["vector-indexes"],
    queryFn: () => base44.entities.VectorIndex.list("", 10).catch(() => []),
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    // Simple client-side search simulation
    const filtered = documents.filter(d =>
      d.title.toLowerCase().includes(query.toLowerCase()) ||
      (d.keywords || []).some(k => k.toLowerCase().includes(query.toLowerCase()))
    );
    setResults(filtered);
    setSearched(true);
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence", path: "/data-intelligence" }, { label: "Semantic Search" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Semantic Search Center</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>AI-powered search across GDS knowledge base</p>
      </div>

      {/* Search Bar */}
      <Card className="p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyPress={e => e.key === "Enter" && handleSearch()}
              placeholder="Search across GDS knowledge — incidents, threat reports, playbooks, vulnerabilities..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}`, color: TEXT }}
            />
          </div>
          <button onClick={handleSearch} className="px-6 py-3 rounded-xl text-sm font-bold transition-all" style={{ background: CYAN, color: "#020817" }}>
            Search
          </button>
        </div>
      </Card>

      {/* Vector Index Status */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Vector Index Status</h3>
          </div>
        </div>
        {loadV ? <Skeleton lines={2} /> : vectorIndexes.length === 0 ? (
          <EmptyState icon={Database} title="No vector indexes" description="Create vector indexes for semantic search" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vectorIndexes.map((idx, i) => (
              <div key={idx.id || i} className="p-4 rounded-xl" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}` }}>
                <p className="text-xs font-bold text-white mb-2">{idx.name}</p>
                <div className="space-y-1 text-[10px]" style={{ color: MUTED }}>
                  <div className="flex items-center justify-between">
                    <span>Type</span>
                    <span className="font-mono" style={{ color: TEXT }}>{idx.index_type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dimensions</span>
                    <span className="font-mono" style={{ color: TEXT }}>{idx.dimensions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Embeddings</span>
                    <span className="font-mono" style={{ color: TEXT }}>{(idx.embedding_count || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Model</span>
                    <span className="font-mono truncate max-w-[100px]" style={{ color: TEXT }}>{idx.model_used || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Avg Query</span>
                    <span className="font-mono" style={{ color: TEXT }}>{idx.avg_query_ms || 0}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rebuilt</span>
                    <span className="font-mono" style={{ color: TEXT }}>{timeAgo(idx.last_rebuilt_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Search Results */}
      {searched && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Search Results</h3>
            <span className="text-[10px]" style={{ color: MUTED }}>{results.length} found</span>
          </div>
          {results.length === 0 ? (
            <EmptyState icon={Search} title="No results" description={`No documents found for "${query}"`} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((doc, i) => (
                <Card key={doc.id || i} className="p-4" glow>
                  <div className="flex items-start justify-between mb-2">
                    <DocTypeBadge type={doc.doc_type} />
                    <span className="text-[10px] font-mono" style={{ color: MUTED }}>{timeAgo(doc.indexed_at)}</span>
                  </div>
                  <p className="text-sm font-bold text-white mb-2">{doc.title}</p>
                  <p className="text-[10px] line-clamp-2 mb-3" style={{ color: MUTED }}>{doc.content_summary}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(doc.keywords || []).slice(0, 5).map((kw, j) => (
                      <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{kw}</span>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span style={{ color: MUTED }}>Relevance</span>
                        <span className="font-mono" style={{ color: TEXT }}>{doc.relevance_score || 0}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: `${BORDER}` }}>
                        <div className="h-full rounded-full" style={{ width: `${doc.relevance_score || 0}%`, background: CYAN }} />
                      </div>
                    </div>
                    {(doc.mitre_refs?.length > 0 || doc.cve_refs?.length > 0) && (
                      <div className="flex gap-2 flex-wrap">
                        {(doc.mitre_refs || []).slice(0, 2).map((m, j) => (
                          <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: HIGH, background: `${HIGH}15` }}>{m}</span>
                        ))}
                        {(doc.cve_refs || []).slice(0, 2).map((c, j) => (
                          <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* All Documents */}
      {!searched && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-sm font-bold text-white">Indexed Documents</h3>
          </div>
          {loadD ? <Skeleton lines={6} /> : documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents" description="Index documents to enable semantic search" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ color: MUTED }}>
                    <th className="pb-3 font-semibold">Title</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Keywords</th>
                    <th className="pb-3 font-semibold">Relevance</th>
                    <th className="pb-3 font-semibold">MITRE</th>
                    <th className="pb-3 font-semibold">CVE</th>
                    <th className="pb-3 font-semibold">Indexed</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                  {documents.map((doc, i) => (
                    <tr key={doc.id || i} className="text-white">
                      <td className="py-3 font-semibold max-w-xs">{doc.title}</td>
                      <td className="py-3"><DocTypeBadge type={doc.doc_type} /></td>
                      <td className="py-3">
                        <div className="flex gap-1 flex-wrap max-w-xs">
                          {(doc.keywords || []).slice(0, 3).map((kw, j) => (
                            <span key={j} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>{kw}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="w-16 h-1.5 rounded-full" style={{ background: `${BORDER}` }}>
                          <div className="h-full rounded-full" style={{ width: `${doc.relevance_score || 0}%`, background: CYAN }} />
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {(doc.mitre_refs || []).slice(0, 2).map((m, j) => (
                            <span key={j} className="text-[9px] font-mono" style={{ color: HIGH }}>{m}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {(doc.cve_refs || []).slice(0, 2).map((c, j) => (
                            <span key={j} className="text-[9px] font-mono" style={{ color: DANGER }}>{c}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3" style={{ color: MUTED }}>{timeAgo(doc.indexed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}