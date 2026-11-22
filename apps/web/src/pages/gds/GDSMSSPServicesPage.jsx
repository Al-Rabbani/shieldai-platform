import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, Activity } from "lucide-react";
import { MSSPBreadcrumb, MSSPBanner, MSSPBadge, HealthScoreGauge, MSSP_PAGE_BG, MSSP_CARD, MSSP_TEAL, MSSP_GREEN, BORDER, MUTED } from "@/components/gds/MSSPShared";
import { Card } from "@/components/gds/GDSOSShared";

const formatNumber = (n) => (n || 0).toLocaleString();

export default function GDSMSSPServicesPage() {
  const [activeTab, setActiveTab] = useState("catalog");
  const { data: servicePlans = [] } = useQuery({ queryKey: ["mssp-plans"], queryFn: () => base44.entities.ServicePlan.list().catch(() => []) });
  const { data: managedServices = [] } = useQuery({ queryKey: ["mssp-managed"], queryFn: () => base44.entities.ManagedService.filter({ status: "active" }).catch(() => []) });

  return (
    <div style={MSSP_PAGE_BG}>
      <MSSPBreadcrumb items={[{ label: "Service Catalog" }]} />
      <MSSPBanner />

      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">SERVICE CATALOG & ACTIVE SERVICES</h1>
        <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-002 · Service Management</p>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab("catalog")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "catalog" ? 'text-white' : ''}`} style={{ background: activeTab === "catalog" ? MSSP_TEAL : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "catalog" ? "#000" : MUTED }}>Service Catalog</button>
        <button onClick={() => setActiveTab("active")} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === "active" ? 'text-white' : ''}`} style={{ background: activeTab === "active" ? MSSP_TEAL : "transparent", border: `1px solid ${BORDER}`, color: activeTab === "active" ? "#000" : MUTED }}>Active Services</button>
      </div>

      {activeTab === "catalog" ? (
        <Card className="p-5" style={MSSP_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Plan Name</th>
                <th className="pb-3">Tier</th>
                <th className="pb-3">SOC Tier</th>
                <th className="pb-3">Response SLA</th>
                <th className="pb-3">Resolve SLA</th>
                <th className="pb-3">Price/Mo</th>
                <th className="pb-3">Active Customers</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {servicePlans.map(p => (
                <tr key={p.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-bold text-white">{p.plan_name}</td>
                  <td className="py-3"><MSSPBadge color={MUTED}>{p.tier || "professional"}</MSSPBadge></td>
                  <td className="py-3"><MSSPBadge color={MUTED}>{p.soc_tier || "ai_only"}</MSSPBadge></td>
                  <td className="py-3 text-white">{p.sla_response_minutes || 60}m</td>
                  <td className="py-3 text-white">{p.sla_resolve_hours || 4}h</td>
                  <td className="py-3 text-white font-mono">${p.price_month_usd || 0}</td>
                  <td className="py-3 text-white">{p.active_customers || 0}</td>
                  <td className="py-3"><MSSPBadge color={MSSP_GREEN}>{p.status || "active"}</MSSPBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-5" style={MSSP_CARD}>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Service Type</th>
                <th className="pb-3">Service Name</th>
                <th className="pb-3">Activated</th>
                <th className="pb-3">Events/30d</th>
                <th className="pb-3">Alerts/30d</th>
                <th className="pb-3">Uptime</th>
                <th className="pb-3">Health</th>
                <th className="pb-3">Automation</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {managedServices.map(s => (
                <tr key={s.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3"><MSSPBadge color={MUTED}>{s.customer_name}</MSSPBadge></td>
                  <td className="py-3"><MSSPBadge color={MSSP_TEAL}>{s.service_type || "managed"}</MSSPBadge></td>
                  <td className="py-3 text-white">{s.service_name || "Standard"}</td>
                  <td className="py-3" style={{ color: MUTED }}>{s.activated_at ? new Date(s.activated_at).toLocaleDateString() : "—"}</td>
                  <td className="py-3 text-white">{formatNumber(s.events_30d)}</td>
                  <td className="py-3 text-white">{formatNumber(s.alerts_30d)}</td>
                  <td className="py-3"><div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${s.uptime_pct || 0}%`, background: (s.uptime_pct || 0) > 99 ? MSSP_GREEN : "#f97316" }} /></div></td>
                  <td className="py-3"><HealthScoreGauge score={s.health_score || 0} size={32} /></td>
                  <td className="py-3"><div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${s.automation_rate_pct || 0}%`, background: (s.automation_rate_pct || 0) > 80 ? MSSP_GREEN : "#f97316" }} /></div></td>
                  <td className="py-3"><MSSPBadge color={s.status === "active" ? MSSP_GREEN : s.status === "degraded" ? "#f97316" : MUTED}>{s.status || "active"}</MSSPBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}