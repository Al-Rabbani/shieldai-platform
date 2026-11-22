import React from "react";

const RULES = [
  "Process injection detection",
  "Unauthorized syscall monitoring",
  "Container escape detection",
  "Reverse shell detection",
  "Crypto-mining detection",
  "File integrity monitoring",
  "Network anomaly detection",
  "Privilege escalation detection",
];

export default function EBPFRuleList() {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">eBPF Security Rules</p>
      <div className="grid grid-cols-2 gap-2">
        {RULES.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "#0a0f1e" }}>
            <span className="text-xs text-slate-300">{r}</span>
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Active</span>
          </div>
        ))}
      </div>
    </div>
  );
}