import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, TrendingUp, Shield, DollarSign, Users, CheckCircle } from "lucide-react";
import { MSSPBreadcrumb, MSSPBanner, MSSPBadge, HealthScoreGauge, MSSP_PAGE_BG, MSSP_CARD, MSSP_TEAL, MSSP_GREEN, BORDER, MUTED, INDUSTRY_COLORS, TIER_COLORS, CHURN_COLORS, SEVERITY_COLORS } from "@/components/gds/MSSPShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatCurrency = (n) => `$${(n || 0).toLocaleString()}`;

export default function GDSMSSPPage() {
  const { data: customers = [] } = useQuery({ queryKey: ["mssp-customers"], queryFn: () => base44.entities.CustomerTenant.filter({ status: "active" }).catch(() => []) });
  const { data: subscriptions = [] } = useQuery({ queryKey: ["mssp-subs"], queryFn: () => base44.entities.Subscription.filter({ status: "active" }).catch(() => []) });
  const { data: incidents = [] } = useQuery({ queryKey: ["mssp-incidents"], queryFn: () => base44.entities.IncidentQueue.filter({ status: { $nin: ["resolved", "closed"] } }).catch(() => []) });
  const { data: services = [] } = useQuery({ queryKey: ["mssp-services"], queryFn: () => base44.entities.ManagedService.filter({ status: "active" }).catch(() => []) });
  const { data: slas = [] } = useQuery({ queryKey: ["mssp-slas"], queryFn: () => base44.entities.SLA.list().catch(() => []) });
  const { data: healthScores = [] } = useQuery({ queryKey: ["mssp-health"], queryFn: () => base44.entities.CustomerHealthScore.list().catch(() => []) });
  const { data: revenueReports = [] } = useQuery({ queryKey: ["mssp-revenue"], queryFn: () => base44.entities.RevenueReport.list("-period_end", 1).catch(() => []) });

  const mrr = subscriptions.reduce((s, sub) => s + (sub.mrr_usd || 0), 0);
  const arr = mrr * 12;
  const nrr = revenueReports[0]?.nrr_pct || 100;
  const p1p2 = incidents.filter(i => ["p1", "p2"].includes(i.severity)).length;
  const slaCompliance = slas.length > 0 ? (slas.filter(s => s.met).length / slas.length) * 100 : 100;
  const avgHealth = healthScores.length > 0 ? healthScores.reduce((s, h) => s + (h.overall_score || 0), 0) / healthScores.length : 0;

  return (
    <div style={MSSP_PAGE_BG}>
      <MSSPBreadcrumb items={[{ label: "Global Operations" }]} />
      <MSSPBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">MSSP GLOBAL OPERATIONS CENTER</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-002 · Business Command Center</p>
      </div>

      {/* REVENUE HERO */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="p-5" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_GREEN}40` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>MRR</p>
          <p className="text-4xl font-black font-mono" style={{ color: MSSP_GREEN }}>{formatCurrency(mrr)}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Monthly Recurring Revenue</p>
        </Card>
        <Card className="p-5" style={{ ...MSSP_CARD, border: `2px solid ${MSSP_TEAL}40` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>ARR</p>
          <p className="text-4xl font-black font-mono" style={{ color: MSSP_TEAL }}>{formatCurrency(arr)}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Annual Run Rate</p>
        </Card>
        <Card className="p-5" style={MSSP_CARD}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Total Customers</p>
          <p className="text-4xl font-black font-mono text-white">{customers.length}</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Active Subscriptions</p>
        </Card>
        <Card className="p-5" style={{ ...MSSP_CARD, border: `2px solid ${nrr >= 100 ? MSSP_GREEN : "#f97316"}40` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>NRR</p>
          <p className={`text-4xl font-black font-mono ${nrr >= 100 ? 'text-green-400' : 'text-amber-400'}`}>{nrr}%</p>
          <p className="text-[10px] mt-1" style={{ color: MUTED }}>Net Revenue Retention</p>
        </Card>
      </div>

      {/* SOC METRICS */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, borderColor: incidents.length > 20 ? "#dc262660" : MSSP_TEAL + "40" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Open Incidents</p>
          <p className={`text-3xl font-black ${incidents.length > 20 ? 'animate-pulse text-red-400' : 'text-white'}`}>{incidents.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, borderColor: p1p2 > 0 ? "#dc262660" : MSSP_TEAL + "40" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>P1/P2 Open</p>
          <p className={`text-3xl font-black ${p1p2 > 0 ? 'animate-pulse text-red-400' : 'text-white'}`}>{p1p2}</p>
        </Card>
        <Card className="p-4 text-center" style={MSSP_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Active Services</p>
          <p className="text-3xl font-black" style={{ color: MSSP_TEAL }}>{services.length}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, borderColor: slaCompliance >= 95 ? `${MSSP_GREEN}60` : slaCompliance >= 90 ? "#f59e0b60" : "#dc262660" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SLA Compliance</p>
          <p className={`text-3xl font-black ${slaCompliance >= 95 ? 'text-green-400' : slaCompliance >= 90 ? 'text-amber-400' : 'text-red-400'}`}>{Math.round(slaCompliance)}%</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...MSSP_CARD, borderColor: avgHealth >= 85 ? `${MSSP_GREEN}60` : avgHealth >= 70 ? "#f59e0b60" : "#dc262660" }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Health</p>
          <p className={`text-3xl font-black ${avgHealth >= 85 ? 'text-green-400' : avgHealth >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{Math.round(avgHealth)}</p>
        </Card>
      </div>

      {/* CUSTOMER LIST */}
      <Card className="p-5" style={MSSP_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Shield className="w-4 h-4" style={{ color: MSSP_TEAL }} />Active Customers</h3>
          <Link to="/mssp/customers" className="text-[10px] font-bold" style={{ color: MSSP_TEAL }}>Manage All →</Link>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
              <th className="pb-3">Customer</th>
              <th className="pb-3">Industry</th>
              <th className="pb-3">Tier</th>
              <th className="pb-3">Endpoints</th>
              <th className="pb-3">Services</th>
              <th className="pb-3">Health</th>
              <th className="pb-3">Churn Risk</th>
              <th className="pb-3">MRR</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {customers.slice(0, 10).map(customer => {
              const health = healthScores.find(h => h.customer_name === customer.customer_name);
              const sub = subscriptions.find(s => s.customer_name === customer.customer_name);
              const svcCount = services.filter(s => s.customer_name === customer.customer_name).length;
              return (
                <tr key={customer.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-semibold text-white">{customer.customer_name}</td>
                  <td className="py-3"><MSSPBadge color={INDUSTRY_COLORS[customer.industry] || MUTED}>{customer.industry || "general"}</MSSPBadge></td>
                  <td className="py-3"><MSSPBadge color={TIER_COLORS[customer.tier] || MUTED}>{customer.tier || "professional"}</MSSPBadge></td>
                  <td className="py-3 text-white">{customer.endpoints_count || 0}</td>
                  <td className="py-3 text-white">{svcCount}</td>
                  <td className="py-3"><HealthScoreGauge score={health?.overall_score || 0} size={40} /></td>
                  <td className="py-3"><MSSPBadge color={CHURN_COLORS[health?.churn_risk] || MUTED}>{health?.churn_risk || "low"}</MSSPBadge></td>
                  <td className="py-3 text-white font-mono">{formatCurrency(sub?.mrr_usd || 0)}</td>
                  <td className="py-3"><MSSPBadge color={MSSP_GREEN}>{customer.status || "active"}</MSSPBadge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}