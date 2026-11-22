import React from "react";

const PROVIDERS = {
  aws:   { label: "AWS",   color: "#FF9900", bg: "rgba(255,153,0,0.12)",  border: "rgba(255,153,0,0.35)" },
  gcp:   { label: "GCP",   color: "#4285F4", bg: "rgba(66,133,244,0.12)", border: "rgba(66,133,244,0.35)" },
  azure: { label: "Azure", color: "#0078D4", bg: "rgba(0,120,212,0.12)",  border: "rgba(0,120,212,0.35)" },
};

export default function ProviderBadge({ provider, size = "sm" }) {
  const p = PROVIDERS[provider] || { label: provider, color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" };
  const cls = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[11px]";
  return (
    <span className={`inline-flex items-center font-bold rounded-md font-mono ${cls}`}
      style={{ color: p.color, background: p.bg, border: `1px solid ${p.border}` }}>
      {p.label}
    </span>
  );
}