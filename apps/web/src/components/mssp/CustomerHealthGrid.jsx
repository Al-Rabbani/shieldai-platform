import React from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

/**
 * One card per customer, reading only what the platform actually holds.
 *
 * The previous version read a separate CustomerHealthScore entity: overall_score, grade, trend, churn_risk,
 * sla_breaches_30d, open_critical_findings. None of those exists. It rendered grade "—" beside "0/100" and
 * "— churn", which reads as a measured zero for a customer nothing has scanned.
 *
 * The route reports health as a state with a reason: not_assessed, monitored or at_risk, derived from that
 * customer's own findings and missions. That is what is shown, with the counts that produced it.
 */
const HEALTH_STYLE = {
  at_risk: { icon: AlertTriangle, color: "#EF4444", label: "At risk" },
  monitored: { icon: CheckCircle2, color: "#10B981", label: "Monitored" },
  not_assessed: { icon: HelpCircle, color: "#94A3B8", label: "Not assessed" },
};

export default function CustomerHealthGrid({ rows, onBriefing }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 p-4">No production customer is configured yet.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {rows.map((r, i) => {
        const c = r.customer;
        const health = c.health || { status: "not_assessed", reason: "no health reported" };
        const style = HEALTH_STYLE[health.status] || HEALTH_STYLE.not_assessed;
        const Icon = style.icon;

        return (
          <div key={c.tenant_id || i} className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-white truncate" title={c.customer_name}>{c.customer_name}</p>
              <span className="flex items-center gap-1 shrink-0" style={{ color: style.color }}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">{style.label}</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {c.plan_tier && <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-500/20 text-slate-300">{c.plan_tier}</span>}
              {c.subscription_status && <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">{c.subscription_status}</span>}
              {c.onboarding_status && <span className="text-[9px] px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">onboarding {c.onboarding_status}</span>}
            </div>

            <p className="text-[10px] text-slate-500 mt-2">{health.reason}</p>

            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div>
                <p className="text-slate-500 text-[10px]">Open findings</p>
                <p className="text-white font-semibold">{c.findings ?? 0}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Critical</p>
                <p className={`font-semibold ${(c.critical_findings || 0) > 0 ? "text-red-400" : "text-white"}`}>{c.critical_findings ?? 0}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Missions</p>
                <p className="text-white font-semibold">{c.missions ?? 0}</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-2">
              {c.active_users ?? 0} active user{(c.active_users === 1) ? "" : "s"} · {(c.services_provisioned || []).length} service{(c.services_provisioned || []).length === 1 ? "" : "s"} provisioned
              {c.onboarded_at ? ` · onboarded ${String(c.onboarded_at).slice(0, 10)}` : ""}
            </p>

            <button onClick={() => onBriefing(r)} className="w-full mt-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">
              AI Briefing
            </button>
          </div>
        );
      })}
    </div>
  );
}
