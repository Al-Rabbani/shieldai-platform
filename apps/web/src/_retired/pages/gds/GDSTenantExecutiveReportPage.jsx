import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Download, TrendingUp, DollarSign, Users, Activity } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, EmptyState, Breadcrumb } from "@/components/gds/GDSOSShared";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function GDSTenantExecutiveReportPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.filter({}).catch(() => []),
  });

  const { data: usageRecords } = useQuery({
    queryKey: ["tenant-usage"],
    queryFn: () => base44.entities.TenantResourceUsage.filter({}).catch(() => []),
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["tenant-subscriptions"],
    queryFn: () => base44.entities.TenantSubscription.filter({}).catch(() => []),
  });

  const PLAN_PRICES = { enterprise: 5000, professional: 2000, starter: 500, mssp: 3000, free: 0 };

  // Aggregate data
  const tenantMap = new Map();
  tenants?.forEach(t => {
    const sub = subscriptions?.find(s => s.tenant_id === t.tenant_id);
    const usage = usageRecords?.filter(u => u.tenant_id === t.tenant_id) || [];
    const latestUsage = usage.length > 0 ? usage.reduce((latest, current) => 
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    ) : null;
    
    tenantMap.set(t.tenant_id, {
      tenant: t,
      subscription: sub,
      usage: latestUsage,
    });
  });

  // Calculate totals
  const totalRevenue = Array.from(tenantMap.values()).reduce((sum, { subscription }) => {
    return sum + (PLAN_PRICES[subscription?.plan] || 0);
  }, 0);

  const totalOverage = Array.from(tenantMap.values()).reduce((sum, { usage }) => {
    if (!usage) return sum;
    const computeOver = Math.max(0, usage.compute_units_used - (usage.compute_units_limit || 1000)) * 0.10;
    const storageOver = Math.max(0, usage.storage_mb_used - (usage.storage_mb_limit || 10240)) * 0.05;
    const apiOver = Math.max(0, usage.api_calls - (usage.api_calls_limit || 10000)) * 0.001;
    return sum + computeOver + storageOver + apiOver;
  }, 0);

  // Chart data
  const planDistribution = Object.entries(
    Array.from(tenantMap.values()).reduce((acc, { subscription }) => {
      const plan = subscription?.plan || 'free';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {})
  ).map(([plan, count]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    value: count,
    color: plan === 'enterprise' ? '#8b5cf6' : plan === 'professional' ? '#06b6d4' : plan === 'mssp' ? '#f59e0b' : plan === 'starter' ? '#10b981' : '#64748b'
  }));

  const resourceUsageData = Array.from(tenantMap.values())
    .slice(0, 10)
    .map(({ tenant, usage }) => ({
      name: tenant.name.slice(0, 12),
      compute: usage?.compute_units_used || 0,
      storage: Math.round((usage?.storage_mb_used || 0) / 1024), // GB
      api: Math.round((usage?.api_calls || 0) / 1000), // thousands
    }));

  const exportPDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("GDS OS - Executive Summary Report", 14, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Period: ${new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);
    
    // Line
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);
    
    // Executive Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Executive Summary", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const summary = [
      `Total Active Tenants: ${tenants?.length || 0}`,
      `Total Monthly Revenue: $${totalRevenue.toFixed(2)}`,
      `Estimated Overage Revenue: $${totalOverage.toFixed(2)}`,
      `Total Compute Units: ${Array.from(tenantMap.values()).reduce((sum, { usage }) => sum + (usage?.compute_units_used || 0), 0).toLocaleString()}`,
      `Total Storage: ${Math.round(Array.from(tenantMap.values()).reduce((sum, { usage }) => sum + (usage?.storage_mb_used || 0), 0) / 1024)} GB`,
      `Total API Calls: ${Array.from(tenantMap.values()).reduce((sum, { usage }) => sum + (usage?.api_calls || 0), 0).toLocaleString()}`,
    ];
    
    summary.forEach((line, i) => {
      doc.text(line, 14, 62 + (i * 6));
    });
    
    // Plan Distribution
    doc.setFont("helvetica", "bold");
    doc.text("Plan Distribution", 14, 110);
    doc.setFont("helvetica", "normal");
    planDistribution.forEach((p, i) => {
      doc.text(`${p.name}: ${p.value} tenants`, 14, 120 + (i * 6));
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("© 2026 Global Digital Security. Confidential.", 14, 280);
    
    doc.save(`executive-report-${selectedMonth}-${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Executive Report" }]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <BarChart className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">Monthly Executive Report</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Tenant resource consumption & billing summary</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}>
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80" style={{ background: `${LOW}15`, border: `1px solid ${LOW}40`, color: LOW }}>
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-2" style={{ color: CYAN }} />
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total Tenants</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{tenants?.length || 0}</p>
        </Card>
        <Card className="p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-2" style={{ color: LOW }} />
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Monthly Revenue</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>${totalRevenue.toFixed(0)}</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-2" style={{ color: CYAN }} />
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Overage Revenue</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>${totalOverage.toFixed(0)}</p>
        </Card>
        <Card className="p-4 text-center">
          <Activity className="w-5 h-5 mx-auto mb-2" style={{ color: HIGH }} />
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Compute Units</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{Array.from(tenantMap.values()).reduce((sum, { usage }) => sum + (usage?.compute_units_used || 0), 0).toLocaleString()}</p>
        </Card>
        <Card className="p-4 text-center">
          <DollarSign className="w-5 h-5 mx-auto mb-2" style={{ color: MUTED }} />
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Storage (GB)</p>
          <p className="text-2xl font-black font-mono" style={{ color: TEXT }}>{Math.round(Array.from(tenantMap.values()).reduce((sum, { usage }) => sum + (usage?.storage_mb_used || 0), 0) / 1024)}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Distribution */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Tenant Distribution by Plan</h3>
          {planDistribution.length === 0 ? (
            <EmptyState icon={Users} title="No tenant data" description="Tenant plans will appear here" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={planDistribution} cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, value }) => `${name}: ${value}`} />
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Resource Usage */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Top 10 Tenants by Resource Usage</h3>
          {resourceUsageData.length === 0 ? (
            <EmptyState icon={Activity} title="No usage data" description="Resource metrics will appear here" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={resourceUsageData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" stroke={MUTED} fontSize={9} />
                <YAxis stroke={MUTED} fontSize={9} />
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: TEXT }} />
                <Bar dataKey="compute" name="Compute" fill={CYAN} radius={[3, 3, 0, 0]} />
                <Bar dataKey="storage" name="Storage (GB)" fill={HIGH} radius={[3, 3, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Tenant Details - Resource Consumption & Billing</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Tenant", "Plan", "Email", "Compute", "Storage", "API Calls", "Base Price", "Overage", "Total"].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(tenantMap.values()).map(({ tenant, subscription, usage }) => {
                const basePrice = PLAN_PRICES[subscription?.plan] || 0;
                const computeOver = usage ? Math.max(0, usage.compute_units_used - (usage.compute_units_limit || 1000)) * 0.10 : 0;
                const storageOver = usage ? Math.max(0, usage.storage_mb_used - (usage.storage_mb_limit || 10240)) * 0.05 : 0;
                const apiOver = usage ? Math.max(0, usage.api_calls - (usage.api_calls_limit || 10000)) * 0.001 : 0;
                const totalOverage = computeOver + storageOver + apiOver;
                
                return (
                  <tr key={tenant.tenant_id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 text-[10px] font-bold" style={{ color: TEXT }}>{tenant.name}</td>
                    <td className="py-2 px-3"><span className="text-[10px] px-1.5 py-0.5 rounded uppercase" style={{ color: subscription?.plan === 'enterprise' ? '#8b5cf6' : subscription?.plan === 'professional' ? '#06b6d4' : subscription?.plan === 'mssp' ? '#f59e0b' : subscription?.plan === 'starter' ? '#10b981' : '#64748b', background: `${subscription?.plan === 'enterprise' ? '#8b5cf6' : subscription?.plan === 'professional' ? '#06b6d4' : subscription?.plan === 'mssp' ? '#f59e0b' : subscription?.plan === 'starter' ? '#10b981' : '#64748b'}15`, border: `1px solid ${subscription?.plan === 'enterprise' ? '#8b5cf6' : subscription?.plan === 'professional' ? '#06b6d4' : subscription?.plan === 'mssp' ? '#f59e0b' : subscription?.plan === 'starter' ? '#10b981' : '#64748b'}30` }}>{subscription?.plan || 'free'}</span></td>
                    <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{tenant.owner_email}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{usage?.compute_units_used || 0}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{Math.round(usage?.storage_mb_used || 0)} MB</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>{usage?.api_calls || 0}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: TEXT }}>${basePrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-[10px] font-mono" style={{ color: totalOverage > 0 ? HIGH : TEXT }}>${totalOverage.toFixed(2)}</td>
                    <td className="py-2 px-3 text-[10px] font-bold font-mono" style={{ color: LOW }}>${(basePrice + totalOverage).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}