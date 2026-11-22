import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CreditCard, Loader2, Check, AlertTriangle, ExternalLink } from "lucide-react";

/**
 * Billing, against the platform's own routes.
 *
 * Every figure here comes from /billing/plans, /billing/subscription, /billing/quota or /billing/invoices. A
 * subscription that Stripe has not confirmed is reported as what it is: a checkout that was started and not
 * completed. Nothing is assumed paid.
 */
/* plan.price_monthly and monthly_amount_gbp are WHOLE POUNDS, matching the Stripe price's unit_amount of
 * 39900 / 119900 / 399900 pence. They are not pence, so nothing here divides by 100. */
const gbp = (amount) => {
  if (amount === null || amount === undefined) return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return `£${value.toLocaleString("en-GB", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const STATUS_WORDING = {
  none: "No subscription",
  incomplete: "Checkout started, not completed",
  trialing: "Trialing",
  active: "Active",
  past_due: "Payment past due",
  unpaid: "Unpaid",
  canceled: "Cancelled",
};

export default function BillingSettingsPage() {
  const [plans, setPlans] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [quota, setQuota] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [returned, setReturned] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturned(params.get("status") || "");
    (async () => {
      const [p, s, q, i] = await Promise.all([
        base44.billing.plans().catch(() => null),
        base44.billing.subscription().catch((e) => {
          setError(e?.message || "Could not read the subscription state.");
          return null;
        }),
        base44.billing.quota().catch(() => null),
        base44.billing.invoices().catch(() => null),
      ]);
      setPlans(p?.plans || null);
      setSubscription(s);
      setQuota(q);
      setInvoices(i?.invoices || null);
      setLoading(false);
    })();
  }, []);

  async function subscribe(tier) {
    setBusy(tier);
    setError("");
    try {
      const result = await base44.billing.checkout(tier);
      if (!result?.checkout_url) throw new Error("Stripe did not return a checkout URL.");
      window.location.assign(result.checkout_url);
    } catch (err) {
      setError(err?.message || "Could not start checkout.");
      setBusy("");
    }
  }

  async function manage() {
    setBusy("portal");
    setError("");
    try {
      const result = await base44.billing.portal();
      if (!result?.portal_url) throw new Error("Stripe did not return a billing portal URL.");
      window.location.assign(result.portal_url);
    } catch (err) {
      setError(err?.message || "Could not open the billing portal.");
      setBusy("");
    }
  }

  const card = { background: "#0d1424", border: "1px solid #1e3a5f" };
  const muted = { color: "#94a3b8" };
  const status = subscription?.status || "none";
  const currentTier = subscription?.plan || null;

  return (
    <div className="min-h-screen p-6" style={{ background: "#0a0f1e" }}>
      <div className="max-w-5xl mx-auto space-y-4">
        <header>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard size={20} style={{ color: "#3b82f6" }} />
            Billing
          </h1>
          <p className="text-xs mt-1" style={muted}>
            Plans, the current subscription and this tenant's usage against its plan.
          </p>
        </header>

        {returned === "success" && (
          <div className="rounded-lg p-3 text-xs" style={{ background: "#0f2419", border: "1px solid #166534", color: "#86efac" }}>
            Stripe returned you here after checkout. The subscription state below is read from the platform, not
            from this message, so refresh if it still reads incomplete.
          </div>
        )}
        {returned === "cancelled" && (
          <div className="rounded-lg p-3 text-xs" style={{ background: "#2a1f0a", border: "1px solid #92400e", color: "#fcd34d" }}>
            Checkout was cancelled. Nothing was charged.
          </div>
        )}
        {error && (
          <div className="rounded-lg p-3 text-xs flex items-start gap-2" style={{ background: "#2a1015", border: "1px solid #7f1d1d", color: "#fca5a5" }}>
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <section className="rounded-xl p-4" style={card}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Current subscription</h2>
            {loading && <Loader2 size={14} className="animate-spin" style={muted} />}
          </div>
          {!loading && (
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <dt style={muted}>Status</dt>
                <dd className="text-white mt-0.5">{STATUS_WORDING[status] || status}</dd>
              </div>
              <div>
                <dt style={muted}>Plan</dt>
                <dd className="text-white mt-0.5">{currentTier || "—"}</dd>
              </div>
              <div>
                <dt style={muted}>Monthly</dt>
                <dd className="text-white mt-0.5">
                  {gbp(subscription?.monthly_amount_gbp)}
                </dd>
              </div>
              <div>
                <dt style={muted}>Renews</dt>
                <dd className="text-white mt-0.5">
                  {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "—"}
                </dd>
              </div>
            </dl>
          )}
          {!loading && status !== "none" && (
            <button
              onClick={manage}
              disabled={busy === "portal"}
              className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "#1d4ed8" }}
            >
              {busy === "portal" ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
              Manage billing in Stripe
            </button>
          )}
          {!loading && status === "none" && (
            <p className="mt-3 text-xs" style={muted}>
              This tenant has no subscription. Pick a plan below; payment is taken by Stripe, not by this platform.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white mb-2">Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {loading && !plans && (
              <div className="text-xs" style={muted}>Reading plans…</div>
            )}
            {(plans || []).map((plan) => {
              const isCurrent = currentTier === plan.tier;
              return (
                <div key={plan.tier} className="rounded-xl p-4 flex flex-col" style={card}>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                    {isCurrent && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#1e3a5f", color: "#93c5fd" }}>current</span>}
                  </div>
                  <p className="mt-2 text-lg font-bold text-white">
                    {gbp(plan.price_monthly)}
                    <span className="text-xs font-normal" style={muted}>/month</span>
                  </p>
                  <p className="mt-1 text-[11px]" style={muted}>{plan.description}</p>
                  <ul className="mt-3 space-y-1 flex-1">
                    {(plan.features || []).map((f) => (
                      <li key={f} className="text-[11px] flex items-start gap-1.5" style={muted}>
                        <Check size={11} className="mt-0.5 shrink-0" style={{ color: "#10b981" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => subscribe(plan.tier)}
                    disabled={busy === plan.tier || isCurrent}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ background: isCurrent ? "#334155" : "#047857" }}
                  >
                    {busy === plan.tier ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
                    {isCurrent ? "Current plan" : "Subscribe"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {quota && (
          <section className="rounded-xl p-4" style={card}>
            <h2 className="text-sm font-semibold text-white">
              Usage this {quota.period || "period"} <span className="font-normal text-xs" style={muted}>· plan {quota.tier}</span>
            </h2>
            {!quota.limits ? (
              <p className="mt-2 text-xs" style={muted}>This plan is not metered.</p>
            ) : (
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr style={muted}>
                    <th className="text-left font-normal pb-1">Resource</th>
                    <th className="text-right font-normal pb-1">Used</th>
                    <th className="text-right font-normal pb-1">Limit</th>
                    <th className="text-right font-normal pb-1">Within plan</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(quota.limits).map((resource) => {
                    const decision = quota.decisions?.[resource] || {};
                    return (
                      <tr key={resource} style={{ borderTop: "1px solid #1e3a5f" }}>
                        <td className="py-1.5 text-white">{resource}</td>
                        <td className="py-1.5 text-right text-white">{quota.usage?.[resource] ?? 0}</td>
                        <td className="py-1.5 text-right text-white">{quota.limits[resource]}</td>
                        <td className="py-1.5 text-right" style={{ color: decision.allowed === false ? "#fca5a5" : "#86efac" }}>
                          {decision.allowed === false ? "no" : "yes"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        )}

        <section className="rounded-xl p-4" style={card}>
          <h2 className="text-sm font-semibold text-white">Payments</h2>
          {loading ? (
            <p className="mt-2 text-xs" style={muted}>Reading payment history…</p>
          ) : invoices && invoices.length > 0 ? (
            <table className="mt-3 w-full text-xs">
              <thead>
                <tr style={muted}>
                  <th className="text-left font-normal pb-1">Date</th>
                  <th className="text-right font-normal pb-1">Amount</th>
                  <th className="text-left font-normal pb-1 pl-3">Status</th>
                  <th className="text-right font-normal pb-1">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id || inv.stripe_invoice_id} style={{ borderTop: "1px solid #1e3a5f" }}>
                    <td className="py-1.5 text-white">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}</td>
                    <td className="py-1.5 text-right text-white">
                      {inv.currency === "gbp" ? "£" : ""}{(inv.amount_paid ?? 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 pl-3 text-white">{inv.status}</td>
                    <td className="py-1.5 text-right">
                      {inv.invoice_url ? (
                        <a href={inv.invoice_url} target="_blank" rel="noreferrer" style={{ color: "#93c5fd" }}>view</a>
                      ) : (
                        <span style={muted}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-xs" style={muted}>
              No payments are recorded for this account. Nothing has been charged.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
