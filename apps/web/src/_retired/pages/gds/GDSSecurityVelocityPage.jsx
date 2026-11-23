import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb } from "@/components/gds/GDSOSShared";
import { AnimatedChartTooltip } from "@/components/gds/AnimatedChartTooltip";

export default function GDSSecurityVelocityPage() {
  const [periodDays, setPeriodDays] = useState(90);

  const { data: findings = [] } = useQuery({
    queryKey: ["all-findings-velocity"],
    queryFn: () => base44.entities.TriagedFinding.list("-created_date", 2000).catch(() => []),
  });

  const { data: pentestJobs = [] } = useQuery({
    queryKey: ["pentest-jobs-velocity"],
    queryFn: () => base44.entities.PentestJob.list("-completed_at", 500).catch(() => []),
  });

  // Process data for velocity chart
  const velocityData = React.useMemo(() => {
    const now = new Date();
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const monthlyData = {};

    // Initialize months
    for (let d = new Date(startDate); d <= now; d.setMonth(d.getMonth() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), opened: 0, remediated: 0, open: 0 };
    }

    // Count opened findings per month
    findings.forEach(f => {
      const created = new Date(f.created_date || f.detected_at);
      if (created >= startDate) {
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key]) monthlyData[key].opened++;
      }
      // Count remediated (status = resolved/mitigated)
      if (f.status === 'resolved' || f.status === 'mitigated') {
        const resolved = new Date(f.updated_date || f.created_date);
        if (resolved >= startDate) {
          const key = `${resolved.getFullYear()}-${String(resolved.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyData[key]) monthlyData[key].remediated++;
        }
      }
    });

    // Calculate cumulative open findings
    let cumulative = 0;
    const result = Object.values(monthlyData).sort((a, b) => {
      const [aYear, aMonth] = a.month.split(', ')[1] ? a.month.split(', ') : ['20', a.month.slice(0, 3)];
      const [bYear, bMonth] = b.month.split(', ')[1] ? b.month.split(', ') : ['20', b.month.slice(0, 3)];
      return new Date(`20${aYear}-${aMonth}-01`) - new Date(`20${bYear}-${bMonth}-01`);
    }).map(m => {
      cumulative += m.opened - m.remediated;
      m.open = cumulative;
      return m;
    });

    return result;
  }, [findings, periodDays]);

  const stats = {
    totalOpen: findings.filter(f => f.status === 'open' || f.status === 'confirmed').length,
    remediatedThisMonth: findings.filter(f => {
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
      const updated = new Date(f.updated_date || f.created_date);
      return (f.status === 'resolved' || f.status === 'mitigated') && updated >= monthAgo;
    }).length,
    avgRemediationDays: (() => {
      const resolved = findings.filter(f => f.status === 'resolved' || f.status === 'mitigated');
      if (resolved.length === 0) return 0;
      const total = resolved.reduce((acc, f) => {
        const created = new Date(f.created_date || f.detected_at);
        const resolved = new Date(f.updated_date || f.created_date);
        return acc + Math.max(0, (resolved - created) / (1000 * 60 * 60 * 24));
      }, 0);
      return Math.round(total / resolved.length);
    })(),
    velocity: velocityData.length > 0 ? velocityData[velocityData.length - 1].remediated : 0,
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Security Velocity" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Security Velocity</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Remediation progress and vulnerability trends</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[30, 60, 90, 180].map(days => (
            <button
              key={days}
              onClick={() => setPeriodDays(days)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: periodDays === days ? `${CYAN}15` : "rgba(255,255,255,0.04)",
                border: `1px solid ${periodDays === days ? CYAN + "40" : BORDER}`,
                color: periodDays === days ? CYAN : MUTED
              }}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40` }}>
              <AlertCircle className="w-5 h-5" style={{ color: DANGER }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Open Vulnerabilities</p>
              <p className="text-2xl font-black text-white">{stats.totalOpen}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Active findings</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40` }}>
              <CheckCircle className="w-5 h-5" style={{ color: LOW }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Remediated This Month</p>
              <p className="text-2xl font-black text-white">{stats.remediatedThisMonth}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Completed fixes</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${HIGH}15`, border: `1px solid ${HIGH}40` }}>
              <Calendar className="w-5 h-5" style={{ color: HIGH }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Avg Remediation Time</p>
              <p className="text-2xl font-black text-white">{stats.avgRemediationDays}d</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Mean time to fix</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40` }}>
              <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Monthly Velocity</p>
              <p className="text-2xl font-black text-white">{stats.velocity}</p>
            </div>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>Findings closed/month</p>
        </Card>
      </div>

      {/* Main Velocity Chart */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Vulnerability Trends vs Remediation Rate</h3>
        {velocityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={11} />
              <YAxis stroke={MUTED} fontSize={11} />
              <Tooltip content={<AnimatedChartTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="opened" stroke={DANGER} strokeWidth={2} dot={{ r: 3 }} name="New Vulnerabilities" />
              <Line type="monotone" dataKey="remediated" stroke={LOW} strokeWidth={2} dot={{ r: 3 }} name="Remediated" />
              <Line type="monotone" dataKey="open" stroke={CYAN} strokeWidth={2} dot={{ r: 3 }} name="Open Total" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-sm" style={{ color: MUTED }}>No data available for the selected period</p>
          </div>
        )}
      </Card>

      {/* Remediation Velocity Bar Chart */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Monthly Remediation Velocity</h3>
        {velocityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" stroke={MUTED} fontSize={11} />
              <YAxis stroke={MUTED} fontSize={11} />
              <Tooltip content={<AnimatedChartTooltip />} />
              <Bar dataKey="remediated" fill={LOW} name="Remediated" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center">
            <p className="text-sm" style={{ color: MUTED }}>No remediation data available</p>
          </div>
        )}
      </Card>
    </div>
  );
}