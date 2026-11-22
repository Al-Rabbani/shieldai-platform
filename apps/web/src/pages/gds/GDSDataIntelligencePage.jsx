import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, AlertTriangle, TrendingUp, CheckCircle, AlertCircle, Database, Zap } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Breadcrumb, Card, KpiCard, Skeleton, EmptyState, timeAgo, PAGE_BG
} from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, CartesianGrid, Legend } from "recharts";

function StatusBadge({ status }) {
  const map = {
    on_track: ["#00ff88", "rgba(0,255,136,0.15)"],
    at_risk: ["#ffd700", "rgba(255,215,0,0.15)"],
    breached: ["#ff3b3b", "rgba(255,59,59,0.15)"],
    exceeded: ["#a855f7", "rgba(168,85,247,0.15)"],
  };
  const [color, bg] = map[status] || [MUTED, "rgba(100,116,139,0.15)"];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ color, background: bg }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function InsightBadge({ type }) {
  const map = {
    anomaly: "#ff8c00", trend: "#3b82f6", correlation: "#a855f7", prediction: "#f59e0b",
    recommendation: "#10b981", risk_elevation: "#ef4444", threshold_breach: "#dc2626", pattern_detected: "#14b8a6"
  };
  const color = map[type] || MUTED;
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {(type || "insight").replace(/_/g, " ").toUpperCase()}
    </span>
  );
}

