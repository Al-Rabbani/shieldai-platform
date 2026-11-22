import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Swords, Shield, Users, Clock } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED,
  Card, Breadcrumb, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";

function GradeBadge({ grade }) {
  const colors = { A: LOW, B: "#0ea5e9", C: MEDIUM, D: HIGH, F: DANGER };
  const color = colors[grade] || MUTED;
  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm" style={{ background: `${color}20`, color, border: `2px solid ${color}` }}>
      {grade || "F"}
    </span>
  );
}

export default function GDSCyberRangeMissionsPage() {
  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["cyber-range-missions"],
    queryFn: () => base44.entities.MissionExercise.list("-completed_at", 50).catch(() => []),
  });

  const missionTypeColors = {
    national_cyber_exercise: DANGER, war_game: DANGER, executive_tabletop: HIGH,
    bcp_drill: "#0ea5e9", incident_command: "#a855f7", threat_hunt: CYAN,
    forensics: "#10b981", malware_analysis: "#f59e0b", attribution: "#ec4899", strategic_response: DANGER,
  };
  const classificationColors = {
    unclassified: MUTED, restricted: "#f59e0b", confidential: HIGH, secret: DANGER, top_secret: "#7c3aed",
  };

  const completed = missions.filter(m => m.status === "completed");
  const avgMaturity = completed.length > 0
    ? Math.round(completed.reduce((sum, m) => sum + (m.overall_score || 0), 0) / completed.length)
    : 0;

  return (
    <div className="space-y-6" style={PAGE_BG}>
      <Breadcrumb items={[{ label: "Cyber Range", path: "/cyber-range" }, { label: "Missions" }]} />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Total Missions</p>
          <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>{missions.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Completed</p>
          <p className="text-3xl font-black font-mono" style={{ color: LOW }}>{completed.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Avg Maturity Grade</p>
          <p className="text-3xl font-black font-mono" style={{ color: avgMaturity > 70 ? LOW : avgMaturity > 50 ? MEDIUM : DANGER }}>{avgMaturity}%</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Mission Exercises</h3>
          </div>
        </div>
        {isLoading ? <Skeleton lines={6} /> : missions.length === 0 ? (
          <EmptyState icon={Swords} title="No missions" description="Mission exercises will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] uppercase tracking-wider" style={{ background: "rgba(0,0,0,0.3)" }}>
                <tr>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Name</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Type</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Classification</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Participants</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Duration</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Score</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Grade</th>
                  <th className="px-4 py-3" style={{ color: MUTED }}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm" style={{ borderColor: `${BORDER}40` }}>
                {missions.map(m => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-bold text-white">{m.mission_name}</td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: missionTypeColors[m.mission_type] || MUTED, background: `${missionTypeColors[m.mission_type] || MUTED}15` }}>
                        {(m.mission_type || "unknown").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded" style={{ color: classificationColors[m.classification] || MUTED, background: `${classificationColors[m.classification] || MUTED}15` }}>
                        {m.classification}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{m.participants_count || 0}</td>
                    <td className="px-4 py-3 text-white">{m.duration_minutes || 0} min</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className={`h-full rounded-full ${m.overall_score > 70 ? "bg-green-400" : m.overall_score > 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${m.overall_score || 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-white">{m.overall_score || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><GradeBadge grade={m.maturity_grade} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded ${
                        m.status === "completed" ? "bg-green-400/20 text-green-400" :
                        m.status === "running" ? "bg-blue-400/20 text-blue-400" :
                        m.status === "briefing" ? "bg-amber-400/20 text-amber-400" :
                        "bg-slate-400/20 text-slate-400"
                      }`}>
                        {m.status}
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