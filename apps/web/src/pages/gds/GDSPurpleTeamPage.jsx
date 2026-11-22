import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Shield, AlertTriangle, TrendingUp, Activity, Zap, Network } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import MITREHeatmap from "@/components/gds/MITREHeatmap";

const BG = "#020817";

const SCENARIO_TYPES = {
  ransomware: DANGER, apt: "#ef4444", kerberoasting: HIGH, c2: "#f59e0b",
  lateral_movement: "#a855f7", data_exfiltration: DANGER, privilege_escalation: HIGH, initial_access: MEDIUM
};

const DIFFICULTY_COLORS = {
  trivial: LOW, easy: CYAN, moderate: MEDIUM, hard: HIGH, expert: DANGER
};

function GradeGauge({ grade, size = 120 }) {
  const gradeValue = { A: 100, B: 80, C: 60, D: 40, F: 20 }[grade] || 0;
  const gradeColor = grade === 'A' ? LOW : grade === 'B' ? CYAN : grade === 'C' ? MEDIUM : grade === 'D' ? HIGH : DANGER;
  const radius = size / 2 - 8;
  const circumference = Math.PI * radius;
  const pct = (gradeValue / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size * 0.6 }}>
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        <path d={`M ${8} ${size * 0.5} A ${radius} ${radius} 0 1 1 ${size - 8} ${size * 0.5}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
        <path d={`M ${8} ${size * 0.5} A ${radius} ${radius} 0 1 1 ${size - 8} ${size * 0.5}`} fill="none" stroke={gradeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${pct} ${circumference - pct}`} style={{ filter: `drop-shadow(0 0 8px ${gradeColor}55)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: size * 0.25 }}>
        <span className="text-4xl font-black" style={{ color: gradeColor }}>{grade || 'F'}</span>
      </div>
    </div>
  );
}

function MiniGauge({ value, label, color }) {
  const radius = 30;
  const circumference = Math.PI * radius;
  const pct = (value / 100) * circumference;
  
  return (
    <Card className="p-4 text-center">
      <div className="relative mx-auto mb-2" style={{ width: 70, height: 40 }}>
        <svg width={70} height={40} viewBox="0 0 70 40">
          <path d="M 5 35 A 30 30 0 1 1 65 35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round" />
          <path d="M 5 35 A 30 30 0 1 1 65 35" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${pct} ${circumference - pct}`} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color, paddingTop: 18 }}>{value}%</div>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{label}</p>
    </Card>
  );
}

