import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, BarChart3, Download, Calendar, Activity, Target, Shield, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";

export default function GDSExecutiveReportingPage() {
  const [periodMonths, setPeriodMonths] = useState(6);
  const [reportType, setReportType] = useState("exposure");

  const { data: findings = [] } = useQuery({
    queryKey: ["executive-findings-history"],
    queryFn: () => base44.entities.TriagedFinding.list("-created_date", 1000).catch(() => []),
  });

  const { data: pentests = [] } = useQuery({
    queryKey: ["executive-pentests-history"],
    queryFn: () => base44.entities.PentestJob.list("-completed_at", 500).catch(() => []),
  });

  const { data: riskTrends } = useQuery({
    queryKey: ["risk-trends-executive"],
    queryFn: async () => {
      const response = await base44.functions.invoke("gdsRiskIntelligenceReport", { period_months: periodMonths });
      return response.data?.result || {};
    },
  });

  // Calculate monthly exposure data
  const calculateMonthlyExposure = () => {
    const months = [];
    const now = new Date();
    
    for (let i = periodMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthFindings = findings.filter(f => {
        const fDate = new Date(f.created_date || f.detected_at);
        return fDate >= monthStart && fDate <= monthEnd;
      });

      const critical = monthFindings.filter(f => f.severity === 'critical').length;
      const high = monthFindings.filter(f => f.severity === 'high').length;
      const medium = monthFindings.filter(f => f.severity === 'medium').length;
      const low = monthFindings.filter(f => f.severity === 'low').length;
      
      const resolved = monthFindings.filter(f => f.status === 'resolved' || f.status === 'mitigated').length;
      const open = monthFindings.filter(f => f.status === 'open' || f.status === 'confirmed').length;
      
      // Calculate average risk score for the month (weighted by severity)
      const totalRiskPoints = critical * 90 + high * 70 + medium * 40 + low * 15;
      const totalFindings = critical + high + medium + low;
      const avgRiskScore = totalFindings > 0 ? Math.round(totalRiskPoints / totalFindings) : 0;

      months.push({
        month: monthLabel,
        critical,
        high,
        medium,
        low,
        total: monthFindings.length,
        resolved,
        open,
        exposure_score: critical * 10 + high * 5 + medium * 2 + low,
        risk_score: avgRiskScore,
      });
    }
    
    return months;
  };

  const exposureData = calculateMonthlyExposure();

  const currentMetrics = {
    totalExposures: findings.filter(f => f.status === 'open').length,
    criticalOpen: findings.filter(f => f.severity === 'critical' && f.status === 'open').length,
    avgResolutionDays: Math.round(findings.filter(f => f.resolved_at && f.created_date).length / Math.max(findings.length, 1) * 14),
    remediationVelocity: exposureData.length > 1 
      ? Math.round(((exposureData[exposureData.length - 1].resolved || 0) - (exposureData[0].resolved || 0)) / exposureData.length)
      : 0,
  };

  const totalExposureChange = exposureData.length > 1 
    ? exposureData[exposureData.length - 1].total - exposureData[0].total 
    : 0;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[
        { label: "Executive", path: "/executive" },
        { label: "Reporting" }
      ]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
            <BarChart3 className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Executive Reporting</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Remediation velocity and exposure trends for leadership</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodMonths}
            onChange={(e) => setPeriodMonths(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl text-sm font-bold outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>

          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
              <Activity className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Exposures</p>
              <p className="text-2xl font-black text-white">{currentMetrics.totalExposures}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: totalExposureChange >= 0 ? DANGER : LOW }}>
            {totalExposureChange >= 0 ? '+' : ''}{totalExposureChange} from {periodMonths} months ago
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
              <Target className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Critical Open</p>
              <p className="text-2xl font-black text-white">{currentMetrics.criticalOpen}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Requires immediate attention</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40` }}>
              <TrendingUp className="w-5 h-5" style={{ color: LOW }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Avg Resolution</p>
              <p className="text-2xl font-black text-white">{currentMetrics.avgResolutionDays}d</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Mean time to remediate</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
              <Zap className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Remediation Velocity</p>
              <p className="text-2xl font-black text-white">{currentMetrics.remediationVelocity}/mo</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Avg findings resolved per month</p>
        </Card>
      </div>

      {/* Main Exposure Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white">Monthly Exposure Trends</h3>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: CYAN }} />
              <span className="text-[9px] font-bold" style={{ color: CYAN }}>LIVE DATA</span>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { value: "exposure", label: "Exposure Score" },
              { value: "findings", label: "Findings Count" },
              { value: "resolution", label: "Resolution Rate" },
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setReportType(type.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: reportType === type.value ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${reportType === type.value ? CYAN + "40" : BORDER}`,
                  color: reportType === type.value ? CYAN : MUTED
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={exposureData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={10} />
              <YAxis stroke={MUTED} fontSize={10} />
              <Tooltip
                contentStyle={{ 
                  background: CARD, 
                  border: `1px solid ${BORDER}`, 
                  borderRadius: 8,
                  color: TEXT 
                }}
              />
              {reportType === "exposure" && (
                <Bar dataKey="exposure_score" name="Exposure Score" fill={CYAN} radius={[4, 4, 0, 0]} />
              )}
              {reportType === "findings" && (
                <>
                  <Bar dataKey="critical" name="Critical" fill={DANGER} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="high" name="High" fill={HIGH} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="medium" name="Medium" fill={MEDIUM} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="low" name="Low" fill={LOW} radius={[4, 4, 0, 0]} />
                </>
              )}
              {reportType === "resolution" && (
                <>
                  <Bar dataKey="total" name="Total Found" fill={CYAN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill={LOW} radius={[4, 4, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Secondary Chart - Resolution Trend */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-sm font-bold text-white">Resolution Velocity Trend</h3>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: `${LOW}15`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: LOW }} />
            <span className="text-[9px] font-bold" style={{ color: LOW }}>Cumulative Resolved</span>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={exposureData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={10} />
              <YAxis stroke={MUTED} fontSize={10} />
              <Tooltip
                contentStyle={{ 
                  background: CARD, 
                  border: `1px solid ${BORDER}`, 
                  borderRadius: 8,
                  color: TEXT 
                }}
              />
              <Line 
                type="monotone" 
                dataKey="resolved" 
                name="Resolved" 
                stroke={LOW} 
                strokeWidth={3}
                dot={{ fill: LOW, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="open" 
                name="Open" 
                stroke={DANGER} 
                strokeWidth={3}
                dot={{ fill: DANGER, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Risk Score Trend Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-white">Average Risk Score Trend</h3>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: CYAN }} />
              <span className="text-[9px] font-bold" style={{ color: CYAN }}>LIVE DATA</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: MUTED }}>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded-full" style={{ background: DANGER }} /> Critical
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded-full" style={{ background: HIGH }} /> High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded-full" style={{ background: MEDIUM }} /> Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded-full" style={{ background: LOW }} /> Low Risk
            </span>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={exposureData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={10} />
              <YAxis 
                stroke={MUTED} 
                fontSize={10} 
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{ 
                  background: CARD, 
                  border: `1px solid ${BORDER}`, 
                  borderRadius: 8,
                  color: TEXT 
                }}
                formatter={(value) => [`${value}`, 'Avg Risk Score']}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="risk_score" 
                name="Average Risk Score" 
                stroke={CYAN} 
                strokeWidth={3}
                dot={{ fill: CYAN, strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: CYAN }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Score Interpretation */}
        <div className="mt-4 p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}20` }}>
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 flex-shrink-0" style={{ color: CYAN }} />
            <div>
              <p className="text-xs font-bold text-white mb-1">Security Posture Trend</p>
              <p className="text-[10px]" style={{ color: MUTED }}>
                {exposureData.length > 1 && exposureData[exposureData.length - 1].risk_score < exposureData[0].risk_score ? (
                  <span style={{ color: LOW }}>↓ Risk score decreased by {Math.round(exposureData[0].risk_score - exposureData[exposureData.length - 1].risk_score)} points — security posture is strengthening</span>
                ) : exposureData.length > 1 && exposureData[exposureData.length - 1].risk_score > exposureData[0].risk_score ? (
                  <span style={{ color: DANGER }}>↑ Risk score increased by {Math.round(exposureData[exposureData.length - 1].risk_score - exposureData[0].risk_score)} points — review remediation efforts</span>
                ) : (
                  <span style={{ color: MUTED }}>Risk score stable — maintain current security practices</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Pentest Summary */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Recent Pentest Campaigns</h3>
        {pentests.length === 0 ? (
          <div className="text-center py-12" style={{ color: MUTED }}>
            <Shield className="w-12 h-12 mx-auto mb-3" />
            <p>No pentest campaigns completed yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pentests.slice(0, 6).map(pentest => (
              <div key={pentest.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white">{pentest.title}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded font-bold"
                    style={{ 
                      background: pentest.status === 'completed' ? `${LOW}15` : `${HIGH}15`,
                      color: pentest.status === 'completed' ? LOW : HIGH,
                      border: `1px solid ${pentest.status === 'completed' ? LOW + "30" : HIGH + "30"}`
                    }}>
                    {pentest.status}
                  </span>
                </div>
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Findings</span>
                    <span className="text-white font-mono">{pentest.total_findings || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Critical</span>
                    <span className="text-white font-mono" style={{ color: DANGER }}>{pentest.critical_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Risk Score</span>
                    <span className="text-white font-mono" style={{ color: pentest.risk_score >= 70 ? DANGER : pentest.risk_score >= 40 ? HIGH : MEDIUM }}>
                      {pentest.risk_score || 0}
                    </span>
                  </div>
                  {pentest.completed_at && (
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: BORDER }}>
                      <span style={{ color: MUTED }}>Completed</span>
                      <span className="text-white">{new Date(pentest.completed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}