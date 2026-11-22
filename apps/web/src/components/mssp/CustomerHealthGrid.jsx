import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const TIER_COLOR = { enterprise: "bg-purple-500/20 text-purple-400", professional: "bg-blue-500/20 text-blue-400", standard: "bg-slate-500/20 text-slate-400" };
const CHURN_COLOR = { high: "bg-red-500/20 text-red-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-emerald-500/20 text-emerald-400" };

function TrendIcon({ trend }) {
  if (trend === "improving") return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend === "declining") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

export default function CustomerHealthGrid({ rows, onBriefing }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500 p-4">No customer data available.</p>;
  return (
    <div className="grid grid-cols-3 gap-4">
      {rows.map((r, i) => {
        const h = r.health;
        const score = h?.overall_score ?? 0;
        const color = h?.grade === "A" ? "#10B981" : h?.grade === "B" ? "#EAB308" : h?.grade === "C" ? "#F59E0B" : "#EF4444";
        return (
          <div key={r.tenant.id || i} className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white truncate">{r.tenant.customer_name}</p>
              <TrendIcon trend={h?.trend} />
            </div>
            {r.tenant.industry && <span className="text-[9px] text-slate-500 uppercase">{r.tenant.industry}</span>}

            <div className="flex items-center gap-2 mt-3">
              <span className="text-3xl font-black" style={{ color }}>{h?.grade || "—"}</span>
              <span className="text-xs text-slate-500">{score}/100</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${TIER_COLOR[r.tenant.tier] || "bg-slate-500/20 text-slate-400"}`}>{r.tenant.tier || "—"}</span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${CHURN_COLOR[h?.churn_risk] || "bg-slate-500/20 text-slate-400"}`}>{h?.churn_risk || "—"} churn</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div><p className="text-slate-500 text-[10px]">Critical</p><p className="text-red-400 font-semibold">{h?.open_critical_findings ?? 0}</p></div>
              <div><p className="text-slate-500 text-[10px]">SLA Breaches</p><p className="text-orange-400 font-semibold">{h?.sla_breaches_30d ?? 0}</p></div>
              <div><p className="text-slate-500 text-[10px]">Incidents 30d</p><p className="text-white font-semibold">{r.incidents30d ?? 0}</p></div>
            </div>

            <button onClick={() => onBriefing(r)} className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
              🤖 AI Briefing
            </button>
          </div>
        );
      })}
    </div>
  );
}