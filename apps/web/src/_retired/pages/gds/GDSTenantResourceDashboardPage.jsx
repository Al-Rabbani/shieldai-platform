import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart3, Cpu, Server, Database, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const METRIC_COLORS = {
  compute: "#8b5cf6",
  memory: "#3b82f6",
  storage: "#10b981",
  api: "#f59e0b"
};

function ResourceBar({ label, value, limit, color, icon: Icon }) {
  const pct = Math.round((value / limit) * 100);
  const isOver = pct > 100;
  const isHigh = pct > 80;
  
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span style={{ color: MUTED }}>{label}</span>
        </div>
        <span className={`font-bold ${isOver ? 'text-red-400' : isHigh ? 'text-orange-400' : ''}`} style={{ color: !isOver && !isHigh ? TEXT : undefined }}>
          {value.toLocaleString()} / {limit.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div 
          className={`h-full rounded-full transition-all ${isOver ? 'animate-pulse' : ''}`}
          style={{ 
            width: `${Math.min(pct, 100)}%`, 
            background: isOver ? DANGER : isHigh ? HIGH : color 
          }} 
        />
      </div>
      {isOver && (
        <div className="flex items-center gap-1 text-[10px] text-red-400">
          <AlertTriangle className="w-3 h-3" />
          <span>OVER LIMIT by {pct - 100}%</span>
        </div>
      )}
    </div>
  );
}

