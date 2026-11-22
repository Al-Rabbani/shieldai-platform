import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BookOpen, Play, Shield, AlertTriangle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const SCENARIO_TYPES = {
  ransomware: DANGER, apt: HIGH, kerberoasting: "#f97316", c2: "#f59e0b",
  lateral_movement: "#a855f7", data_exfiltration: DANGER, privilege_escalation: HIGH,
  initial_access: MEDIUM, persistence: "#ef4444"
};

const DIFFICULTY_COLORS = {
  trivial: LOW, easy: "#3b82f6", moderate: MEDIUM, hard: HIGH, expert: DANGER
};

export default function GDSPurpleScenariosPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedScenario, setSelectedScenario] = useState(null);

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["purple-scenarios"], queryFn: () => base44.entities.SimulationScenario.list("", 100).catch(() => []),
  });

  const filtered = scenarios.filter(s => {
    const matchSearch = !search || s.scenario_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || s.scenario_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "Scenario Library" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <BookOpen className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Scenario Library</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Pre-built simulation scenarios for purple team exercises</p>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search scenarios..." className="px-3 py-2 rounded-xl text-xs font-bold outline-none w-64" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            {Object.keys(SCENARIO_TYPES).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </Card>

      {isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No scenarios" description="Add simulation scenarios to your library" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((scenario) => {
            const typeColor = SCENARIO_TYPES[scenario.scenario_type] || MUTED;
            const diffColor = DIFFICULTY_COLORS[scenario.difficulty_level] || MUTED;
            return (
              <Card key={scenario.id} className="p-5 cursor-pointer hover:scale-[1.01] transition-transform" style={{ background: CARD, border: `1px solid ${BORDER}` }} onClick={() => setSelectedScenario(scenario)}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex-1">{scenario.scenario_name}</h3>
                  <Play className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: CYAN }} />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>{scenario.scenario_type?.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${diffColor}15`, color: diffColor }}>{scenario.difficulty_level}</span>
                  </div>
                  <p className="text-[10px]" style={{ color: MUTED }}>Adversary: {scenario.adversary_profile || 'Unknown'}</p>
                  {scenario.mitre_techniques?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>MITRE Techniques</p>
                      <div className="flex flex-wrap gap-1">
                        {scenario.mitre_techniques.slice(0, 3).map((t, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(0,212,255,0.08)", color: CYAN }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-3 border-t" style={{ borderColor: BORDER }}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span style={{ color: MUTED }}>Times Executed</span>
                      <span style={{ color: TEXT }}>{scenario.times_executed || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] mt-1">
                      <span style={{ color: MUTED }}>Success Rate</span>
                      <span style={{ color: scenario.detection_success_rate >= 0.7 ? LOW : scenario.detection_success_rate >= 0.4 ? MEDIUM : DANGER }}>{((scenario.detection_success_rate || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Scenario Detail Modal */}
      {selectedScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: "#0a1628" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedScenario.scenario_name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${SCENARIO_TYPES[selectedScenario.scenario_type] || MUTED}15`, color: SCENARIO_TYPES[selectedScenario.scenario_type] || MUTED }}>{selectedScenario.scenario_type?.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${DIFFICULTY_COLORS[selectedScenario.difficulty_level] || MUTED}15`, color: DIFFICULTY_COLORS[selectedScenario.difficulty_level] || MUTED }}>{selectedScenario.difficulty_level}</span>
                </div>
              </div>
              <button onClick={() => setSelectedScenario(null)} className="text-slate-400 hover:text-white"><span className="text-xl">×</span></button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-bold mb-2" style={{ color: TEXT }}>Description</p>
                <p style={{ color: MUTED }}>{selectedScenario.description || 'No description'}</p>
              </div>
              {selectedScenario.execution_steps?.length > 0 && (
                <div>
                  <p className="font-bold mb-2" style={{ color: TEXT }}>Execution Steps</p>
                  <ol className="space-y-2">
                    {selectedScenario.execution_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>{i + 1}</span>
                        <p style={{ color: MUTED }}>{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {selectedScenario.sigma_rules?.length > 0 && (
                <div>
                  <p className="font-bold mb-2" style={{ color: TEXT }}>Sigma Rules</p>
                  <div className="space-y-1">
                    {selectedScenario.sigma_rules.map((rule, i) => (
                      <p key={i} className="font-mono text-[10px] px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.05)", color: TEXT }}>{rule}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}