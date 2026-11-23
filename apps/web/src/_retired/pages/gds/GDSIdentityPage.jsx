import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Users, Activity, AlertTriangle, FileText, Key, Calendar, TrendingUp, CheckCircle, Clock3, MapPin, ShieldAlert } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

const SIGNAL_TYPE_COLORS = {
  impossible_travel: DANGER, brute_force: DANGER, leaked_credential: DANGER,
  anomalous_behavior: HIGH, privilege_escalation: HIGH, geo_anomaly: MEDIUM, device_anomaly: MEDIUM
};

export default function GDSIdentityPage() {
  const [selectedSignal, setSelectedSignal] = useState(null);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["identity-metrics"],
    queryFn: () => base44.functions.invoke("gdsIdentityPlatform", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: signals } = useQuery({
    queryKey: ["identity-risk-signals"],
    queryFn: () => base44.entities.IdentityRiskSignal.filter({ status: 'active' }, '-created_date', 10).catch(() => []),
    refetchInterval: 30000,
  });

  const m = metrics || {};
  const mfaRate = m.users?.mfa_compliance_rate || 0;
  const mfaColor = mfaRate >= 80 ? LOW : mfaRate >= 50 ? HIGH : DANGER;

  const signalData = [
    { name: 'Critical', value: m.risk_signals?.critical || 0, color: DANGER },
    { name: 'High', value: m.risk_signals?.high || 0, color: HIGH },
    { name: 'Medium', value: (m.risk_signals?.total || 0) - (m.risk_signals?.critical || 0) - (m.risk_signals?.high || 0), color: MEDIUM },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Enterprise Identity Platform" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Enterprise Identity Platform</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>10-stage pipeline · 7 system roles · 15 permissions · MFA enforcement · Session risk scoring</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#a855f7", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>EDP-011 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton lines={8} />
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Tenants</p>
              <p className="text-xl font-black font-mono" style={{ color: "#a855f7" }}>{m.tenants?.total ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Users</p>
              <p className="text-xl font-black font-mono" style={{ color: TEXT }}>{m.users?.total ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Sessions</p>
              <p className="text-xl font-black font-mono" style={{ color: LOW }}>{m.sessions?.active ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Suspicious</p>
              <p className="text-xl font-black font-mono" style={{ color: m.sessions?.suspicious > 0 ? DANGER : MUTED }}>{m.sessions?.suspicious ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Roles</p>
              <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{m.roles?.total ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Permissions</p>
              <p className="text-xl font-black font-mono" style={{ color: "#60a5fa" }}>{m.permissions?.total ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Access Reviews</p>
              <p className="text-xl font-black font-mono" style={{ color: m.access_reviews?.in_progress > 0 ? HIGH : MUTED }}>{m.access_reviews?.in_progress ?? 0}</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Risk Signals</p>
              <p className="text-xl font-black font-mono" style={{ color: (m.risk_signals?.critical + m.risk_signals?.high) > 0 ? DANGER : MUTED }}>{(m.risk_signals?.critical || 0) + (m.risk_signals?.high || 0)}</p>
            </Card>
          </div>

          {/* MFA Compliance Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">MFA Compliance Rate</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Percentage of users with MFA enabled</p>
              </div>
              <div className="flex items-center justify-center py-8">
                <div className="relative">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
                    <circle cx="80" cy="80" r="60" fill="none" stroke={mfaColor} strokeWidth="16" strokeDasharray={`${(mfaRate / 100) * 377} 377`} strokeLinecap="round" transform="rotate(-90 80 80)" style={{ transition: "all 1s ease" }} />
                    <text x="80" y="75" textAnchor="middle" fill={mfaColor} fontSize="32" fontWeight="900" fontFamily="monospace">{mfaRate}%</text>
                    <text x="80" y="95" textAnchor="middle" fill={MUTED} fontSize="10" fontWeight="600">COMPLIANT</text>
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: LOW }} />
                  <span style={{ color: MUTED }}>≥80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: HIGH }} />
                  <span style={{ color: MUTED }}>50-79%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: DANGER }} />
                  <span style={{ color: MUTED }}>&lt;50%</span>
                </div>
              </div>
            </Card>

            {/* Risk Signal Distribution */}
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Risk Signal Distribution</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Active risk signals by severity</p>
              </div>
              {signalData.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No risk signals" description="Active risk signals will appear here" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={signalData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                      {signalData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: MUTED }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Risk Signals Table */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white">Active Risk Signals</h3>
              <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time identity threat detection</p>
            </div>
            {signals?.length === 0 ? (
              <EmptyState icon={ShieldAlert} title="No active signals" description="Risk signals will appear when suspicious activity is detected" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Type", "Severity", "User", "Description", "Source", "Previous", "Auto-Remediation", "Status", "Detected"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {signals?.map((signal, i) => {
                      const typeColor = SIGNAL_TYPE_COLORS[signal.signal_type] || MUTED;
                      const sevColor = signal.severity === 'critical' ? DANGER : signal.severity === 'high' ? HIGH : signal.severity === 'medium' ? MEDIUM : LOW;
                      return (
                        <tr key={signal.signal_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                          <td className="py-2 px-3">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30` }}>
                              {(signal.signal_type || 'unknown').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: sevColor, background: `${sevColor}15`, border: `1px solid ${sevColor}30` }}>
                              {signal.severity || 'low'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{signal.user_id || '—'}</td>
                          <td className="py-2 px-3 text-[10px] max-w-[200px] truncate" style={{ color: TEXT }}>{signal.description || '—'}</td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{signal.source_country || '—'}</td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{signal.previous_country || '—'}</td>
                          <td className="py-2 px-3">
                            {signal.auto_remediation ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>AUTO</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: MUTED, background: "rgba(255,255,255,0.04)" }}>MANUAL</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: signal.status === 'active' ? CYAN : MUTED, background: "rgba(255,255,255,0.04)" }}>
                              {signal.status || 'active'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(signal.created_date)}</td>
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