import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Key, Calendar, CheckCircle, XCircle, Users, Plus, Settings, Play, AlertTriangle, Globe, Lock } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";

const PROVIDER_TYPE_COLORS = { microsoft_entra: "#0078d4", google_workspace: "#ea4335", okta: "#007dc1", auth0: "#eb5424", saml: "#f59e0b", oidc: "#8b5cf6", local: MUTED };
const PLAN_COLORS = { enterprise: "#a855f7", professional: "#3b82f6", starter: "#10b981", free: MUTED };

export default function GDSIdentityProvidersPage() {
  const qc = useQueryClient();
  const [showIdpModal, setShowIdpModal] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [newIdp, setNewIdp] = useState({ name: '', provider_type: 'microsoft_entra', issuer_url: '', client_id: '', scopes: '', auto_provision: false, is_primary: false });
  const [newMfa, setNewMfa] = useState({ scope: 'global', scope_id: '', allowed_methods: ['totp'], grace_period_hours: 72, bypass_roles: '' });
  const [newReview, setNewReview] = useState({ name: '', review_type: 'access', scope: 'global', reviewer_roles: '', due_days: 30, triggered_by: '' });
  const [newTenant, setNewTenant] = useState({ name: '', domain: '', plan: 'professional', owner_email: '', industry: '', country: '', mfa_required: true, max_users: 100, max_agents: 50 });

  const { data: idps, isLoading: idpsLoading } = useQuery({
    queryKey: ["identity-providers"],
    queryFn: () => base44.entities.IdentityProvider.list().catch(() => []),
  });

  const { data: mfaSettings, isLoading: mfaLoading } = useQuery({
    queryKey: ["mfa-settings"],
    queryFn: () => base44.entities.MFASetting.list().catch(() => []),
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["access-reviews"],
    queryFn: () => base44.entities.AccessReview.list('-created_date').catch(() => []),
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.list().catch(() => []),
  });

  const configureIdpMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsIdentityPlatform", { action: "configure_idp", ...data }),
    onSuccess: () => { qc.invalidateQueries(["identity-providers"]); setShowIdpModal(false); setNewIdp({ name: '', provider_type: 'microsoft_entra', issuer_url: '', client_id: '', scopes: '', auto_provision: false, is_primary: false }); }
  });

  const enforceMfaMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsIdentityPlatform", { action: "enforce_mfa", ...data }),
    onSuccess: () => { qc.invalidateQueries(["mfa-settings"]); setShowMfaModal(false); setNewMfa({ scope: 'global', scope_id: '', allowed_methods: ['totp'], grace_period_hours: 72, bypass_roles: '' }); }
  });

  const startReviewMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsIdentityPlatform", { action: "start_access_review", ...data }),
    onSuccess: () => { qc.invalidateQueries(["access-reviews"]); setShowReviewModal(false); setNewReview({ name: '', review_type: 'access', scope: 'global', reviewer_roles: '', due_days: 30, triggered_by: '' }); }
  });

  const provisionTenantMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsIdentityPlatform", { action: "provision_tenant", ...data }),
    onSuccess: () => { qc.invalidateQueries(["tenants"]); setShowTenantModal(false); setNewTenant({ name: '', domain: '', plan: 'professional', owner_email: '', industry: '', country: '', mfa_required: true, max_users: 100, max_agents: 50 }); }
  });

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity & Access Governance" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Identity & Access Governance</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Identity Providers · MFA · Access Reviews · Tenant Management</p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Identity Providers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Globe className="w-5 h-5" style={{ color: CYAN }} />
            Identity Providers
          </h2>
          <button onClick={() => setShowIdpModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" /> Configure IDP
          </button>
        </div>
        {idpsLoading ? <Skeleton lines={4} /> : idps?.length === 0 ? (
          <EmptyState icon={Globe} title="No identity providers" description="Configure your first identity provider" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {idps.map((idp, i) => {
              const providerColor = PROVIDER_TYPE_COLORS[idp.provider_type] || MUTED;
              return (
                <Card key={idp.idp_id || i} className="p-5" glow>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${providerColor}15`, border: `1px solid ${providerColor}30` }}>
                        <Globe className="w-4 h-4" style={{ color: providerColor }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{idp.name}</p>
                        <p className="text-[10px]" style={{ color: MUTED }}>{idp.provider_type?.replace(/_/g, ' ').toUpperCase()}</p>
                      </div>
                    </div>
                    {idp.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: LOW, background: `${LOW}15`, border: `1px solid ${LOW}30` }}>PRIMARY</span>}
                  </div>
                  <div className="space-y-2 text-xs mb-4">
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Issuer URL</span>
                      <span className="truncate max-w-[150px] font-mono" style={{ color: TEXT }}>{idp.issuer_url || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Auto-Provision</span>
                      <span style={{ color: idp.auto_provision ? LOW : MUTED }}>{idp.auto_provision ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Users Synced</span>
                      <span style={{ color: TEXT }}>{idp.users_synced || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Last Sync</span>
                      <span style={{ color: MUTED }}>{idp.last_sync ? new Date(idp.last_sync).toLocaleDateString() : 'Never'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: MUTED }}>Status</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${idp.status === 'active' ? 'animate-pulse' : ''}`} style={{ color: idp.status === 'active' ? LOW : idp.status === 'error' ? DANGER : MUTED, background: "rgba(255,255,255,0.04)" }}>{idp.status || 'inactive'}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: MFA Enforcement */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Lock className="w-5 h-5" style={{ color: CYAN }} />
            MFA Enforcement
          </h2>
          <button onClick={() => setShowMfaModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Shield className="w-4 h-4" /> Enforce MFA
          </button>
        </div>
        {mfaLoading ? <Skeleton lines={3} /> : mfaSettings?.length === 0 ? (
          <EmptyState icon={Lock} title="No MFA policies" description="Create your first MFA enforcement policy" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mfaSettings.map((mfa, i) => (
              <Card key={mfa.setting_id || i} className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5" style={{ color: CYAN }} />
                    <div>
                      <p className="text-sm font-bold text-white">MFA Policy: {mfa.scope}</p>
                      <p className="text-[10px]" style={{ color: MUTED }}>{mfa.scope_id || 'Global'}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${mfa.status === 'grace_period' ? 'animate-pulse' : ''}`} style={{ color: mfa.status === 'grace_period' ? HIGH : mfa.status === 'enforced' ? LOW : CYAN, background: "rgba(255,255,255,0.04)" }}>{mfa.status?.replace(/_/g, ' ')}</span>
                </div>
                <div className="space-y-3 text-xs mb-4">
                  <div>
                    <p className="mb-1" style={{ color: MUTED }}>Allowed Methods</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(mfa.allowed_methods || []).map((m, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Grace Period</span>
                    <span style={{ color: TEXT }}>{mfa.grace_period_hours || 0}h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: MUTED }}>Enforcement Date</span>
                    <span style={{ color: TEXT }}>{mfa.enforcement_date ? new Date(mfa.enforcement_date).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ color: MUTED }}>Compliance</span>
                        <span style={{ color: LOW }}>{mfa.compliant_count || 0}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${((mfa.compliant_count || 0) / ((mfa.compliant_count || 0) + (mfa.non_compliant_count || 1))) * 100}%`, background: LOW }} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ color: MUTED }}>Non-Compliant</span>
                        <span style={{ color: DANGER }}>{mfa.non_compliant_count || 0}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${((mfa.non_compliant_count || 0) / ((mfa.compliant_count || 0) + (mfa.non_compliant_count || 1))) * 100}%`, background: DANGER }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Access Reviews */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: CYAN }} />
            Access Reviews
          </h2>
          <button onClick={() => setShowReviewModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Play className="w-4 h-4" /> Start Access Review
          </button>
        </div>
        {reviewsLoading ? <Skeleton lines={4} /> : reviews?.length === 0 ? (
          <EmptyState icon={Calendar} title="No access reviews" description="Start your first access review campaign" />
        ) : (
          <Card className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Name", "Type", "Scope", "Status", "Progress", "Approved", "Revoked", "Due Date", "Triggered By"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r, i) => {
                    const statusColor = r.status === 'in_progress' ? CYAN : r.status === 'overdue' ? DANGER : LOW;
                    const progress = r.total_items > 0 ? Math.round((r.reviewed_count / r.total_items) * 100) : 0;
                    return (
                      <tr key={r.review_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-bold text-white">{r.name}</td>
                        <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{r.review_type || 'access'}</span></td>
                        <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{r.scope || 'global'}</td>
                        <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${r.status === 'overdue' ? 'animate-pulse' : ''}`} style={{ color: statusColor, background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>{r.status || 'pending'}</span></td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: CYAN }} />
                            </div>
                            <span className="text-[9px] font-bold" style={{ color: TEXT }}>{progress}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: LOW }}>{r.approved_count || 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: DANGER }}>{r.revoked_count || 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: r.due_date && new Date(r.due_date) < new Date() ? DANGER : TEXT }}>{r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}</td>
                        <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{r.triggered_by || 'system'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* SECTION 4: Tenants */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: CYAN }} />
            Tenant Management
          </h2>
          <button onClick={() => setShowTenantModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            <Plus className="w-4 h-4" /> Provision Tenant
          </button>
        </div>
        {tenantsLoading ? <Skeleton lines={4} /> : tenants?.length === 0 ? (
          <EmptyState icon={Users} title="No tenants" description="Provision your first tenant" />
        ) : (
          <Card className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Name", "Domain", "Plan", "Owner", "Max Users", "MFA Required", "SSO Enabled", "Status", "Monthly Spend", "Created"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t, i) => {
                    const planColor = PLAN_COLORS[t.plan] || MUTED;
                    return (
                      <tr key={t.tenant_id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-bold text-white">{t.name}</td>
                        <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{t.domain || '—'}</td>
                        <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: planColor, background: `${planColor}15`, border: `1px solid ${planColor}30` }}>{t.plan || 'professional'}</span></td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{t.owner_email || '—'}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{t.max_users || 100}</td>
                        <td className="py-2 px-3">{t.mfa_required ? <CheckCircle className="w-3 h-3" style={{ color: LOW }} /> : <XCircle className="w-3 h-3" style={{ color: DANGER }} />}</td>
                        <td className="py-2 px-3">{t.sso_enabled ? <CheckCircle className="w-3 h-3" style={{ color: LOW }} /> : <span style={{ color: MUTED }}>No</span>}</td>
                        <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: t.status === 'active' ? LOW : MUTED, background: "rgba(255,255,255,0.04)" }}>{t.status || 'active'}</span></td>
                        <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>${t.monthly_spend_usd || 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{t.created_date ? new Date(t.created_date).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Modals would go here (similar pattern to other pages - omitted for brevity) */}
    </div>
  );
}