import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Activity, Clock, DollarSign, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Card, Breadcrumb, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function GradeBadge({ grade }) {
  const colors = { A: LOW, B: "#0ea5e9", C: MEDIUM, D: HIGH, F: DANGER };
  const color = colors[grade] || MUTED;
  return (
    <span className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg" style={{ background: `${color}20`, color, border: `2px solid ${color}` }}>
      {grade || "F"}
    </span>
  );
}

function formatUSD(val) {
  if (!val && val !== 0) return "$0";
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val}`;
}

export default function GDSCyberRangeExercisesPage() {
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ["cyber-range-exercises"],
    queryFn: () => base44.entities.SimulationExercise.list("-completed_at", 100).catch(() => []),
  });

  const sectorColors = {
    enterprise: CYAN, financial: "#10b981", government: "#6366f1", healthcare: "#ef4444",
    energy: "#f59e0b", telecom: "#8b5cf6", manufacturing: "#ec4899", critical_infrastructure: DANGER,
  };

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Exercises" }]} />
      
      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Simulation Exercises</h3>
          </div>
        </div>
        {isLoading ? <Skeleton lines={6} /> : exercises.length === 0 ? (
          <EmptyState icon={Target} title="No exercises" description="Simulation exercises will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.3)" }}>
                <tr>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Name</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Sector</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Type</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Participants</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Detection</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Response</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>RTO</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Exposure</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Grade</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: `${BORDER}40` }}>
                {exercises.map(ex => (
                  <tr key={ex.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold text-white">{ex.exercise_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: sectorColors[ex.sector] || MUTED, background: `${sectorColors[ex.sector] || MUTED}15` }}>
                        {(ex.sector || "enterprise").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{(ex.exercise_type || "tabletop").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-white">{ex.participants_count || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className={`h-full rounded-full ${ex.detection_rate_pct > 70 ? "bg-green-400" : ex.detection_rate_pct > 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${ex.detection_rate_pct || 0}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${ex.detection_rate_pct > 70 ? "text-green-400" : ex.detection_rate_pct > 50 ? "text-amber-400" : "text-red-400"}`}>{ex.detection_rate_pct || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white">{ex.response_time_minutes || 0} min</td>
                    <td className="px-4 py-3">{ex.rto_met ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}</td>
                    <td className="px-4 py-3 text-white font-mono">{formatUSD(ex.financial_exposure_usd)}</td>
                    <td className="px-4 py-3"><GradeBadge grade={ex.grade} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded ${
                        ex.status === "completed" ? "bg-green-400/20 text-green-400" :
                        ex.status === "running" ? "bg-blue-400/20 text-blue-400" :
                        "bg-slate-400/20 text-slate-400"
                      }`}>
                        {ex.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}