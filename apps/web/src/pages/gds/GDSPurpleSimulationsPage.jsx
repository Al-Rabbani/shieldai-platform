import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Plus, Play, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";

const BG = "#020817";

const STATUS_COLORS = {
  running: LOW, completed: CYAN, failed: DANGER, queued: MUTED,
  adversary_emulation: HIGH, breach_simulation: DANGER, purple_team: CYAN, red_team: DANGER, blue_team: "#3b82f6"
};

const GRADE_COLORS = { A: LOW, B: "#3b82f6", C: MEDIUM, D: HIGH, F: DANGER };

export default function GDSPurpleSimulationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedSim, setSelectedSim] = useState(null);

  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ["purple-simulations"], queryFn: () => base44.entities.Simulation.list("-started_at", 100).catch(() => []),
  });

  const filtered = simulations.filter(s => {
    const matchSearch = !search || s.simulation_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchType = typeFilter === "all" || s.simulation_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const runningCount = simulations.filter(s => s.status === "running").length;
  const completedCount = simulations.filter(s => s.status === "completed").length;
  const avgDetectionRate = simulations.filter(s => s.status === "completed").reduce((sum, s) => sum + (s.detection_rate || 0), 0) / (completedCount || 1) * 100;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "Simulations" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Activity className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Simulation Manager</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Manage and monitor purple team simulations</p>
          </div>
        </div>
        <Button className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Simulation
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Simulations</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{simulations.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${LOW}08`, border: `1px solid ${LOW}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Running</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{runningCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{completedCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Detection Rate</p>
          <p className="text-2xl font-black font-mono" style={{ color: avgDetectionRate >= 70 ? LOW : avgDetectionRate >= 40 ? MEDIUM : DANGER }}>{avgDetectionRate.toFixed(0)}%</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search simulations..."
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none w-64"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Statuses</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-bold outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Types</option>
            <option value="adversary_emulation">Adversary Emulation</option>
            <option value="breach_simulation">Breach Simulation</option>
            <option value="purple_team">Purple Team</option>
            <option value="red_team">Red Team</option>
          </select>
        </div>
      </Card>

      {isLoading ? <Skeleton lines={6} /> : filtered.length === 0 ? (
        <EmptyState icon={Activity} title="No simulations" description="Create a new simulation to get started" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Name", "Type", "Adversary", "Status", "Techniques", "Detected", "Prevented", "Missed", "Detection Rate", "Grade", "Duration", "Started"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((sim) => {
                const statusColor = STATUS_COLORS[sim.status] || MUTED;
                const typeColor = STATUS_COLORS[sim.simulation_type] || MUTED;
                const gradeColor = GRADE_COLORS[sim.security_grade] || MUTED;
                const detectionRate = (sim.detection_rate || 0) * 100;
                
                return (
                  <tr key={sim.id} className="hover:bg-white/[0.02] cursor-pointer" style={{ borderBottom: `1px solid ${BORDER}20` }} onClick={() => setSelectedSim(sim)}>
                    <td className="py-3 px-3"><p className="text-xs font-bold text-white">{sim.simulation_name}</p></td>
                    <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>{sim.simulation_type?.replace(/_/g, ' ')}</span></td>
                    <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{sim.adversary_profile || 'Custom'}</td>
                    <td className="py-3 px-3">
                      <span className={`flex items-center gap-1 text-[10px] font-semibold ${sim.status === 'running' ? 'animate-pulse' : ''}`} style={{ color: statusColor }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                        {sim.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{sim.total_techniques || 0}</td>
                    <td className="py-3 px-3 text-xs font-bold" style={{ color: LOW }}>{sim.techniques_detected || 0}</td>
                    <td className="py-3 px-3 text-xs font-bold" style={{ color: "#3b82f6" }}>{sim.techniques_prevented || 0}</td>
                    <td className="py-3 px-3 text-xs font-bold" style={{ color: DANGER }}>{sim.techniques_missed || 0}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className="h-full rounded-full" style={{ width: `${detectionRate}%`, background: detectionRate >= 70 ? LOW : detectionRate >= 40 ? MEDIUM : DANGER }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: detectionRate >= 70 ? LOW : detectionRate >= 40 ? MEDIUM : DANGER }}>{detectionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3"><span className="text-sm font-black px-2 py-0.5 rounded" style={{ background: `${gradeColor}15`, color: gradeColor }}>{sim.security_grade || '—'}</span></td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{sim.duration_minutes ? `${sim.duration_minutes}m` : '—'}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(sim.started_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Simulation Detail Modal */}
      {selectedSim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <Card className="w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" style={{ background: "#0a1628" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedSim.simulation_name}</h3>
                <p className="text-xs" style={{ color: MUTED }}>Started: {timeAgo(selectedSim.started_at)}</p>
              </div>
              <button onClick={() => setSelectedSim(null)} className="text-slate-400 hover:text-white"><span className="text-xl">×</span></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Security Grade</p>
                <p className="text-2xl font-black" style={{ color: GRADE_COLORS[selectedSim.security_grade] || MUTED }}>{selectedSim.security_grade || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Detection Rate</p>
                <p className="text-2xl font-black" style={{ color: LOW }}>{((selectedSim.detection_rate || 0) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Techniques</p>
                <p className="text-2xl font-black" style={{ color: TEXT }}>{selectedSim.total_techniques || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold mb-1" style={{ color: MUTED }}>Duration</p>
                <p className="text-2xl font-black" style={{ color: TEXT }}>{selectedSim.duration_minutes || 0}m</p>
              </div>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-bold mb-2" style={{ color: TEXT }}>Breakdown</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg" style={{ background: `${LOW}08`, border: `1px solid ${LOW}20` }}>
                    <p className="text-[10px] mb-1" style={{ color: MUTED }}>Detected</p>
                    <p className="text-lg font-bold" style={{ color: LOW }}>{selectedSim.techniques_detected || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: `rgba(59,130,246,0.08)`, border: `1px solid rgba(59,130,246,0.3)` }}>
                    <p className="text-[10px] mb-1" style={{ color: MUTED }}>Prevented</p>
                    <p className="text-lg font-bold" style={{ color: "#3b82f6" }}>{selectedSim.techniques_prevented || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                    <p className="text-[10px] mb-1" style={{ color: MUTED }}>Missed</p>
                    <p className="text-lg font-bold" style={{ color: DANGER }}>{selectedSim.techniques_missed || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}