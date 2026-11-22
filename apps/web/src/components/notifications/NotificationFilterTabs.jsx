import React from "react";

const TABS = ["All", "Unread", "Critical", "Drift", "Cloud", "Compliance", "Incidents"];

export default function NotificationFilterTabs({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-xl p-1 w-fit flex-wrap" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      {TABS.map(t => (
        <button key={t} onClick={() => onChange(t)} className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${active === t ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-slate-800"}`}>{t}</button>
      ))}
    </div>
  );
}