import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, TrendingUp, Shield, CheckCircle, XCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const TACTIC_COLORS = {
  reconnaissance: "#3b82f6", resource_development: "#8b5cf6", initial_access: DANGER,
  execution: HIGH, persistence: "#f59e0b", privilege_escalation: "#ef4444",
  defense_evasion: MEDIUM, credential_access: "#a855f7", discovery: "#14b8a6",
  lateral_movement: "#f97316", collection: "#ec4899", command_and_control: DANGER,
  exfiltration: "#6366f1", impact: DANGER
};

export default function GDSPurpleCoveragePage() {
  const [selectedTactic, setSelectedTactic] = useState(null);

  const { data: coverageScores = [], isLoading: loadC } = useQuery({
    queryKey: ["purple-coverage-scores"], queryFn: () => base44.entities.CoverageScore.list("-scored_at", 50).catch(() => []),
  });

  const { data: attackTechs = [], isLoading: loadA } = useQuery({
    queryKey: ["attack-techniques"], queryFn: () => base44.entities.ATTACKTechnique.list("", 300).catch(() => []),
  });

  const { data: attackTactics = [], isLoading: loadT } = useQuery({
    queryKey: ["attack-tactics"], queryFn: () => base44.entities.ATTACKTactic.list("", 20).catch(() => []),
  });

  const latestCoverage = coverageScores[0];
  const totalTechniques = attackTechs.length;
  const coveredTechniques = attackTechs.filter(t => t.is_validated || t.is_detected).length;
  const coveragePct = totalTechniques > 0 ? Math.round((coveredTechniques / totalTechniques) * 100) : 0;

  // Group techniques by tactic
  const techniquesByTactic = attackTactics.map(tactic => {
    const tacticTechs = attackTechs.filter(t => t.tactic === tactic.tactic_name);
    const covered = tacticTechs.filter(t => t.is_validated || t.is_detected).length;
    return {
      tactic: tactic.tactic_name,
      tactic_id: tactic.tactic_id,
      total: tacticTechs.length,
      covered,
      coverage_pct: tacticTechs.length > 0 ? Math.round((covered / tacticTechs.length) * 100) : 0
    };
  }).sort((a, b) => a.coverage_pct - b.coverage_pct);

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "ATT&CK Coverage" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Target className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">ATT&CK Coverage Navigator</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Visualize MITRE ATT&CK technique coverage across all tactics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tactics</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{attackTactics.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Techniques</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{totalTechniques}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Validated</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{coveredTechniques}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Detected</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{attackTechs.filter(t => t.is_detected).length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Missed</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{attackTechs.filter(t => !t.is_detected && !t.is_validated).length}</p>
        </Card>
      </div>

      {/* Heatmap */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">MITRE ATT&CK Heatmap</h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: DANGER }} /><span style={{ color: MUTED }}>0%</span></span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: MEDIUM }} /><span style={{ color: MUTED }}>50%</span></span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: LOW }} /><span style={{ color: MUTED }}>100%</span></span>
          </div>
        </div>
        {loadC || loadA || loadT ? <Skeleton lines={4} /> : (
          <div className="grid grid-cols-7 md:grid-cols-14 gap-2">
            {techniquesByTactic.map((tactic, i) => {
              const color = TACTIC_COLORS[tactic.tactic?.toLowerCase()] || MUTED;
              const intensity = tactic.coverage_pct >= 80 ? 1 : tactic.coverage_pct >= 50 ? 0.6 : tactic.coverage_pct >= 20 ? 0.3 : 0.1;
              return (
                <Card key={i} className="p-3 text-center cursor-pointer hover:scale-105 transition-transform" style={{ background: `${color}${Math.round(intensity * 99).toString(16).padStart(2, '0')}`, border: `1px solid ${color}40` }} onClick={() => setSelectedTactic(tactic)}>
                  <p className="text-[9px] font-bold uppercase tracking-tight mb-1" style={{ color: 'white' }}>{tactic.tactic?.split('_')[0]}</p>
                  <p className="text-lg font-black" style={{ color: tactic.coverage_pct >= 50 ? 'white' : MUTED }}>{tactic.coverage_pct}%</p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{tactic.covered}/{tactic.total}</p>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Coverage Trend */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Coverage Trend</h3>
        </div>
        {loadC ? <Skeleton lines={3} /> : coverageScores.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No trend data" description="Coverage scores will appear here over time" />
        ) : (
          <div className="flex items-end gap-1 h-32">
            {coverageScores.slice(0, 20).reverse().map((score, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-full rounded-t-sm" style={{ height: `${(score.coverage_pct || 0)}%`, background: score.coverage_pct >= 80 ? LOW : score.coverage_pct >= 50 ? MEDIUM : DANGER, minHeight: '4px' }} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Coverage by Tactic Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Coverage by Tactic (Worst First)</h3>
        {loadT ? <Skeleton lines={6} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Tactic", "MITRE ID", "Total Techniques", "Covered", "Coverage %"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {techniquesByTactic.map((tactic, i) => {
                  const color = TACTIC_COLORS[tactic.tactic?.toLowerCase()] || MUTED;
                  return (
                    <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-3 px-3">
                        <span className="text-xs font-bold" style={{ color }}>{tactic.tactic?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{tactic.tactic_id || '—'}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{tactic.total}</td>
                      <td className="py-3 px-3 text-xs font-bold" style={{ color: LOW }}>{tactic.covered}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                            <div className="h-full rounded-full" style={{ width: `${tactic.coverage_pct}%`, background: tactic.coverage_pct >= 80 ? LOW : tactic.coverage_pct >= 50 ? MEDIUM : DANGER }} />
                          </div>
                          <span className={`text-[10px] font-bold ${tactic.coverage_pct >= 80 ? 'text-green-400' : tactic.coverage_pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{tactic.coverage_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Tactic Detail Modal */}
      {selectedTactic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-lg p-6" style={{ background: "#0a1628" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedTactic.tactic?.replace(/_/g, ' ')}</h3>
                <p className="text-xs font-mono" style={{ color: CYAN }}>{selectedTactic.tactic_id}</p>
              </div>
              <button onClick={() => setSelectedTactic(null)} className="text-slate-400 hover:text-white"><span className="text-xl">×</span></button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-[10px] mb-1" style={{ color: MUTED }}>Total</p>
                <p className="text-xl font-bold" style={{ color: TEXT }}>{selectedTactic.total}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: `${LOW}08` }}>
                <p className="text-[10px] mb-1" style={{ color: MUTED }}>Covered</p>
                <p className="text-xl font-bold" style={{ color: LOW }}>{selectedTactic.covered}</p>
              </div>
              <div className="text-center p-3 rounded-lg" style={{ background: `${DANGER}08` }}>
                <p className="text-[10px] mb-1" style={{ color: MUTED }}>Missed</p>
                <p className="text-xl font-bold" style={{ color: DANGER }}>{selectedTactic.total - selectedTactic.covered}</p>
              </div>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full" style={{ width: `${selectedTactic.coverage_pct}%`, background: selectedTactic.coverage_pct >= 80 ? LOW : selectedTactic.coverage_pct >= 50 ? MEDIUM : DANGER }} />
            </div>
            <p className="text-center text-2xl font-bold" style={{ color: selectedTactic.coverage_pct >= 80 ? LOW : selectedTactic.coverage_pct >= 50 ? MEDIUM : DANGER }}>{selectedTactic.coverage_pct}% Coverage</p>
          </Card>
        </div>
      )}
    </div>
  );
}