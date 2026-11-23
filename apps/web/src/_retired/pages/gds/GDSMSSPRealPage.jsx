import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Database, CheckCircle, AlertTriangle } from "lucide-react";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

const TIER_COLOR = { Enterprise: CYAN, Professional: MEDIUM, Starter: LOW };

export default function GDSMSSPRealPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "", tier: "Professional", industry: "Technology", analyst_email: "", account_id: "" });
  const [provisioning, setProvisioning] = useState(false);
  const [provisionResult, setProvisionResult] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["gds-mssp-real"],
    queryFn: () => base44.functions.invoke("gdsMSSPEngine", { action: "list_tenants" }).then(r => r.data),
  });

  const provision = async () => {
    setProvisioning(true); setProvisionResult(null);
    try {
      const r = await base44.functions.invoke("gdsMSSPEngine", { action: "provision", ...form });
      setProvisionResult(r.data);
      setForm({ name: "", domain: "", tier: "Professional", industry: "Technology", analyst_email: "", account_id: "" });
      refetch();
    } catch (e) { console.error(e); }
    finally { setProvisioning(false); }
  };

  const d = data || {};
  const platform = d.current_platform || {};
  const tenants = d.tenants || [];
  const isSingle = d.mode === 'single_tenant';
  const riskColor = platform.risk_score >= 75 ? DANGER : platform.risk_score >= 50 ? MEDIUM : LOW;

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "MSSP" }]} />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">MSSP Portal</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Multi-tenant security management — real entity database</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveDataBadge />
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80"
            style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
            <Plus className="w-4 h-4" />Provision Tenant
          </button>
        </div>
      </div>

      {/* Real data notice */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: `${CYAN}06`, border: `1px solid ${CYAN}30` }}>
        <Database className="w-4 h-4 flex-shrink-0" style={{ color: CYAN }} />
        <p className="text-xs" style={{ color: TEXT }}>
          <strong style={{ color: CYAN }}>Real Data:</strong> Tenants are stored in your entity database (Organization entity) and stats are pulled in real-time from live cloud scan data (TriagedFinding, CloudAccount entities).
        </p>
      </div>

      {/* Current platform stats */}
      {isLoading ? <Skeleton lines={2} /> : (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Current Platform — Live Scan Data</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Risk Score", value: platform.risk_score ?? "—", color: riskColor },
              { label: "Critical Open", value: platform.critical ?? 0, color: DANGER },
              { label: "High Open", value: platform.high ?? 0, color: HIGH },
              { label: "SLA Breached", value: platform.sla_breached ?? 0, color: platform.sla_breached > 0 ? DANGER : LOW },
              { label: "Cloud Accounts", value: platform.cloud_accounts ?? 0, color: CYAN },
            ].map(({ label, value, color }) => (
              <Card key={label} className="p-4 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Provision form */}
      {showForm && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Provision New Tenant</h3>
          {provisionResult?.success && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: `${LOW}12`, border: `1px solid ${LOW}40` }}>
              <CheckCircle className="w-4 h-4" style={{ color: LOW }} />
              <span className="text-xs font-bold" style={{ color: LOW }}>Tenant provisioned — stored in Organization entity (ID: {provisionResult.tenant_id?.slice(0, 8)}…)</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {[["name", "Organisation Name *"], ["domain", "Domain (e.g. client.com) *"], ["analyst_email", "Analyst Email"], ["account_id", "Account ID (optional)"]].map(([k, label]) => (
              <input key={k} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} placeholder={label}
                className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }} />
            ))}
            <select value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))}
              className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
              {["Starter", "Professional", "Enterprise"].map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
              className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT }}>
              {["Technology", "Finance", "Healthcare", "Retail", "Government", "Other"].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <button onClick={provision} disabled={provisioning || !form.name || !form.domain}
            className="px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
            {provisioning ? "Provisioning…" : "Provision & Save to Database"}
          </button>
        </Card>
      )}

      {/* Tenant list / single tenant message */}
      {isLoading ? <Skeleton lines={4} /> : isSingle && tenants.length === 0 ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: MEDIUM }} />
          <p className="text-sm font-bold text-white mb-1">Single-Tenant Mode</p>
          <p className="text-xs" style={{ color: MUTED }}>No MSSP tenants provisioned yet. Use the "Provision Tenant" button above to add clients. Each tenant is stored as an Organization entity record.</p>
        </Card>
      ) : tenants.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="p-4 border-b" style={{ borderColor: BORDER }}>
            <h3 className="text-sm font-bold text-white">Tenants <span className="text-[10px] ml-2" style={{ color: MUTED }}>(Organization entity · {tenants.length} records)</span></h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Name", "Domain", "Tier", "Industry", "Account ID", "Contact", "Created"].map(h => (
                    <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => (
                  <tr key={t.id || i} style={{ borderBottom: `1px solid ${BORDER}15` }}>
                    <td className="py-3 px-4 font-bold text-white">{t.name}</td>
                    <td className="py-3 px-4 font-mono text-[10px]" style={{ color: MUTED }}>{t.domain}</td>
                    <td className="py-3 px-4"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: TIER_COLOR[t.tier] || MUTED, background: `${TIER_COLOR[t.tier] || MUTED}15` }}>{t.tier || "—"}</span></td>
                    <td className="py-3 px-4" style={{ color: MUTED }}>{t.industry || "—"}</td>
                    <td className="py-3 px-4 font-mono text-[10px]" style={{ color: CYAN }}>{t.account_id || "—"}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: MUTED }}>{t.contact_email || "—"}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: MUTED }}>{timeAgo(t.created_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}