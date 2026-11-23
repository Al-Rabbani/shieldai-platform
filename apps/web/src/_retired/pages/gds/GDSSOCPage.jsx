import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, CheckCircle, AlertTriangle, Filter, Search, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge, AnimatedArc } from "@/components/gds/GDSOSShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const BG = "#020817";

const SOURCE_COLORS = {
  edr: "#ef4444", cloud: "#3b82f6", identity: "#a855f7", network: "#10b981", endpoint: "#f59e0b", email: "#ec4899", default: MUTED
};

const STATUS_COLORS = {
  new: DANGER, acknowledged: CYAN, investigating: HIGH, resolved: LOW, false_positive: MUTED
};

export default function GDSSOCPage() {
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["soc-alerts", filterSeverity, filterSource, filterStatus],
    queryFn: () => base44.entities.Alert.list("-detected_at", 500).then(r => r.filter(a => {
      if (filterSeverity && a.severity !== filterSeverity) return false;
      if (filterSource && a.source_type !== filterSource) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (search && !a.title?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })).catch(() => []),
  });

  const { data: riskScores = [] } = useQuery({
    queryKey: ["executive-risk-trend"],
    queryFn: () => base44.entities.RiskScore.list("-scored_at", 30).then(r => r.slice(0, 30).reverse()).catch(() => []),
  });

  const { data: investigations = [] } = useQuery({
    queryKey: ["soc-investigations"],
    queryFn: () => base44.entities.Investigation.filter({ status: "active" }).catch(() => []),
  });

  const riskTrendData = riskScores.map(r => ({
    date: new Date(r.scored_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: r.score || 0
  }));

  const currentRiskScore = riskScores.length > 0 ? riskScores[riskScores.length - 1].score : 0;
  const riskGrade = currentRiskScore >= 80 ? 'A' : currentRiskScore >= 60 ? 'B' : currentRiskScore >= 40 ? 'C' : currentRiskScore >= 20 ? 'D' : 'F';

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId) => base44.entities.Alert.update(alertId, { status: "acknowledged" }),
    onSuccess: () => queryClient.invalidateQueries(["soc-alerts"]),
  });

  const stats = {
    total: alerts.length,
    new: alerts.filter(a => a.status === "new").length,
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    falsePositive: alerts.filter(a => a.status === "false_positive").length
  };

  const sourceTypes = [...new Set(alerts.map(a => a.source_type).filter(Boolean))];

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "AI-SOC", path: "/soc" }, { label: "SOC Operations" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">SOC Operations Dashboard</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time alert monitoring and triage</p>
          </div>
        </div>
      </div>

      {/* Executive Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Score & Grade */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Executive Risk Score</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>LIVE</span>
          </div>
          <div className="flex items-center gap-4">
            <AnimatedArc score={currentRiskScore} size={100} strokeWidth={10} />
            <div className="flex-1">
              <div className="mb-2">
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Current Grade</p>
                <p className="text-3xl font-black" style={{ color: currentRiskScore >= 70 ? LOW : currentRiskScore >= 50 ? MEDIUM : DANGER }}>{riskGrade}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Investigations</p>
                <p className="text-xl font-black font-mono" style={{ color: investigations.length > 0 ? HIGH : MUTED }}>{investigations.length}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Risk Trend Chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-sm font-bold text-white">Risk Score Trend (30 Days)</h3>
            </div>
          </div>
          {riskTrendData.length > 0 ? (
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={riskTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="date" stroke={MUTED} fontSize={10} tick={{ fill: MUTED }} />
                  <YAxis stroke={MUTED} fontSize={10} tick={{ fill: MUTED }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#0a1628', border: `1px solid ${BORDER}`, borderRadius: 8 }}
                    labelStyle={{ color: TEXT, fontSize: 11 }}
                    itemStyle={{ color: CYAN, fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="score" stroke={CYAN} strokeWidth={2} dot={{ fill: CYAN, r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-sm" style={{ color: MUTED }}>No risk score data available</p>
            </div>
          )}
        </Card>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Alerts</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>New</p>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DANGER }} />
            <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.new}</p>
          </div>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{stats.critical}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>High</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{stats.high}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>False Positives</p>
          <p className="text-2xl font-black font-mono" style={{ color: MUTED }}>{stats.falsePositive}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-64">
            <Search className="w-4 h-4" style={{ color: MUTED }} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts..." className="flex-1" />
          </div>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Sources</option>
            {sourceTypes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </Card>

      {/* Alert Table */}
      <Card className="overflow-hidden">
        {isLoading ? <Skeleton lines={10} /> : alerts.length === 0 ? (
          <EmptyState icon={Activity} title="No alerts" description="Connect security data sources to receive alerts" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `2px solid ${BORDER}` }}>
                  {["Severity", "Source", "Title", "MITRE Technique", "Asset", "User", "IP", "Status", "Detected", "Actions"].map(h => (
                    <th key={h} className="text-left py-3 px-4 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, i) => {
                  const statusColor = STATUS_COLORS[alert.status] || MUTED;
                  const sourceColor = SOURCE_COLORS[alert.source_type?.toLowerCase()] || SOURCE_COLORS.default;
                  return (
                    <tr key={alert.id} style={{ borderBottom: `1px solid ${BORDER}20` }} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4"><SevBadge sev={alert.severity} /></td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: `${sourceColor}15`, color: sourceColor }}>{alert.source_type || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-semibold text-white max-w-xs truncate">{alert.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-mono" style={{ color: CYAN }}>{alert.mitre_technique || "—"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{alert.asset || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: TEXT }}>{alert.user || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs font-mono" style={{ color: TEXT }}>{alert.ip_address || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${alert.status === 'new' ? 'animate-pulse' : ''}`} style={{ color: statusColor, background: `${statusColor}15` }}>{alert.status || "UNKNOWN"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs" style={{ color: MUTED }}>{timeAgo(alert.detected_at)}</p>
                      </td>
                      <td className="py-3 px-4">
                        {alert.status === "new" && (
                          <Button size="sm" onClick={() => acknowledgeMutation.mutate(alert.id)} disabled={acknowledgeMutation.isPending} className="px-2 py-1 text-[10px]" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                            Acknowledge
                          </Button>
                        )}
                      </td>
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