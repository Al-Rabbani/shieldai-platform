import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Key, Lock, Clock, Calendar, AlertTriangle, CheckCircle, XCircle, Shield, Flame, Download, Plus } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

export default function GDSZeroTrustJITPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("jit");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    resource: "", resource_type: "database", permissions: "", justification: "", duration_minutes: 60, is_emergency: false
  });

  const { data: jitGrants, isLoading: jitLoading } = useQuery({
    queryKey: ["zero-trust-jit-grants"],
    queryFn: () => base44.entities.JITAccessGrant.list('-created_date', 50).catch(() => []),
    refetchInterval: 30000,
  });

  const { data: jeaScopes, isLoading: jeaLoading } = useQuery({
    queryKey: ["zero-trust-jea-scopes"],
    queryFn: () => base44.entities.JEAAccessScope.list('-created_date', 50).catch(() => []),
    refetchInterval: 30000,
  });

  const requestMutation = useMutation({
    mutationFn: (payload) => base44.functions.invoke("gdsZeroTrustPlatform", { action: "jit_request", ...payload }),
    onSuccess: () => {
      qc.invalidateQueries(["zero-trust-jit-grants"]);
      setShowRequestModal(false);
      alert("✅ JIT access requested!");
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (grant_id) => base44.functions.invoke("gdsZeroTrustPlatform", { action: "jit_revoke", grant_id }),
    onSuccess: () => {
      qc.invalidateQueries(["zero-trust-jit-grants"]);
      alert("✅ JIT grant revoked!");
    }
  });

  const activeGrants = jitGrants?.filter(g => g.status === 'active') || [];
  const expiringSoon = activeGrants.filter(g => {
    const expires = new Date(g.expires_at);
    const now = new Date();
    return (expires - now) < 30 * 60 * 1000;
  });
  const pendingGrants = jitGrants?.filter(g => g.status === 'pending') || [];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "JIT & JEA Access" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Just-In-Time & Just-Enough Access</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Temporary privilege elevation with auto-expiry</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          Request JIT Access
        </button>
      </div>

      {/* Active Grants Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active Grants</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{activeGrants.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Expiring Soon</p>
          <p className="text-2xl font-black font-mono" style={{ color: expiringSoon.length > 0 ? HIGH : MUTED }}>{expiringSoon.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Pending Approval</p>
          <p className="text-2xl font-black font-mono" style={{ color: pendingGrants.length > 0 ? HIGH : MUTED }}>{pendingGrants.length}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: BORDER }}>
        <button onClick={() => setActiveTab("jit")}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px"
          style={{ color: activeTab === "jit" ? CYAN : MUTED, borderBottomColor: activeTab === "jit" ? CYAN : "transparent" }}>
          <Clock className="w-3.5 h-3.5" />
          JIT Grants
        </button>
        <button onClick={() => setActiveTab("jea")}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px"
          style={{ color: activeTab === "jea" ? CYAN : MUTED, borderBottomColor: activeTab === "jea" ? CYAN : "transparent" }}>
          <Lock className="w-3.5 h-3.5" />
          JEA Scopes
        </button>
      </div>

      {/* JIT Grants Tab */}
      {activeTab === "jit" && (
        <Card className="p-5">
          {jitLoading ? <Skeleton lines={6} /> : jitGrants?.length === 0 ? (
            <EmptyState icon={Key} title="No JIT grants" description="JIT access grants will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Grant ID", "Requestor", "Resource", "Permissions", "Duration", "Expires", "Trust Score", "Emergency", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jitGrants.map((grant, i) => {
                    const expires = new Date(grant.expires_at);
                    const now = new Date();
                    const timeLeft = expires - now;
                    const isExpiring = timeLeft < 5 * 60 * 1000 && grant.status === 'active';
                    return (
                      <tr key={grant.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{grant.grant_id}</td>
                        <td className="py-2 px-3">
                          <div>
                            <p className="text-white font-bold">{grant.requestor_id}</p>
                            <p className="text-[9px]" style={{ color: MUTED }}>{grant.requestor_role}</p>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{grant.resource}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(grant.permissions_granted || []).slice(0, 3).map((p, idx) => (
                              <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{p}</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{grant.duration_minutes}min</td>
                        <td className="py-2 px-3">
                          <div>
                            <p className={`text-[10px] font-bold ${isExpiring ? 'text-red-400' : ''}`} style={{ color: isExpiring ? DANGER : TEXT }}>
                              {expires.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                            <p className="text-[9px]" style={{ color: MUTED }}>{expires.toLocaleDateString()}</p>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${grant.trust_score_at_grant || 0}%`, background: grant.trust_score_at_grant >= 75 ? LOW : grant.trust_score_at_grant >= 50 ? MEDIUM : DANGER }} />
                            </div>
                            <span className="text-[9px] font-bold" style={{ color: TEXT }}>{grant.trust_score_at_grant || 0}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {grant.is_emergency ? <Flame className="w-3.5 h-3.5" style={{ color: DANGER }} /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${grant.status === 'active' ? 'text-green-400' : grant.status === 'pending' ? 'text-amber-400' : grant.status === 'expired' ? 'text-gray-400' : 'text-red-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                            {grant.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {grant.status === 'active' && (
                            <button onClick={() => revokeMutation.mutate(grant.grant_id)}
                              className="text-[10px] px-2 py-1 rounded transition-all hover:opacity-80"
                              style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>
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
          )}
        </Card>
      )}

      {/* JEA Scopes Tab */}
      {activeTab === "jea" && (
        <Card className="p-5">
          {jeaLoading ? <Skeleton lines={6} /> : jeaScopes?.length === 0 ? (
            <EmptyState icon={Lock} title="No JEA scopes" description="JEA access scopes will appear here" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Scope ID", "Entity", "Resource", "Allowed Actions", "Denied Actions", "Max Records", "Valid Until", "Use Count", "Status"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jeaScopes.map((scope, i) => (
                    <tr key={scope.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                      <td className="py-2 px-3 font-mono text-[10px]" style={{ color: TEXT }}>{scope.scope_id}</td>
                      <td className="py-2 px-3">
                        <div>
                          <p className="text-white font-bold">{scope.entity_id}</p>
                          <p className="text-[9px]" style={{ color: MUTED }}>{scope.entity_type}</p>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{scope.resource}</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(scope.allowed_actions || []).slice(0, 3).map((a, idx) => (
                            <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>{a}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(scope.denied_actions || []).slice(0, 3).map((a, idx) => (
                            <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>{a}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{scope.max_records}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: scope.valid_until ? MUTED : TEXT }}>{scope.valid_until ? new Date(scope.valid_until).toLocaleDateString() : '∞'}</td>
                      <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{scope.use_count || 0}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${scope.status === 'active' ? 'text-green-400' : 'text-gray-400'}`} style={{ background: "rgba(255,255,255,0.04)" }}>
                          {scope.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Request JIT Access</h2>
              <button onClick={() => setShowRequestModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}>
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Resource</label>
                <input value={requestForm.resource} onChange={e => setRequestForm({...requestForm, resource: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Resource Type</label>
                <select value={requestForm.resource_type} onChange={e => setRequestForm({...requestForm, resource_type: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                  <option value="database">Database</option>
                  <option value="api">API</option>
                  <option value="server">Server</option>
                  <option value="storage">Storage</option>
                  <option value="network">Network</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Permissions (comma-separated)</label>
                <input value={requestForm.permissions} onChange={e => setRequestForm({...requestForm, permissions: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Justification</label>
                <textarea value={requestForm.justification} onChange={e => setRequestForm({...requestForm, justification: e.target.value})} rows={3}
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                  style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} />
              </div>
              <div>
                <label className="text-[10px] font-bold mb-1 block" style={{ color: MUTED }}>Duration: {requestForm.duration_minutes} minutes</label>
                <input type="range" min="15" max="480" step="15" value={requestForm.duration_minutes} onChange={e => setRequestForm({...requestForm, duration_minutes: parseInt(e.target.value)})}
                  className="w-full" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={requestForm.is_emergency} onChange={e => setRequestForm({...requestForm, is_emergency: e.target.checked})} id="emergency" />
                <label htmlFor="emergency" className="text-xs" style={{ color: TEXT }}>Emergency Access</label>
              </div>
            </div>
            <button onClick={() => requestMutation.mutate(requestForm)}
              disabled={requestMutation.isPending || !requestForm.resource || !requestForm.permissions}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {requestMutation.isPending ? "Requesting..." : "Submit Request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}