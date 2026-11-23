import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Users, CheckCircle, AlertTriangle, Folder } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const TYPE_COLORS = { full_pir: CYAN, hot_wash: HIGH, executive_review: DANGER };
const CATEGORY_COLORS = {
  detection_improvement: CYAN, process_improvement: HIGH, coverage_success: LOW,
  communication_improvement: "#a855f7", training_need: "#f97316", policy_gap: DANGER,
  technology_gap: "#eab308", other: MUTED
};

const STATUS_COLORS = { scheduled: MUTED, in_progress: HIGH, completed: LOW, cancelled: MUTED };
const PRIORITY_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };
const LESSON_STATUS_COLORS = { open: MUTED, in_progress: HIGH, completed: LOW, cancelled: MUTED };

export default function GDSDFIRPirPage() {
  const [activeTab, setActiveTab] = useState("pir");

  const { data: pirs = [], isLoading: loadP } = useQuery({
    queryKey: ["dfir-pir"],
    queryFn: () => base44.entities.PostIncidentReview.list("-conducted_at", 100).catch(() => []),
  });

  const { data: lessons = [], isLoading: loadL } = useQuery({
    queryKey: ["dfir-lessons"],
    queryFn: () => base44.entities.LessonsLearned.list("-created_date", 200).catch(() => []),
  });

  const stats = {
    totalPirs: pirs.length,
    completed: pirs.filter(p => p.status === "completed").length,
    totalLessons: lessons.length,
    open: lessons.filter(l => l.status === "open").length
  };

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Incident Response", path: "/dfir" }, { label: "Post-Incident Reviews" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Post-Incident Reviews</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>PIRs and lessons learned</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("pir")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "pir" ? "" : "hover:opacity-70"}`} style={{ background: activeTab === "pir" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${activeTab === "pir" ? CYAN + "40" : BORDER}`, color: activeTab === "pir" ? CYAN : MUTED }}>PIR Reviews</button>
        <button onClick={() => setActiveTab("lessons")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "lessons" ? "" : "hover:opacity-70"}`} style={{ background: activeTab === "lessons" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${activeTab === "lessons" ? CYAN + "40" : BORDER}`, color: activeTab === "lessons" ? CYAN : MUTED }}>Lessons Learned</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total PIRs</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.totalPirs}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Completed</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.completed}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Lessons</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.totalLessons}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.open}</p>
        </Card>
      </div>

      {/* PIR Reviews Tab */}
      {activeTab === "pir" && (
        <Card className="overflow-hidden">
          {loadP ? <Skeleton lines={10} /> : pirs.length === 0 ? (
            <EmptyState icon={FileText} title="No PIRs" description="Post-incident reviews will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Title", "Type", "Facilitator", "Participants", "Conducted", "Detection %", "Response %", "Maturity", "Status"].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pirs.map(pir => {
                    const typeColor = TYPE_COLORS[pir.type] || TYPE_COLORS.full_pir;
                    return (
                      <tr key={pir.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5">
                        <td className="py-3 px-4">
                          <p className="text-xs font-semibold text-white max-w-xs truncate">{pir.title}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ background: `${typeColor}15`, color: typeColor }}>{pir.type?.replace(/_/g, " ")}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs" style={{ color: TEXT }}>{pir.facilitator_name || pir.facilitator || "—"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" style={{ color: MUTED }} />
                            <span className="text-xs" style={{ color: TEXT }}>{pir.participants?.length || 0}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs" style={{ color: MUTED }}>{timeAgo(pir.conducted_at)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${pir.detection_effectiveness_percent || 0}%`, background: pir.detection_effectiveness_percent >= 80 ? LOW : pir.detection_effectiveness_percent >= 60 ? MEDIUM : DANGER }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: TEXT }}>{pir.detection_effectiveness_percent || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${pir.response_effectiveness_percent || 0}%`, background: pir.response_effectiveness_percent >= 80 ? LOW : pir.response_effectiveness_percent >= 60 ? MEDIUM : DANGER }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: TEXT }}>{pir.response_effectiveness_percent || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-bold" style={{ color: pir.overall_maturity_score >= 80 ? LOW : pir.overall_maturity_score >= 60 ? MEDIUM : DANGER }}>{pir.overall_maturity_score || 0}%</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: STATUS_COLORS[pir.status], background: `${STATUS_COLORS[pir.status]}15` }}>{pir.status || "scheduled"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Lessons Learned Tab */}
      {activeTab === "lessons" && (
        <Card className="overflow-hidden">
          {loadL ? <Skeleton lines={10} /> : lessons.length === 0 ? (
            <EmptyState icon={FileText} title="No lessons learned" description="Lessons will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                    {["Title", "Category", "Priority", "Owner", "Due Date", "Status"].map(h => (
                      <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lessons.map(lesson => {
                    const categoryColor = CATEGORY_COLORS[lesson.category] || CATEGORY_COLORS.other;
                    const isOverdue = lesson.due_date && new Date(lesson.due_date) < new Date();
                    return (
                      <tr key={lesson.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5">
                        <td className="py-3 px-4">
                          <p className="text-xs font-semibold text-white max-w-xs truncate">{lesson.title}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${categoryColor}15`, color: categoryColor }}>{lesson.category?.replace(/_/g, " ")}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: PRIORITY_COLORS[lesson.priority], background: `${PRIORITY_COLORS[lesson.priority]}15` }}>{lesson.priority}</span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs" style={{ color: TEXT }}>{lesson.owner_name || lesson.owner || "—"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className={`text-xs font-bold ${isOverdue ? 'text-red-400' : ''}`}>{lesson.due_date ? new Date(lesson.due_date).toLocaleDateString() : "—"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: LESSON_STATUS_COLORS[lesson.status], background: `${LESSON_STATUS_COLORS[lesson.status]}15` }}>{lesson.status || "open"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}