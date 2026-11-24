import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, SectionCard, SeverityBadge, StatusBadge, LoadingSpinner, EmptyState, SearchInput, gradeFromScore, gradeColor } from "@/components/dashboards/DashboardShared";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import ControlFailureHeatmap from "@/components/compliance/ControlFailureHeatmap";
import AuditReadinessTrend90d from "@/components/compliance/AuditReadinessTrend90d";
import FrameworkProgressTracker from "@/components/compliance/FrameworkProgressTracker";

export default function AuditCompliancePage() {
  const [frameworks, setFrameworks] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gapFilter, setGapFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.ComplianceFramework.list().catch(() => []),
      base44.entities.ComplianceAssessment.list("-last_assessed", 50).catch(() => []),
      base44.entities.ComplianceGap.list().catch(() => []),
      base44.entities.ComplianceRecommendation.list().catch(() => []),
    ]).then(([f, a, g, r]) => {
      setFrameworks(f); setAssessments(a); setGaps(g); setRecs(r); setLoading(false);
    });
  }, []);

  const filteredGaps = useMemo(() => {
    return gaps.filter(g => {
      const sevMatch = gapFilter === "all" || g.severity === gapFilter;
      const searchMatch = !search || (g.title || "").toLowerCase().includes(search.toLowerCase()) || (g.framework || "").toLowerCase().includes(search.toLowerCase());
      return sevMatch && searchMatch;
    });
  }, [gaps, gapFilter, search]);

  const chartData = frameworks.map(f => ({ name: f.name, score: f.score || 0, fill: (f.score || 0) >= 80 ? "#10b981" : (f.score || 0) >= 60 ? "#f59e0b" : "#ef4444" }));

  if (loading) return <DashboardPage title="Audit & Compliance" badge="EDP-017"><LoadingSpinner /></DashboardPage>;

  return (
    <DashboardPage title="Audit & Compliance" badge="EDP-017" subtitle="Framework scores, assessment results, gaps, and remediation recommendations">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {frameworks.map(fw => {
          const grade = gradeFromScore(fw.score || 0);
          return (
            <div key={fw.id} className="rounded-xl p-4" style={{ background: "#111827", border: `1px solid ${gradeColor(grade)}40`, borderLeft: `3px solid ${gradeColor(grade)}` }}>
              <p className="text-sm font-bold text-white">{fw.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold" style={{ color: gradeColor(grade) }}>{fw.score || 0}%</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${gradeColor(grade)}20`, color: gradeColor(grade) }}>Grade {grade}</span>
              </div>
              <StatusBadge status={fw.status} />
            </div>
          );
        })}
      </div>

      <SectionCard title="Framework progress — passing vs failing controls">
        <FrameworkProgressTracker />
      </SectionCard>

      {chartData.length > 0 && (
        <SectionCard title="Compliance Scores by Framework">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      <SectionCard title="Control failure heatmap">
        <ControlFailureHeatmap />
      </SectionCard>

      <SectionCard title="Audit readiness — last 90 days">
        <AuditReadinessTrend90d />
      </SectionCard>

      <SectionCard title="Compliance Assessments">
        {assessments.length === 0 ? <EmptyState message="No assessments recorded" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 px-3">Framework</th><th className="text-left py-2 px-3">Score</th><th className="text-left py-2 px-3">Grade</th><th className="text-left py-2 px-3">Gaps</th><th className="text-left py-2 px-3">Critical</th><th className="text-left py-2 px-3">Last Assessed</th>
              </tr></thead>
              <tbody>
                {assessments.map(a => (
                  <tr key={a.id} className="border-b border-slate-800 hover:bg-blue-500/5">
                    <td className="py-2 px-3 text-white font-medium">{a.framework_name}</td>
                    <td className="py-2 px-3" style={{ color: gradeColor(a.grade || gradeFromScore(a.compliance_score)) }}>{a.compliance_score}%</td>
                    <td className="py-2 px-3"><span className="font-bold" style={{ color: gradeColor(a.grade || gradeFromScore(a.compliance_score)) }}>{a.grade || gradeFromScore(a.compliance_score)}</span></td>
                    <td className="py-2 px-3 text-slate-300">{a.gaps_found}</td>
                    <td className="py-2 px-3 text-red-400 font-medium">{a.critical_gaps}</td>
                    <td className="py-2 px-3 text-slate-500">{a.last_assessed ? new Date(a.last_assessed).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Compliance Gaps" action={
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search gaps..." />
          <select value={gapFilter} onChange={e => setGapFilter(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs bg-[#0a0f1e] border border-slate-700 text-slate-200">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
      }>
        {filteredGaps.length === 0 ? <EmptyState message={absentStoreReason("ComplianceGap")} /> : (
          <div className="space-y-2">
            {filteredGaps.map(gap => (
              <div key={gap.id} className="rounded-lg p-3 flex items-start gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <SeverityBadge severity={gap.severity} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{gap.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{gap.description}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{gap.framework} {gap.control_id ? `· ${gap.control_id}` : ""}</p>
                </div>
                <StatusBadge status={gap.status} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recommendations">
        {recs.length === 0 ? <EmptyState message="No recommendations" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recs.map(rec => (
              <div key={rec.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={rec.priority} />
                  <span className="text-[10px] text-slate-500">{rec.effort_level} effort</span>
                </div>
                <p className="text-sm font-semibold text-white">{rec.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{rec.description}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </DashboardPage>
  );
}