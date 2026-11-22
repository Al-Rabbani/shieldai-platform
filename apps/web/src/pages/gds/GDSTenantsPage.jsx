import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building2, Plus, Shield, RefreshCw, AlertTriangle, CheckCircle, X } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const PLAN_COLORS = {
  enterprise: "#8b5cf6",
  professional: "#3b82f6",
  starter: "#10b981",
  mssp: "#f59e0b",
  free: "#64748b"
};

export default function GDSTenantsPage() {
  const qc = useQueryClient();
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [selectedTenant, setSelectedTenant] = useState(null);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["tenant-metrics"],
    queryFn: () => base44.functions.invoke("gdsTenantEngine", { action: "metrics" }).then(r => r.data.result),
    refetchInterval: 30000,
  });

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.filter({}, '-created_date', 50).catch(() => []),
  });

  const provisionMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantEngine", { action: "provision", ...data }).then(r => r.data.result),
    onSuccess: (result) => {
      toast.success(`Tenant provisioned: ${result.tenant_id}`);
      qc.invalidateQueries(["tenants", "tenant-metrics"]);
      setShowProvisionModal(false);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ tenant_id, reason }) => base44.functions.invoke("gdsTenantEngine", { action: "suspend", tenant_id, reason }).then(r => r.data.result),
    onSuccess: () => {
      toast.success("Tenant suspended");
      qc.invalidateQueries(["tenants"]);
      setSelectedTenant(null);
      setSuspendReason("");
    },
  });

  const recoverMutation = useMutation({
    mutationFn: ({ tenant_id, reason, strategy }) => base44.functions.invoke("gdsTenantEngine", { action: "recover", tenant_id, reason, strategy }).then(r => r.data.result),
    onSuccess: () => {
      toast.success("Tenant recovery initiated");
      qc.invalidateQueries(["tenants", "tenant-metrics"]);
      setSelectedTenant(null);
    },
  });

  const m = metrics || {};
  const planData = Object.entries(m.subscriptions?.by_plan || {}).map(([plan, count]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    value: count,
    color: PLAN_COLORS[plan] || MUTED
  }));

  const formatMRR = (mrr) => {
    if (!mrr) return "$0";
    return mrr >= 1000 ? `$${(mrr / 1000).toFixed(1)}K/mo` : `$${mrr}/mo`;
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tenants" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Building2 className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Multi-Tenant Administration Center</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>15-stage provisioning · 13-stage isolation · Tenant lifecycle · Boundary enforcement</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>EDP-014 v1.0</span>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${LOW}10`, border: `1px solid ${LOW}30` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: LOW }} />
            <span className="text-[10px] font-black" style={{ color: LOW }}>LIVE</span>
          </div>
        </div>
        <button
          onClick={() => setShowProvisionModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          <Plus className="w-4 h-4" />
          Provision New Tenant
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tenants</p>
          <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{m.tenants?.total ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-xl font-black font-mono" style={{ color: LOW }}>{m.tenants?.active ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Suspended</p>
          <p className="text-xl font-black font-mono" style={{ color: (m.tenants?.suspended ?? 0) > 0 ? DANGER : MUTED }}>{m.tenants?.suspended ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>MRR</p>
          <p className="text-xl font-black font-mono" style={{ color: LOW }}>{formatMRR(m.subscriptions?.mrr_usd)}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Feature Flags</p>
          <p className="text-xl font-black font-mono" style={{ color: CYAN }}>{m.feature_flags?.total_enabled ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Violations Blocked</p>
          <p className="text-xl font-black font-mono" style={{ color: (m.isolation?.violations_blocked ?? 0) > 0 ? DANGER : MUTED }}>{m.isolation?.violations_blocked ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Provisioning Jobs</p>
          <p className="text-xl font-black font-mono" style={{ color: "#60a5fa" }}>{m.provisioning?.total_jobs ?? 0}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Recoveries</p>
          <p className="text-xl font-black font-mono" style={{ color: "#14b8a6" }}>{m.recoveries?.total ?? 0}</p>
        </Card>
      </div>

      {/* Plan Distribution Chart */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Plan Distribution</h3>
        {planData.length === 0 ? (
          <EmptyState icon={Building2} title="No subscription data" description="Tenant subscriptions will appear here" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={planData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis type="number" stroke={MUTED} fontSize={10} />
              <YAxis dataKey="name" type="category" stroke={MUTED} fontSize={9} width={100} />
              <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {planData.map((entry, i) => (<rect key={i} fill={entry.color} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Tenants Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Tenants</h3>
        {isLoading ? <Skeleton lines={6} /> : tenants?.length === 0 ? (
          <EmptyState icon={Building2} title="No tenants" description="Provision your first tenant to get started" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Domain", "Plan", "Owner", "MFA", "SSO", "Max Users", "Max Agents", "Status", "Created", "Actions"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants?.map(tenant => (
                  <tr key={tenant.tenant_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-bold" style={{ color: TEXT }}>{tenant.name}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{tenant.domain}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: PLAN_COLORS[tenant.plan], background: `${PLAN_COLORS[tenant.plan]}18`, border: `1px solid ${PLAN_COLORS[tenant.plan]}30` }}>
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{tenant.owner_email}</td>
                    <td className="py-2 px-3">{tenant.mfa_required ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                    <td className="py-2 px-3">{tenant.sso_enabled ? <Shield className="w-3.5 h-3.5 text-blue-400" /> : <span className="text-[10px]" style={{ color: MUTED }}>No</span>}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{tenant.max_users}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{tenant.max_agents}</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${tenant.status === 'active' ? 'bg-green-400/15 text-green-400' : tenant.status === 'suspended' ? 'bg-red-400/15 text-red-400' : tenant.status === 'trial' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-gray-400/15 text-gray-400'}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{timeAgo(tenant.created_date)}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedTenant(tenant)} className="text-[10px] px-2 py-0.5 rounded" style={{ color: CYAN, background: `${CYAN}15` }}>Configure</button>
                        {tenant.status === 'active' && (
                          <button onClick={() => { setSelectedTenant(tenant); setSuspendReason(""); }} className="text-[10px] px-2 py-0.5 rounded" style={{ color: DANGER, background: `${DANGER}15` }}>Suspend</button>
                        )}
                        {tenant.status === 'suspended' && (
                          <button onClick={() => { setSelectedTenant(tenant); recoverMutation.mutate({ tenant_id: tenant.tenant_id, reason: 'manual', strategy: 'full_restore' }); }} className="text-[10px] px-2 py-0.5 rounded" style={{ color: HIGH, background: `${HIGH}15` }}>Recover</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Provision Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}`, maxHeight: "90vh", overflow: "auto" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white">Provision New Tenant</h2>
              <button onClick={() => setShowProvisionModal(false)} className="hover:text-white transition-colors" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); provisionMutation.mutate(Object.fromEntries(new FormData(e.target))); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Name</label><input name="name" required className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} /></div>
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Domain</label><input name="domain" required className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} /></div>
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Plan</label><select name="plan" required className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}><option value="enterprise">Enterprise</option><option value="professional">Professional</option><option value="starter">Starter</option><option value="mssp">MSSP</option><option value="free">Free</option></select></div>
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Admin Email</label><input name="admin_email" type="email" required className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} /></div>
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Region</label><select name="region" required className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}><option value="us">US</option><option value="eu">EU</option><option value="ap">AP</option></select></div>
                <div><label className="text-xs font-bold mb-1 block" style={{ color: MUTED }}>Data Residency</label><select name="data_residency" className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}><option value="us">US</option><option value="eu">EU</option><option value="uk">UK</option><option value="global">Global</option></select></div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="mfa_required" className="rounded" /> MFA Required</label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="white_label" className="rounded" /> White Label</label>
              </div>
              <button type="submit" disabled={provisionMutation.isPending} className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                {provisionMutation.isPending ? 'Provisioning...' : 'Provision Tenant'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {selectedTenant && suspendReason !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <h2 className="text-base font-black text-white">Suspend Tenant: {selectedTenant.name}</h2>
            <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} placeholder="Reason for suspension..." className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }} rows={4} />
            <div className="flex items-center gap-2">
              <button onClick={() => { setSelectedTenant(null); setSuspendReason(""); }} className="flex-1 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,0.04)", color: MUTED }}>Cancel</button>
              <button onClick={() => suspendMutation.mutate({ tenant_id: selectedTenant.tenant_id, reason: suspendReason })} disabled={!suspendReason} className="flex-1 py-2 rounded-xl text-sm font-bold disabled:opacity-50" style={{ background: `${DANGER}15`, border: `1px solid ${DANGER}40`, color: DANGER }}>Suspend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}