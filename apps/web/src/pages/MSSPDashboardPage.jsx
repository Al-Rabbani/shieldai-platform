import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import RevenueTiles from "@/components/mssp/RevenueTiles";
import CustomerHealthGrid from "@/components/mssp/CustomerHealthGrid";
import ServicesTable from "@/components/mssp/ServicesTable";
import AIResponseModal from "@/components/shared/AIResponseModal";

/**
 * MSSP Command Centre, reading the provider surface the platform actually serves.
 *
 * What this page used to do, and why it was rewritten: it read four entity names - CustomerTenant,
 * CustomerHealthScore, RevenueReport, ManagedService - none of which had a resource here, so the page rendered its
 * empty state over a real customer. It then computed `mrr = revenue?.mrr_usd ?? 0` and printed "$0K MRR" from a
 * missing number, and rendered a health grid of grade "—" beside "0/100" for a customer nothing has scanned.
 *
 * It now reads three routes:
 *   /mssp/customers  one production customer, the provider excluded, fixtures counted separately, and per-customer
 *                    health as a STATE with a reason rather than a score out of nothing
 *   /mssp/services   which services that customer is provisioned for, with the six telemetry measures named absent
 *   /mssp/revenue    billing arithmetic with its basis, null when no subscription row exists
 *
 * The AI briefing button used to call gdsAgentOS, which is not served by this API, so it always failed with a
 * TypeError the modal showed as an error. It now composes the briefing from the platform's own records and says so.
 */
export default function MSSPDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [services, setServices] = useState([]);
  const [servicesNote, setServicesNote] = useState({ notMeasured: [], note: null });
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalText, setModalText] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [book, svc, rev] = await Promise.all([
        base44.mssp.overview(),
        base44.mssp.services(),
        base44.mssp.revenue(),
      ]);
      setOverview(book);
      setServices(svc?.services || []);
      setServicesNote({ notMeasured: svc?.not_measured || [], note: svc?.note || null });
      setRevenue(rev || null);
    } catch (e) {
      setError(e?.message || "the MSSP routes could not be read");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const customers = overview?.customers || [];
  const rows = customers.map((customer) => ({ customer }));

  function briefing(row) {
    const c = row.customer;
    const health = c.health || {};
    const lines = [
      `${c.customer_name} (${c.slug})`,
      `Plan: ${c.plan_tier || "none recorded"} · subscription: ${c.subscription_status || "none recorded"} · onboarding: ${c.onboarding_status || "unknown"}`,
      `Health: ${health.status || "unknown"} — ${health.reason || "no reason recorded"}`,
      `Findings: ${c.findings} open, ${c.critical_findings} critical · missions: ${c.missions}`,
      `Users: ${c.active_users} · services provisioned: ${(c.services_provisioned || []).join(", ") || "none"}`,
      c.onboarded_at ? `Onboarded ${String(c.onboarded_at).slice(0, 10)}` : "No onboarding date recorded",
      "",
      revenue?.mrr_gbp == null
        ? `Revenue: not measured — ${revenue?.note || "no subscription record exists"}`
        : `Revenue: £${(revenue.mrr_gbp / 1000).toFixed(1)}K MRR / £${(revenue.arr_gbp / 1000000).toFixed(2)}M ARR (${revenue.basis})`,
      "",
      "Composed from this platform's own records. A model-written narrative is not available here: the gdsAgentOS " +
        "function this page used to call is not served by the GDSA Radar API.",
    ];
    setModalTitle(`Briefing — ${c.customer_name}`);
    setModalText(lines.join("\n"));
  }

  const revenueBadge = revenue?.mrr_gbp == null
    ? { text: "Revenue not measured", cls: "bg-slate-500/20 text-slate-400" }
    : { text: `● £${(revenue.mrr_gbp / 1000).toFixed(0)}K MRR`, cls: "bg-emerald-500/20 text-emerald-400" };

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-white">MSSP Command Centre</h1>
        {!loading && !error && <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${revenueBadge.cls}`}>{revenueBadge.text}</span>}
      </div>

      {loading ? (
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto mt-20" />
      ) : error ? (
        <div className="rounded-xl p-6" style={{ background: "#111827", border: "1px solid #7F1D1D" }}>
          <p className="text-sm font-bold text-red-400">The MSSP surface could not be read</p>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
          <p className="text-[10px] text-slate-500 mt-2">Nothing is shown as zero; the numbers are unknown until this read succeeds.</p>
          <button onClick={load} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500 text-white">Retry</button>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-sm font-bold text-white">No production customer is configured yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The platform is serving {overview?.non_production_count || 0} non-production tenant(s) and the provider
            tenant itself. A customer appears here once it exists as a production tenant of its own.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[10px] text-slate-500">
            {overview.count} production customer{overview.count === 1 ? "" : "s"} · {overview.onboarded} onboarded ·{" "}
            {overview.assessed} with telemetry of their own ·{" "}
            {overview.non_production_count} non-production tenant{overview.non_production_count === 1 ? "" : "s"} excluded
            {overview.provider_tenant ? `, provider ${overview.provider_tenant.display_name || overview.provider_tenant.slug} excluded` : ""}
          </p>

          <RevenueTiles
            mrr={revenue?.mrr_gbp ?? null}
            arr={revenue?.arr_gbp ?? null}
            nrr={revenue?.nrr_pct ?? null}
            activeCustomers={overview.count}
            totalEndpoints={null}
            currency={revenue?.currency || "GBP"}
            basis={revenue?.basis}
            note={revenue?.note || revenue?.nrr_note}
          />

          <CustomerHealthGrid rows={rows} onBriefing={briefing} />

          <h2 className="text-sm font-bold text-white mt-6 mb-2">Managed Services</h2>
          <ServicesTable services={services} notMeasured={servicesNote.notMeasured} />

          {overview.note && <p className="text-[10px] text-slate-500">{overview.note}</p>}
          {servicesNote.note && <p className="text-[10px] text-slate-500">{servicesNote.note}</p>}
        </>
      )}

      {modalTitle && (
        <AIResponseModal title={modalTitle} loading={false} response={modalText} agentSteps={[]} onClose={() => setModalTitle(null)} />
      )}
    </div>
  );
}
