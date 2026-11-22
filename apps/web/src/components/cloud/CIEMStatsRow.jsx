import React from "react";

export default function CIEMStatsRow({ totalIdentities, overprivileged, inactive90, adminAccess }) {
  const tiles = [
    { label: "Total Identities", value: totalIdentities, color: "text-white" },
    { label: "Overprivileged", value: overprivileged, color: overprivileged > 0 ? "text-red-400" : "text-white" },
    { label: "Inactive 90+ Days", value: inactive90, color: inactive90 > 0 ? "text-amber-400" : "text-white" },
    { label: "Admin Access Count", value: adminAccess, color: adminAccess > 0 ? "text-orange-400" : "text-white" },
  ];
  return (
    <div className="grid grid-cols-4 gap-4">
      {tiles.map((t, i) => (
        <div key={i} className="rounded-xl p-3 text-center" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{t.label}</p>
        </div>
      ))}
    </div>
  );
}