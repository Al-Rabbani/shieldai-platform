import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Activity, Clock } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton } from "@/components/gds/GDSOSShared";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const BG = "#020817";

export default function GDSSOCExecutivePage() {
  const { data: metrics = [], isLoading: loadM } = useQuery({
    queryKey: ["soc-metrics-exec"],
    queryFn: () => base44.entities.SOCMetrics.list("-measured_at", 90).catch(() => []),
  });

  const { data: incidents = [], isLoading: loadI } = useQuery({
    queryKey: ["soc-incidents-exec"],
    queryFn: () => base44.entities.Incident.list("-created_at", 200).catch(() => []),
  });

  const { data: alerts = [], isLoading: loadA } = useQuery({
    queryKey: ["soc-alerts-exec"],
    queryFn: () => base44.entities.Alert.list("-created_at", 500).catch(() => []),
  });

  const { data: investigations = [], isLoading: loadInv } = useQuery({
    queryKey: ["soc-investigations-exec"],
    queryFn: () => base44.entities.Investigation.list("-started_at", 100).catch(() => []),
  });

  const orgRiskScore = calculateOrgRiskScore(metrics, incidents, alerts);
  const riskTrend = calculateRiskTrend(metrics);

  const alertTrendData = metrics.slice(0, 30).reverse().map(m => ({
    date: new Date(m.measured_at).toLocaleDateString(),
    alerts: m.total_alerts || 0,
    critical: m.critical_alerts || 0
  }));

  const totalInvestigationTime = investigations.reduce((sum, inv) => {
    if (inv.completed_at && inv.started_at) {
      const hours = (new Date(inv.completed_at) - new Date(inv.started_at)) / (1000 * 60 * 60);
      return sum + hours;
    }
    return sum;
  }, 0);

  const activeInvestigations = investigations.filter(inv => inv.status === "active").length;
  const avgInvestigationTime = investigations.length > 0 ? (totalInvestigationTime / investigations.length).toFixed(1) : 0;
  const openIncidents = incidents.filter(i => i.status === "open" || i.status === "investigating").length;
  const criticalIncidents = incidents.filter(i => i.severity === "critical").length;
  const highIncidents = incidents.filter(i => i.severity === "high").length;
  const mediumIncidents = incidents.filter(i => i.severity === "medium").length;

  const totalAlerts24h = alerts.filter(a => {
    const created = new Date(a.created_at);
    const now = new Date();
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }).length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "AI-SOC", path: "/soc" }, { label: "Executive Dashboard" }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Executive SOC Dashboard</h1>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Organization-wide security posture and operational metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5" style={{ background: `linear-gradient(135deg, ${orgRiskScore >= 70 ? '#10b981' : orgRiskScore >= 40 ? '#f59e0b' : '#ef4444'}20, rgba(2,8,23,0))`, border: `1px solid ${orgRiskScore >= 70 ? '#10b981' : orgRiskScore >= 40 ? '#f59e0b' : '#ef4444'}40` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Org Risk Score</span>
            <Shield className="w-4 h-4" style={{ color: orgRiskScore >= 70 ? LOW : orgRiskScore >= 40 ? MEDIUM : DANGER }} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black ${orgRiskScore >= 70 ? 'text-green-400' : orgRiskScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{orgRiskScore}</span>
            <span className="text-xs" style={{ color: MUTED }}>/100</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {riskTrend > 0 ? <TrendingUp className="w-3 h-3" style={{ color: LOW }} /> : riskTrend < 0 ? <TrendingDown className="w-3 h-3" style={{ color: DANGER }} /> : null}
            <span className="text-[10px]" style={{ color: MUTED }}>{riskTrend > 0 ? 'Improving' : riskTrend < 0 ? 'Declining' : 'Stable'}</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Alerts (24h)</span>
            <Activity className="w-4 h-4" style={{ color: CYAN }} />
          </div>
          <p className="text-4xl font-black" style={{ color: CYAN }}>{totalAlerts24h}</p>
          <p className="text-[10px] mt-2" style={{ color: MUTED }}>Last 24 hours</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Open Incidents</span>
            <AlertTriangle className="w-4 h-4" style={{ color: criticalIncidents > 0 ? DANGER : TEXT }} />
          </div>
          <p className={`text-4xl font-black ${criticalIncidents > 0 ? 'text-red-400' : 'text-white'}`}>{openIncidents}</p>
          <p className="text-[10px] mt-2" style={{ color: MUTED }}>{criticalIncidents} critical</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Investigations</span>
            <Clock className="w-4 h-4" style={{ color: HIGH }} />
          </div>
          <p className="text-4xl font-black" style={{ color: HIGH }}>{activeInvestigations}</p>
          <p className="text-[10px] mt-2" style={{ color: MUTED }}>Avg: {avgInvestigationTime}h</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Active Alert Trends (30 Days)</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Total alerts and critical severity breakdown</p>
          </div>
        </div>
        {loadA || loadM ? <Skeleton lines={6} /> : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={alertTrendData}>
              <defs>
                <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DANGER} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={DANGER} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" stroke={MUTED} fontSize={10} tick={{ angle: -45, textAnchor: 'end' }} height={60} />
              <YAxis stroke={MUTED} fontSize={10} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${BORDER}`, color: TEXT }} />
              <Legend />
              <Area type="monotone" dataKey="alerts" stroke={CYAN} fillOpacity={1} fill="url(#colorAlerts)" strokeWidth={2} name="Total Alerts" />
              <Area type="monotone" dataKey="critical" stroke={DANGER} fillOpacity={1} fill="url(#colorCritical)" strokeWidth={2} name="Critical" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" style={{ color: HIGH }} />
            <h3 className="text-sm font-bold text-white">Investigation Time Analytics</h3>
          </div>
          {loadInv ? <Skeleton lines={6} /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Time Invested</p>
                  <p className="text-2xl font-black" style={{ color: TEXT }}>{totalInvestigationTime.toFixed(1)}h</p>
                  <p className="text-[10px] mt-1" style={{ color: MUTED }}>All investigations</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg per Investigation</p>
                  <p className="text-2xl font-black" style={{ color: HIGH }}>{avgInvestigationTime}h</p>
                  <p className="text-[10px] mt-1" style={{ color: MUTED }}>Per case average</p>
                </div>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Recent Investigations</p>
                  <span className="text-[10px]" style={{ color: MUTED }}>{investigations.length} total</span>
                </div>
                <div className="space-y-2">
                  {investigations.slice(0, 5).map((inv, i) => (
                    <div key={inv.id || i} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[200px]" style={{ color: TEXT }}>{inv.title || 'Investigation'}</span>
                      <span className="text-[10px]" style={{ color: MUTED }}>
                        {inv.completed_at && inv.started_at 
                          ? `${((new Date(inv.completed_at) - new Date(inv.started_at)) / (1000 * 60 * 60)).toFixed(1)}h`
                          : 'Active'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5" style={{ color: orgRiskScore >= 70 ? LOW : orgRiskScore >= 40 ? MEDIUM : DANGER }} />
            <h3 className="text-sm font-bold text-white">Risk Score Breakdown</h3>
          </div>
          {loadM || loadI ? <Skeleton lines={6} /> : (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-3" 
                  style={{ 
                    background: `conic-gradient(${orgRiskScore >= 70 ? LOW : orgRiskScore >= 40 ? MEDIUM : DANGER} ${orgRiskScore}%, rgba(255,255,255,0.1) ${orgRiskScore}%)`,
                    boxShadow: `0 0 30px ${orgRiskScore >= 70 ? 'rgba(0,255,136,0.3)' : orgRiskScore >= 40 ? 'rgba(255,215,0,0.3)' : 'rgba(255,59,59,0.3)'}`
                  }}>
                  <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: BG }}>
                    <span className={`text-4xl font-black ${orgRiskScore >= 70 ? 'text-green-400' : orgRiskScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{orgRiskScore}</span>
                  </div>
                </div>
                <p className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>Organization-Wide Risk Score</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical</p>
                  <p className="text-lg font-black" style={{ color: DANGER }}>{criticalIncidents}</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>High</p>
                  <p className="text-lg font-black" style={{ color: HIGH }}>{highIncidents}</p>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Medium</p>
                  <p className="text-lg font-black" style={{ color: MEDIUM }}>{mediumIncidents}</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function calculateOrgRiskScore(metrics, incidents, alerts) {
  if (metrics.length === 0 && incidents.length === 0) return 100;
  const latest = metrics[0];
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
  const highIncidents = incidents.filter(i => i.severity === 'high').length;
  const openIncidents = incidents.filter(i => ['open', 'investigating'].includes(i.status)).length;
  let score = 100;
  score -= criticalIncidents * 15;
  score -= highIncidents * 8;
  score -= openIncidents * 3;
  if (latest?.mttd_minutes > 60) score -= 10;
  else if (latest?.mttd_minutes > 30) score -= 5;
  if (latest?.mttr_hours > 4) score -= 10;
  else if (latest?.mttr_hours > 2) score -= 5;
  if ((latest?.automation_rate || 0) > 50) score += 5;
  if ((latest?.soc_health_score || 0) > 80) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateRiskTrend(metrics) {
  if (metrics.length < 2) return 0;
  const latest = metrics[0];
  const previous = metrics[1];
  const currentScore = (latest?.soc_health_score || 50);
  const previousScore = (previous?.soc_health_score || 50);
  return Math.round(currentScore - previousScore);
}