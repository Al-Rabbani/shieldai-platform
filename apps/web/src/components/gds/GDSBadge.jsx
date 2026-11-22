import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const SEV = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };
const SUCCESS = "#22c55e";
const DANGER = "#ef4444";
const GOLD = "#c9a84c";
const CARD = "#111827";
const BORDER = "#1a1f2e";

export function SevBadge({ sev }) {
  const color = SEV[sev] || "#64748b";
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {sev || "—"}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    open:           [DANGER,   "rgba(239,68,68,0.1)"],
    in_remediation: ["#f97316","rgba(249,115,22,0.1)"],
    in_review:      ["#f97316","rgba(249,115,22,0.1)"],
    fixed:          [SUCCESS,  "rgba(34,197,94,0.1)"],
    resolved:       [SUCCESS,  "rgba(34,197,94,0.1)"],
    accepted_risk:  ["#64748b","rgba(100,116,139,0.1)"],
    false_positive: ["#64748b","rgba(100,116,139,0.1)"],
    active:         [SUCCESS,  "rgba(34,197,94,0.1)"],
    inactive:       ["#64748b","rgba(100,116,139,0.1)"],
    blocked:        [DANGER,   "rgba(239,68,68,0.1)"],
    connected:      [SUCCESS,  "rgba(34,197,94,0.1)"],
    scanned:        [SUCCESS,  "rgba(34,197,94,0.1)"],
    error:          [DANGER,   "rgba(239,68,68,0.1)"],
    exposed:        [DANGER,   "rgba(239,68,68,0.1)"],
    revoked:        ["#64748b","rgba(100,116,139,0.1)"],
  };
  const [c, bg] = map[status] || ["#64748b", "rgba(100,116,139,0.1)"];
  return (
    <span className="text-[9px] capitalize px-2 py-0.5 rounded"
      style={{ color: c, background: bg }}>
      {(status || "—").replace(/_/g, " ")}
    </span>
  );
}

export function YesNo({ val }) {
  return val
    ? <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: SUCCESS }}><CheckCircle2 className="w-3 h-3" />Yes</span>
    : <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: "#64748b" }}><XCircle className="w-3 h-3" />No</span>;
}

export function StatCard({ label, value, color, icon: Icon, sub }) {
  return (
    <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
      </div>
      <div className="text-2xl font-black font-mono" style={{ color }}>{value ?? "—"}</div>
      {sub && <p className="text-[9px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

export function ProviderBadge({ provider }) {
  const map = {
    aws:    { color: "#ff9900", label: "AWS" },
    azure:  { color: "#0078d4", label: "Azure" },
    gcp:    { color: "#4285f4", label: "GCP" },
    github: { color: "#e2e8f0", label: "GitHub" },
    gitlab: { color: "#fc6d26", label: "GitLab" },
  };
  const m = map[provider?.toLowerCase()] || { color: "#64748b", label: provider || "—" };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded"
      style={{ color: m.color, background: `${m.color}18` }}>
      {m.label}
    </span>
  );
}