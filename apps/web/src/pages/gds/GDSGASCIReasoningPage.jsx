import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lightbulb, Search } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";

const BG = "#020817";

export default function GDSGASCIReasoningPage() {
  const [filterConfidence, setFilterConfidence] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["gasci-reasoning", filterConfidence],
    queryFn: () => base44.entities.ReasoningRecord.list("-created_date", 200).then(r => {
      if (filterConfidence) return r.filter(rec => rec.confidence_level === filterConfidence);
      return r;
    }).catch(() => []),
  });

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "GASCI", path: "/gasci" }, { label: "Reasoning" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Reasoning Explorer</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>AI reasoning chains and decision logic</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <select value={filterConfidence} onChange={(e) => setFilterConfidence(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Confidence Levels</option>
            <option value="very_high">Very High</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="very_low">Very Low</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : records.length === 0 ? (
          <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No reasoning records</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Question", "Decision", "Confidence", "Level", "Model", "Duration", "Created"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedRecord(record)}>
                    <td className="py-3 px-4"><p className="text-xs text-white max-w-xs truncate">{record.question}</p></td>
                    <td className="py-3 px-4"><span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{record.decision_type}</span></td>
                    <td className="py-3 px-4"><p className={`text-xs font-bold ${record.confidence_score >= 80 ? 'text-green-400' : record.confidence_score >= 65 ? 'text-yellow-400' : 'text-red-400'}`}>{record.confidence_score || 0}%</p></td>
                    <td className="py-3 px-4"><span className={`text-[10px] px-2 py-0.5 rounded ${record.confidence_level === 'very_high' ? 'bg-green-400/20 text-green-400' : record.confidence_level === 'high' ? 'bg-blue-400/20 text-blue-400' : 'bg-gray-400/20 text-gray-400'}`}>{record.confidence_level}</span></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: TEXT }}>{record.ai_model || "—"}</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{record.duration_ms || 0}ms</p></td>
                    <td className="py-3 px-4"><p className="text-xs" style={{ color: MUTED }}>{new Date(record.created_at).toLocaleDateString()}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedRecord.decision_type}</h3>
                <p className="text-[10px]" style={{ color: MUTED }}>{selectedRecord.question}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white"><span className="text-2xl">×</span></button>
            </div>
            <div className="mb-4">
              <p className="text-xs font-bold mb-2" style={{ color: CYAN }}>Reasoning Chain</p>
              <div className="space-y-2">
                {(selectedRecord.reasoning_chain || []).map((step, i) => (
                  <div key={i} className="p-3 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                    <p className="font-semibold text-white mb-1">Step {i + 1}</p>
                    <p className="text-[10px]" style={{ color: TEXT }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setSelectedRecord(null)} className="w-full px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Close</button>
          </Card>
        </div>
      )}
    </div>
  );
}