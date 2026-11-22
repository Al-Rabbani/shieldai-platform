import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const gdsMSSP = (payload) => base44.functions.invoke("gdsMSSP", payload).then(r => r.data);

const fmt = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
};

const GRADE_COLORS = {
  A: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  B: "bg-teal-500/10 text-teal-400 border-teal-500/30",
  C: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  D: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  F: "bg-destructive/10 text-destructive border-destructive/30",
};

function StatCard({ label, value, subtitle }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value ?? "—"}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-12 rounded-lg border bg-card animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}

export default function GDSMSSPOperationsPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    gdsMSSP({ action: "dashboard" })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, []);

  const customers = data?.customers || {};
  const revenue = data?.revenue || {};
  const partners = data?.partners || {};
  const plans = data?.plans || {};

  return (
    <div className="p-6 min-h-screen bg-background">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🏢 MSSP Operations Center</h1>
        <p className="text-sm text-muted-foreground mt-1">Managed Security Service Provider Command Dashboard</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Customers"
          value={isLoading ? "…" : customers.active}
          subtitle="active accounts"
        />
        <StatCard
          label="MRR"
          value={isLoading ? "…" : revenue.mrr_usd ? `$${fmt(revenue.mrr_usd)}` : "—"}
          subtitle={revenue.period ? `${revenue.period} · ${revenue.nrr_pct ?? "—"}% NRR` : "monthly recurring"}
        />
        <StatCard
          label="Endpoints Managed"
          value={isLoading ? "…" : customers.total_endpoints_managed ? fmt(customers.total_endpoints_managed) : "—"}
          subtitle="across all customers"
        />
        <StatCard
          label="ARR"
          value={isLoading ? "…" : revenue.arr_usd ? `$${fmt(revenue.arr_usd)}` : "—"}
          subtitle="annual recurring revenue"
        />
      </div>

      {/* Section 1 — Customer Health */}
      <div className="mt-6">
        <h2 className="text-lg font-bold mb-3">Customer Health Dashboard</h2>
        {isLoading ? <Skeleton /> : (
          <div className="space-y-2">
            {(customers.list || []).slice(0, 10).map((c, i) => {
              const churn = c.churn_risk?.toLowerCase();
              const churnEl = churn === "high"
                ? <span className="text-[11px] text-red-400 font-semibold">⚠ High Risk</span>
                : churn === "medium"
                  ? <span className="text-[11px] text-amber-400 font-semibold">Medium</span>
                  : <span className="text-[11px] text-emerald-400 font-semibold">✅ Low</span>;
              const gradeClass = GRADE_COLORS[c.health_grade] || GRADE_COLORS.B;
              return (
                <div key={c.id || i} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <p className="font-medium text-sm flex-1 min-w-0 truncate">{c.name}</p>
                  {c.industry && (
                    <span className="text-[11px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground border flex-shrink-0">{c.industry}</span>
                  )}
                  {c.tier && (
                    <span className="text-[11px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground border flex-shrink-0">{c.tier}</span>
                  )}
                  {c.endpoints && (
                    <span className="text-sm text-muted-foreground flex-shrink-0">{fmt(c.endpoints)} endpoints</span>
                  )}
                  {c.health_grade && (
                    <span className={`text-[11px] rounded-full px-2 py-0.5 border font-bold flex-shrink-0 ${gradeClass}`}>{c.health_grade}</span>
                  )}
                  <div className="flex-shrink-0">{churnEl}</div>
                </div>
              );
            })}
            {!customers.list?.length && (
              <p className="text-sm text-muted-foreground text-center py-8">No customer data returned from backend.</p>
            )}
          </div>
        )}
      </div>

      {/* Section 2 — Revenue Intelligence */}
      <div className="mt-6">
        <h2 className="text-lg font-bold mb-3">Revenue Intelligence</h2>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4"><Skeleton /><Skeleton /><Skeleton /></div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MRR Growth</p>
              <p className={`text-2xl font-bold mt-1 ${revenue.growth >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                {revenue.growth != null ? `${revenue.growth >= 0 ? "+" : ""}${revenue.growth}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gross Margin</p>
              <p className="text-2xl font-bold mt-1">{revenue.gross_margin_pct != null ? `${revenue.gross_margin_pct}%` : "—"}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">New MRR</p>
              <p className="text-2xl font-bold mt-1">{revenue.new_mrr_usd ? `$${fmt(revenue.new_mrr_usd)}` : "—"}</p>
            </div>
          </div>
        )}
        {/* Partner ecosystem */}
        {!isLoading && partners.list?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Partner Ecosystem</h3>
            <div className="flex flex-wrap gap-2">
              {partners.list.map((p, i) => (
                <div key={p.id || i} className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-[11px]">
                  <span className="font-semibold">{p.name}</span>
                  {p.tier && <span className="rounded-full px-1.5 py-0.5 bg-muted text-muted-foreground">{p.tier}</span>}
                  {p.mrr_usd && <span className="text-primary font-bold">${fmt(p.mrr_usd)}</span>}
                  {p.customers && <span className="text-muted-foreground">{p.customers} customers</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 3 — Service Catalog */}
      <div className="mt-6">
        <h2 className="text-lg font-bold mb-3">Service Catalog</h2>
        {isLoading ? <Skeleton /> : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(plans.list || []).map((plan, i) => (
              <div key={plan.id || i} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-sm">{plan.name}</p>
                  {plan.tier && <span className="text-[10px] rounded-full px-2 py-0.5 bg-muted text-muted-foreground border">{plan.tier}</span>}
                </div>
                <p className="text-2xl font-bold text-primary mt-2">
                  {plan.price_monthly_usd ? `$${plan.price_monthly_usd}/mo` : "—"}
                </p>
                {plan.active_customers != null && (
                  <p className="text-sm text-muted-foreground mt-1">{plan.active_customers} customers</p>
                )}
              </div>
            ))}
            {!plans.list?.length && (
              <p className="text-sm text-muted-foreground col-span-3 text-center py-8">No plan data returned from backend.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}