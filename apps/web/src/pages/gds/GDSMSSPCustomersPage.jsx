import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Filter, TrendingUp, AlertTriangle, Crown, Shield } from "lucide-react";
import { MSSPBreadcrumb, MSSPBanner, MSSPBadge, HealthScoreGauge, MSSP_PAGE_BG, MSSP_CARD, MSSP_TEAL, MSSP_GREEN, BORDER, MUTED, TEXT, INDUSTRY_COLORS, TIER_COLORS, CHURN_COLORS } from "@/components/gds/MSSPShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;
const countdown = (d) => {
  if (!d) return { text: "—", overdue: false };
  const diff = new Date(d) - new Date();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "OVERDUE", overdue: true };
  if (days === 0) return { text: "TODAY", overdue: false };
  if (days < 30) return { text: `${days}d`, overdue: days < 7 };
  if (days < 365) return { text: `${Math.round(days/30)}mo`, overdue: false };
  return { text: `${Math.round(days/365)}y`, overdue: false };
};

const isolationColor = (level) => {
  switch(level) {
    case "air_gapped": return "#dc2626";
    case "dedicated_cluster": return "#f97316";
    case "dedicated_namespace": return "#f59e0b";
    default: return "#6b7280";
  }
};

export default function GDSMSSPCustomersPage() {
  const { data: customers = [] } = useQuery({ queryKey: ["mssp-customers"], queryFn: () => base44.entities.CustomerTenant.list("-created_date", 200).catch(() => []) });
  const { data: healthScores = [] } = useQuery({ queryKey: ["mssp-health"], queryFn: () => base44.entities.CustomerHealthScore.list().catch(() => []) });
  const { data: subscriptions = [] } = useQuery({ queryKey: ["mssp-subs"], queryFn: () => base44.entities.Subscription.filter({ status: "active" }).catch(() => []) });
  const { data: services = [] } = useQuery({ queryKey: ["mssp-managed-services"], queryFn: () => base44.entities.ManagedService.filter({ status: "active" }).catch(() => []) });
  
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterChurn, setFilterChurn] = useState("");
  const [sortBy, setSortBy] = useState("mrr");

  const filtered = customers.filter(c => {
    const health = healthScores.find(h => h.customer_name === c.customer_name);
    if (filterIndustry && c.industry !== filterIndustry) return false;
    if (filterTier && c.tier !== filterTier) return false;
    if (filterChurn && health?.churn_risk !== filterChurn) return false;
    return true;
  }).sort((a, b) => {
    const ha = healthScores.find(h => h.customer_name === a.customer_name);
    const hb = healthScores.find(h => h.customer_name === b.customer_name);
    const sa = subscriptions.find(s => s.customer_name === a.customer_name);
    const sb = subscriptions.find(s => s.customer_name === b.customer_name);
    if (sortBy === "mrr") return (sb?.mrr_usd || 0) - (sa?.mrr_usd || 0);
    if (sortBy === "health") return (ha?.overall_score || 0) - (hb?.overall_score || 0);
    if (sortBy === "risk") return (hb?.risk_score || 0) - (ha?.risk_score || 0);
    return 0;
  });

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === "active").length,
    atRisk: healthScores.filter(h => ["high", "critical"].includes(h.churn_risk)).length,
    upsell: healthScores.filter(h => h.upsell_opportunity).length,
  };

  return (
    <div style={MSSP_PAGE_BG}>
      <MSSPBreadcrumb items={[{ label: "Customer Management" }]} />
      <MSSPBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">CUSTOMER MANAGEMENT</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-002 · Customer Success Platform</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: `${MSSP_TEAL}20`, border: `1px solid ${MSSP_TEAL}40`, color: MSSP_TEAL }}>
          <Shield className="w-4 h-4" /> Onboard New Customer
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={MSSP_CARD}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Customers</p><p className="text-3xl font-black" style={{ color: MSSP_TEAL }}>{stats.total}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_GREEN}40` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active</p><p className="text-3xl font-black" style={{ color: MSSP_GREEN }}>{stats.active}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid #dc262640` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>At-Risk</p><p className="text-3xl font-black text-red-400">{stats.atRisk}</p></Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, border: `2px solid #fbbf2440` }}><p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Upsell Opps</p><p className="text-3xl font-black" style={{ color: "#fbbf24" }}>{stats.upsell}</p></Card>
      </div>

      {/* FILTERS */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} className="text-xs px-3 py-2 rounded-lg" style={{ background: MSSP_CARD.background, border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="">All Industries</option>
          {Object.keys(INDUSTRY_COLORS).map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="text-xs px-3 py-2 rounded-lg" style={{ background: MSSP_CARD.background, border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="">All Tiers</option>
          {Object.keys(TIER_COLORS).map(tier => <option key={tier} value={tier}>{tier}</option>)}
        </select>
        <select value={filterChurn} onChange={e => setFilterChurn(e.target.value)} className="text-xs px-3 py-2 rounded-lg" style={{ background: MSSP_CARD.background, border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="">All Churn Risk</option>
          {Object.keys(CHURN_COLORS).map(risk => <option key={risk} value={risk}>{risk}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs px-3 py-2 rounded-lg" style={{ background: MSSP_CARD.background, border: `1px solid ${BORDER}`, color: TEXT }}>
          <option value="mrr">Sort by MRR (desc)</option>
          <option value="health">Sort by Health (asc)</option>
          <option value="risk">Sort by Risk (desc)</option>
        </select>
      </div>

      {/* TABLE */}
      <Card className="p-5" style={MSSP_CARD}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Domain</th>
              <th className="pb-3">Industry</th>
              <th className="pb-3">Tier</th>
              <th className="pb-3">Isolation</th>
              <th className="pb-3">Endpoints</th>
              <th className="pb-3">Cloud</th>
              <th className="pb-3">Services</th>
              <th className="pb-3">Health</th>
              <th className="pb-3">Churn</th>
              <th className="pb-3">MRR</th>
              <th className="pb-3">Contract End</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {filtered.map(customer => {
              const health = healthScores.find(h => h.customer_name === customer.customer_name);
              const sub = subscriptions.find(s => s.customer_name === customer.customer_name);
              const svcCount = services.filter(s => s.customer_name === customer.customer_name).length;
              const contractEnd = countdown(customer.contract_end_date);
              return (
                <tr key={customer.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-semibold text-white">{customer.customer_name}</td>
                  <td className="py-3" style={{ color: MUTED }}>{customer.customer_domain || "—"}</td>
                  <td className="py-3"><MSSPBadge color={INDUSTRY_COLORS[customer.industry] || MUTED}>{customer.industry || "general"}</MSSPBadge></td>
                  <td className="py-3"><MSSPBadge color={TIER_COLORS[customer.tier] || MUTED}>{customer.tier || "professional"}</MSSPBadge></td>
                  <td className="py-3"><MSSPBadge color={isolationColor(customer.isolation_level)}>{customer.isolation_level || "shared"}</MSSPBadge></td>
                  <td className="py-3 text-white">{customer.endpoints_count || 0}</td>
                  <td className="py-3 text-white">{customer.cloud_accounts_count || 0}</td>
                  <td className="py-3 text-white">{svcCount}</td>
                  <td className="py-3"><HealthScoreGauge score={health?.overall_score || 0} size={40} /></td>
                  <td className="py-3"><MSSPBadge color={CHURN_COLORS[health?.churn_risk] || MUTED}>{health?.churn_risk || "low"}</MSSPBadge></td>
                  <td className="py-3 text-white font-mono">{formatCurrency(sub?.mrr_usd || 0)}</td>
                  <td className={`py-3 font-mono ${contractEnd.overdue ? 'text-red-400 font-bold' : 'text-white'}`}>{contractEnd.text}</td>
                  <td className="py-3"><MSSPBadge color={customer.status === "active" ? MSSP_GREEN : MUTED}>{customer.status || "active"}</MSSPBadge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}