import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, AlertTriangle, FileText, Download, Calendar, TrendingUp, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

export default function GDSUnifiedCompliancePage() {
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: controls, isLoading: controlsLoading } = useQuery({
    queryKey: ["compliance-controls-unified"],
    queryFn: () => base44.entities.ComplianceControl.filter({ status: 'active' }).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["compliance-reports-unified"],
    queryFn: () => base44.entities.ComplianceReportSchedule.filter({}, '-created_date', 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["compliance-alerts-unified"],
    queryFn: () => base44.entities.WorkflowAlert.filter({ alert_type: 'compliance_drift' }, '-created_date', 100).catch(() => []),
    refetchInterval: 30000,
  });

  const generateAuditLogMutation = useMutation({
    mutationFn: (params) => base44.functions.invoke("gdsMonthlyComplianceAuditLog", params),
  });

  const handleGenerateAuditLog = async () => {
    try {
      const response = await generateAuditLogMutation.mutateAsync({ month: selectedMonth, year: selectedYear });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GDS_Compliance_Audit_${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })}_${selectedYear}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate audit log:', error);
    }
  };

  // Filter controls by framework
  const filteredControls = selectedFramework === 'all' 
    ? controls 
    : controls?.filter(c => c.framework === selectedFramework);

  // Calculate metrics per framework
  const frameworks = ['SOC 2', 'ISO 27001', 'NIST'];
  const frameworkMetrics = frameworks.map(fw => {
    const fwControls = controls?.filter(c => c.framework === fw) || [];
    const compliant = fwControls.filter(c => c.compliance_status === 'compliant').length;
    const failing = fwControls.filter(c => c.compliance_status !== 'compliant').length;
    const rate = fwControls.length > 0 ? Math.round((compliant / fwControls.length) * 100) : 0;
    return { framework: fw, total: fwControls.length, compliant, failing, rate };
  });

  const overallComplianceRate = controls?.length > 0 
    ? Math.round((controls.filter(c => c.compliance_status === 'compliant').length / controls.length) * 100)
    : 0;

  const failingControls = controls?.filter(c => c.compliance_status !== 'compliant') || [];
  const criticalAlerts = alerts?.filter(a => a.severity === 'high' && a.status !== 'resolved').length || 0;

  const pieData = [
    { name: 'Compliant', value: controls?.filter(c => c.compliance_status === 'compliant').length || 0, color: LOW },
    { name: 'Failing', value: controls?.filter(c => c.compliance_status !== 'compliant').length || 0, color: DANGER },
    { name: 'Testing', value: controls?.filter(c => c.compliance_status === 'testing').length || 0, color: MEDIUM }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Unified Compliance Dashboard" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Unified Compliance Dashboard</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time SOC 2, ISO 27001 & NIST progress tracking with failing control alerts</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Overall Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Overall Compliance</p>
          <p className="text-2xl font-black font-mono" style={{ color: overallComplianceRate >= 80 ? LOW : overallComplianceRate >= 50 ? HIGH : DANGER }}>{overallComplianceRate}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Controls</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{controls?.length || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Compliant</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{controls?.filter(c => c.compliance_status === 'compliant').length || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Failing</p>
          <p className="text-2xl font-black font-mono" style={{ color: failingControls.length > 0 ? DANGER : MUTED }}>{failingControls.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical Alerts</p>
          <p className="text-2xl font-black font-mono" style={{ color: criticalAlerts > 0 ? DANGER : MUTED }}>{criticalAlerts}</p>
        </Card>
      </div>

      {/* Framework Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {frameworkMetrics.map(fw => (
          <Card key={fw.framework} className="p-5" glow>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{fw.framework}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${fw.rate >= 80 ? 'bg-green-400/15 text-green-400' : fw.rate >= 50 ? 'bg-yellow-400/15 text-yellow-400' : 'bg-red-400/15 text-red-400'}`}>
                {fw.rate}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div 
                className="h-3 rounded-full transition-all"
                style={{ 
                  width: `${fw.rate}%`, 
                  background: fw.rate >= 80 ? LOW : fw.rate >= 50 ? HIGH : DANGER,
                  boxShadow: `0 0 10px ${fw.rate >= 80 ? LOW : fw.rate >= 50 ? HIGH : DANGER}60`
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span style={{ color: MUTED }}>{fw.compliant} compliant</span>
              <span style={{ color: fw.failing > 0 ? DANGER : MUTED }}>{fw.failing} failing</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compliance Distribution */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Compliance Distribution</h3>
          {pieData.length === 0 ? (
            <EmptyState icon={Shield} title="No data" description="Compliance data will appear here" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Framework Comparison */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Framework Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={frameworkMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="framework" stroke={MUTED} fontSize={11} />
              <YAxis stroke={MUTED} fontSize={11} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
              <Bar dataKey="compliant" fill={LOW} name="Compliant" />
              <Bar dataKey="failing" fill={DANGER} name="Failing" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Failing Controls Alert */}
      {failingControls.length > 0 && (
        <Card className="p-5" style={{ border: `1px solid ${DANGER}40`, background: `${DANGER}08` }}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
            <div>
              <h3 className="text-sm font-bold" style={{ color: DANGER }}>Failing Controls Requiring Immediate Attention</h3>
              <p className="text-[10px]" style={{ color: MUTED }}>{failingControls.length} controls are not compliant</p>
            </div>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {failingControls.slice(0, 10).map(control => (
              <div key={control.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,59,59,0.1)", border: `1px solid ${DANGER}30` }}>
                <div className="flex items-center gap-3">
                  <XCircle className="w-4 h-4" style={{ color: DANGER }} />
                  <div>
                    <p className="text-xs font-bold text-white">{control.control_id} - {control.framework}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{control.description || 'No description'}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                  {control.compliance_status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Monthly Audit Log Export */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-5 h-5" style={{ color: CYAN }} />
          <div>
            <h3 className="text-sm font-bold text-white">Monthly Audit Log Export</h3>
            <p className="text-[10px]" style={{ color: MUTED }}>Generate clean PDF summaries for internal reviews and compliance evidence</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: MUTED }} />
            <span className="text-xs font-semibold" style={{ color: MUTED }}>Select Month:</span>
          </div>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => (
              <option key={m} value={m}>{new Date(2024, m).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerateAuditLog}
          disabled={generateAuditLogMutation.isPending}
          className="w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          style={{
            background: generateAuditLogMutation.isPending ? "rgba(255,255,255,0.1)" : `${CYAN}15`,
            border: `1px solid ${CYAN}40`,
            color: generateAuditLogMutation.isPending ? MUTED : CYAN,
            opacity: generateAuditLogMutation.isPending ? 0.6 : 1
          }}
        >
          {generateAuditLogMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: CYAN, borderTopColor: "transparent" }} />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Monthly Audit Log PDF
            </>
          )}
        </button>

        <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(0,255,136,0.05)", border: `1px solid ${LOW}30` }}>
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: LOW }} />
            <div>
              <p className="text-[10px] font-bold" style={{ color: LOW }}>Evidence-Ready Format</p>
              <p className="text-[9px]" style={{ color: MUTED }}>PDF includes executive summary, framework progress, failing controls, and audit activity</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Compliance Reports */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recent Compliance Reports</h3>
        {reportsLoading ? (
          <Skeleton lines={5} />
        ) : reports?.length === 0 ? (
          <EmptyState icon={FileText} title="No reports" description="Compliance reports will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Framework", "Status", "Compliance Rate", "Generated", "Type"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports?.slice(0, 10).map(report => (
                  <tr key={report.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-bold" style={{ color: TEXT }}>{report.framework || 'Unknown'}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${report.status === 'compliant' ? 'bg-green-400/15 text-green-400' : 'bg-red-400/15 text-red-400'}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: report.compliance_rate >= 80 ? LOW : report.compliance_rate >= 50 ? HIGH : DANGER }}>
                      {report.compliance_rate || 0}%
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(report.created_date)}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{report.report_type || 'Scheduled'}</td>
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