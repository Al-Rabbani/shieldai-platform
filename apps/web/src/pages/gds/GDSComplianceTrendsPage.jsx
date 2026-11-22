import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckSquare, TrendingUp, TrendingDown, Minus, FileText, Calendar, Download, Plus, RefreshCw } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from "recharts";
import { toast } from "sonner";

const FRAMEWORK_COLORS = {
  soc2: "#00d4ff",
  iso27001: "#10b981",
  gdpr: "#8b5cf6",
  hipaa: "#f59e0b",
  pci_dss: "#ef4444"
};

const TREND_ICONS = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown
};

export default function GDSComplianceTrendsPage() {
  const [selectedFramework, setSelectedFramework] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleBulkExport = async () => {
    setIsExporting(true);
    try {
      const response = await base44.functions.invoke('gdsComplianceBulkExport', { frameworks: ['soc2', 'iso27001'] });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-status-soc2-iso27001-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const { data: trendsData, isLoading, refetch } = useQuery({
    queryKey: ["compliance-trends", selectedFramework],
    queryFn: () => {
      const query = selectedFramework !== "all" ? { framework: selectedFramework } : {};
      return base44.entities.ComplianceTrend.filter(query, '-assessment_date', 50).catch(() => []);
    },
    refetchInterval: 60000,
  });

  const createAssessment = useMutation({
    mutationFn: async (data) => {
      const result = await base44.functions.invoke("gdsComplianceAutomation", { action: "generate_trend", ...data });
      return result.data;
    },
    onSuccess: () => {
      toast.success("Compliance assessment created");
      refetch();
      setShowCreateModal(false);
    }
  });

  const trends = trendsData || [];
  
  const soc2Trends = trends.filter(t => t.framework === 'soc2').sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date));
  const iso27001Trends = trends.filter(t => t.framework === 'iso27001').sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date));

  const latestScores = {
    soc2: soc2Trends.length > 0 ? soc2Trends[soc2Trends.length - 1] : null,
    iso27001: iso27001Trends.length > 0 ? iso27001Trends[iso27001Trends.length - 1] : null
  };

  const chartData = {
    soc2: soc2Trends.map(t => ({
      date: new Date(t.assessment_date).toLocaleDateString(),
      score: t.overall_score,
      compliant: t.compliant_controls,
      non_compliant: t.non_compliant
    })),
    iso27001: iso27001Trends.map(t => ({
      date: new Date(t.assessment_date).toLocaleDateString(),
      score: t.overall_score,
      compliant: t.compliant_controls,
      non_compliant: t.non_compliant
    }))
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Compliance Trends Dashboard" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <CheckSquare className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Compliance Trends Dashboard</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>SOC 2 & ISO 27001 compliance score tracking over time</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" />
            New Assessment
          </button>
          <button
            onClick={handleBulkExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? 'Generating...' : 'Export All'}
          </button>
        </div>
      </div>

      {/* Current Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SOC 2 */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: FRAMEWORK_COLORS.soc2 }} />
              <h3 className="text-sm font-bold text-white">SOC 2 Type II</h3>
            </div>
            {latestScores.soc2 && (
              <div className="flex items-center gap-1">
                {(() => {
                  const TrendIcon = TREND_ICONS[latestScores.soc2.trend_direction] || Minus;
                  return <TrendIcon className="w-4 h-4" style={{ color: latestScores.soc2.score_delta >= 0 ? LOW : DANGER }} />;
                })()}
                <span className="text-[10px] font-bold" style={{ color: latestScores.soc2.score_delta >= 0 ? LOW : DANGER }}>
                  {latestScores.soc2.score_delta >= 0 ? '+' : ''}{latestScores.soc2.score_delta || 0}
                </span>
              </div>
            )}
          </div>
          {isLoading ? <Skeleton lines={4} /> : latestScores.soc2 ? (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-black font-mono" style={{ color: FRAMEWORK_COLORS.soc2 }}>
                  {latestScores.soc2.overall_score}
                </span>
                <span className="text-sm font-bold" style={{ color: MUTED }}>/ 100</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Compliant Controls</span>
                  <span className="font-bold" style={{ color: LOW }}>{latestScores.soc2.compliant_controls} / {latestScores.soc2.total_controls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Critical Gaps</span>
                  <span className="font-bold" style={{ color: latestScores.soc2.critical_gaps > 0 ? DANGER : MUTED }}>{latestScores.soc2.critical_gaps}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Audit Ready</span>
                  <span className={`font-bold ${latestScores.soc2.audit_ready ? 'text-green-400' : 'text-yellow-400'}`}>
                    {latestScores.soc2.audit_ready ? 'Yes' : 'No'}
                  </span>
                </div>
                {latestScores.soc2.next_audit_date && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Next Audit</span>
                    <span className="font-bold" style={{ color: TEXT }}>{new Date(latestScores.soc2.next_audit_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState icon={FileText} title="No SOC 2 data" description="Create your first assessment" />
          )}
        </Card>

        {/* ISO 27001 */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: FRAMEWORK_COLORS.iso27001 }} />
              <h3 className="text-sm font-bold text-white">ISO 27001</h3>
            </div>
            {latestScores.iso27001 && (
              <div className="flex items-center gap-1">
                {(() => {
                  const TrendIcon = TREND_ICONS[latestScores.iso27001.trend_direction] || Minus;
                  return <TrendIcon className="w-4 h-4" style={{ color: latestScores.iso27001.score_delta >= 0 ? LOW : DANGER }} />;
                })()}
                <span className="text-[10px] font-bold" style={{ color: latestScores.iso27001.score_delta >= 0 ? LOW : DANGER }}>
                  {latestScores.iso27001.score_delta >= 0 ? '+' : ''}{latestScores.iso27001.score_delta || 0}
                </span>
              </div>
            )}
          </div>
          {isLoading ? <Skeleton lines={4} /> : latestScores.iso27001 ? (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-black font-mono" style={{ color: FRAMEWORK_COLORS.iso27001 }}>
                  {latestScores.iso27001.overall_score}
                </span>
                <span className="text-sm font-bold" style={{ color: MUTED }}>/ 100</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Compliant Controls</span>
                  <span className="font-bold" style={{ color: LOW }}>{latestScores.iso27001.compliant_controls} / {latestScores.iso27001.total_controls}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Critical Gaps</span>
                  <span className="font-bold" style={{ color: latestScores.iso27001.critical_gaps > 0 ? DANGER : MUTED }}>{latestScores.iso27001.critical_gaps}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: MUTED }}>Audit Ready</span>
                  <span className={`font-bold ${latestScores.iso27001.audit_ready ? 'text-green-400' : 'text-yellow-400'}`}>
                    {latestScores.iso27001.audit_ready ? 'Yes' : 'No'}
                  </span>
                </div>
                {latestScores.iso27001.next_audit_date && (
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Next Audit</span>
                    <span className="font-bold" style={{ color: TEXT }}>{new Date(latestScores.iso27001.next_audit_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState icon={FileText} title="No ISO 27001 data" description="Create your first assessment" />
          )}
        </Card>
      </div>

      {/* SOC 2 Trend Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">SOC 2 Compliance Trend</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Historical compliance scores over time</p>
        </div>
        {chartData.soc2.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No trend data" description="SOC 2 assessments will appear here" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData.soc2}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" stroke={MUTED} fontSize={10} />
              <YAxis domain={[0, 100]} stroke={MUTED} fontSize={10} />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
              />
              <Area type="monotone" dataKey="score" stroke={FRAMEWORK_COLORS.soc2} fill={FRAMEWORK_COLORS.soc2} fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ISO 27001 Trend Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">ISO 27001 Compliance Trend</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Historical compliance scores over time</p>
        </div>
        {chartData.iso27001.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No trend data" description="ISO 27001 assessments will appear here" />
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData.iso27001}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" stroke={MUTED} fontSize={10} />
              <YAxis domain={[0, 100]} stroke={MUTED} fontSize={10} />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
              />
              <Area type="monotone" dataKey="score" stroke={FRAMEWORK_COLORS.iso27001} fill={FRAMEWORK_COLORS.iso27001} fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Recent Assessments Table */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Recent Assessments</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>All compliance assessments</p>
        </div>
        {trends.length === 0 ? (
          <EmptyState icon={FileText} title="No assessments" description="Compliance assessments will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Framework", "Score", "Trend", "Compliant", "Non-Compliant", "Critical Gaps", "Audit Ready", "Date"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trends.map((trend, i) => {
                  const fwColor = FRAMEWORK_COLORS[trend.framework] || MUTED;
                  const TrendIcon = TREND_ICONS[trend.trend_direction] || Minus;
                  return (
                    <tr key={trend.trend_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase"
                          style={{ color: fwColor, background: `${fwColor}18`, border: `1px solid ${fwColor}30` }}>
                          {trend.framework}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-sm font-black font-mono" style={{ color: fwColor }}>{trend.overall_score}</span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <TrendIcon className="w-3.5 h-3.5" style={{ color: trend.score_delta >= 0 ? LOW : DANGER }} />
                          <span className="text-[10px] font-bold" style={{ color: trend.score_delta >= 0 ? LOW : DANGER }}>
                            {trend.score_delta >= 0 ? '+' : ''}{trend.score_delta || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: LOW }}>{trend.compliant_controls}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: DANGER }}>{trend.non_compliant}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: trend.critical_gaps > 0 ? DANGER : MUTED }}>{trend.critical_gaps}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${trend.audit_ready ? 'bg-green-400/15 text-green-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
                          {trend.audit_ready ? 'READY' : 'NOT READY'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{new Date(trend.assessment_date).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}