export default function GDSTenantResourceDashboardPage() {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [sortBy, setSortBy] = useState("compute");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants-with-resources"],
    queryFn: async () => {
      const tenantList = await base44.entities.Tenant.filter({}, '-created_date', 50).catch(() => []);
      const subscriptions = await base44.entities.TenantSubscription.filter({}).catch(() => []);
      const usage = await base44.entities.TenantResourceUsage.filter({}, '-timestamp', 100).catch(() => []);
      
      return tenantList.map(tenant => {
        const sub = subscriptions.find(s => s.tenant_id === tenant.tenant_id);
        const latestUsage = usage.filter(u => u.tenant_id === tenant.tenant_id).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        
        return {
          ...tenant,
          subscription: sub,
          usage: latestUsage,
          compute_pct: latestUsage ? Math.round((latestUsage.compute_units_used / (latestUsage.compute_units_limit || 1)) * 100) : 0,
          memory_pct: latestUsage ? Math.round((latestUsage.memory_mb_used / (latestUsage.memory_mb_limit || 1)) * 100) : 0,
          storage_pct: latestUsage ? Math.round((latestUsage.storage_mb_used / (latestUsage.storage_mb_limit || 1)) * 100) : 0,
          api_pct: latestUsage ? Math.round((latestUsage.api_calls / (latestUsage.api_calls_limit || 1)) * 100) : 0,
        };
      });
    },
    refetchInterval: 30000,
  });

  const sortedTenants = tenants?.sort((a, b) => {
    if (sortBy === "compute") return b.compute_pct - a.compute_pct;
    if (sortBy === "memory") return b.memory_pct - a.memory_pct;
    if (sortBy === "storage") return b.storage_pct - a.storage_pct;
    if (sortBy === "api") return b.api_pct - a.api_pct;
    return 0;
  });

  const overLimitTenants = tenants?.filter(t => t.compute_pct > 100 || t.memory_pct > 100 || t.storage_pct > 100 || t.api_pct > 100) || [];
  const highUsageTenants = tenants?.filter(t => (t.compute_pct > 80 || t.memory_pct > 80) && t.compute_pct <= 100) || [];

  const chartData = sortedTenants?.slice(0, 10).map(t => ({
    name: t.name?.slice(0, 15) || t.tenant_id.slice(-10),
    compute: t.compute_pct,
    memory: t.memory_pct,
    storage: t.storage_pct,
    api: t.api_pct
  })) || [];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Resource Consumption Dashboard" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <BarChart3 className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Tenant Resource Consumption Dashboard</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time resource usage, limits, and overage detection</p>
          </div>
          {overLimitTenants.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
              <AlertTriangle className="w-3 h-3" style={{ color: DANGER }} />
              <span className="text-[10px] font-black" style={{ color: DANGER }}>{overLimitTenants.length} Over Limit</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="compute">Sort by Compute</option>
            <option value="memory">Sort by Memory</option>
            <option value="storage">Sort by Storage</option>
            <option value="api">Sort by API Calls</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tenants</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{tenants?.length || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Over Limit</p>
          <p className="text-2xl font-black font-mono" style={{ color: overLimitTenants.length > 0 ? DANGER : MUTED }}>{overLimitTenants.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>High Usage</p>
          <p className="text-2xl font-black font-mono" style={{ color: highUsageTenants.length > 0 ? HIGH : MUTED }}>{highUsageTenants.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Compute</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{tenants?.length ? Math.round(tenants.reduce((s, t) => s + t.compute_pct, 0) / tenants.length) : 0}%</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Avg Memory</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{tenants?.length ? Math.round(tenants.reduce((s, t) => s + t.memory_pct, 0) / tenants.length) : 0}%</p>
        </Card>
      </div>

      {/* Top Consumers Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Top 10 Resource Consumers</h3>
        {chartData.length === 0 ? (
          <EmptyState icon={BarChart3} title="No resource data" description="Tenant resource usage will appear here" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" stroke={MUTED} fontSize={10} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke={MUTED} fontSize={10} label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }}
                formatter={(value, name) => [`${value}%`, name.toUpperCase()]}
              />
              <Bar dataKey="compute" name="Compute" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.compute > 80 ? DANGER : METRIC_COLORS.compute} />
                ))}
              </Bar>
              <Bar dataKey="memory" name="Memory" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.memory > 80 ? DANGER : METRIC_COLORS.memory} />
                ))}
              </Bar>
              <Bar dataKey="storage" name="Storage" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.storage > 80 ? DANGER : METRIC_COLORS.storage} />
                ))}
              </Bar>
              <Bar dataKey="api" name="API Calls" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.api > 80 ? DANGER : METRIC_COLORS.api} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Over Limit Alerts */}
      {overLimitTenants.length > 0 && (
        <Card className="p-5 border-2" style={{ borderColor: DANGER }}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
            <h3 className="text-sm font-black text-white">⚠️ TENANTS EXCEEDING LIMITS</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overLimitTenants.map(tenant => (
              <div key={tenant.tenant_id} className="p-4 rounded-xl" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-white">{tenant.name}</span>
                  <span className="text-[10px] font-mono" style={{ color: MUTED }}>{tenant.tenant_id.slice(-8)}</span>
                </div>
                <div className="space-y-2">
                  {tenant.compute_pct > 100 && <ResourceBar label="Compute" value={tenant.usage?.compute_units_used || 0} limit={tenant.usage?.compute_units_limit || 1} color={METRIC_COLORS.compute} icon={Cpu} />}
                  {tenant.memory_pct > 100 && <ResourceBar label="Memory" value={tenant.usage?.memory_mb_used || 0} limit={tenant.usage?.memory_mb_limit || 1} color={METRIC_COLORS.memory} icon={Server} />}
                  {tenant.storage_pct > 100 && <ResourceBar label="Storage" value={tenant.usage?.storage_mb_used || 0} limit={tenant.usage?.storage_mb_limit || 1} color={METRIC_COLORS.storage} icon={Database} />}
                  {tenant.api_pct > 100 && <ResourceBar label="API Calls" value={tenant.usage?.api_calls || 0} limit={tenant.usage?.api_calls_limit || 1} color={METRIC_COLORS.api} icon={Zap} />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tenant Cards Grid */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">All Tenants - Resource Usage</h3>
        {isLoading ? <Skeleton lines={8} /> : sortedTenants?.length === 0 ? (
          <EmptyState icon={BarChart3} title="No tenants" description="Provision tenants to see resource usage" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTenants.map(tenant => (
              <Card key={tenant.tenant_id} className="p-4" glow={tenant.compute_pct > 80 || tenant.memory_pct > 80}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-white">{tenant.name}</p>
                    <p className="text-[10px] font-mono" style={{ color: MUTED }}>{tenant.plan?.toUpperCase()}</p>
                  </div>
                  {(tenant.compute_pct > 80 || tenant.memory_pct > 80) && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${HIGH}10`, border: `1px solid ${HIGH}30` }}>
                      <AlertTriangle className="w-3 h-3" style={{ color: HIGH }} />
                      <span className="text-[9px] font-black" style={{ color: HIGH }}>HIGH</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <ResourceBar label="Compute Units" value={tenant.usage?.compute_units_used || 0} limit={tenant.subscription?.max_users ? tenant.subscription.max_users * 100 : 1000} color={METRIC_COLORS.compute} icon={Cpu} />
                  <ResourceBar label="Memory (MB)" value={tenant.usage?.memory_mb_used || 0} limit={tenant.subscription?.max_agents ? tenant.subscription.max_agents * 1024 : 8192} color={METRIC_COLORS.memory} icon={Server} />
                  <ResourceBar label="Storage (MB)" value={tenant.usage?.storage_mb_used || 0} limit={tenant.subscription?.max_scans ? tenant.subscription.max_scans * 10 : 10240} color={METRIC_COLORS.storage} icon={Database} />
                  <ResourceBar label="API Calls" value={tenant.usage?.api_calls || 0} limit={tenant.subscription?.max_api_calls || 10000} color={METRIC_COLORS.api} icon={Zap} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}