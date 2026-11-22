import React from "react";
import { TrendingUp } from "lucide-react";

export default function RevenueTiles({ mrr, arr, nrr, activeCustomers, totalEndpoints }) {
  const items = [
    { label: "MRR", value: `$${(mrr / 1000).toFixed(0)}K`, color: "text-emerald-400", trend: true },
    { label: "ARR", value: `$${(arr / 1000000).toFixed(2)}M`, color: "text-blue-400" },
    { label: "NRR", value: `${nrr.toFixed(1)}%`, color: "text-emerald-400" },
    { label: "Active Customers", value: activeCustomers, color: "text-white" },
    { label: "Total Endpoints", value: totalEndpoints.toLocaleString(), color: "text-white" },
  ];
  return (
    <div className="grid grid-cols-5 gap-4">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">{it.label}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className={`text-2xl font-black ${it.color}`}>{it.value}</p>
            {it.trend && <TrendingUp className="w-4 h-4 text-emerald-400" />}
          </div>
        </div>
      ))}
    </div>
  );
}