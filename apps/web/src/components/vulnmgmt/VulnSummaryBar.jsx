import React from "react";

export default function VulnSummaryBar({ total, critical, high, exploited, slaBreached }) {
  const items = [
    { label: "Total", value: total, color: "text-white" },
    { label: "Critical", value: critical, color: "text-red-400" },
    { label: "High", value: high, color: "text-orange-400" },
    { label: "Exploited in Wild", value: exploited, color: "text-red-400", pulse: exploited > 0 },
    { label: "SLA Breached", value: slaBreached, color: "text-red-400" },
  ];
  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-2xl font-bold ${it.color} ${it.pulse ? "animate-pulse" : ""}`}>{it.value}</p>
            {it.pulse && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{it.label}</p>
        </div>
      ))}
    </div>
  );
}