import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, CheckCircle, XCircle, TrendingUp, BookOpen, Download } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const GRADE_COLORS = { A: LOW, B: "#3b82f6", C: MEDIUM, D: HIGH, F: DANGER };

const CATEGORY_COLORS = {
  detection_improvement: LOW, coverage_success: CYAN, control_gap: DANGER,
  process_improvement: HIGH, training_need: MEDIUM
};

export default function GDSPurpleReportsPage() {
  const [activeTab, setActiveTab] = useState("reports");
  const [selectedReportIds, setSelectedReportIds] = useState([]);

  const exportMutation = useMutation({
    mutationFn: async (reportIds) => {
      const response = await base44.functions.invoke('gdsPurpleTeamReport', { reportIds, type: 'exercise' });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `purple-team-report-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const handleExport = () => {
    const idsToExport = selectedReportIds.length > 0 ? selectedReportIds : [];
    exportMutation.mutate(idsToExport);
  };

  const toggleReportSelection = (id) => {
    setSelectedReportIds(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const { data: reports = [], isLoading: loadR } = useQuery({
    queryKey: ["purple-exercise-reports"], queryFn: () => base44.entities.ExerciseReport.list("-generated_at", 50).catch(() => []),
  });

  const { data: lessons = [], isLoading: loadL } = useQuery({
    queryKey: ["purple-lessons-learned"], queryFn: () => base44.entities.LessonsLearned.list("-created_date", 100).catch(() => []),
  });

  const avgGrade = reports.length > 0 ? reports.reduce((s, r) => s + (r.security_grade === 'A' ? 4 : r.security_grade === 'B' ? 3 : r.security_grade === 'C' ? 2 : r.security_grade === 'D' ? 1 : 0), 0) / reports.length : 0;
  const avgCoverage = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + (r.coverage_pct || 0), 0) / reports.length) : 0;
  const avgDetection = reports.length > 0 ? Math.round(reports.reduce((s, r) => s + (r.detection_rate_pct || 0), 0) / reports.length) : 0;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Purple Team", path: "/purple" }, { label: "Reports" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Exercise Reports & Lessons Learned</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Review simulation outcomes and continuous improvement insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "reports" ? "" : "hover:opacity-70"}`}
            style={{ background: activeTab === "reports" ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${activeTab === "reports" ? CYAN + "40" : BORDER}`, color: activeTab === "reports" ? CYAN : MUTED }}
          >
            Exercise Reports
          </button>
          <button
            onClick={() => setActiveTab("lessons")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === "lessons" ? "" : "hover:opacity-70"}`}
            style={{ background: activeTab === "lessons" ? `${HIGH}15` : "rgba(255,255,255,0.04)", border: `1px solid ${activeTab === "lessons" ? HIGH + "40" : BORDER}`, color: activeTab === "lessons" ? HIGH : MUTED }}
          >
            Lessons Learned
          </button>
          {activeTab === "reports" && (
            <button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              style={{ 
                background: `${CYAN}15`, 
                border: `1px solid ${CYAN}40`, 
                color: CYAN,
                opacity: exportMutation.isPending ? 0.6 : 1 
              }}
            >
              <Download className="w-4 h-4" />
              {exportMutation.isPending ? 'Generating...' : 'Export PDF'}
            </button>
          )}
        </div>
      </div>

      {activeTab === "reports" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Reports</p>
              <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{reports.length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Security Grade</p>
              <p className="text-2xl font-black" style={{ color: avgGrade >= 3 ? LOW : avgGrade >= 2 ? MEDIUM : DANGER }}>{avgGrade >= 3.5 ? 'A' : avgGrade >= 2.5 ? 'B' : avgGrade >= 1.5 ? 'C' : avgGrade >= 0.5 ? 'D' : 'F'}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Coverage</p>
              <p className="text-2xl font-black font-mono" style={{ color: avgCoverage >= 80 ? LOW : avgCoverage >= 50 ? MEDIUM : DANGER }}>{avgCoverage}%</p>
            </Card>
          </div>

          {loadR ? <Skeleton lines={6} /> : reports.length === 0 ? (
            <EmptyState icon={FileText} title="No reports" description="Exercise reports will appear here after simulations" />
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const gradeColor = GRADE_COLORS[report.security_grade] || MUTED;
                const isSelected = selectedReportIds.includes(report.id);
                return (
                  <Card key={report.id} className="p-5" style={{ background: CARD, border: `1px solid ${isSelected ? CYAN : BORDER}` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleReportSelection(report.id)}
                          className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all"
                          style={{ 
                            background: isSelected ? `${CYAN}15` : 'transparent',
                            borderColor: isSelected ? CYAN : BORDER
                          }}
                        >
                          {isSelected && <CheckCircle className="w-3.5 h-3.5" style={{ color: CYAN }} />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-bold text-white">{report.report_title}</h3>
                            <span className="text-lg font-black px-3 py-0.5 rounded" style={{ background: `${gradeColor}15`, color: gradeColor }}>{report.security_grade}</span>
                          </div>
                          <p className="text-xs" style={{ color: MUTED }}>Adversary: {report.adversary_profile || 'Custom'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px]" style={{ color: MUTED }}>Generated</p>
                        <p className="text-xs" style={{ color: TEXT }}>{new Date(report.generated_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                      <div>
                        <p className="font-bold mb-1" style={{ color: MUTED }}>Coverage</p>
                        <p className="text-sm font-bold" style={{ color: report.coverage_pct >= 80 ? LOW : report.coverage_pct >= 50 ? MEDIUM : DANGER }}>{report.coverage_pct}%</p>
                      </div>
                      <div>
                        <p className="font-bold mb-1" style={{ color: MUTED }}>Detection</p>
                        <p className="text-sm font-bold" style={{ color: report.detection_rate_pct >= 80 ? LOW : report.detection_rate_pct >= 50 ? MEDIUM : DANGER }}>{report.detection_rate_pct}%</p>
                      </div>
                      <div>
                        <p className="font-bold mb-1" style={{ color: MUTED }}>Miss Rate</p>
                        <p className="text-sm font-bold" style={{ color: report.miss_rate_pct < 20 ? LOW : report.miss_rate_pct < 50 ? MEDIUM : DANGER }}>{report.miss_rate_pct}%</p>
                      </div>
                      <div>
                        <p className="font-bold mb-1" style={{ color: MUTED }}>Gaps</p>
                        <p className="text-sm font-bold" style={{ color: DANGER }}>{report.gaps_identified || 0}</p>
                      </div>
                      <div>
                        <p className="font-bold mb-1" style={{ color: MUTED }}>Strengths</p>
                        <p className="text-sm font-bold" style={{ color: LOW }}>{report.key_strengths?.length || 0}</p>
                      </div>
                      <div>
                        <p className="font-bold mb-1" style={{ color: MUTED }}>Weaknesses</p>
                        <p className="text-sm font-bold" style={{ color: DANGER }}>{report.key_weaknesses?.length || 0}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "lessons" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Lessons</p>
              <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{lessons.length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Open</p>
              <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{lessons.filter(l => l.status !== 'closed').length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Priority</p>
              <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{lessons.filter(l => l.priority === 'high').length}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Closed</p>
              <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{lessons.filter(l => l.status === 'closed').length}</p>
            </Card>
          </div>

          {loadL ? <Skeleton lines={6} /> : lessons.length === 0 ? (
            <EmptyState icon={BookOpen} title="No lessons learned" description="Lessons will be captured during exercises" />
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => {
                const categoryColor = CATEGORY_COLORS[lesson.category] || MUTED;
                return (
                  <Card key={lesson.id} className="p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-bold text-white">{lesson.lesson_title}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${categoryColor}15`, color: categoryColor }}>{lesson.category?.replace(/_/g, ' ')}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${lesson.priority === 'high' ? 'bg-red-400/15 text-red-400' : lesson.priority === 'medium' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-blue-400/15 text-blue-400'}`}>{lesson.priority}</span>
                        </div>
                        <p className="text-xs" style={{ color: MUTED }}>Owner: {lesson.owner || 'Unassigned'}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${lesson.status === 'open' ? 'bg-red-400/15 text-red-400' : lesson.status === 'in_progress' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-green-400/15 text-green-400'}`}>{lesson.status}</span>
                        <p className="text-[10px] mt-1" style={{ color: MUTED }}>Due: {lesson.due_date ? new Date(lesson.due_date).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                    <div className="text-xs space-y-1" style={{ color: MUTED }}>
                      <p><span style={{ color: TEXT }}>Observation:</span> {lesson.observation}</p>
                      {lesson.root_cause && <p><span style={{ color: TEXT }}>Root Cause:</span> {lesson.root_cause}</p>}
                      {lesson.recommendation && <p><span style={{ color: TEXT }}>Recommendation:</span> {lesson.recommendation}</p>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}