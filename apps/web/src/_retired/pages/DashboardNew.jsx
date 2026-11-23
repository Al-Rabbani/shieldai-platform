import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Zap, CheckCircle, Clock, TrendingDown, TrendingUp, BarChart3, RefreshCw, Download, Share2, Activity, Cloud, Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import ExecutiveRiskGauge from "@/components/dashboard/ExecutiveRiskGauge";
import PillarRadarChart from "@/components/dashboard/PillarRadarChart";
import ComplianceDonut from "@/components/dashboard/ComplianceDonut";
import EnvironmentSelector from "@/components/dashboard/EnvironmentSelector";
import SeverityBadge from "@/components/shared/SeverityBadge";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import GlobalRiskWidget from "@/components/dashboard/GlobalRiskWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { subDays, format, parseISO } from "date-fns";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

function SkeletonCard({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-800/50 ${className}`} />;
}

function StatCard({ label, value, color, icon: IconComp, sub, link, loading, pulse }) {
  const inner = (
    <div className="rounded-xl p-4 border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all h-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        {IconComp && <IconComp className="w-3.5 h-3.5" style={{ color }} />}
      </div>
      {loading ? (
        <div className="h-7 w-16 animate-pulse bg-slate-700 rounded" />
      ) : (
        <div className="text-xl font-black font-mono" style={{ color }}>
          {pulse && <span className="inline-block w-2 h-2 rounded-full mr-1.5 animate-pulse" style={{ background: color }} />}
          {value ?? "—"}
        </div>
      )}
      {sub && <p className="text-[9px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}

function RiskTrendChart({ findings }) {
  const days = 30;
  const buckets = {};
  for (let i = days - 1; i >= 0; i--) {
    buckets[format(subDays(new Date(), i), "MMM dd")] = 0;
  }
  findings.forEach(f => {
    try {
      const key = format(parseISO(f.first_detected || f.created_date), "MMM dd");
      if (key in buckets) buckets[key]++;
    } catch {}
  });
  const data = Object.entries(buckets).map(([date, count]) => ({ date, count }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="findingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} interval={4} />
        <YAxis tick={{ fontSize: 9, fill: "#475569" }} />
        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
        <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#findingGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function DashboardNew() {
  const [env, setEnv] = useState("production");
  const qc = useQueryClient();

  const { data: triaged = [], isLoading: loadTriaged } = useQuery({
    queryKey: ["dash-triaged"],
    queryFn: () => base44.entities.TriagedFinding.filter({}).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: cloudFindings = [] } = useQuery({
    queryKey: ["dash-cloud"],
    queryFn: () => base44.entities.CloudFinding.filter({}).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: cloudAccounts = [] } = useQuery({
    queryKey: ["dash-cloud-accounts"],
    queryFn: () => base44.entities.CloudAccount.filter({}).catch(() => []),
    initialData: [],
  });

  const { data: repos = [] } = useQuery({
    queryKey: ["dash-repos"],
    queryFn: () => base44.entities.CodeRepository.list().catch(() => []),
    initialData: [],
  });

  const { data: threatFeeds = [] } = useQuery({
    queryKey: ["dash-threats"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-detected_at", 10).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: complianceFrameworks = [] } = useQuery({
    queryKey: ["dash-compliance"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
    initialData: [],
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["dash-audit"],
    queryFn: () => base44.entities.AuditLog.list("-timestamp", 15).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: zenFirewalls = [] } = useQuery({
    queryKey: ["dash-zen"],
    queryFn: () => base44.entities.ZenFirewall.list().catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: vmScans = [] } = useQuery({
    queryKey: ["dash-vms"],
    queryFn: () => base44.entities.VMScan.list().catch(() => []),
    initialData: [],
  });

  const { data: containerScans = [] } = useQuery({
    queryKey: ["dash-containers"],
    queryFn: () => base44.entities.ContainerScan.list().catch(() => []),
    initialData: [],
  });

  // Derived stats
  const allFindings = [...triaged, ...cloudFindings];
  const openFindings = allFindings.filter(f => (f.status || f.finding_status) === "open");
  const criticalCount = openFindings.filter(f => (f.normalized_severity || f.severity) === "critical").length;
  const kevCount = triaged.filter(f => f.exploited_in_wild).length;
  const slaBreached = triaged.filter(f => f.sla_breached).length;
  const assetsProtected = cloudAccounts.length + repos.length + vmScans.length + containerScans.length;
  const allRiskScores = [...cloudAccounts, ...repos].map(a => a.risk_score).filter(Boolean);
  const avgRisk = allRiskScores.length > 0 ? Math.round(allRiskScores.reduce((a, b) => a + b, 0) / allRiskScores.length) : 0;
  const threatsBlockedToday = zenFirewalls.reduce((s, z) => s + (z.attacks_blocked_today || 0), 0);
  const avgCompliance = complianceFrameworks.length > 0
    ? Math.round(complianceFrameworks.reduce((s, f) => s + (f.score || 0), 0) / complianceFrameworks.length)
    : 0;

  const topCritical = [...triaged, ...cloudFindings]
    .filter(f => (f.normalized_severity || f.severity) === "critical" && (f.status || f.finding_status) === "open")
    .sort((a, b) => new Date(a.sla_deadline || 0) - new Date(b.sla_deadline || 0))
    .slice(0, 10);

  const loading = loadTriaged;

  const handleRefresh = () => {
    qc.invalidateQueries();
  };

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Global Risk Score Widget */}
        <GlobalRiskWidget />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-amber-500" />
              <div>
                <h1 className="text-xl font-bold text-white">Security Command Center</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live data · auto-refreshes every 30s
                </div>
              </div>
            </div>
            <EnvironmentSelector value={env} onChange={setEnv} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-colors">
              <Download className="w-3.5 h-3.5" /> Board Report
            </button>
          </div>
        </div>

        {/* Hero Risk Gauge */}
        <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <ExecutiveRiskGauge score={avgRisk || 73} trend={-8} benchmark={61} />
            </div>
            <div className="text-center mt-4">
              <p className="text-slate-400 text-sm">
                {criticalCount > 0 ? `${criticalCount} critical issues require immediate attention` : "No critical issues — security posture healthy"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 6 Stat Cards — live entity counts */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard loading={loading} label="Open Findings" value={openFindings.length} color="#f97316" icon={AlertTriangle} link="/findings" />
          <StatCard loading={loading} label="Critical" value={criticalCount} color="#ef4444" icon={AlertTriangle} sub="24h SLA" link="/findings?severity=critical" pulse={criticalCount > 0} />
          <StatCard loading={loading} label="CISA KEV" value={kevCount} color="#ef4444" icon={Zap} sub="exploited in wild" link="/autotriage" pulse={kevCount > 0} />
          <StatCard loading={loading} label="SLA Breached" value={slaBreached} color="#f97316" icon={Clock} link="/autotriage" />
          <StatCard loading={loading} label="Assets Protected" value={assetsProtected} color="#22c55e" icon={Shield} link="/assets" />
          <StatCard loading={loading} label="Compliance" value={avgCompliance > 0 ? `${avgCompliance}%` : "—"} color="#3b82f6" icon={CheckCircle} link="/governance/compliance" />
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Critical Findings Feed (50%) */}
          <Card className="col-span-5 lg:col-span-3 border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Critical Findings Feed
                </CardTitle>
                <Link to="/autotriage" className="text-xs text-blue-400 hover:underline">AutoTriage →</Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-14" />)}</div>
              ) : topCritical.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                  <p className="text-sm">No critical findings — all clear!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {topCritical.map((f, i) => {
                    const sev = f.normalized_severity || f.severity;
                    const asset = f.asset_name || f.resource || "Unknown";
                    const deadline = f.sla_deadline;
                    const breached = f.sla_breached || (deadline && new Date(deadline) < new Date());
                    return (
                      <div key={f.id || i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-red-500/30 transition-colors cursor-pointer">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 flex-shrink-0"
                          style={{ color: SEV_COLOR[sev], background: `${SEV_COLOR[sev]}20`, border: `1px solid ${SEV_COLOR[sev]}40` }}>
                          {sev?.toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{f.title || f.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="truncate">{asset}</span>
                            {f.cvss_score && <span>CVSS {f.cvss_score}</span>}
                            {f.exploited_in_wild && <span className="text-red-400 font-bold">🔥 KEV</span>}
                          </div>
                        </div>
                        {deadline && (
                          <div className={`text-[9px] font-mono flex-shrink-0 ${breached ? "text-red-400" : "text-slate-500"}`}>
                            {breached ? "⚠️ BREACHED" : formatDistanceToNow(new Date(deadline), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column (50%) split into Compliance + Threat */}
          <div className="col-span-5 lg:col-span-2 flex flex-col gap-6">
            {/* Compliance Score */}
            <Card className="flex-1 border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm">Compliance Status</CardTitle>
                  <Link to="/governance/compliance" className="text-xs text-blue-400 hover:underline">Full report →</Link>
                </div>
              </CardHeader>
              <CardContent>
                <ComplianceDonut />
              </CardContent>
            </Card>

            {/* Live Threat Intel */}
            <Card className="flex-1 border-slate-800 bg-slate-900/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Live Threat Feed
                  </CardTitle>
                  <Link to="/threat-intel" className="text-xs text-blue-400 hover:underline">View all →</Link>
                </div>
              </CardHeader>
              <CardContent>
                {threatFeeds.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No threats in feed</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {threatFeeds.slice(0, 10).map((t, i) => (
                      <div key={t.id || i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 mt-0.5"
                          style={{ color: SEV_COLOR[t.severity] || "#64748b", background: `${SEV_COLOR[t.severity] || "#64748b"}20` }}>
                          {(t.severity || "low").toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white truncate">{t.title}</p>
                          <p className="text-[9px] text-slate-500">
                            {t.source} · {t.detected_at ? formatDistanceToNow(new Date(t.detected_at), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Risk Trend Chart */}
          <Card className="col-span-5 lg:col-span-3 border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Risk Trend — Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <RiskTrendChart findings={triaged} />
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="col-span-5 lg:col-span-2 border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Recent Activity
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {auditLogs.slice(0, 15).map((log, i) => (
                    <div key={log.id || i} className="flex items-start gap-2 py-1.5 border-b border-slate-800 last:border-0">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${log.outcome === "failure" ? "bg-red-400" : "bg-emerald-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-slate-300 truncate">
                          <span className="text-white font-medium">{log.actor_email?.split("@")[0] || "System"}</span>
                          {" · "}{log.action}
                          {log.resource_name && <span className="text-slate-400"> on {log.resource_name}</span>}
                        </p>
                        <p className="text-[9px] text-slate-500">
                          {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : ""}
                        </p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${log.outcome === "failure" ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10"}`}>
                        {log.outcome || "ok"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
}