export default function GDSPurpleTeamPage() {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowCharts(true), 400); return () => clearTimeout(t); }, []);

  const { data: simulations = [], isLoading: loadS } = useQuery({
    queryKey: ["purple-simulations"], queryFn: () => base44.entities.Simulation.list("-started_at", 20).catch(() => []),
  });

  const { data: scenarios = [], isLoading: loadSc } = useQuery({
    queryKey: ["purple-scenarios"], queryFn: () => base44.entities.SimulationScenario.list("", 50).catch(() => []),
  });

  const { data: coverageScores = [], isLoading: loadC } = useQuery({
    queryKey: ["purple-coverage-scores"], queryFn: () => base44.entities.CoverageScore.list("-scored_at", 30).catch(() => []),
  });

  const { data: gaps = [], isLoading: loadG } = useQuery({
    queryKey: ["purple-gaps"], queryFn: () => base44.entities.DetectionGap.list("", 100).catch(() => []),
  });

  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["purple-findings"], queryFn: () => base44.entities.PurpleFinding.list("-created_date", 50).catch(() => []),
  });

  const { data: techniques = [], isLoading: loadT } = useQuery({
    queryKey: ["attack-techniques"], queryFn: () => base44.entities.ATTACKTechnique.list("", 300).catch(() => []),
  });

  const { data: tactics = [], isLoading: loadTac } = useQuery({
    queryKey: ["attack-tactics"], queryFn: () => base44.entities.ATTACKTactic.list("", 20).catch(() => []),
  });

  const latestSim = simulations[0];
  const avgDetectionRate = simulations.length > 0 ? Math.round(simulations.reduce((s, sim) => s + (sim.detection_rate || 0), 0) / simulations.length) : 0;
  const totalGaps = gaps.filter(g => g.status !== 'remediated').length;
  const criticalGaps = gaps.filter(g => g.severity === 'critical' && g.status !== 'remediated').length;
  const overallGrade = latestSim?.overall_grade || 'F';
  const attckCoverage = coverageScores.length > 0 ? Math.round(coverageScores[0].coverage_pct || 0) : 0;

  const scenarioTypes = [...new Set(scenarios.map(s => s.scenario_type))];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Target className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Purple Team Command Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Continuous security validation through adversarial simulation</p>
          </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Simulations Run</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{simulations.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>ATT&CK Coverage</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className={`text-2xl font-black font-mono ${attckCoverage >= 80 ? 'text-green-400' : attckCoverage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{attckCoverage}%</span>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Detection Rate</p>
          <p className={`text-2xl font-black font-mono ${avgDetectionRate >= 80 ? 'text-green-400' : avgDetectionRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{avgDetectionRate}%</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Detection Gaps</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className={`w-2 h-2 rounded-full animate-pulse ${totalGaps > 0 ? 'bg-red-400' : 'bg-gray-400'}`} />
            <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{totalGaps}</p>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Sigma Rules</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{scenarios.reduce((s, sc) => s + (sc.sigma_rules?.length || 0), 0)}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Security Grade</p>
          <p className={`text-4xl font-black ${overallGrade === 'A' ? 'text-green-400' : overallGrade === 'B' ? 'text-cyan-400' : overallGrade === 'C' ? 'text-yellow-400' : overallGrade === 'D' ? 'text-orange-400' : 'text-red-400'}`}>{overallGrade}</p>
        </Card>
      </div>

      {/* Gauge Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniGauge value={avgDetectionRate} label="Detection Rate" color={LOW} />
        <MiniGauge value={simulations.length > 0 ? Math.round(simulations.reduce((s, sim) => s + (sim.prevention_rate || 0), 0) / simulations.length) : 0} label="Prevention Rate" color={CYAN} />
        <MiniGauge value={simulations.length > 0 ? Math.round(simulations.reduce((s, sim) => s + (sim.miss_rate || 0), 0) / simulations.length) : 0} label="Miss Rate" color={DANGER} />
        <MiniGauge value={attckCoverage} label="Coverage %" color={MEDIUM} />
      </div>

      {/* MITRE ATT&CK Heatmap */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">MITRE ATT&CK Coverage Heatmap</h3>
          </div>
          <div className="text-[10px]" style={{ color: MUTED }}>
            Click tactics to view details
          </div>
        </div>
        {loadT || loadTac ? <Skeleton lines={4} /> : techniques.length === 0 ? (
          <EmptyState icon={Network} title="No ATT&CK data" description="Import MITRE ATT&CK techniques to visualize coverage" />
        ) : (
          <MITREHeatmap techniques={techniques} tactics={tactics} />
        )}
      </Card>

      {/* Latest Simulation Results */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Latest Simulation Results</h3>
          </div>
        </div>
        {loadS ? <Skeleton lines={4} /> : !latestSim ? (
          <EmptyState icon={Target} title="No simulations yet" description="Launch your first adversarial simulation" />
        ) : (
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
            <GradeGauge grade={latestSim.overall_grade} size={100} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-base font-bold text-white">{latestSim.name}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${latestSim.simulation_type === 'adversary_emulation' ? 'bg-red-400/15 text-red-400' : latestSim.simulation_type === 'breach_simulation' ? 'bg-orange-400/15 text-orange-400' : 'bg-blue-400/15 text-blue-400'}`}>
                  {latestSim.simulation_type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="font-bold mb-1" style={{ color: MUTED }}>Detection Rate</p>
                  <p className={`text-lg font-bold ${latestSim.detection_rate >= 80 ? 'text-green-400' : latestSim.detection_rate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{latestSim.detection_rate}%</p>
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ color: MUTED }}>Gaps Found</p>
                  <p className="text-lg font-bold" style={{ color: DANGER }}>{latestSim.gaps_identified || 0}</p>
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ color: MUTED }}>Adversary</p>
                  <p className="text-sm" style={{ color: TEXT }}>{latestSim.adversary_profile || 'Custom'}</p>
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ color: MUTED }}>Started</p>
                  <p className="text-sm" style={{ color: MUTED }}>{timeAgo(latestSim.started_at)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Scenario Library Quick Launch */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: HIGH }} />
            <h3 className="text-sm font-bold text-white">Scenario Library - Quick Launch</h3>
          </div>
        </div>
        {loadSc ? <Skeleton lines={4} /> : scenarios.length === 0 ? (
          <EmptyState icon={Zap} title="No scenarios" description="Add simulation scenarios to your library" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {scenarios.slice(0, 8).map((scenario) => {
              const typeColor = SCENARIO_TYPES[scenario.scenario_type] || MUTED;
              const diffColor = DIFFICULTY_COLORS[scenario.difficulty_level] || MUTED;
              return (
                <Card key={scenario.id} className="p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="mb-3">
                    <h4 className="text-xs font-bold text-white mb-2">{scenario.scenario_name}</h4>
                    <div className="flex items-center gap-1 mb-2 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>
                        {scenario.scenario_type?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${diffColor}15`, color: diffColor }}>
                        {scenario.difficulty_level}
                      </span>
                    </div>
                    <p className="text-[10px]" style={{ color: MUTED }}>Adversary: {scenario.adversary_profile || 'Unknown'}</p>
                  </div>
                  <Button 
                    onClick={() => setSelectedScenario(scenario)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold"
                    style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
                  >
                    Launch →
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Launch Scenario Modal */}
      {selectedScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-lg p-6" style={{ background: "#0a1628" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Launch Simulation</h3>
              <button onClick={() => setSelectedScenario(null)} className="text-slate-400 hover:text-white">
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: TEXT }}>Scenario</p>
                <p className="text-sm" style={{ color: MUTED }}>{selectedScenario.scenario_name}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}30` }}>
                <p className="text-[10px] font-bold mb-1" style={{ color: DANGER }}>⚠️ Approval Required</p>
                <p className="text-xs" style={{ color: MUTED }}>This simulation requires authorization before execution.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setSelectedScenario(null)} className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: MUTED }}>Cancel</button>
                <button className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>Request Approval</button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}