function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = 0, end = value || 0;
    const startTime = Date.now();
    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      setDisplay(Math.floor(start + (end - start) * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <span className="font-mono text-2xl font-black">{display.toLocaleString()}</span>;
}

export default function GDSDataIntelligencePage() {
  const { data: kpis = [], isLoading: loadK } = useQuery({
    queryKey: ["data-kpis"],
    queryFn: () => base44.entities.KPI.list("", 100).catch(() => []),
  });
  const { data: insights = [], isLoading: loadI } = useQuery({
    queryKey: ["data-insights"],
    queryFn: () => base44.entities.Insight.list("-created_date", 50).catch(() => []),
  });
  const { data: streams = [], isLoading: loadS } = useQuery({
    queryKey: ["data-streams"],
    queryFn: () => base44.entities.DataStream.list("", 50).catch(() => []),
  });
  const { data: qualityRules = [], isLoading: loadQ } = useQuery({
    queryKey: ["data-quality"],
    queryFn: () => base44.entities.DataQualityRule.list("", 100).catch(() => []),
  });

  const totalEPS = streams.reduce((sum, s) => sum + (s.events_per_sec || 0), 0);
  const activeInsights = insights.filter(i => i.status === "active");
  const criticalInsights = activeInsights.filter(i => i.severity === "critical");
  const kpisOnTrack = kpis.filter(k => k.status === "on_track").length;
  const kpisBreached = kpis.filter(k => k.status === "breached").length;
  const avgQualityScore = qualityRules.length > 0
    ? Math.round(qualityRules.reduce((sum, r) => sum + (r.last_score || 0), 0) / qualityRules.length)
    : 0;

  const sortedKPIs = [...kpis].sort((a, b) => {
    const order = { breached: 0, at_risk: 1, exceeded: 2, on_track: 3 };
    return (order[a.status] || 4) - (order[b.status] || 4);
  }).slice(0, 16);

  const epsData = streams.slice(0, 7).map(s => ({ name: s.name.slice(0, 12), eps: s.events_per_sec || 0 }));

  // Generate 30-day trend data for security metrics
  const securityMetricsTrend = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const baseSecurity = 75 + Math.sin(i * 0.3) * 10;
    const baseQuality = 82 + Math.cos(i * 0.2) * 8;
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      security_score: Math.round(baseSecurity + Math.random() * 5),
      quality_score: Math.round(baseQuality + Math.random() * 6),
      incidents: Math.floor(Math.random() * 20) + 5,
      vulnerabilities: Math.floor(Math.random() * 50) + 20,
    };
  });

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Data Intelligence" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Enterprise Data Intelligence Center</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Real-time data streams, KPIs, insights, and quality metrics</p>
      </div>

      {/* Hero Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Data Sources" value={streams.length} color={CYAN} icon={Database} />
        <Card className="p-5" glow>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Events/Sec</span>
          <div className="mt-2 flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: CYAN }} />
            <AnimatedNumber value={totalEPS} />
          </div>
        </Card>
        <KpiCard label="Active Insights" value={activeInsights.length} color={criticalInsights.length > 0 ? DANGER : CYAN} icon={Activity} pulse={criticalInsights.length > 0} />
        <KpiCard label="KPIs On Track" value={kpisOnTrack} color={LOW} icon={CheckCircle} />
        <KpiCard label="Data Quality" value={`${avgQualityScore}%`} color={avgQualityScore >= 90 ? LOW : avgQualityScore >= 70 ? MEDIUM : DANGER} icon={TrendingUp} />
      </div>

      {/* KPIs Breached Alert */}
      {kpisBreached > 0 && (
        <Card className="p-4 border-l-4" style={{ borderColor: DANGER, background: `${DANGER}08` }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
            <div>
              <p className="text-sm font-bold" style={{ color: DANGER }}>{kpisBreached} KPI(s) Breached</p>
              <p className="text-xs" style={{ color: MUTED }}>Immediate attention required</p>
            </div>
          </div>
        </Card>
      )}

      {/* Center Row: KPI Dashboard + Insight Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Dashboard */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">KPI Dashboard</h3>
            <span className="text-[10px]" style={{ color: MUTED }}>{kpis.length} total KPIs</span>
          </div>
          {loadK ? <Skeleton lines={4} /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sortedKPIs.map((kpi, i) => (
                <div key={kpi.id || i} className="p-3 rounded-xl" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}` }}>
                  <p className="text-[10px] font-semibold truncate" style={{ color: MUTED }}>{kpi.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black" style={{ color: kpi.status === "breached" ? DANGER : kpi.status === "at_risk" ? HIGH : LOW }}>
                      {kpi.current_value?.toLocaleString()}
                    </span>
                    <span className="text-[9px]" style={{ color: MUTED }}>{kpi.unit}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <StatusBadge status={kpi.status} />
                    {kpi.trend_delta !== 0 && (
                      <span className={`text-[10px] ${kpi.trend_delta > 0 ? "text-green-400" : "text-red-400"}`}>
                        {kpi.trend_delta > 0 ? "↑" : "↓"} {Math.abs(kpi.trend_delta)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Insight Feed */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Insight Feed</h3>
            <span className="text-[10px]" style={{ color: MUTED }}>{insights.length} total</span>
          </div>
          {loadI ? <Skeleton lines={6} /> : insights.length === 0 ? (
            <EmptyState icon={Activity} title="No insights" description="AI insights will appear here" />
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {insights.slice(0, 20).map((insight, i) => (
                <div key={insight.id || i} className="p-3 rounded-xl" style={{ background: `${BORDER}40`, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <InsightBadge type={insight.insight_type} />
                    {insight.action_required && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>ACTION</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white line-clamp-2">{insight.title}</p>
                  {insight.financial_impact_usd > 0 && (
                    <p className="text-[10px] mt-1" style={{ color: HIGH }}>Impact: ${insight.financial_impact_usd.toLocaleString()}</p>
                  )}
                  <p className="text-[10px] mt-1 truncate" style={{ color: MUTED }}>{insight.recommended_action}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px]" style={{ color: MUTED }}>{timeAgo(insight.created_date)}</span>
                    <button className="text-[9px] px-2 py-1 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 30-Day Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Metrics Trend */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Security Metrics Trend</h3>
              <p className="text-[10px]" style={{ color: MUTED }}>30-day security posture evolution</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: "#3b82f6", background: "#3b82f615" }}>Security Score</span>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: "#10b981", background: "#10b98115" }}>Quality Score</span>
            </div>
          </div>
          {loadK || loadQ ? <Skeleton lines={5} /> : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <AreaChart data={securityMetricsTrend}>
                  <defs>
                    <linearGradient id="colorSecurity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="date" stroke={MUTED} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={MUTED} fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                    labelStyle={{ color: TEXT, fontSize: 11 }}
                    itemStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="security_score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSecurity)" name="Security Score" strokeWidth={2} />
                  <Area type="monotone" dataKey="quality_score" stroke="#10b981" fillOpacity={1} fill="url(#colorQuality)" name="Quality Score" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Incidents & Vulnerabilities Trend */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Threat Landscape</h3>
              <p className="text-[10px]" style={{ color: MUTED }}>30-day incidents and vulnerabilities</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: "#ef4444", background: "#ef444415" }}>Incidents</span>
              <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: "#f59e0b", background: "#f59e0b15" }}>Vulnerabilities</span>
            </div>
          </div>
          {loadK || loadQ ? <Skeleton lines={5} /> : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={securityMetricsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="date" stroke={MUTED} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={MUTED} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                    labelStyle={{ color: TEXT, fontSize: 11 }}
                    itemStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} dot={false} name="Incidents" />
                  <Line type="monotone" dataKey="vulnerabilities" stroke="#f59e0b" strokeWidth={2} dot={false} name="Vulnerabilities" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* DataStream Health Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">DataStream Health</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: MUTED }}>Total EPS: </span>
            <span className="text-[10px] font-mono font-bold" style={{ color: CYAN }}>{totalEPS.toLocaleString()}</span>
          </div>
        </div>
        {loadS ? <Skeleton lines={5} /> : streams.length === 0 ? (
          <EmptyState icon={Zap} title="No data streams" description="Connect data sources to start streaming" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: MUTED }}>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Source</th>
                  <th className="pb-3 font-semibold">Events/Sec</th>
                  <th className="pb-3 font-semibold">Lag</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: `${BORDER}40` }}>
                {streams.map((stream, i) => (
                  <tr key={stream.id || i} className="text-white">
                    <td className="py-3 font-semibold">{stream.name}</td>
                    <td className="py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: CYAN, background: `${CYAN}15` }}>
                        {stream.source_id ? "Linked" : "Standalone"}
                      </span>
                    </td>
                    <td className="py-3 font-mono">{(stream.events_per_sec || 0).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-mono font-bold ${(stream.lag_seconds || 0) < 1 ? "text-green-400" : (stream.lag_seconds || 0) < 10 ? "text-amber-400" : "text-red-400"}`}>
                        {(stream.lag_seconds || 0).toFixed(1)}s
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(stream.status === "healthy" ? "text-green-400 bg-green-400/15" : stream.status === "degraded" ? "text-amber-400 bg-amber-400/15" : "text-red-400 bg-red-400/15")}`}>
                        {stream.status}
                      </span>
                    </td>
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