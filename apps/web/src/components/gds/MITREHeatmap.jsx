import React, { useState } from "react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";
import { X, ChevronRight, Shield, CheckCircle, AlertTriangle } from "lucide-react";

const TACTIC_COLORS = {
  reconnaissance: "#3b82f6",
  resource_development: "#8b5cf6",
  initial_access: DANGER,
  execution: HIGH,
  persistence: "#f59e0b",
  privilege_escalation: "#ef4444",
  defense_evasion: MUTED,
  credential_access: "#a855f7",
  discovery: "#14b8a6",
  lateral_movement: "#f97316",
  collection: "#ec4899",
  command_and_control: DANGER,
  exfiltration: "#6366f1",
  impact: DANGER
};

const COVERAGE_COLORS = {
  0: "#1e293b",
  25: "#dc2626",
  50: "#f59e0b",
  75: "#10b981",
  100: "#059669"
};

export default function MITREHeatmap({ techniques, tactics }) {
  const [selectedTactic, setSelectedTactic] = useState(null);

  const getCoverageColor = (pct) => {
    if (pct >= 100) return COVERAGE_COLORS[100];
    if (pct >= 75) return COVERAGE_COLORS[75];
    if (pct >= 50) return COVERAGE_COLORS[50];
    if (pct >= 25) return COVERAGE_COLORS[25];
    return COVERAGE_COLORS[0];
  };

  const groupedByTactic = (tactics || []).map(tactic => {
    const tacticTechs = (techniques || []).filter(t => t.tactic === tactic.tactic_name) || [];
    return {
      tactic: tactic.tactic_name,
      tactic_id: tactic.tactic_id,
      techniques: tacticTechs
    };
  });

  const handleTacticClick = (tacticGroup) => {
    setSelectedTactic(tacticGroup);
  };

  const closeModal = () => setSelectedTactic(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-[10px]">
        <span style={{ color: MUTED }}>Coverage:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: COVERAGE_COLORS[100] }} />
          <span style={{ color: MUTED }}>100%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: COVERAGE_COLORS[75] }} />
          <span style={{ color: MUTED }}>75%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: COVERAGE_COLORS[50] }} />
          <span style={{ color: MUTED }}>50%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: COVERAGE_COLORS[25] }} />
          <span style={{ color: MUTED }}>25%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: COVERAGE_COLORS[0] }} />
          <span style={{ color: MUTED }}>0%</span>
        </div>
      </div>

      <div className="grid grid-cols-7 md:grid-cols-14 gap-1.5">
        {groupedByTactic.map((tacticGroup, i) => {
          const tacticColor = TACTIC_COLORS[tacticGroup.tactic?.toLowerCase()] || MUTED;
          const coveredCount = tacticGroup.techniques.filter(t => t.is_validated || t.is_detected).length;
          const totalCount = tacticGroup.techniques.length;
          const coveragePct = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;
          const bgColor = getCoverageColor(coveragePct);

          return (
            <div
              key={i}
              onClick={() => handleTacticClick(tacticGroup)}
              className="relative group cursor-pointer rounded-md p-2 transition-all hover:scale-105 active:scale-95"
              style={{ background: bgColor, border: `1px solid ${tacticColor}40`, boxShadow: coveragePct < 50 ? `0 0 12px ${DANGER}40` : 'none' }}
              title={`${tacticGroup.tactic?.replace(/_/g, ' ')}: ${coveragePct}% coverage (${coveredCount}/${totalCount}) - Click for details`}
            >
              <div className="text-center">
                <p className="text-[8px] font-bold uppercase tracking-tight mb-1" style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {tacticGroup.tactic?.split('_')[0]?.slice(0, 8)}
                </p>
                <p className="text-sm font-black" style={{ color: coveragePct >= 50 ? 'white' : MUTED, textShadow: coveragePct >= 50 ? '0 1px 2px rgba(0,0,0,0.8)' : 'none' }}>
                  {coveragePct}%
                </p>
                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {coveredCount}/{totalCount}
                </p>
              </div>

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-xl"
                style={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: TEXT }}>
                <p className="font-bold mb-1" style={{ color: tacticColor }}>{tacticGroup.tactic?.replace(/_/g, ' ')}</p>
                <p style={{ color: MUTED }}>Coverage: {coveragePct}%</p>
                <p style={{ color: MUTED }}>Validated: {coveredCount}/{totalCount}</p>
                {coveragePct < 50 && (
                  <p className="mt-1 font-bold" style={{ color: DANGER }}>⚠️ Coverage Gap</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t" style={{ borderColor: BORDER }}>
        {groupedByTactic
          .map(tg => {
            const covered = tg.techniques.filter(t => t.is_validated || t.is_detected).length;
            const total = tg.techniques.length;
            const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
            return { tactic: tg.tactic, covered, total, pct };
          })
          .filter(t => t.pct < 50)
          .sort((a, b) => a.pct - b.pct)
          .slice(0, 4)
          .map((t, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: DANGER }}>{t.tactic?.replace(/_/g, ' ')}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-black" style={{ color: DANGER }}>{t.pct}%</span>
                <span className="text-[10px]" style={{ color: MUTED }}>{t.covered}/{t.total}</span>
              </div>
            </div>
          ))}
        {groupedByTactic.filter(tg => {
          const covered = tg.techniques.filter(t => t.is_validated || t.is_detected).length;
          const total = tg.techniques.length;
          return total > 0 ? Math.round((covered / total) * 100) < 50 : false;
        }).length === 0 && (
          <div className="col-span-4 text-center py-3">
            <p className="text-xs font-bold" style={{ color: LOW }}>✓ All tactics have ≥50% coverage</p>
          </div>
        )}
      </div>

      {/* Tactic Detail Modal */}
      {selectedTactic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }} onClick={closeModal}>
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" style={{ background: "#0a1628" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6" style={{ color: TACTIC_COLORS[selectedTactic.tactic?.toLowerCase()] || CYAN }} />
                <h3 className="text-lg font-bold text-white">{selectedTactic.tactic?.replace(/_/g, ' ')}</h3>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Techniques</p>
                <p className="text-2xl font-black" style={{ color: CYAN }}>{selectedTactic.techniques.length}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: `${LOW}08`, border: `1px solid ${LOW}20` }}>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Validated</p>
                <p className="text-2xl font-black" style={{ color: LOW }}>
                  {selectedTactic.techniques.filter(t => t.is_validated || t.is_detected).length}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Coverage Gap</p>
                <p className="text-2xl font-black" style={{ color: DANGER }}>
                  {selectedTactic.techniques.filter(t => !t.is_validated && !t.is_detected).length}
                </p>
              </div>
            </div>

            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <ChevronRight className="w-4 h-4" style={{ color: CYAN }} />
              Technique Details
            </h4>

            {selectedTactic.techniques.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: MUTED }} />
                <p className="text-sm font-bold" style={{ color: MUTED }}>No techniques mapped to this tactic</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedTactic.techniques.map((tech, idx) => {
                  const isValidated = tech.is_validated || tech.is_detected;
                  return (
                    <div key={tech.id || idx} className="p-3 rounded-lg flex items-center justify-between"
                      style={{ 
                        background: isValidated ? `${LOW}08` : `${DANGER}08`,
                        border: `1px solid ${isValidated ? LOW + '20' : DANGER + '20'}`
                      }}>
                      <div className="flex items-center gap-3 flex-1">
                        {isValidated ? (
                          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: LOW }} />
                        ) : (
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: DANGER }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{tech.technique_name || tech.name || 'Unnamed Technique'}</p>
                          {tech.technique_id && (
                            <p className="text-[9px] font-mono" style={{ color: MUTED }}>{tech.technique_id}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {tech.simulation_count != null && (
                          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>
                            {tech.simulation_count} sims
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          isValidated ? 'bg-green-400/15 text-green-400' : 'bg-red-400/15 text-red-400'
                        }`}>
                          {isValidated ? 'VALIDATED' : 'GAP'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 pt-4 mt-4 border-t" style={{ borderColor: BORDER }}>
              <button onClick={closeModal} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>
                Close
              </button>
              {!selectedTactic.techniques.every(t => t.is_validated || t.is_detected) && (
                <button className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER }}>
                  Launch Simulation →
                </button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}