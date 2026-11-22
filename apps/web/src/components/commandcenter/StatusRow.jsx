import React from "react";

export default function StatusRow({ exploited, exploitedCves, kevUnpatched, slaBreached, msspCustomers }) {
  const items = [
    { label: "Exploited in Wild", value: exploited, sub: exploitedCves.join(", "), danger: exploited > 0 },
    { label: "KEV Unpatched", value: kevUnpatched, danger: kevUnpatched > 0 },
    { label: "SLA Breached", value: slaBreached, danger: slaBreached > 0 },
    { label: "MSSP Customers", value: msspCustomers, danger: false },
  ];
  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl p-3" style={{ background: "#111827", border: `1px solid ${it.danger ? "#EF444450" : "#1F2937"}` }}>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{it.label}</p>
          <p className={`text-2xl font-bold mt-1 ${it.danger ? "text-red-400" : "text-white"}`}>{it.value}</p>
          {it.sub && <p className="text-[10px] text-slate-500 truncate mt-0.5">{it.sub}</p>}
        </div>
      ))}
    </div>
  );
}