import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Settings, Palette, Flag, Save, FileText, DollarSign, Zap, Download, Plus } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { toast } from "sonner";

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} className="relative inline-flex items-center w-10 h-5 rounded-full transition-colors flex-shrink-0" style={{ background: value ? CYAN : "rgba(255,255,255,0.1)" }}>
      <span className="inline-block w-4 h-4 rounded-full bg-white transition-transform shadow" style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }} />
    </button>
  );
}

export default function GDSTenantConfigurePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("configuration");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [billingMonth, setBillingMonth] = useState(new Date().getMonth() + 1);
  const [billingYear, setBillingYear] = useState(new Date().getFullYear());
  const [provisioningTenant, setProvisioningTenant] = useState("");
  const [provisioningResult, setProvisioningResult] = useState(null);

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.filter({}).catch(() => []),
  });

  const { data: configs } = useQuery({
    queryKey: ["tenant-configs", selectedTenant],
    queryFn: () => selectedTenant ? base44.entities.TenantConfiguration.filter({ tenant_id: selectedTenant }).catch(() => []) : Promise.resolve([]),
    enabled: !!selectedTenant,
  });

  const { data: branding } = useQuery({
    queryKey: ["tenant-branding", selectedTenant],
    queryFn: () => selectedTenant ? base44.entities.TenantBranding.filter({ tenant_id: selectedTenant }).catch(() => []) : Promise.resolve([]),
    enabled: !!selectedTenant,
  });

  const { data: featureFlags } = useQuery({
    queryKey: ["tenant-feature-flags", selectedTenant],
    queryFn: () => selectedTenant ? base44.entities.TenantFeatureFlag.filter({ tenant_id: selectedTenant }).catch(() => []) : Promise.resolve([]),
    enabled: !!selectedTenant,
  });

  const billingMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantBillingReport", data),
    onSuccess: (response) => {
      toast.success(`Billing report generated for ${response.report.period}`);
      setBillingReport(response.report);
    },
  });

  const provisionMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantProvisioningWorkflow", data),
    onSuccess: (response) => {
      setProvisioningResult(response);
      if (response.success) {
        toast.success(`Tenant ${response.tenant_id} provisioned successfully`);
      } else {
        toast.error(`Provisioning failed: ${response.error_message}`);
      }
      qc.invalidateQueries(["tenants"]);
    },
  });

  const [billingReport, setBillingReport] = useState(null);

  const handleProvision = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.mfa_required = formData.get('mfa_required') === 'on';
    data.white_label = formData.get('white_label') === 'on';
    provisionMutation.mutate(data);
  };

  const configureMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantEngine", { action: "configure", ...data }),
    onSuccess: () => {
      toast.success("Configuration updated");
      qc.invalidateQueries(["tenant-configs"]);
    },
  });

  const setFlagMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("gdsTenantEngine", { action: "set_feature_flag", ...data }),
    onSuccess: () => {
      toast.success("Feature flag updated");
      qc.invalidateQueries(["tenant-feature-flags"]);
    },
  });

  const config = configs?.[0];
  const brand = branding?.[0];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Tenant Configuration" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Settings className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Tenant Configuration & Branding</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Security policies, feature flags, branding settings</p>
          </div>
        </div>
        <select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="">Select tenant...</option>
          {tenants?.map(t => <option key={t.tenant_id} value={t.tenant_id}>{t.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b overflow-x-auto" style={{ borderColor: BORDER }}>
        {[
          { id: "configuration", label: "Configuration", icon: Settings },
          { id: "billing", label: "Billing Reports", icon: DollarSign },
          { id: "provisioning", label: "Provisioning", icon: Zap },
          { id: "branding", label: "Branding", icon: Palette },
          { id: "feature-flags", label: "Feature Flags", icon: Flag },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px whitespace-nowrap"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottomColor: activeTab === id ? CYAN : "transparent", background: activeTab === id ? `${CYAN}06` : "transparent" }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {!selectedTenant && <EmptyState icon={Settings} title="Select a tenant" description="Choose a tenant to configure" />}

      {/* Billing Reports Tab */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">Generate Monthly Billing Report</h3>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <select value={billingMonth} onChange={(e) => setBillingMonth(parseInt(e.target.value))} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <select value={billingYear} onChange={(e) => setBillingYear(parseInt(e.target.value))} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                {[2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button onClick={() => billingMutation.mutate({ month: billingMonth, year: billingYear })} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
              {billingReport && (
                <button onClick={() => {
                  const { jsPDF } = window.jspdf;
                  const doc = new jsPDF();
                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(18);
                  doc.text("GDS OS - Monthly Billing Report", 14, 20);
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(12);
                  doc.text(`Period: ${billingReport.period}`, 14, 30);
                  doc.setFontSize(10);
                  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);
                  doc.setLineWidth(0.5);
                  doc.line(14, 40, 196, 40);
                  doc.setFont("helvetica", "bold");
                  doc.text("Executive Summary", 14, 50);
                  doc.setFont("helvetica", "normal");
                  doc.text(`Total Tenants: ${billingReport.total_tenants}`, 14, 58);
                  doc.text(`Total Revenue: $${billingReport.total_revenue_usd.toFixed(2)}`, 14, 64);
                  doc.text(`Overage Revenue: $${billingReport.total_overage_revenue_usd.toFixed(2)}`, 14, 70);
                  doc.text(`Tenants with Overage: ${billingReport.tenants_with_overage}`, 14, 76);
                  doc.setFont("helvetica", "bold");
                  doc.text("Tenant Billing Details", 14, 88);
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(9);
                  let y = 96;
                  billingReport.tenant_details.forEach((t, i) => {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.text(`${t.tenant_name} (${t.plan})`, 14, y);
                    doc.text(`$${t.total_cost_usd.toFixed(2)}`, 140, y);
                    y += 6;
                  });
                  doc.save(`billing-report-${billingMonth}-${billingYear}.pdf`);
                }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              )}
            </div>
            {billingReport && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Card className="p-4 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tenants</p>
                  <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{billingReport.total_tenants}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Revenue</p>
                  <p className="text-2xl font-black font-mono" style={{ color: LOW }}>${billingReport.total_revenue_usd.toFixed(2)}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Overage Revenue</p>
                  <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>${billingReport.total_overage_revenue_usd.toFixed(2)}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Tenants with Overage</p>
                  <p className="text-2xl font-black font-mono" style={{ color: billingReport.tenants_with_overage > 0 ? HIGH : MUTED }}>{billingReport.tenants_with_overage}</p>
                </Card>
              </div>
            )}
          </Card>
          {billingReport && billingReport.tenant_details && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-white mb-4">Tenant Billing Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {["Tenant", "Plan", "Base Price", "Overage", "Total", "Email"].map(h => (
                        <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {billingReport.tenant_details.map((tenant, i) => (
                      <tr key={tenant.tenant_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 text-[10px] font-bold" style={{ color: TEXT }}>{tenant.tenant_name}</td>
                        <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{tenant.plan}</span></td>
                        <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>${tenant.base_price_usd.toFixed(2)}</td>
                        <td className="py-2 px-3 text-[10px] font-mono" style={{ color: tenant.total_overage_cost > 0 ? HIGH : TEXT }}>${tenant.total_overage_cost.toFixed(2)}</td>
                        <td className="py-2 px-3 text-[10px] font-bold font-mono" style={{ color: LOW }}>${tenant.total_cost_usd.toFixed(2)}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{tenant.owner_email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Provisioning Tab */}
      {activeTab === "provisioning" && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-4">Automated Tenant Provisioning</h3>
            <p className="text-xs mb-4" style={{ color: MUTED }}>Select a tenant in trial/suspended status to provision with full resource allocation and security policies</p>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <select value={provisioningTenant} onChange={(e) => setProvisioningTenant(e.target.value)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
                <option value="">Select tenant...</option>
                {tenants?.filter(t => t.status === 'trial' || t.status === 'suspended').map(t => (
                  <option key={t.tenant_id} value={t.tenant_id}>{t.name} ({t.status})</option>
                ))}
              </select>
              <button onClick={() => provisionMutation.mutate({ tenant_id: provisioningTenant })} disabled={!provisioningTenant} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
                <Plus className="w-4 h-4" />
                Provision Tenant
              </button>
            </div>
            {provisioningResult && (
              <div className={`p-4 rounded-xl ${provisioningResult.success ? 'bg-green-400/10 border-green-400/30' : 'bg-red-400/10 border-red-400/30'} border`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-3 h-3 rounded-full ${provisioningResult.success ? 'bg-green-400' : 'bg-red-400'}`} />
                  <p className={`text-sm font-bold ${provisioningResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {provisioningResult.success ? 'Provisioning Completed' : 'Provisioning Failed'}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Stages Completed</p>
                    <p className="text-sm font-mono" style={{ color: TEXT }}>{provisioningResult.stages_completed} / {provisioningResult.total_stages}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Progress</p>
                    <p className="text-sm font-mono" style={{ color: TEXT }}>{provisioningResult.progress_pct}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Duration</p>
                    <p className="text-sm font-mono" style={{ color: TEXT }}>{(provisioningResult.duration_ms / 1000).toFixed(2)}s</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Status</p>
                    <p className={`text-sm font-bold ${provisioningResult.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>{provisioningResult.status.toUpperCase()}</p>
                  </div>
                </div>
                {provisioningResult.steps && provisioningResult.steps.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase mb-2" style={{ color: MUTED }}>Provisioning Steps</p>
                    {provisioningResult.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${step.status === 'completed' ? 'bg-green-400' : step.status === 'running' ? 'bg-blue-400' : 'bg-red-400'}`} />
                        <span style={{ color: step.status === 'completed' ? LOW : step.status === 'running' ? CYAN : DANGER }}>
                          {step.name.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {!provisioningResult.success && provisioningResult.error_message && (
                  <div className="mt-3 p-3 rounded bg-red-400/10 border border-red-400/30">
                    <p className="text-xs text-red-400 font-mono">{provisioningResult.error_message}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === "configuration" && selectedTenant && config && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Security Configuration</h3>
            <div className="flex items-center justify-between"><span className="text-xs" style={{ color: MUTED }}>MFA Required</span><Toggle value={config.mfa_required} onChange={(v) => configureMutation.mutate({ tenant_id: selectedTenant, mfa_required: v })} /></div>
            <div className="flex items-center justify-between"><span className="text-xs" style={{ color: MUTED }}>SSO Enabled</span><Toggle value={config.sso_enabled} onChange={(v) => configureMutation.mutate({ tenant_id: selectedTenant, sso_enabled: v })} /></div>
            <div className="flex items-center justify-between"><span className="text-xs" style={{ color: MUTED }}>Auto Remediation</span><Toggle value={config.auto_remediation_enabled} onChange={(v) => configureMutation.mutate({ tenant_id: selectedTenant, auto_remediation_enabled: v })} /></div>
            <div className="flex items-center justify-between"><span className="text-xs" style={{ color: MUTED }}>AI Triage</span><Toggle value={config.ai_triage_enabled} onChange={(v) => configureMutation.mutate({ tenant_id: selectedTenant, ai_triage_enabled: v })} /></div>
          </Card>
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Compliance</h3>
            <div className="flex flex-wrap gap-2">
              {(config.compliance_frameworks || []).map(fw => (
                <span key={fw} className="text-[10px] px-2 py-1 rounded uppercase" style={{ color: CYAN, background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>{fw}</span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === "branding" && selectedTenant && brand && (
        <Card className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-4">Brand Identity</h3>
              <p className="text-xs" style={{ color: MUTED }}>Display Name: <span style={{ color: TEXT }}>{brand.display_name}</span></p>
              <p className="text-xs" style={{ color: MUTED }}>Portal Title: <span style={{ color: TEXT }}>{brand.portal_title}</span></p>
              <p className="text-xs" style={{ color: MUTED }}>Support Email: <span style={{ color: TEXT }}>{brand.support_email}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ background: brand.primary_color }}><span className="text-xs font-bold" style={{ color: "#020817" }}>{brand.display_name?.[0]}</span></div>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded" style={{ background: brand.primary_color }} /><span className="text-[10px]" style={{ color: MUTED }}>Primary</span></div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded" style={{ background: brand.secondary_color }} /><span className="text-[10px]" style={{ color: MUTED }}>Secondary</span></div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded" style={{ background: brand.accent_color }} /><span className="text-[10px]" style={{ color: MUTED }}>Accent</span></div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Feature Flags Tab */}
      {activeTab === "feature-flags" && selectedTenant && featureFlags && featureFlags.length > 0 && (
        <Card className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Flag Name", "Display Name", "Enabled", "Value", "Type", "Requires Plan", "Rollout", "Status"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureFlags.map(flag => (
                  <tr key={flag.flag_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{flag.flag_name}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: TEXT }}>{flag.display_name}</td>
                    <td className="py-2 px-3"><Toggle value={flag.is_enabled} onChange={(v) => setFlagMutation.mutate({ tenant_id: selectedTenant, flag_name: flag.flag_name, is_enabled: v })} /></td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: MUTED }}>{flag.flag_value || "—"}</td>
                    <td className="py-2 px-3 text-[10px] uppercase" style={{ color: MUTED }}>{flag.flag_type}</td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{flag.requires_plan || "—"}</td>
                    <td className="py-2 px-3">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${flag.rollout_percentage}%`, background: CYAN }} />
                      </div>
                    </td>
                    <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${flag.status === 'active' ? 'bg-green-400/15 text-green-400' : 'bg-gray-400/15 text-gray-400'}`}>{flag.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}