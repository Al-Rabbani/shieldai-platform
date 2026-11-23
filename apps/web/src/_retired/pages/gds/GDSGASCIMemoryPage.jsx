import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Star, Clock3 } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const MEMORY_TYPE_COLORS = {
  episodic: "#3b82f6", semantic: "#10b981", procedural: "#a855f7",
  contextual: "#f97316", working: "#f59e0b"
};

export default function GDSGASCIMemoryPage() {
  const { data: memory = [], isLoading: loadM } = useQuery({
    queryKey: ["gasci-memory"],
    queryFn: () => base44.entities.MemoryRecord.list("-created_at", 100).catch(() => []),
  });

  const { data: patterns = [], isLoading: loadP } = useQuery({
    queryKey: ["gasci-patterns"],
    queryFn: () => base44.entities.PatternLibrary.list("-last_seen", 100).catch(() => []),
  });

  const stats = {
    total: memory.length,
    pinned: memory.filter(m => m.is_pinned).length,
    avgImportance: memory.length > 0 ? Math.round(memory.reduce((sum, m) => sum + (m.importance_score || 0), 0) / memory.length * 100) : 0
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Memory" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">AI Memory Center</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Memory records and pattern library</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Records</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Pinned</p>
          <div className="flex items-center justify-center gap-2">
            <Star className="w-4 h-4" style={{ color: HIGH }} />
            <p className="text-2xl font-black" style={{ color: HIGH }}>{stats.pinned}</p>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Importance</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{stats.avgImportance}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Patterns</p>
          <p className="text-2xl font-black" style={{ color: "#a855f7" }}>{patterns.length}</p>
        </Card>
      </div>

      {/* Memory Records */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Memory Records</h3>
        </div>
        <Card className="overflow-hidden">
          {loadM ? <Skeleton lines={5} /> : memory.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>No memory records</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Subject", "Type", "Summary", "Importance", "Confidence", "Pinned", "Access Count", "Last Accessed", "Expires"].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {memory.map(m => (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-4"><p className="text-xs font-semibold text-white max-w-xs truncate">{m.subject}</p></td>
                      <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${MEMORY_TYPE_COLORS[m.memory_type] || MUTED}30`, color: MEMORY_TYPE_COLORS[m.memory_type] || MUTED }}>{m.memory_type}</span></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }} className="max-w-xs truncate">{m.content_summary || m.content}</p></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${(m.importance_score || 0) * 100}%`, background: LOW }} />
                          </div>
                          <span className="text-[9px]" style={{ color: MUTED }}>{Math.round((m.importance_score || 0) * 100)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{m.confidence_percent || 0}%</p></td>
                      <td className="py-3 px-4">{m.is_pinned ? <Star className="w-4 h-4" style={{ color: HIGH }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{m.access_count || 0}</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{m.last_accessed ? new Date(m.last_accessed).toLocaleDateString() : '—'}</p></td>
                      <td className="py-3 px-4"><p className={`text-xs ${m.expires_at && new Date(m.expires_at) < new Date(Date.now() + 7*24*60*60*1000) ? 'text-yellow-400' : 'text-slate-400'}`}>{m.expires_at ? new Date(m.expires_at).toLocaleDateString() : 'Never'}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Pattern Library */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5" style={{ color: "#a855f7" }} />
          <h3 className="text-sm font-bold text-white">Pattern Library</h3>
        </div>
        <Card className="overflow-hidden">
          {loadP ? <Skeleton lines={5} /> : patterns.length === 0 ? (
            <div className="text-center py-8"><p className="text-sm" style={{ color: MUTED }}>No patterns</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Pattern Name", "Type", "Confidence", "Occurrences", "Severity", "Last Seen"].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patterns.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-4"><p className="text-xs font-semibold text-white">{p.pattern_name}</p></td>
                      <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{p.pattern_type}</span></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{p.confidence || 0}%</p></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{p.occurrence_count || 0}</p></td>
                      <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded ${p.severity === 'critical' ? 'bg-red-400/20 text-red-400' : p.severity === 'high' ? 'bg-orange-400/20 text-orange-400' : 'bg-blue-400/20 text-blue-400'}`}>{p.severity}</span></td>
                      <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{p.last_seen ? new Date(p.last_seen).toLocaleDateString() : '—'}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}