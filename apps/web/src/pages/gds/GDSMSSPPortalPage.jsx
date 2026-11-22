import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, X, Plus, CheckCircle, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  SevBadge, Skeleton, Breadcrumb, Card, PAGE_BG, TOOLTIP_STYLE
} from "@/components/gds/GDSOSShared";

const TIER_COLOR = { Enterprise: CYAN, Professional: MEDIUM, Starter: LOW };
const STATUS_COLOR = { active: LOW, onboarding: MEDIUM, inactive: MUTED };
const SLICE_COLORS = [CYAN, DANGER, LOW, HIGH, MEDIUM, "#8b5cf6", "#f97316"];

function GradeColor(g) { return { A: LOW, B: CYAN, C: MEDIUM, D: HIGH, F: DANGER }[g] || MUTED; }

function RiskGauge({ score }) {
  const color = score >= 75 ? DANGER : score >= 50 ? MEDIUM : LOW;
  const r = 16, circ = 2 * Math.PI * r;
  return (
    <svg width={40} height={40} viewBox="0 0 40 40">
      <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <circle cx={20} cy={20} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 20 20)" />
      <text x={20} y={24} fill={color} fontSize={10} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score}</text>
    </svg>
  );
}

function PosturePanel({ tenantId, onClose }) {
  const [data, setData] = useState(null);
  React.useEffect(() => {
    base44.functions.invoke("gdsMSSPMultiTenant", { action: "tenant_posture", tenant_id: tenantId })
      .then(r => setData(r.data)).catch(() => {});
  }, [tenantId]);
  if (!data) return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-lg p-6" style={{ background: "#050e1f", borderRadius: 16, border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
        <Skeleton lines={5} />
      </div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-lg p-6 space-y-4 overflow-y-auto max-h-[90vh]" style={{ background: "#050e1f", borderRadius: 16, border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">{data.tenant?.name} — Posture</h2>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: MUTED }} /></button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[["Critical", data.findings_by_severity?.critical, DANGER], ["High", data.findings_by_severity?.high, HIGH], ["Coverage", `${data.coverage_pct}%`, CYAN]].map(([l, v, c]) => (
            <div key={l} className="p-3 rounded-xl text-center" style={{ background: `${c}08`, border: `1px solid ${c}30` }}>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>{l}</p>
              <p className="text-xl font-black font-mono" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Top Risks</p>
          {data.top_risks?.map((r, i) => <p key={i} className="text-xs mb-1" style={{ color: DANGER }}>⚠ {r}</p>)}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Recommendations</p>
          {data.recommendations?.map((r, i) => <p key={i} className="text-xs mb-1" style={{ color: LOW }}>→ {r}</p>)}
        </div>
      </div>
    </div>
  );
}

