import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Activity, Clock, Zap, Shield, BookOpen } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ComposedChart } from "recharts";

const BG = "#020817";
const COLORS = [CYAN, HIGH, DANGER, LOW, MEDIUM, "#a855f7", "#f97316", "#ec4899"];

export default function GDSSOCMetricsPage() {
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["soc-metrics"],
    queryFn: () => base44.entities.SOCMetrics.list("-measured_at", 90).catch(() => []),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["soc-incidents-metrics"],
    queryFn: () => base44.entities.Incident.list("-created_at", 500).catch(() => []),
  });

  const latest = metrics[0];
  
  // 30-day alert volume trend
  const alertVolumeData = metrics.slice(0, 30).reverse().map(m => ({
    date: new Date(m.measured_at).toLocaleDateString(),
    alerts: m.total_alerts || 0,
    incidents: m.incidents_created || 0,
    autoResolved: Math.round((m.total_alerts || 0) * ((m.automation_rate || 0) / 100)),
    manualResolved: Math.round((m.total_alerts || 0) * (1 - (m.automation_rate || 0) / 100))
  }));

  // Incident resolution times (MTTR trend)
  const resolutionTimeData = metrics.slice(0, 30).reverse().map(m => ({
    date: new Date(m.measured_at).toLocaleDateString(),
    mttr: m.mttr_hours || 0,
    mttd: m.mttd_minutes || 0,
    mttc: m.mttc_hours || 0
  }));

  // Team response rate calculation
  const responseRateData = metrics.slice(0, 30).reverse().map(m => {
    const totalAlerts = m.total_alerts || 0;
    const autoResolved = Math.round(totalAlerts * ((m.automation_rate || 0) / 100));
    const triagedInTime = Math.round(totalAlerts * ((m.sla_compliance_rate || 80) / 100));
    return {
      date: new Date(m.measured_at).toLocaleDateString(),
      responseRate: m.sla_compliance_rate || 0,
      autoResolutionRate: m.automation_rate || 0,
      triagedInTime: triagedInTime,
      totalAlerts: totalAlerts
    };
  });

  const avgResponseRate = responseRateData.length > 0 
    ? Math.round(responseRateData.reduce((sum, d) => sum + d.responseRate, 0) / responseRateData.length) 
    : 0;
  const avgAutoRate = responseRateData.length > 0 
    ? Math.round(responseRateData.reduce((sum, d) => sum + d.autoResolutionRate, 0) / responseRateData.length) 
    : 0;

  const alertsBySource = metrics.slice(0, 7).reduce((acc, m) => {
    Object.entries(m.alerts_by_source || {}).forEach(([source, count]) => {
      acc[source] = (acc[source] || 0) + count;
    });
    return acc;
  }, {});
  const sourceData = Object.entries(alertsBySource).map(([name, value]) => ({ name, value }));

  const tierData = [
    { name: "T1", value: metrics.slice(0, 7).reduce((s, m) => s + (m.t1_alerts || 0), 0) },
    { name: "T2", value: metrics.slice(0, 7).reduce((s, m) => s + (m.t2_alerts || 0), 0) },
    { name: "T3", value: metrics.slice(0, 7).reduce((s, m) => s + (m.t3_alerts || 0), 0) }
  ];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "AI-SOC", path: "/soc" }, { label: "Metrics" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">SOC Performance Metrics</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Operational efficiency and trend analysis</p>
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>MTTD</p>
          <p className={`text-2xl font-black ${latest?.mttd_minutes > 60 ? 'text-red-400' : latest?.mttd_minutes > 15 ? 'text-orange-400' : 'text-green-400'}`}>{latest?.mttd_minutes || 0}m</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Target: &lt;15m</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>MTTR</p>
          <p className={`text-2xl font-black ${latest?.mttr_hours > 4 ? 'text-red-400' : latest?.mttr_hours > 2 ? 'text-orange-400' : 'text-green-400'}`}>{latest?.mttr_hours || 0}h</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Target: &lt;4h</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>MTTC</p>
          <p className="text-2xl font-black" style={{ color: TEXT }}>{latest?.mttc_hours || 0}h</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Automation</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>{latest?.automation_rate || 0}%</p>
          <div className="w-full h-2 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${latest?.automation_rate || 0}%`, background: CYAN }} />
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SOC Health</p>
          <p className={`text-2xl font-black ${latest?.soc_health_score >= 80 ? 'text-green-400' : latest?.soc_health_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{latest?.soc_health_score || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Queue Depth</p>
          <p className="text-2xl font-black" style={{ color: MEDIUM }}>{latest?.queue_depth || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Noise Reduction</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{latest?.noise_reduction_pct || 0}%</p>
        </Card>
      </div>

      {/* Team Response Rate Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Response Rate</p>
          <p className={`text-2xl font-black ${avgResponseRate >= 90 ? 'text-green-400' : avgResponseRate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{avgResponseRate}%</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Last 30 days</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Auto-Resolution Rate</p>
          <p className="text-2xl font-black" style={{ color: CYAN }}>{avgAutoRate}%</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Last 30 days</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Alerts</p>
          <p className="text-2xl font-black" style={{ color: TEXT }}>{responseRateData.reduce((sum, d) => sum + d.totalAlerts, 0).toLocaleString()}</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Last 30 days</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Triaged In Time</p>
          <p className="text-2xl font-black" style={{ color: LOW }}>{responseRateData.reduce((sum, d) => sum + d.triagedInTime, 0).toLocaleString()}</p>
          <p className="text-[9px] mt-1" style={{ color: MUTED }}>Last 30 days</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Volume Trends (30 days) */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Alert Volume Trends (30 Days)</h3>
          {isLoading ? <Skeleton lines={6} /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={alertVolumeData}>
                <defs>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CYAN} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={DANGER} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={DANGER} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" stroke={MUTED} fontSize={10} tick={{ angle: -45, textAnchor: 'end' }} height={60} />
                <YAxis stroke={MUTED} fontSize={10} />
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: TEXT }} />
                <Legend />
                <Area type="monotone" dataKey="alerts" stroke={CYAN} fillOpacity={1} fill="url(#colorAlerts)" strokeWidth={2} />
                <Area type="monotone" dataKey="incidents" stroke={DANGER} fillOpacity={1} fill="url(#colorIncidents)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Incident Resolution Times */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Incident Resolution Times</h3>
          {isLoading ? <Skeleton lines={6} /> : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={resolutionTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" stroke={MUTED} fontSize={10} tick={{ angle: -45, textAnchor: 'end' }} height={60} />
                <YAxis yAxisId="left" stroke={MUTED} fontSize={10} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke={MUTED} fontSize={10} label={{ value: 'Minutes', angle: 90, position: 'insideRight', fill: MUTED, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: TEXT }} />
                <Legend />
                <Bar yAxisId="left" dataKey="mttr" fill={HIGH} barSize={20} name="MTTR (hrs)" />
                <Bar yAxisId="left" dataKey="mttc" fill={MEDIUM} barSize={20} name="MTTC (hrs)" />
                <Line yAxisId="right" type="monotone" dataKey="mttd" stroke={CYAN} strokeWidth={2} dot={false} name="MTTD (min)" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Team Response Rate */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Team Response Rate (30 Days)</h3>
          {isLoading ? <Skeleton lines={6} /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={responseRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="date" stroke={MUTED} fontSize={10} tick={{ angle: -45, textAnchor: 'end' }} height={60} />
                <YAxis stroke={MUTED} fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: TEXT }} />
                <Legend />
                <Line type="monotone" dataKey="responseRate" stroke={LOW} strokeWidth={3} dot={{ r: 4 }} name="Response Rate %" />
                <Line type="monotone" dataKey="autoResolutionRate" stroke={CYAN} strokeWidth={2} dot={false} strokeDasharray="5 5" name="Auto-Resolution %" />
                <defs>
                  <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={LOW} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={LOW} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="responseRate" stroke={LOW} fill="url(#colorResponse)" fillOpacity={0.3} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Alerts by Source */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Alerts by Source Type</h3>
          {isLoading ? <Skeleton lines={6} /> : sourceData.length === 0 ? (
            <div className="text-center py-12"><p className="text-sm" style={{ color: MUTED }}>No data</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" stroke={MUTED} fontSize={10} />
                <YAxis stroke={MUTED} fontSize={10} />
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: TEXT }} />
                <Bar dataKey="value" fill={CYAN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}