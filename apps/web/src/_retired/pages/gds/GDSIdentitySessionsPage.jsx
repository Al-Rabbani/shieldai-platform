import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Activity, Shield, AlertTriangle, MapPin, Clock3, XCircle, CheckCircle, Flame, Smartphone, Laptop, Globe, Search, Filter } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const AUTH_METHOD_COLORS = { password: MUTED, sso: "#3b82f6", mfa: LOW, oauth: "#8b5cf6", api_key: HIGH };
const DEVICE_ICONS = { desktop: Laptop, mobile: Smartphone, tablet: Laptop, unknown: Globe };

export default function GDSIdentitySessionsPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', auth_method: '', country: '', risk_min: 0, date_from: '', date_to: '' });
  const [revokeSessionId, setRevokeSessionId] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["identity-sessions", filters],
    queryFn: () => base44.entities.Session.list('-created_date').then(list => {
      return list.filter(s => {
        if (filters.status && s.status !== filters.status) return false;
        if (filters.auth_method && s.auth_method !== filters.auth_method) return false;
        if (filters.country && s.country !== filters.country) return false;
        if (filters.risk_min && (s.risk_score || 0) < filters.risk_min) return false;
        return true;
      });
    }).catch(() => []),
    refetchInterval: 15000,
  });

  const { data: signals } = useQuery({
    queryKey: ["identity-risk-signals-all"],
    queryFn: () => base44.entities.IdentityRiskSignal.list('-created_date').catch(() => []),
  });

  const revokeMutation = useMutation({
    mutationFn: ({ session_id, reason }) => base44.functions.invoke("gdsIdentityPlatform", { action: "revoke_session", session_id, reason }),
    onSuccess: () => { qc.invalidateQueries(["identity-sessions"]); setRevokeSessionId(null); setRevokeReason(''); }
  });

  const activeCount = sessions?.filter(s => s.status === 'active').length || 0;
  const suspiciousCount = sessions?.filter(s => s.status === 'suspicious' || (s.risk_score || 0) >= 70).length || 0;

  const signalTypeData = (signals || []).reduce((acc, s) => {
    acc[s.signal_type] = (acc[s.signal_type] || 0) + 1;
    return acc;
  }, {});
  const signalChartData = Object.entries(signalTypeData).map(([type, count]) => ({
    name: type.replace(/_/g, ' '), value: count, color: type === 'impossible_travel' ? DANGER : type === 'brute_force' ? DANGER : HIGH
  }));

  const impossibleTravels = (sessions || []).filter(s => s.risk_signals?.includes('impossible_travel') || s.impossible_travel);

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Session Intelligence Monitor" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Session Intelligence Monitor</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Real-time session monitoring and risk detection</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: LOW, background: `${LOW}10`, border: `1px solid ${LOW}30` }}>{activeCount} active</span>
          {suspiciousCount > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded animate-pulse" style={{ color: DANGER, background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>{suspiciousCount} suspicious</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
            <Filter className="w-3.5 h-3.5" />
            <span className="font-bold">Filters:</span>
          </div>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspicious">Suspicious</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
          <select value={filters.auth_method} onChange={e => setFilters({ ...filters, auth_method: e.target.value })} className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            <option value="">All Methods</option>
            <option value="password">Password</option>
            <option value="sso">SSO</option>
            <option value="mfa">MFA</option>
            <option value="oauth">OAuth</option>
            <option value="api_key">API Key</option>
          </select>
          <input type="text" value={filters.country} onChange={e => setFilters({ ...filters, country: e.target.value })} placeholder="Country" className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
          <input type="number" value={filters.risk_min} onChange={e => setFilters({ ...filters, risk_min: parseInt(e.target.value) })} placeholder="Min Risk Score" className="w-24 px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
        </div>
      </Card>

      {isLoading ? <Skeleton lines={8} /> : sessions?.length === 0 ? (
        <EmptyState icon={Activity} title="No sessions" description="Active sessions will appear here" />
      ) : (
        <>
          {/* Sessions Table */}
          <Card className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Session ID", "User", "Status", "Auth Method", "MFA", "IP", "Location", "Device", "Risk Score", "Signals", "Started", "Last Active", "Expires", "Actions"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => {
                    const statusColor = s.status === 'active' ? LOW : s.status === 'suspicious' || (s.risk_score || 0) >= 70 ? DANGER : s.status === 'revoked' ? MUTED : MUTED;
                    const authColor = AUTH_METHOD_COLORS[s.auth_method] || MUTED;
                    const riskColor = (s.risk_score || 0) >= 70 ? DANGER : (s.risk_score || 0) >= 40 ? HIGH : LOW;
                    const DeviceIcon = DEVICE_ICONS[s.device_type] || DEVICE_ICONS.unknown;
                    return (
                      <tr key={s.session_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3">
                          <span className="text-[9px] font-mono truncate block max-w-[120px]" style={{ color: TEXT }}>{s.session_id?.slice(0, 12) || '—'}</span>
                        </td>
                        <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{s.user_id || '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${s.status === 'suspicious' ? 'animate-pulse' : ''}`} style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
                            {s.status || 'active'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: authColor, background: `${authColor}15`, border: `1px solid ${authColor}30` }}>{s.auth_method || 'password'}</span>
                        </td>
                        <td className="py-2 px-3">{s.mfa_verified ? <CheckCircle className="w-3 h-3" style={{ color: LOW }} /> : <XCircle className="w-3 h-3" style={{ color: DANGER }} />}</td>
                        <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{s.ip_address || '—'}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" style={{ color: MUTED }} />
                            <span className="text-[10px]" style={{ color: TEXT }}>{s.country || '—'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <DeviceIcon className="w-3 h-3" style={{ color: MUTED }} />
                            <span className="text-[10px]" style={{ color: MUTED }}>{s.device_type || 'desktop'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${s.risk_score || 0}%`, background: riskColor }} />
                            </div>
                            <span className="text-[9px] font-bold" style={{ color: riskColor }}>{s.risk_score || 0}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(s.risk_signals || []).slice(0, 3).map((sig, idx) => (
                              <span key={idx} className="text-[8px] px-1 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
                                {sig.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {s.impossible_travel && <Flame className="w-3 h-3" style={{ color: DANGER }} />}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{s.started_at ? timeAgo(s.started_at) : '—'}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{s.last_active_at ? timeAgo(s.last_active_at) : '—'}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}</td>
                        <td className="py-2 px-3">
                          {s.status !== 'revoked' && s.status !== 'expired' && (
                            <button onClick={() => setRevokeSessionId(s.session_id)} className="text-[10px] px-2 py-1 rounded hover:bg-red-500/10 transition-all" style={{ color: DANGER, border: `1px solid ${DANGER}30` }}>
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Risk Signal Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Risk Signal Distribution</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Sessions by risk signal type</p>
              </div>
              {signalChartData.length === 0 ? (
                <EmptyState icon={AlertTriangle} title="No risk signals" description="Risk signals will appear when suspicious activity is detected" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={signalChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                    <XAxis dataKey="name" stroke={MUTED} fontSize={9} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke={MUTED} fontSize={9} />
                    <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {signalChartData.map((entry, i) => (<rect key={i} fill={entry.color} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Impossible Travel */}
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Impossible Travel Detection</h3>
                <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Sessions with geographically impossible login patterns</p>
              </div>
              {impossibleTravels.length === 0 ? (
                <EmptyState icon={MapPin} title="No impossible travel" description="No geographically anomalous sessions detected" />
              ) : (
                <div className="space-y-3">
                  {impossibleTravels.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg" style={{ background: `${DANGER}10`, border: `1px solid ${DANGER}30` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4" style={{ color: DANGER }} />
                          <span className="text-xs font-bold" style={{ color: TEXT }}>{s.user_id || 'Unknown User'}</span>
                        </div>
                        <span className="text-[10px]" style={{ color: MUTED }}>{s.started_at ? timeAgo(s.started_at) : '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                        <span>{s.source_country || 'Unknown'}</span>
                        <span style={{ color: DANGER }}>→</span>
                        <span>{s.previous_country || 'Unknown'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Revoke Modal */}
      {revokeSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" style={{ color: DANGER }} />
              <h2 className="text-base font-black text-white">Revoke Session</h2>
            </div>
            <p className="text-xs" style={{ color: MUTED }}>Are you sure you want to revoke this session? This will immediately terminate the user's access.</p>
            <select value={revokeReason} onChange={e => setRevokeReason(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
              <option value="">Select reason...</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="policy_violation">Policy Violation</option>
              <option value="user_request">User Request</option>
              <option value="security_incident">Security Incident</option>
              <option value="other">Other</option>
            </select>
            <div className="flex items-center gap-3">
              <button onClick={() => setRevokeSessionId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                Cancel
              </button>
              <button onClick={() => revokeMutation.mutate({ session_id: revokeSessionId, reason: revokeReason })} disabled={!revokeReason || revokeMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER }}>
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}