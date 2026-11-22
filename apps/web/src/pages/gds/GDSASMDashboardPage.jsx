import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Radar, AlertTriangle, Shield, Globe, Search, Clock, CheckCircle, TrendingUp, Target } from "lucide-react";
import { Card, Breadcrumb, CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, SevBadge } from "@/components/gds/GDSOSShared";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Legend, Treemap } from "recharts";

const SEV_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GDSASMDashboardPage() {
  const { data: assets = [], isLoading: loadA } = useQuery({
    queryKey: ["asm-assets"],
    queryFn: () => base44.entities.ASMAsset.list("-created_date", 500).catch(() => []),
  });

  const { data: exposures = [], isLoading: loadE } = useQuery({
    queryKey: ["asm-exposures"],
    queryFn: () => base44.entities.ASMExposureRecord.list("-discovered_date", 200).catch(() => []),
  });

  const { data: jobs = [], isLoading: loadJ } = useQuery({
    queryKey: ["asm-jobs"],
    queryFn: () => base44.entities.ASMDiscoveryJob.list("-started_at", 50).catch(() => []),
  });

  const assetTypeBreakdown = [
    { name: "Domains", value: assets.filter(a => a.asset_type === "domain").length, color: "#00d4ff" },
    { name: "Subdomains", value: assets.filter(a => a.asset_type === "subdomain").length, color: "#3b82f6" },
    { name: "IPs", value: assets.filter(a => a.asset_type === "ip_address").length, color: "#8b5cf6" },
    { name: "APIs", value: assets.filter(a => a.asset_type === "api_endpoint").length, color: "#10b981" },
    { name: "Cloud", value: assets.filter(a => a.asset_type === "cloud_resource").length, color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const exposureByType = exposures.reduce((acc, e) => {
    acc[e.exposure_type] = (acc[e.exposure_type] || 0) + 1;
    return acc;
  }, {});

  const exposureData = Object.entries(exposureByType).map(([name, value]) => ({ name, value }));

  const internetFacing = assets.filter(a => a.is_internet_facing).length;
  const shadowIT = assets.filter(a => a.is_shadow_it).length;
  const criticalExposures = exposures.filter(e => e.severity === "critical" && !e.is_resolved).length;
  const highExposures = exposures.filter(e => e.severity === "high" && !e.is_resolved).length;
  const mediumExposures = exposures.filter(e => e.severity === "medium" && !e.is_resolved).length;

  // Calculate month-by-month exposure trends (last 12 months)
  const exposureTrendData = React.useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthExposures = exposures.filter(e => {
        const discovered = new Date(e.discovered_date);
        return discovered.getFullYear() === date.getFullYear() && 
               discovered.getMonth() === date.getMonth() &&
               !e.is_resolved;
      });

      months.push({
        month: monthLabel,
        critical: monthExposures.filter(e => e.severity === 'critical').length,
        high: monthExposures.filter(e => e.severity === 'high').length,
        medium: monthExposures.filter(e => e.severity === 'medium').length,
        low: monthExposures.filter(e => e.severity === 'low').length,
        total: monthExposures.length,
      });
    }
    return months;
  }, [exposures]);

  if (loadA || loadE || loadJ) {
    return <div className="p-8"><div className="w-8 h-8 border-4 border-t-cyan-400 border-white/10 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Attack Surface" }]} />

      <div className="flex items-center gap-3">
        <Radar className="w-6 h-6" style={{ color: CYAN }} />
        <div>
          <h1 className="text-2xl font-black text-white">Attack Surface Dashboard</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Comprehensive view of internet-facing assets and exposures</p>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Assets</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{assets.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Internet Facing</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{internetFacing}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: shadowIT > 0 ? `${DANGER}08` : "transparent", border: shadowIT > 0 ? `1px solid ${DANGER}30` : "none" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Shadow IT</p>
          <p className="text-2xl font-black font-mono" style={{ color: shadowIT > 0 ? DANGER : MUTED }}>{shadowIT}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Exposures</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs font-bold" style={{ color: DANGER }}>{criticalExposures}</span>
            <span className="text-xs font-bold" style={{ color: HIGH }}>{highExposures}</span>
            <span className="text-xs font-bold" style={{ color: MEDIUM }}>{mediumExposures}</span>
          </div>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Jobs</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{jobs.filter(j => j.status === "running").length}</p>
        </Card>
      </div>

      {/* Risk Heatmap */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: DANGER }} />
            Asset Risk Heatmap
          </h3>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: DANGER }} /> High Risk</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: LOW }} /> Low Risk</span>
          </div>
        </div>
        {assets.length === 0 ? (
          <div className="text-center py-12" style={{ color: MUTED }}>No assets to display</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={assets.map(a => ({
                  name: a.asset_name,
                  risk_score: a.gds_risk_score || 0,
                  exposures: exposures.filter(e => e.asset_id === a.id && !e.is_resolved).length,
                  children: [],
                }))}
                dataKey="risk_score"
                aspectRatio={4 / 3}
                stroke="#1e3a5f"
                fill="#8884d8"
              >
                <Tooltip
                  contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                  formatter={(value, name, props) => {
                    const { risk_score, exposures } = props.payload;
                    return [`Risk Score: ${risk_score} | Active Exposures: ${exposures}`, name];
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Exposure Timeline Chart */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
            Active Exposures Timeline (12 Months)
          </h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: DANGER }} /> Critical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: HIGH }} /> High</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: MEDIUM }} /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: LOW }} /> Low</span>
          </div>
        </div>
        {exposureTrendData.every(d => d.total === 0) ? (
          <div className="text-center py-12" style={{ color: MUTED }}>No exposure data available</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={exposureTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="month" stroke={MUTED} fontSize={10} />
                <YAxis stroke={MUTED} fontSize={10} />
                <Tooltip 
                  contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                  labelStyle={{ color: TEXT }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="critical" stroke={DANGER} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Critical" />
                <Line type="monotone" dataKey="high" stroke={HIGH} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} name="High" />
                <Line type="monotone" dataKey="medium" stroke={MEDIUM} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Medium" />
                <Line type="monotone" dataKey="low" stroke={LOW} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Low" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Risk Heatmap */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: DANGER }} />
            Asset Risk Heatmap
          </h3>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: DANGER }} /> High Risk</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: LOW }} /> Low Risk</span>
          </div>
        </div>
        {assets.length === 0 ? (
          <div className="text-center py-12" style={{ color: MUTED }}>No assets to display</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={assets.map(a => ({
                  name: a.asset_name,
                  risk_score: a.gds_risk_score || 0,
                  exposures: exposures.filter(e => e.asset_id === a.id && !e.is_resolved).length,
                  children: [],
                }))}
                dataKey="risk_score"
                aspectRatio={4 / 3}
                stroke="#1e3a5f"
                fill="#8884d8"
              >
                <Tooltip
                  contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                  formatter={(value, name, props) => {
                    const { risk_score, exposures } = props.payload;
                    return [`Risk Score: ${risk_score} | Active Exposures: ${exposures}`, name];
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Asset Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: CYAN }} />
            Asset Type Breakdown
          </h3>
          {assetTypeBreakdown.length === 0 ? (
            <div className="text-center py-12" style={{ color: MUTED }}>No assets discovered</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetTypeBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: MUTED }}>
                    {assetTypeBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
            Recent Discovery Jobs
          </h3>
          {jobs.length === 0 ? (
            <div className="text-center py-12" style={{ color: MUTED }}>No discovery jobs</div>
          ) : (
            <div className="space-y-2">
              {jobs.slice(0, 8).map(job => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${job.status === "running" ? "animate-pulse" : ""}`} style={{ background: job.status === "running" ? CYAN : job.status === "completed" ? LOW : job.status === "failed" ? DANGER : MUTED }} />
                    <div>
                      <p className="text-xs font-semibold text-white">{job.job_type}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{job.target}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: CYAN }}>{job.assets_discovered || 0} assets</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{new Date(job.started_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Risk Heatmap */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: DANGER }} />
            Asset Risk Heatmap
          </h3>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: DANGER }} /> High Risk</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: HIGH }} /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: LOW }} /> Low</span>
          </div>
        </div>
        {assets.length === 0 ? (
          <div className="text-center py-12" style={{ color: MUTED }}>No assets to display</div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={assets.map(a => ({
                  name: a.asset_name?.slice(0, 20) || 'Unknown',
                  risk_score: a.gds_risk_score || 0,
                  exposures: exposures.filter(e => e.asset_id === a.id && !e.is_resolved).length,
                  size: (a.gds_risk_score || 0) + (exposures.filter(e => e.asset_id === a.id && !e.is_resolved).length * 10),
                })).filter(d => d.size > 0)}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#1e3a5f"
                fill="#8884d8"
              >
                <Tooltip
                  contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                  formatter={(value, name, props) => {
                    const { risk_score, exposures } = props.payload;
                    return [`Risk: ${risk_score} · Exposures: ${exposures}`, props.payload.name];
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Critical Exposures Feed */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            Critical Exposures Feed
          </h3>
        </div>
        {exposures.filter(e => e.severity === "critical" || e.severity === "high").length === 0 ? (
          <div className="text-center py-12" style={{ color: MUTED }}>No critical exposures detected</div>
        ) : (
          <div className="space-y-2">
            {exposures.filter(e => e.severity === "critical" || e.severity === "high").slice(0, 10).map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: exp.severity === "critical" ? `${DANGER}05` : `${HIGH}05`, border: `1px solid ${exp.severity === "critical" ? DANGER : HIGH}20` }}>
                <div className="flex items-center gap-3">
                  <SevBadge sev={exp.severity} />
                  <div>
                    <p className="text-xs font-semibold text-white">{exp.exposure_type}</p>
                    <p className="text-[10px]" style={{ color: MUTED }}>{exp.asset_name}</p>
                  </div>
                </div>
                <p className="text-[10px]" style={{ color: MUTED }}>{new Date(exp.discovered_date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}