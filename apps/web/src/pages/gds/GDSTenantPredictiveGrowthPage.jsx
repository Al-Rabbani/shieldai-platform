import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Server, Database, Zap, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function GDSTenantPredictiveGrowthPage() {
  const [timeRange, setTimeRange] = useState("90"); // days

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.filter({}).catch(() => []),
  });

  const { data: usageRecords } = useQuery({
    queryKey: ["tenant-usage-all"],
    queryFn: () => base44.entities.TenantResourceUsage.filter({}).catch(() => []),
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["tenant-subscriptions"],
    queryFn: () => base44.entities.TenantSubscription.filter({}).catch(() => []),
  });

  // Aggregate usage over time
  const dailyUsage = usageRecords?.reduce((acc, record) => {
    const date = new Date(record.timestamp).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = { date, compute: 0, storage: 0, api: 0 };
    acc[date].compute += record.compute_units_used || 0;
    acc[date].storage += record.storage_mb_used || 0;
    acc[date].api += record.api_calls || 0;
    return acc;
  }, {}) || {};

  const timeSeriesData = Object.values(dailyUsage)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-parseInt(timeRange))
    .map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      compute: d.compute,
      storage: Math.round(d.storage / 1024), // GB
      api: Math.round(d.api / 1000), // thousands
    }));

  // Calculate growth rate (simple linear regression)
  const calculateGrowthRate = (data, key) => {
    if (data.length < 2) return 0;
    const n = data.length;
    const sumX = n * (n - 1) / 2;
    const sumY = data.reduce((s, d, i) => s + d[key] * i, 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    const sumXY = data.reduce((s, d, i) => s + d[key] * i, 0);
    const slope = (n * sumXY - sumX * data.reduce((s, d) => s + d[key], 0)) / (n * sumX2 - sumX * sumX);
    return slope;
  };

  const computeGrowthRate = calculateGrowthRate(timeSeriesData, 'compute');
  const storageGrowthRate = calculateGrowthRate(timeSeriesData, 'storage');
  const apiGrowthRate = calculateGrowthRate(timeSeriesData, 'api');

  // Forecast future usage
  const forecastDays = 90;
  const lastPoint = timeSeriesData[timeSeriesData.length - 1] || { compute: 0, storage: 0, api: 0 };
  
  const forecastData = Array.from({ length: forecastDays }, (_, i) => {
    const day = timeSeriesData.length + i;
    return {
      date: `Day ${day}`,
      compute: Math.round(lastPoint.compute + (computeGrowthRate * i)),
      storage: Math.round(lastPoint.storage + (storageGrowthRate * i)),
      api: Math.round(lastPoint.api + (apiGrowthRate * i)),
      isForecast: true,
    };
  });

  const combinedData = [...timeSeriesData, ...forecastData];

  // Calculate when thresholds will be breached
  const totalCapacity = {
    compute: subscriptions?.reduce((sum, s) => sum + (s.max_scans || 1000), 0) || 10000,
    storage: subscriptions?.reduce((sum, s) => sum + ((s.max_api_calls || 10000) * 10), 0) || 100000,
    api: subscriptions?.reduce((sum, s) => sum + (s.max_api_calls || 10000), 0) || 100000,
  };

  const daysToThreshold = {
    compute: computeGrowthRate > 0 ? Math.round((totalCapacity.compute - lastPoint.compute) / computeGrowthRate) : Infinity,
    storage: storageGrowthRate > 0 ? Math.round((totalCapacity.storage - lastPoint.storage) / storageGrowthRate) : Infinity,
    api: apiGrowthRate > 0 ? Math.round((totalCapacity.api - lastPoint.api) / apiGrowthRate) : Infinity,
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Predictive Growth" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Predictive Growth Dashboard</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Infrastructure scaling forecasts based on consumption trends</p>
          </div>
        </div>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Capacity Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: "Compute Capacity", current: lastPoint.compute, total: totalCapacity.compute, days: daysToThreshold.compute, unit: "units", icon: Server, color: CYAN },
          { label: "Storage Capacity", current: lastPoint.storage, total: totalCapacity.storage, days: daysToThreshold.storage, unit: "GB", icon: Database, color: HIGH },
          { label: "API Capacity", current: lastPoint.api, total: totalCapacity.api, days: daysToThreshold.api, unit: "K calls", icon: Zap, color: DANGER },
        ].map(({ label, current, total, days, unit, icon: Icon, color }) => (
          <Card key={label} className={`p-4 border-2 ${days < 30 ? 'border-red-400/30' : days < 60 ? 'border-yellow-400/30' : 'border-green-400/30'}`}>
            <div className="flex items-center justify-between mb-2">
              <Icon className="w-4 h-4" style={{ color }} />
              {days < 60 && <AlertTriangle className="w-3.5 h-3.5" style={{ color: days < 30 ? DANGER : HIGH }} />}
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{current.toLocaleString()} / {Math.round(total / (unit === "GB" ? 1024 : 1)).toLocaleString()} {unit}</p>
            <p className={`text-xs mt-2 font-bold ${days < 30 ? 'text-red-400' : days < 60 ? 'text-yellow-400' : 'text-green-400'}`}>
              {days === Infinity ? 'No growth trend' : days < 30 ? `Critical: ${days} days to capacity` : days < 60 ? `Warning: ${days} days to capacity` : `${days}+ days to capacity`}
            </p>
          </Card>
        ))}
      </div>

      {/* Growth Rate Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Compute Growth", rate: computeGrowthRate, unit: "units/day", color: CYAN },
          { label: "Storage Growth", rate: storageGrowthRate, unit: "GB/day", color: HIGH },
          { label: "API Growth", rate: apiGrowthRate, unit: "K calls/day", color: DANGER },
        ].map(({ label, rate, unit, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className={`text-2xl font-black font-mono ${rate > 0 ? 'text-red-400' : rate < 0 ? 'text-green-400' : ''}`} style={{ color: rate === 0 ? TEXT : undefined }}>
              {rate > 0 ? '+' : ''}{rate.toFixed(1)}
            </p>
            <p className="text-[9px] mt-1" style={{ color: MUTED }}>{unit}</p>
          </Card>
        ))}
      </div>

      {/* Forecast Chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white">Resource Consumption Forecast (90 Days)</h3>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Historical trend + projected growth with capacity thresholds</p>
        </div>
        {timeSeriesData.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No usage data" description="Resource usage will appear here" />
        ) : (
          <div className="space-y-6">
            {/* Compute Forecast */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white">Compute Units</p>
                <div className="flex items-center gap-3 text-[9px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CYAN }} />Historical</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: DANGER }} />Forecast</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: HIGH }} />Capacity</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="date" stroke={MUTED} fontSize={9} />
                  <YAxis stroke={MUTED} fontSize={9} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                  <Area dataKey="compute" stroke={CYAN} fill={`rgba(0,212,255,0.1)`} strokeWidth={2} />
                  <Line type="monotone" dataKey="compute" stroke={DANGER} strokeDasharray="5 5" strokeWidth={2} dot={false} data={forecastData} />
                  <Line type="monotone" y={[totalCapacity.compute]} stroke={HIGH} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Storage Forecast */}
            <div>
              <p className="text-xs font-bold text-white mb-2">Storage (GB)</p>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="date" stroke={MUTED} fontSize={9} />
                  <YAxis stroke={MUTED} fontSize={9} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                  <Area dataKey="storage" stroke={HIGH} fill={`rgba(255,140,0,0.1)`} strokeWidth={2} />
                  <Line type="monotone" dataKey="storage" stroke={DANGER} strokeDasharray="5 5" strokeWidth={2} dot={false} data={forecastData} />
                  <Line type="monotone" data={[{ storage: totalCapacity.storage / 1024 }]} stroke={CYAN} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      {/* Recommendations */}
      {Object.values(daysToThreshold).some(d => d < 60) && (
        <Card className="p-5 border-2" style={{ borderColor: DANGER + "30" }}>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            Scaling Recommendations
          </h3>
          <div className="space-y-2">
            {daysToThreshold.compute < 60 && (
              <p className="text-xs" style={{ color: TEXT }}>
                <span style={{ color: DANGER }}>• Compute:</span> Plan capacity expansion within {daysToThreshold.compute} days. Consider adding {Math.round(computeGrowthRate * 30)} units/month.
              </p>
            )}
            {daysToThreshold.storage < 60 && (
              <p className="text-xs" style={{ color: TEXT }}>
                <span style={{ color: DANGER }}>• Storage:</span> Plan storage expansion within {daysToThreshold.storage} days. Current growth: {storageGrowthRate.toFixed(1)} GB/day.
              </p>
            )}
            {daysToThreshold.api < 60 && (
              <p className="text-xs" style={{ color: TEXT }}>
                <span style={{ color: DANGER }}>• API:</span> Plan API capacity expansion within {daysToThreshold.api} days. Consider rate limiting or tier upgrades.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}