function ProvisionPanel({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", domain: "", tier: "Professional", industry: "Technology", analyst_email: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const provision = async () => {
    setLoading(true);
    try { const r = await base44.functions.invoke("gdsMSSPMultiTenant", { action: "provision", ...form }); setResult(r.data); onSuccess?.(); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md p-6 space-y-4" style={{ background: "#050e1f", borderRadius: 16, border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Provision Tenant</h2>
          <button onClick={onClose}><X className="w-4 h-4" style={{ color: MUTED }} /></button>
        </div>
        {!result ? (
          <div className="space-y-3">
            {[["name", "Organisation Name"], ["domain", "Domain (e.g. client.com)"], ["analyst_email", "Analyst Email"]].map(([k, label]) => (
              <input key={k} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} placeholder={label}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#020817", border: `1px solid ${BORDER}`, color: TEXT }} />
            ))}
            <select value={form.tier} onChange={e => setForm(p => ({ ...p, tier: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#020817", border: `1px solid ${BORDER}`, color: TEXT }}>
              {["Starter", "Professional", "Enterprise"].map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "#020817", border: `1px solid ${BORDER}`, color: TEXT }}>
              {["Technology", "Finance", "Healthcare", "Retail", "Government", "Other"].map(i => <option key={i}>{i}</option>)}
            </select>
            <button onClick={provision} disabled={loading || !form.name || !form.domain}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: CYAN }}>
              {loading ? "Provisioning…" : "Provision Tenant"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2" style={{ color: LOW }}><CheckCircle className="w-5 h-5" /><span className="font-bold">Tenant Provisioned</span></div>
            <p className="text-xs font-mono" style={{ color: MUTED }}>ID: {result.tenant_id}</p>
            {result.onboarding_steps?.map(s => (
              <div key={s.step} className="flex items-center gap-2 text-xs">
                <span style={{ color: s.status === 'done' ? LOW : MUTED }}>{s.status === 'done' ? '✓' : '○'}</span>
                <span style={{ color: s.status === 'done' ? TEXT : MUTED }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GDSMSSPPortalPage() {
  const [activeTab, setActiveTab] = useState("tenants");
  const [slaData, setSlaData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [tabLoading, setTabLoading] = useState({});
  const [postureId, setPostureId] = useState(null);
  const [showProvision, setShowProvision] = useState(false);

  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ["gds-mssp-tenants"],
    queryFn: () => base44.functions.invoke("gdsMSSPMultiTenant", { action: "list_tenants" }).then(r => r.data),
  });

  const load = async (tab, act, setter) => {
    setTabLoading(p => ({ ...p, [tab]: true }));
    try { const r = await base44.functions.invoke("gdsMSSPMultiTenant", { action: act }); setter(r.data); }
    catch (e) { console.error(e); } finally { setTabLoading(p => ({ ...p, [tab]: false })); }
  };

  const handleTab = (tab) => {
    setActiveTab(tab);
    if (tab === "sla" && !slaData) load("sla", "sla_report", setSlaData);
    if (tab === "analytics" && !analyticsData) load("analytics", "analytics", setAnalyticsData);
  };

  const stats = listData?.stats || {};
  const tenants = listData?.tenants || [];

  const TIERS = [
    { name: "Starter", price: "$499/mo", features: ["5 Cloud Accounts", "Weekly Reports", "Email Support", "Basic SAST/SCA"] },
    { name: "Professional", price: "$1,499/mo", features: ["25 Cloud Accounts", "Daily Reports", "Slack Alerts", "Full SAST/SCA/DAST", "SLA Tracking"] },
    { name: "Enterprise", price: "$4,999/mo", features: ["Unlimited Accounts", "Real-time Reports", "Dedicated Analyst", "AI Auto-Triage", "4h SLA", "Board Reports"] },
  ];

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "MSSP Portal" }]} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">MSSP Multi-Tenant Portal</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Manage client tenants, SLAs, and portfolio health</p>
        </div>
        <button onClick={() => setShowProvision(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-80"
          style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
          <Plus className="w-4 h-4" />Provision Tenant
        </button>
      </div>

      {/* Portfolio stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Total Tenants", value: stats.total, color: CYAN },
          { label: "Active", value: stats.active, color: LOW },
          { label: "Onboarding", value: stats.onboarding, color: MEDIUM },
          { label: "SLA Breached", value: stats.sla_breached, color: DANGER },
          { label: "MRR", value: `$${((stats.mrr || 0) / 1000).toFixed(1)}k`, color: CYAN },
          { label: "ARR", value: `$${((stats.arr || 0) / 1000).toFixed(0)}k`, color: LOW },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-xl font-black font-mono" style={{ color }}>{value ?? "—"}</p>
          </Card>
        ))}
      </div>

      <div className="flex border-b flex-wrap" style={{ borderColor: BORDER }}>
        {[["tenants", "Tenant List"], ["sla", "SLA Report"], ["analytics", "Analytics"], ["tiers", "Tiers"]].map(([id, label]) => (
          <button key={id} onClick={() => handleTab(id)}
            className="px-5 py-3 text-xs font-bold transition-all"
            style={{ color: activeTab === id ? CYAN : MUTED, borderBottom: activeTab === id ? `2px solid ${CYAN}` : "2px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "tenants" && (
        isLoading ? <Skeleton lines={5} /> : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Name", "Domain", "Tier", "Status", "Risk", "Grade", "Crit", "High", "SLA", "Analyst", "Actions"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${BORDER}15`, background: t.sla_status === 'BREACHED' ? `${DANGER}05` : undefined }}>
                      <td className="py-3 px-3 font-bold text-white">{t.name}</td>
                      <td className="py-3 px-3 font-mono text-[10px]" style={{ color: MUTED }}>{t.domain}</td>
                      <td className="py-3 px-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: TIER_COLOR[t.tier] || MUTED, background: `${TIER_COLOR[t.tier] || MUTED}15` }}>{t.tier}</span></td>
                      <td className="py-3 px-3"><span className="text-[10px] capitalize" style={{ color: STATUS_COLOR[t.status] || MUTED }}>{t.status}</span></td>
                      <td className="py-3 px-3"><RiskGauge score={t.risk_score} /></td>
                      <td className="py-3 px-3"><span className="text-base font-black" style={{ color: GradeColor(t.grade) }}>{t.grade}</span></td>
                      <td className="py-3 px-3 font-mono font-black" style={{ color: t.critical > 0 ? DANGER : LOW }}>{t.critical}</td>
                      <td className="py-3 px-3 font-mono" style={{ color: t.high > 0 ? HIGH : MUTED }}>{t.high}</td>
                      <td className="py-3 px-3"><span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: t.sla_status === 'BREACHED' ? DANGER : LOW, background: t.sla_status === 'BREACHED' ? `${DANGER}15` : `${LOW}15` }}>{t.sla_status}</span></td>
                      <td className="py-3 px-3 text-[10px]" style={{ color: MUTED }}>{t.analyst}</td>
                      <td className="py-3 px-3">
                        <button onClick={() => setPostureId(t.id)} className="text-[10px] px-2 py-1 rounded mr-1 hover:opacity-80 transition-all" style={{ background: `${CYAN}15`, color: CYAN }}>Posture</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {activeTab === "sla" && (
        tabLoading.sla ? <Skeleton lines={4} /> : !slaData ? <div /> : (
          <Card className="overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                  {["Tenant", "Tier", "Critical SLA", "High SLA", "Breaches", "Compliance"].map(h => (
                    <th key={h} className="text-left py-2 px-4 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slaData.tenants?.map((t, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}15` }}>
                    <td className="py-3 px-4 font-bold text-white">{t.name}</td>
                    <td className="py-3 px-4"><span className="text-[10px] font-bold" style={{ color: TIER_COLOR[t.tier] || MUTED }}>{t.tier}</span></td>
                    <td className="py-3 px-4 font-mono" style={{ color: CYAN }}>{t.critical_sla_hours}h</td>
                    <td className="py-3 px-4 font-mono" style={{ color: MUTED }}>{t.high_sla_hours}h</td>
                    <td className="py-3 px-4 font-mono font-black" style={{ color: t.breaches > 0 ? DANGER : LOW }}>{t.breaches}</td>
                    <td className="py-3 px-4"><span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: t.compliance === 'BREACHED' ? DANGER : LOW, background: t.compliance === 'BREACHED' ? `${DANGER}15` : `${LOW}15` }}>{t.compliance}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {activeTab === "analytics" && (
        tabLoading.analytics ? <Skeleton lines={3} /> : !analyticsData ? <div /> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Avg Risk Score", value: analyticsData.avg_risk_score, color: MEDIUM },
                { label: "Total Critical", value: analyticsData.total_critical, color: DANGER },
                { label: "SLA Breaches", value: analyticsData.total_sla_breaches, color: DANGER },
                { label: "MRR", value: `$${((analyticsData.mrr || 0) / 1000).toFixed(1)}k`, color: CYAN },
                { label: "ARR", value: `$${((analyticsData.arr || 0) / 1000).toFixed(0)}k`, color: LOW },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 text-center">
                  <p className="text-[9px]" style={{ color: MUTED }}>{label}</p>
                  <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-2">By Industry</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={analyticsData.by_industry} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                      {analyticsData.by_industry?.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-5">
                <h3 className="text-sm font-bold text-white mb-2">By Tier</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={analyticsData.by_tier} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                      {analyticsData.by_tier?.map((_, i) => <Cell key={i} fill={[CYAN, MEDIUM, LOW][i] || MUTED} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )
      )}

      {activeTab === "tiers" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((t, i) => {
            const tc = TIER_COLOR[t.name] || MUTED;
            return (
              <Card key={i} className="p-5" style={{ borderTop: `3px solid ${tc}` }}>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-lg font-black text-white">{t.name}</h3>
                  <span className="text-sm font-black font-mono" style={{ color: tc }}>{t.price}</span>
                </div>
                <div className="space-y-2">
                  {t.features.map(f => <p key={f} className="text-xs" style={{ color: MUTED }}>✓ {f}</p>)}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {postureId && <PosturePanel tenantId={postureId} onClose={() => setPostureId(null)} />}
      {showProvision && <ProvisionPanel onClose={() => setShowProvision(false)} onSuccess={() => { setShowProvision(false); refetch(); }} />}
    </div>
  );
}