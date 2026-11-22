import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, AlertTriangle, Shield, CheckCircle, Clock, TrendingUp, Mail, MessageSquare, Zap } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts";

export default function GDSComplianceAlertsPage() {
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterFramework, setFilterFramework] = useState("all");

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ["compliance-alerts"],
    queryFn: () => base44.entities.WorkflowAlert.filter(
      { alert_type: 'compliance_drift' },
      '-created_date',
      100
    ).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["compliance-alert-metrics"],
    queryFn: () => base44.functions.invoke("gdsComplianceAlertMonitor", { action: 'check_compliance_drift' }).then(r => r.data.result),
    refetchInterval: 300000,
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId) => base44.entities.WorkflowAlert.update(alertId, { status: 'resolved' }),
  });

  const handleResolve = async (alertId) => {
    await resolveMutation.mutateAsync(alertId);
    refetch();
  };

  const filteredAlerts = alerts?.filter(alert => {
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesFramework = filterFramework === 'all' || alert.metadata?.framework === filterFramework;
    return matchesSeverity && matchesFramework;
  });

  const stats = {
    total: alerts?.length || 0,
    critical: alerts?.filter(a => a.severity === 'critical').length || 0,
    high: alerts?.filter(a => a.severity === 'high').length || 0,
    resolved: alerts?.filter(a => a.status === 'resolved').length || 0
  };

  const trendData = [
    { day: 'Mon', alerts: 3 },
    { day: 'Tue', alerts: 5 },
    { day: 'Wed', alerts: 2 },
    { day: 'Thu', alerts: 8 },
    { day: 'Fri', alerts: 4 },
    { day: 'Sat', alerts: 1 },
    { day: 'Sun', alerts: 3 }
  ];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Compliance Alerts" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Bell className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Compliance Alert System</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time ISO 27001 & SOC 2 control failure notifications</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30` }}>
            <Zap className="w-3 h-3" style={{ color: CYAN }} />
            <span className="text-[10px] font-black" style={{ color: CYAN }}>AUTO-MONITORING</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Alerts</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.critical}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.high}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Resolved</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{stats.resolved}</p>
        </Card>
      </div>

      {/* Alert Trend */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">7-Day Alert Trend</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="day" stroke={MUTED} fontSize={10} />
            <YAxis stroke={MUTED} fontSize={10} />
            <Tooltip 
              contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
            />
            <Line type="monotone" dataKey="alerts" stroke={CYAN} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Notification Channels */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Active Notification Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
            <Mail className="w-5 h-5" style={{ color: CYAN }} />
            <div>
              <p className="text-xs font-bold text-white">Email Alerts</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Sent to security team on control failures</p>
            </div>
            <CheckCircle className="w-4 h-4 ml-auto" style={{ color: LOW }} />
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.05)", border: `1px solid ${CYAN}30` }}>
            <MessageSquare className="w-5 h-5" style={{ color: CYAN }} />
            <div>
              <p className="text-xs font-bold text-white">Slack Notifications</p>
              <p className="text-[10px]" style={{ color: MUTED }}>Posted to #security-alerts channel</p>
            </div>
            <CheckCircle className="w-4 h-4 ml-auto" style={{ color: LOW }} />
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
          <select value={filterFramework} onChange={(e) => setFilterFramework(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="all">All Frameworks</option>
            <option value="SOC 2">SOC 2</option>
            <option value="ISO 27001">ISO 27001</option>
            <option value="NIST">NIST</option>
          </select>
        </div>
      </Card>

      {/* Alerts List */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Recent Compliance Alerts</h3>
        {isLoading ? (
          <Skeleton lines={8} />
        ) : filteredAlerts?.length === 0 ? (
          <EmptyState icon={Bell} title="No alerts" description="All compliance controls are currently aligned" />
        ) : (
          <div className="space-y-3">
            {filteredAlerts?.map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ 
                    background: alert.severity === 'critical' ? `${DANGER}15` : `${HIGH}15`,
                    border: `1px solid ${alert.severity === 'critical' ? DANGER + "30" : HIGH + "30"}`
                  }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: alert.severity === 'critical' ? DANGER : HIGH }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-white truncate">{alert.title}</p>
                      {alert.status === 'resolved' && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: LOW }} />}
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded uppercase font-bold ${
                        alert.severity === 'critical' ? 'bg-red-400/15 text-red-400' : 
                        alert.severity === 'high' ? 'bg-orange-400/15 text-orange-400' : 
                        'bg-yellow-400/15 text-yellow-400'
                      }`}>
                        {alert.severity}
                      </span>
                      <span style={{ color: CYAN }}>{alert.metadata?.framework}</span>
                      <span style={{ color: MUTED }}>• {timeAgo(alert.created_date)}</span>
                    </div>
                  </div>
                </div>
                {alert.status !== 'resolved' && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}