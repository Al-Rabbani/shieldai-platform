import React from "react";

const TABS = [
  { key: "threats", label: "🔴 Active Threats" },
  { key: "assets", label: "🖥️ Asset Health" },
  { key: "compliance", label: "📋 Compliance Status" },
];

export default function QuickViewTabs({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1 w-fit">
      {TABS.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
            active === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}