import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Database, Target, Zap, Shield, Lock, Clock, AlertTriangle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, BG,
  Card, Breadcrumb, Skeleton, EmptyState, timeAgo, PAGE_BG, SevBadge
} from "@/components/gds/GDSOSShared";

function formatUSD(val) {
  if (!val && val !== 0) return "$0";
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val}`;
}

function GradeBadge({ grade }) {
  const colors = { A: LOW, B: "#0ea5e9", C: MEDIUM, D: HIGH, F: DANGER };
  const color = colors[grade] || MUTED;
  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm" style={{ background: `${color}20`, color, border: `2px solid ${color}` }}>
      {grade || "F"}
    </span>
  );
}

function RiskTrajectoryBadge({ trajectory }) {
  const map = {
    improving: { color: LOW, label: "Improving" },
    stable: { color: "#0ea5e9", label: "Stable" },
    degrading: { color: HIGH, label: "Degrading" },
    critical_degrading: { color: DANGER, label: "Critical", pulse: true },
  };
  const cfg = map[trajectory] || map.stable;
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${cfg.pulse ? "animate-pulse" : ""}`}
      style={{ color: cfg.color, background: `${cfg.color}15`, border: `1px solid ${cfg.color}40` }}>
      {cfg.label}
    </span>
  );
}

export default function GDSCyberRangePage() {
  const { data: twins = [], isLoading: loadTwins } = useQuery({
    queryKey: ["cyber-range-twins"],
    queryFn: () => base44.entities.DigitalTwin.list("-last_synced", 50).catch(() => []),
  });
  const { data: environments = [], isLoading: loadEnvs } = useQuery({
    queryKey: ["cyber-range-envs"],
    queryFn: () => base44.entities.TwinEnvironment.list("-provisioned_at", 50).catch(() => []),
  });
  const { data: exercises = [], isLoading: loadExercises } = useQuery({
    queryKey: ["cyber-range-exercises"],
    queryFn: () => base44.entities.SimulationExercise.list("-completed_at", 50).catch(() => []),
  });
  const { data: chaos = [], isLoading: loadChaos } = useQuery({
    queryKey: ["cyber-range-chaos"],
    queryFn: () => base44.entities.ChaosExperiment.list("-completed_at", 50).catch(() => []),
  });
  const { data: forecasts = [], isLoading: loadForecasts } = useQuery({
    queryKey: ["cyber-range-forecasts"],
    queryFn: () => base44.entities.RiskForecast.list("-generated_at", 10).catch(() => []),
  });

  const activeTwins = twins.filter(t => t.is_active);
  const activeEnvs = environments.filter(e => e.status === "active");
  const completedExercises = exercises.filter(e => e.status === "completed");
  const avgGrade = completedExercises.length > 0
    ? Math.round(completedExercises.reduce((sum, e) => sum + (e.overall_score || 0), 0) / completedExercises.length)
    : 0;
  const latestForecast = forecasts[0];
  const isLoading = loadTwins || loadEnvs || loadExercises || loadChaos || loadForecasts;

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Command Center" }]} />
      
      <Card className="p-4" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}40` }}>
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5" style={{ color: DANGER }} />
          <p className="text-sm font-bold" style={{ color: DANGER }}>
            ISOLATION WARNING: All cyber range operations execute exclusively within isolated TwinEnvironment with verified network isolation. Zero production system access.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Active Twins</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{activeTwins.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Environments Live</p>
          <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{activeEnvs.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Exercises Completed</p>
          <p className="text-3xl font-black font-mono" style={{ color: HIGH }}>{completedExercises.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Chaos Experiments</p>
          <p className="text-3xl font-black font-mono" style={{ color: "#a855f7" }}>{chaos.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Avg Exercise Grade</p>
          <p className="text-3xl font-black font-mono" style={{ color: avgGrade > 70 ? LOW : avgGrade > 50 ? MEDIUM : DANGER }}>{avgGrade}%</p>
        </Card>
      </div>

      {latestForecast && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Current Risk Trajectory</h3>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-black" style={{ color: latestForecast.probability_pct > 60 ? DANGER : HIGH }}>{latestForecast.probability_pct}%</p>
                <p className="text-[9px] mt-1" style={{ color: MUTED }}>Probability</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black" style={{ color: CYAN }}>{formatUSD(latestForecast.projected_impact_usd)}</p>
                <p className="text-[9px] mt-1" style={{ color: MUTED }}>Projected Impact</p>
              </div>
              <div className="text-center">
                <RiskTrajectoryBadge trajectory={latestForecast.risk_trajectory} />
                <p className="text-[9px] mt-2" style={{ color: MUTED }}>Trajectory</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Active Digital Twins</h3>
            </div>
          </div>
          {isLoading ? <Skeleton lines={5} /> : activeTwins.length === 0 ? (
            <EmptyState icon={Database} title="No active twins" description="Digital twins will appear here" />
          ) : (
            <div className="space-y-2">
              {activeTwins.slice(0, 5).map(twin => (
                <div key={twin.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    <p className="text-xs font-bold text-white">{twin.twin_name}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>{twin.total_assets || 0} assets • {timeAgo(twin.last_synced)}</p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded ${twin.risk_score >= 70 ? "bg-red-400/20 text-red-400" : twin.risk_score >= 40 ? "bg-orange-400/20 text-orange-400" : "bg-green-400/20 text-green-400"}`}>
                    Risk: {twin.risk_score || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: HIGH }} />
              <h3 className="text-sm font-bold text-white">Latest Exercises</h3>
            </div>
          </div>
          {isLoading ? <Skeleton lines={5} /> : completedExercises.length === 0 ? (
            <EmptyState icon={Target} title="No exercises" description="Completed exercises will appear here" />
          ) : (
            <div className="space-y-2">
              {completedExercises.slice(0, 5).map(ex => (
                <div key={ex.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    <p className="text-xs font-bold text-white">{ex.exercise_name}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>{ex.sector} • Detection: {ex.detection_rate_pct}%</p>
                  </div>
                  <GradeBadge grade={ex.grade} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: "#a855f7" }} />
              <h3 className="text-sm font-bold text-white">Recent Chaos</h3>
            </div>
          </div>
          {isLoading ? <Skeleton lines={5} /> : chaos.length === 0 ? (
            <EmptyState icon={Zap} title="No experiments" description="Chaos experiments will appear here" />
          ) : (
            <div className="space-y-2">
              {chaos.slice(0, 5).map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div>
                    <p className="text-xs font-bold text-white">{exp.experiment_name}</p>
                    <p className="text-[9px]" style={{ color: MUTED }}>{exp.chaos_type.replace(/_/g, " ")}</p>
                  </div>
                  {exp.hypothesis_confirmed ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}