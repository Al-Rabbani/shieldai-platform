import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Users, Shield, AlertTriangle, Activity, Key, Lock, Calendar, ShieldAlert, CheckCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";

export default function GDSIdentityInsightsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["identity-insights-metrics", timeRange],
    queryFn: () => base44.functions.invoke("gdsIdentityPlatform", { action: "insights", time_range: timeRange }).then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: sessions } = useQuery({
    queryKey: ["identity-sessions-all"],
    queryFn: () => base44.entities.Session.list().catch(() => []),
  });

  const { data: roleChanges } = useQuery({
    queryKey: ["identity-role-changes"],
    queryFn: () => base44.entities.UserRole.list('-created_date', 50).catch(() => []),
  });

  const { data: riskSignals } = useQuery({
    queryKey: ["identity-risk-signals"],
    queryFn: () => base44.entities.IdentityRiskSignal.filter({ status: 'active' }).catch(() => []),
  });

  const m = metrics || {};
  const activeSessions = sessions?.filter(s => s.status === 'active').length || 0;
  const suspiciousSessions = sessions?.filter(s => (s.risk_score || 0) >= 70).length || 0;

  const sessionTrendData = m.session_trends || [];
  const roleChangeData = m.role_change_trends || [];
  const permissionRiskData = m.permission_risk_breakdown || [];
  const cloudAssetData = m.cloud_asset_risk || [];

  const roleChangeCount = roleChanges?.length || 0;
  const riskSignalCount = riskSignals?.length || 0;

  const pieData = [
    { name: 'Low Risk', value: m.risk_distribution?.low || 0, color: LOW },
    { name: 'Medium Risk', value: m.risk_distribution?.medium || 0, color: MEDIUM },
    { name: 'High Risk', value: m.risk_distribution?.high || 0, color: HIGH },
    { name: 'Critical', value: m.risk_distribution?.critical || 0, color: DANGER },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Insights" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Identity Insights Dashboard</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Monthly trends for sessions, roles, and permission risks</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {isLoading ? (
        <Skeleton lines={8} />
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Sessions</p>
              <p className="text-xl font-black font-mono" style={{ color: LOW }}>{activeSessions}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Suspicious</p>
              <p className="text-xl font-black font-mono" style={{ color: suspiciousSessions > 0 ? DANGER : MUTED }}>{suspiciousSessions}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Role Changes</p>
              <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{roleChangeCount}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Risk Signals</p>
              <p className="text-xl font-black font-mono" style={{ color: riskSignalCount > 0 ? DANGER : MUTED }}>{riskSignalCount}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Overprivileged</p>
              <p className="text-xl font-black font-mono" style={{ color: m.overprivileged_users || 0 > 0 ? HIGH : MUTED }}>{m.overprivileged_users || 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Cloud Risks</p>
              <p className="text-xl font-black font-mono" style={{ color: m.cloud_risk_count || 0 > 0 ? DANGER : MUTED }}>{m.cloud_risk_count || 0}</p>
            </Card>
          </div>

          {/* Session Trends */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Active Session Trends</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Monthly session activity and anomalies</p>
            </div>
            {sessionTrendData.length === 0 ? (
              <EmptyState icon={Activity} title="No session data" description="Session trends will appear after activity is recorded" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={sessionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                  <XAxis dataKey="date" stroke={MUTED} fontSize={10} />
                  <YAxis stroke={MUTED} fontSize={10} />
                  <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                  <Area type="monotone" dataKey="active" stroke={LOW} fill={`${LOW}20`} strokeWidth={2} name="Active" />
                  <Area type="monotone" dataKey="suspicious" stroke={DANGER} fill={`${DANGER}20`} strokeWidth={2} name="Suspicious" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Role Changes & Risk Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Role Changes Timeline</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Recent role assignments and modifications</p>
              </div>
              {roleChangeData.length === 0 ? (
                <EmptyState icon={Key} title="No role changes" description="Role changes will appear here" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={roleChangeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="date" stroke={MUTED} fontSize={10} />
                    <YAxis stroke={MUTED} fontSize={10} />
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Bar dataKey="count" fill={CYAN} name="Changes" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Permission Risk Distribution</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Risk levels across all permissions</p>
              </div>
              {pieData.length === 0 ? (
                <EmptyState icon={ShieldAlert} title="No risk data" description="Permission risk data will appear after analysis" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Permission Risk Breakdown */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Permission Risk Breakdown</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>High-risk permissions by category</p>
            </div>
            {permissionRiskData.length === 0 ? (
              <EmptyState icon={Lock} title="No permission risks" description="Permission risk analysis will appear here" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Permission", "Category", "Risk Level", "Users with Access", "Cloud Assets", "Last Changed"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissionRiskData.map((perm, i) => {
                      const riskColor = perm.risk_level === 'critical' ? DANGER : perm.risk_level === 'high' ? HIGH : MEDIUM;
                      return (
                        <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-mono font-bold" style={{ color: TEXT }}>{perm.permission}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{perm.category}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: riskColor, background: `${riskColor}15`, border: `1px solid ${riskColor}30` }}>{perm.risk_level}</span>
                          </td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{perm.user_count}</td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{perm.cloud_assets}</td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{perm.last_changed || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Cloud Asset Risks */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Cloud Asset Permission Risks</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Identity risks across cloud infrastructure</p>
            </div>
            {cloudAssetData.length === 0 ? (
              <EmptyState icon={Shield} title="No cloud asset risks" description="Cloud asset risk data will appear after scanning" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Asset Name", "Asset Type", "Provider", "Risk Score", "Overprivileged Identities", "Critical Permissions", "Last Audit"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cloudAssetData.map((asset, i) => {
                      const riskColor = asset.risk_score >= 70 ? DANGER : asset.risk_score >= 40 ? HIGH : LOW;
                      return (
                        <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                          <td className="py-2 px-3 font-bold text-white">{asset.asset_name}</td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: TEXT, background: "rgba(255,255,255,0.04)" }}>{asset.asset_type}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: asset.provider === 'aws' ? '#ff9900' : asset.provider === 'azure' ? '#0078d4' : '#4285f4', background: "rgba(255,255,255,0.04)" }}>{asset.provider}</span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <div className="h-full rounded-full" style={{ width: `${asset.risk_score}%`, background: riskColor }} />
                              </div>
                              <span className="text-[9px] font-bold" style={{ color: riskColor }}>{asset.risk_score}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: asset.overprivileged_count > 0 ? HIGH : MUTED }}>{asset.overprivileged_count}</td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: asset.critical_perms > 0 ? DANGER : MUTED }}>{asset.critical_perms}</td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{asset.last_audit ? new Date(asset.last_audit).toLocaleDateString() : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}