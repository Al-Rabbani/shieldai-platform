import React from "react";

export default function ServicesTable({ services }) {
  if (services.length === 0) return <p className="text-sm text-slate-500 p-4">No managed services found.</p>;
  return (
    <div className="rounded-xl overflow-x-auto" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            {["Service", "Customer", "Events/30d", "Alerts/30d", "Uptime", "SLA Met", "Health", "Automation Rate"].map(h => (
              <th key={h} className="text-left p-2 text-[10px] text-slate-500 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => (
            <tr key={s.id || i} className="border-b border-slate-800/60 hover:bg-white/5">
              <td className="p-2 text-white whitespace-nowrap">{s.service_name || s.service_type}</td>
              <td className="p-2 text-slate-400 truncate max-w-[140px]">{s.customer_name}</td>
              <td className="p-2 text-slate-300">{(s.events_30d ?? 0).toLocaleString()}</td>
              <td className="p-2 text-slate-300">{s.alerts_30d ?? 0}</td>
              <td className="p-2 text-slate-300">{s.uptime_pct != null ? `${s.uptime_pct}%` : "—"}</td>
              <td className="p-2">{s.sla_met ? <span className="text-emerald-400 text-[10px] font-bold">MET</span> : <span className="text-red-400 text-[10px] font-bold">MISSED</span>}</td>
              <td className="p-2 text-slate-300">{s.health_score != null ? `${s.health_score}/100` : "—"}</td>
              <td className="p-2 text-slate-300">{s.automation_rate_pct != null ? `${s.automation_rate_pct}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}