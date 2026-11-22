import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertTriangle, Shield, TrendingDown, Calendar, Download } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, PAGE_BG, KpiCard
} from "@/components/gds/GDSOSShared";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from "recharts";
import { Button } from "@/components/ui/button";

export default function GDSRiskTrendsPage() {
  const [timeRange, setTimeRange] = useState(6); // months

  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["findings-trends"],
    queryFn: () => base44.entities.Finding.filter({}, '-created_date', 1000).catch(() => []),
  });

  const { data: pentestJobs = [] } = useQuery({
    queryKey: ["pentest-jobs-trends"],
    queryFn: () => base44.entities.PentestJob.list("-started_at", 100).catch(() => []),
  });

  const { data: attackSimulations = [] } = useQuery({
    queryKey: ["attack-simulations-trends"],
    queryFn: () => base44.entities.AttackSimulation.list("-started_at", 100).catch(() => []),
  });

  // Calculate monthly trends for the last N months
  const calculateTrends = () => {
    const now = new Date();
    const months = [];
    
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
        date: date,
        monthIndex: i
      });
    }

    return months.map(m => {
      const monthStart = new Date(m.date.getFullYear(), m.date.getMonth(), 1);
      const monthEnd = new Date(m.date.getFullYear(), m.date.getMonth() + 1, 0, 23, 59, 59);

      const monthFindings = findings.filter(f => {
        const fDate = new Date(f.created_date);
        return fDate >= monthStart && fDate <= monthEnd;
      });

      const critical = monthFindings.filter(f => f.severity === 'critical').length;
      const high = monthFindings.filter(f => f.severity === 'high').length;
      const medium = monthFindings.filter(f => f.severity === 'medium').length;
      const low = monthFindings.filter(f => f.severity === 'low').length;

      // Calculate risk score (weighted average)
      const totalFindings = monthFindings.length;
      const riskScore = totalFindings > 0 
        ? Math.min(100, Math.round((critical * 40 + high * 25 + medium * 10 + low * 5) / totalFindings))
        : 0;

      const resolved = monthFindings.filter(f => 
        f.workflow_status === 'resolved' || f.status === 'mitigated'
      ).length;

      const resolutionRate = totalFindings > 0 
        ? Math.round((resolved / totalFindings) * 100)
        : 0;

      return {
        month: m.month,
        findings: totalFindings,
        critical,
        high,
        medium,
        low,
        riskScore,
        resolved,
        resolutionRate
      };
    });
  };

  const trendData = calculateTrends();

  // Current stats
  const currentFindings = findings.filter(f => f.workflow_status !== 'resolved');
  const criticalCount = currentFindings.filter(f => f.severity === 'critical').length;
  const highCount = currentFindings.filter(f => f.severity === 'high').length;
  
  // Calculate trend direction
  const latestMonth = trendData[trendData.length - 1];
  const previousMonth = trendData[trendData.length - 2];
  
  const findingsChange = previousMonth && latestMonth 
    ? latestMonth.findings - previousMonth.findings 
    : 0;
  
  const riskScoreChange = previousMonth && latestMonth 
    ? latestMonth.riskScore - previousMonth.riskScore 
    : 0;

  const currentRiskScore = latestMonth?.riskScore || 0;

  const handleExport = () => {
    const csvContent = [
      ['Month', 'Total Findings', 'Critical', 'High', 'Medium', 'Low', 'Risk Score', 'Resolution Rate (%)'],
      ...trendData.map(d => [
        d.month, d.findings, d.critical, d.high, d.medium, d.low, d.riskScore, d.resolutionRate
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-trends-${timeRange}months.csv`;
    a.click();
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Risk Trends" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
            <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Risk Trends Dashboard</h1>
            <p className="text-sm mt-0.5" style={{ color: MUTED }}>Track security posture improvement over time</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
          <Button
            onClick={handleExport}
            className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard 
          label="Current Risk Score" 
          value={currentRiskScore} 
          sub={`${riskScoreChange > 0 ? '+' : ''}${riskScoreChange} from last month`}
          color={currentRiskScore >= 70 ? LOW : currentRiskScore >= 40 ? MEDIUM : DANGER}
          icon={currentRiskScore >= 70 ? Shield : currentRiskScore >= 40 ? AlertTriangle : Shield}
          pulse={riskScoreChange < 0}
        />
        <KpiCard 
          label="Open Findings" 
          value={currentFindings.length} 
          sub={`${findingsChange > 0 ? '+' : ''}${findingsChange} from last month`}
          color={CYAN}
          icon={AlertTriangle}
        />
        <KpiCard 
          label="Critical" 
          value={criticalCount} 
          color={DANGER}
          icon={AlertTriangle}
          pulse={criticalCount > 0}
        />
        <KpiCard 
          label="High" 
          value={highCount} 
          color={HIGH}
          icon={AlertTriangle}
        />
        <KpiCard 
          label="Resolution Rate" 
          value={`${latestMonth?.resolutionRate || 0}%`} 
          sub="This month"
          color={LOW}
          icon={TrendingDown}
        />
      </div>

      {/* Risk Score Trend Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Risk Score Trend</h3>
            <p className="text-xs" style={{ color: MUTED }}>Average risk score over time (lower is better)</p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded" style={{ background: LOW }} />
              <span style={{ color: MUTED }}>Good (70+)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded" style={{ background: MEDIUM }} />
              <span style={{ color: MUTED }}>Fair (40-69)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded" style={{ background: DANGER }} />
              <span style={{ color: MUTED }}>Poor (&lt;40)</span>
            </span>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={12} />
              <YAxis stroke={MUTED} fontSize={12} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  background: CARD, 
                  border: `1px solid ${BORDER}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: TEXT }}
              />
              <Area 
                type="monotone" 
                dataKey="riskScore" 
                stroke={CYAN} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRisk)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Findings Trend Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Findings by Severity</h3>
            <p className="text-xs" style={{ color: MUTED }}>Monthly breakdown of vulnerability discoveries</p>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={12} />
              <YAxis stroke={MUTED} fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  background: CARD, 
                  border: `1px solid ${BORDER}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: TEXT }}
              />
              <Bar dataKey="critical" stackId="a" fill={DANGER} name="Critical" />
              <Bar dataKey="high" stackId="a" fill={HIGH} name="High" />
              <Bar dataKey="medium" stackId="a" fill={MEDIUM} name="Medium" />
              <Bar dataKey="low" stackId="a" fill={LOW} name="Low" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Resolution Rate Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Resolution Rate</h3>
            <p className="text-xs" style={{ color: MUTED }}>Percentage of findings resolved each month</p>
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={12} />
              <YAxis stroke={MUTED} fontSize={12} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  background: CARD, 
                  border: `1px solid ${BORDER}`,
                  borderRadius: '8px'
                }}
                labelStyle={{ color: TEXT }}
                formatter={(value) => [`${value}%`, 'Resolution Rate']}
              />
              <Line 
                type="monotone" 
                dataKey="resolutionRate" 
                stroke={LOW} 
                strokeWidth={3}
                dot={{ fill: LOW, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">6-Month Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: MUTED }}>Total Findings</span>
              <span className="text-sm font-bold" style={{ color: TEXT }}>{trendData.reduce((sum, d) => sum + d.findings, 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: MUTED }}>Critical Findings</span>
              <span className="text-sm font-bold" style={{ color: DANGER }}>{trendData.reduce((sum, d) => sum + d.critical, 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: MUTED }}>High Findings</span>
              <span className="text-sm font-bold" style={{ color: HIGH }}>{trendData.reduce((sum, d) => sum + d.high, 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: MUTED }}>Avg Risk Score</span>
              <span className="text-sm font-bold" style={{ color: CYAN }}>
                {Math.round(trendData.reduce((sum, d) => sum + d.riskScore, 0) / trendData.length)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: MUTED }}>Avg Resolution Rate</span>
              <span className="text-sm font-bold" style={{ color: LOW }}>
                {Math.round(trendData.reduce((sum, d) => sum + d.resolutionRate, 0) / trendData.length)}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Improvement Metrics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: MUTED }}>Risk Score Change</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${riskScoreChange > 0 ? 'text-green-400' : riskScoreChange < 0 ? 'text-red-400' : ''}`} style={{ color: riskScoreChange > 0 ? LOW : riskScoreChange < 0 ? DANGER : MUTED }}>
                {riskScoreChange > 0 ? <TrendingUp className="w-4 h-4" /> : riskScoreChange < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                {riskScoreChange > 0 ? '+' : ''}{riskScoreChange}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: MUTED }}>Findings Change</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${findingsChange < 0 ? 'text-green-400' : findingsChange > 0 ? 'text-red-400' : ''}`} style={{ color: findingsChange < 0 ? LOW : findingsChange > 0 ? DANGER : MUTED }}>
                {findingsChange < 0 ? <TrendingDown className="w-4 h-4" /> : findingsChange > 0 ? <TrendingUp className="w-4 h-4" /> : null}
                {findingsChange > 0 ? '+' : ''}{findingsChange}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: MUTED }}>Best Month</span>
              <span className="text-sm font-bold" style={{ color: CYAN }}>
                {trendData.reduce((best, d) => d.riskScore > best.riskScore ? d : best, trendData[0])?.month || 'N/A'}
              </span>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: BORDER }}>
              <p className="text-xs mb-2" style={{ color: MUTED }}>Stakeholder Summary</p>
              <p className="text-sm" style={{ color: TEXT }}>
                {riskScoreChange > 0 
                  ? `✅ Risk score improved by ${riskScoreChange} points this month. Security posture is strengthening.`
                  : riskScoreChange < 0
                  ? `⚠️ Risk score decreased by ${Math.abs(riskScoreChange)} points. Additional remediation efforts recommended.`
                  : `➡️ Risk score stable. Continue current security practices.`
                }
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}