import React from "react";
import { DANGER, HIGH, MEDIUM, LOW, MUTED, BORDER } from "@/components/gds/GDSOSShared";

const LEVELS = [
  { value: "all",      label: "All",      color: MUTED  },
  { value: "critical", label: "Critical", color: DANGER },
  { value: "high",     label: "High",     color: HIGH   },
  { value: "medium",   label: "Medium",   color: MEDIUM },
  { value: "low",      label: "Low",      color: LOW    },
];

export default function SevFilterBar({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {LEVELS.map(l => {
        const active = value === l.value;
        return (
          <button
            key={l.value}
            onClick={() => onChange(l.value)}
            className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all"
            style={{
              color: active ? (l.value === "all" ? "#fff" : l.color) : MUTED,
              background: active ? `${l.color}20` : "transparent",
              border: `1px solid ${active ? l.color + "60" : BORDER}`,
            }}>
            {l.label}
          </button>
        );
      })}
    </div>
  );
}