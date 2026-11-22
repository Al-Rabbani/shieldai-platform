import React from "react";

/**
 * Revenue band. Every figure is nullable and says so.
 *
 * The platform had no subscription rows when this was written, and the previous version defaulted a null MRR to 0,
 * printing "$0K MRR" and "$0.00M ARR" - a business fact the platform could not support. A null now renders
 * "not measured" and the basis line beneath the tiles states where the number comes from.
 *
 * Currency is passed in because billing_subscriptions stores monthly_amount_gbp; the old tiles hardcoded "$".
 */
export default function RevenueTiles({ mrr, arr, nrr, activeCustomers, totalEndpoints, currency = "GBP", basis, note }) {
  const symbol = currency === "GBP" ? "£" : "$";
  const money = (value, divisor, suffix) =>
    value == null ? "not measured" : `${symbol}${(value / divisor).toFixed(divisor === 1000000 ? 2 : 0)}${suffix}`;

  const items = [
    { label: "MRR", value: money(mrr, 1000, "K"), measured: mrr != null },
    { label: "ARR", value: money(arr, 1000000, "M"), measured: arr != null },
    { label: "NRR", value: nrr == null ? "not measured" : `${nrr.toFixed(1)}%`, measured: nrr != null },
    { label: "Active Customers", value: activeCustomers == null ? "—" : activeCustomers, measured: activeCustomers != null },
    { label: "Total Endpoints", value: totalEndpoints == null ? "not measured" : totalEndpoints.toLocaleString(), measured: totalEndpoints != null },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{it.label}</p>
            <p className={`mt-1 font-black ${it.measured ? "text-2xl text-white" : "text-sm text-slate-500 italic"}`}>
              {it.value}
            </p>
          </div>
        ))}
      </div>
      {(basis || note) && (
        <p className="text-[10px] text-slate-500">
          {note || basis}
          {note && basis ? ` · ${basis}` : ""}
        </p>
      )}
    </div>
  );
}
