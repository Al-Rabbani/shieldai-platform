import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { invokeAction } from "@/lib/invokeAction";
import { buildLiveDataOverride } from "@/lib/liveDataOverride";
import RevenueTiles from "@/components/mssp/RevenueTiles";
import CustomerHealthGrid from "@/components/mssp/CustomerHealthGrid";
import ServicesTable from "@/components/mssp/ServicesTable";
import AIResponseModal from "@/components/shared/AIResponseModal";

export default function MSSPDashboardPage() {
  const [tenants, setTenants] = useState([]);
  const [healthScores, setHealthScores] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, h, r, s] = await Promise.all([
      base44.entities.CustomerTenant.list("-created_date", 50).catch(() => []),
      base44.entities.CustomerHealthScore.list("-scored_at", 50).catch(() => []),
      base44.entities.RevenueReport.list("-created_date", 1).catch(() => []),
      base44.entities.ManagedService.list("-created_date", 50).catch(() => []),
    ]);
    setTenants(t);
    setHealthScores(h);
    setRevenue(r[0] || null);
    setServices(s);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeCustomers = tenants.filter(t => t.status === "active").length;
  const hasRealData = tenants.length > 0 || services.length > 0 || !!revenue;
  const mrr = revenue?.mrr_usd ?? 0;
  const arr = revenue?.arr_usd ?? mrr * 12;
  const nrr = revenue?.nrr_pct ?? 0;
  const totalEndpoints = tenants.reduce((s, t) => s + (t.endpoints_count || 0), 0);

  const rows = tenants.map(tenant => ({
    tenant,
    health: healthScores.find(h => h.customer_tenant_id === tenant.id || h.customer_name === tenant.customer_name) || null,
    incidents30d: services.filter(s => s.customer_name === tenant.customer_name).reduce((sum, s) => sum + (s.incidents_30d || 0), 0),
  }));

  async function aiBriefing(row) {
    setModalTitle(`AI Briefing — ${row.tenant.customer_name}`);
    setModalLoading(true); setModalData(null);
    const h = row.health;
    const { liveDataOverride } = await buildLiveDataOverride().catch(() => ({ liveDataOverride: "" }));
    const result = await invokeAction("gdsAgentOS", {
      action: "command",
      command_type: "board_report",
      input: `Generate MSSP customer briefing for ${row.tenant.customer_name}: health=${h?.overall_score ?? "N/A"}/100 grade=${h?.grade ?? "N/A"} critical=${h?.open_critical_findings ?? 0} sla_breaches=${h?.sla_breaches_30d ?? 0}`,
      live_data_override: liveDataOverride,
    }).catch(e => ({ response: `Error: ${e.message}` }));
    setModalData(result);
    setModalLoading(false);
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">MSSP Command Centre</h1>
        {hasRealData && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">● Live Revenue: ${(mrr / 1000).toFixed(0)}K MRR</span>}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : !hasRealData ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-2xl mb-2">📊</p>
          <p className="text-sm font-bold text-white">No MSSP customers configured yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">This platform is currently operating in single-tenant mode. Connect your first customer tenant to begin multi-tenant MSSP operations.</p>
          <button className="mt-4 px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition">+ Onboard First Customer</button>
        </div>
      ) : (
        <>
          <RevenueTiles mrr={mrr} arr={arr} nrr={nrr} activeCustomers={activeCustomers} totalEndpoints={totalEndpoints} />
          <CustomerHealthGrid rows={rows} onBriefing={aiBriefing} />
          <h2 className="text-sm font-bold text-white mt-6 mb-2">Managed Services</h2>
          <ServicesTable services={services} />
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={modalLoading} response={modalData?.response} agentSteps={modalData?.agent_steps} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}