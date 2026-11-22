import React from "react";

const PILLAR_COLORS = {
  CODE: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", label: "Code" },
  CLOUD: { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", label: "Cloud" },
  ATTACK: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "Attack" },
  RUNTIME: { color: "#06b6d4", bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)", label: "Runtime" },
  GOVERNANCE: { color: "#6366f1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", label: "Governance" },
};

const FW_COLORS = {
  SOC2: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" },
  ISO27001: { color: "#16a34a", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.3)" },
  GDPR: { color: "#6366f1", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)" },
  NIST_CSF: { color: "#0891b2", bg: "rgba(8,145,178,0.12)", border: "rgba(8,145,178,0.3)" },
  CIS_Benchmark: { color: "#ea580c", bg: "rgba(234,88,12,0.12)", border: "rgba(234,88,12,0.3)" },
  PCI_DSS: { color: "#dc2626", bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.3)" },
  HIPAA: { color: "#9333ea", bg: "rgba(147,51,234,0.12)", border: "rgba(147,51,234,0.3)" },
};

export function PillarBadge({ pillar, size = "sm" }) {
  const style = PILLAR_COLORS[pillar] || { color: "#64748b", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)", label: pillar };
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={`inline-flex items-center rounded font-semibold uppercase tracking-wide ${padding}`}
      style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}>
      {style.label || pillar}
    </span>
  );
}

export function FrameworkBadge({ framework, size = "sm" }) {
  const style = FW_COLORS[framework] || { color: "#64748b", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)" };
  const padding = size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span className={`inline-flex items-center rounded font-semibold ${padding}`}
      style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}>
      {framework?.replace(/_/g, " ")}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const map = {
    critical: { color: "#dc2626", bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.3)", label: "Critical" },
    high: { color: "#ea580c", bg: "rgba(234,88,12,0.12)", border: "rgba(234,88,12,0.3)", label: "High" },
    medium: { color: "#d97706", bg: "rgba(217,119,6,0.12)", border: "rgba(217,119,6,0.3)", label: "Medium" },
    low: { color: "#16a34a", bg: "rgba(22,163,74,0.12)", border: "rgba(22,163,74,0.3)", label: "Low" },
    info: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", label: "Info" },
  };
  const s = map[severity?.toLowerCase()] || map.low;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

export default PillarBadge;