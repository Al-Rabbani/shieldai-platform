import React from "react";
import { Users, Filter } from "lucide-react";
import { DASHBOARD_ROLES, DASHBOARD_SEVERITIES } from "@/lib/dashboardScope";

export default function DashboardScopeBar({ role, severity, onRole, onSeverity, shown, total }) {
  const active = DASHBOARD_ROLES.find((option) => option.key === role) || DASHBOARD_ROLES[0];

  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Users size={13} className="text-blue-400" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1">View as</span>
        {DASHBOARD_ROLES.map((option) => (
          <button
            key={option.key}
            onClick={() => onRole(option.key)}
            title={option.hint}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
              role === option.key
                ? "bg-blue-500/25 text-blue-200 border-blue-500/50"
                : "bg-transparent text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <Filter size={12} className="text-slate-500" />
          <select
            value={severity}
            onChange={(e) => onSeverity(e.target.value)}
            aria-label="Severity filter"
            className="px-2 py-1 rounded-lg text-[11px] bg-[#0a0f1e] border border-slate-700 text-white focus:border-blue-500 outline-none"
          >
            {DASHBOARD_SEVERITIES.map((level) => (
              <option key={level} value={level}>
                {level === "all" ? "All severities" : level}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-500">
            {shown} of {total} open findings
          </span>
        </div>
      </div>
      <p className="text-[10px] text-slate-600 mt-1">{active.hint} · applies to the tiles, heatmap and finding table below</p>
    </div>
  );
}