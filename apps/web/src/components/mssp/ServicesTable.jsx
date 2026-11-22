import React from "react";

/**
 * What each customer is provisioned for.
 *
 * The previous table had eight columns: Events/30d, Alerts/30d, Uptime, SLA Met, Health, Automation Rate, and a
 * customer. The platform holds none of that per service - there is no service telemetry table. Two of those columns
 * also defaulted to 0 and rendered "MISSED" for SLA, which is a negative finding invented from a missing field.
 *
 * The table now lists the fact that exists (service, customer, plan, provisioned since) and one column that states
 * the absence for the six measures, taken from the route's own not_measured list rather than hardcoded here.
 */
export default function ServicesTable({ services, notMeasured = [] }) {
  if (services.length === 0) {
    return <p className="text-sm text-slate-500 p-4">No service is provisioned for any production customer yet.</p>;
  }

  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            {["Service", "Customer", "Plan", "Provisioned", "Telemetry"].map((h) => (
              <th key={h} className="text-left p-2 text-[10px] text-slate-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => (
            <tr key={s.id || i} className="border-b border-slate-800/60 hover:bg-white/5">
              <td className="p-2 text-white whitespace-nowrap">{String(s.service_name || "").replace(/_/g, " ")}</td>
              <td className="p-2 text-slate-400 truncate max-w-[180px]">{s.customer_name}</td>
              <td className="p-2 text-slate-300">{s.plan_tier || "—"}</td>
              <td className="p-2 text-slate-300">{s.provisioned_at ? String(s.provisioned_at).slice(0, 10) : "—"}</td>
              <td className="p-2 text-slate-500 italic">
                not measured{notMeasured.length ? ` (${notMeasured.length} measures absent)` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {notMeasured.length > 0 && (
        <p className="text-[10px] text-slate-500 px-2 py-2 border-t border-slate-800">
          The platform records which services a customer is provisioned for and holds no per-service telemetry, so
          these are absent rather than zero: {notMeasured.join(", ")}.
        </p>
      )}
    </div>
  );
}
