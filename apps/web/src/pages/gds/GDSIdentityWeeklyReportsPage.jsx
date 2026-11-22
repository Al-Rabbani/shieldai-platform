import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Calendar } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function GDSIdentityWeeklyReportsPage() {
  const qc = useQueryClient();
  const [selectedReport, setSelectedReport] = useState(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["identity-weekly-reports"],
    queryFn: () => base44.entities.IdentityWeeklyReport.list('-created_date', 20).catch(() => []),
    refetchInterval: 60000,
  });

  const generateReportMutation = useMutation({
    mutationFn: () => base44.functions.invoke("gdsIdentityPlatform", { action: "weekly_report" }),
    onSuccess: () => {
      qc.invalidateQueries(["identity-weekly-reports"]);
      alert("✅ Weekly report generated and sent!");
    },
    onError: (err) => alert("❌ Failed to generate report: " + err.message)
  });

  const exportReport = (report) => {
    const exportData = {
      report_id: report.report_id,
      period: `${new Date(report.period_start).toLocaleDateString()} - ${new Date(report.period_end).toLocaleDateString()}`,
      generated_at: new Date(report.generated_at).toLocaleString(),
      summary: report.summary,
      sessions: report.sessions || [],
      role_changes: report.role_changes || [],
      risk_signals: report.risk_signals || []
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `identity-weekly-report-${report.report_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reportStats = reports?.length > 0 ? reports[0].summary : null;
  const sessionData = reportStats ? [
    { name: 'Total', value: reportStats.total_sessions || 0, color: CYAN },
    { name: 'Active', value: reportStats.active_sessions || 0, color: LOW },
    { name: 'Suspicious', value: reportStats.suspicious_sessions || 0, color: DANGER }
  ] : [];
  
  const roleChangeData = reportStats ? [
    { name: 'Assignments', value: reportStats.role_assignments || 0, color: CYAN },
    { name: 'Revocations', value: reportStats.role_revocations || 0, color: MUTED }
  ] : [];
  
  const riskData = reportStats ? [
    { name: 'Critical', value: reportStats.critical_signals || 0, color: DANGER },
    { name: 'High', value: reportStats.high_signals || 0, color: HIGH },
    { name: 'Other', value: (reportStats.total_risk_signals || 0) - (reportStats.critical_signals || 0) - (reportStats.high_signals || 0), color: MEDIUM }
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Weekly Reports" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Identity Weekly Reports</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Automated weekly summaries of sessions, roles, and risks</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>AUTO-GENERATED</span>
          </div>
        </div>
        <button
          onClick={() => generateReportMutation.mutate()}
          disabled={generateReportMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Calendar className="w-4 h-4" />
          {generateReportMutation.isPending ? "Generating..." : "Generate Report Now"}
        </button>
      </div>

      {isLoading ? (
        <Skeleton lines={6} />
      ) : reports?.length === 0 ? (
        <EmptyState 
          icon={FileText} 
          title="No reports yet" 
          description="Generate your first weekly report or wait for the automated scheduler"
          actionLabel="Generate First Report"
          action={() => generateReportMutation.mutate()}
        />
      ) : (
        <>
          {/* Stats Row */}
          {reportStats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Card className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Sessions</p>
                <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{reportStats.total_sessions || 0}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
                <p className="text-xl font-black font-mono" style={{ color: LOW }}>{reportStats.active_sessions || 0}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Suspicious</p>
                <p className="text-xl font-black font-mono" style={{ color: reportStats.suspicious_sessions > 0 ? DANGER : MUTED }}>{reportStats.suspicious_sessions || 0}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Role Changes</p>
                <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{reportStats.total_role_changes || 0}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Risk Signals</p>
                <p className="text-xl font-black font-mono" style={{ color: reportStats.total_risk_signals > 0 ? DANGER : MUTED }}>{reportStats.total_risk_signals || 0}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>MFA Compliance</p>
                <p className="text-xl font-black font-mono" style={{ color: (reportStats.mfa_compliance_rate || 0) >= 80 ? LOW : (reportStats.mfa_compliance_rate || 0) >= 50 ? HIGH : DANGER }}>{reportStats.mfa_compliance_rate || 0}%</p>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Session Breakdown</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Latest report session distribution</p>
              </div>
              {sessionData.length === 0 ? (
                <EmptyState icon={FileText} title="No session data" description="Sessions will appear after report generation" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={sessionData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {sessionData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Role Changes</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Assignments vs revocations</p>
              </div>
              {roleChangeData.length === 0 ? (
                <EmptyState icon={FileText} title="No role change data" description="Role changes will appear after report generation" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={roleChangeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="name" stroke={MUTED} fontSize={10} />
                    <YAxis stroke={MUTED} fontSize={10} />
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {roleChangeData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Risk Distribution</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Signals by severity</p>
              </div>
              {riskData.length === 0 ? (
                <EmptyState icon={FileText} title="No risk data" description="Risk signals will appear after report generation" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {riskData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Reports List */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Report History</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Previously generated weekly reports</p>
            </div>
            <div className="space-y-2">
              {reports?.map((report, i) => (
                <div key={report.id} className="p-4 rounded-xl flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                      <FileText className="w-5 h-5" style={{ color: CYAN }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{report.report_id}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>
                        {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                        {report.generated_at && ` • Generated ${new Date(report.generated_at).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.summary && (
                      <span className="text-[10px] px-2 py-1 rounded" style={{ color: TEXT, background: "rgba(255,255,255,0.04)" }}>
                        {report.summary.total_sessions || 0} sessions • {report.summary.total_role_changes || 0} roles
                      </span>
                    )}
                    <button
                      onClick={() => exportReport(report)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                      style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}