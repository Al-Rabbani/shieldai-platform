import React, { useEffect, useState } from "react";
import { Gauge, ShieldAlert, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Per-department risk limits were a form over nothing.
 *
 * Measured 23 Nov 2026: this page saved DepartmentRiskThreshold through create, update and delete at five sites and no
 * threshold table has ever existed. The dimension the form is built on is absent too: security_findings has no
 * department, team or unit column (measured 0), and there is no departments table. A per-department limit therefore
 * could not be evaluated even with a store, so the form is gone rather than saving intent nothing can act on.
 *
 * What IS in force is shown below, read from the engine that applies it: the per-severity age policy, with any tenant
 * override from the platform settings page. The preview writes nothing.
 */

const SEVERITIES = ["critical", "high", "medium", "low", "info"];

export default function RiskThresholdsPage() {
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke("gdsAutoAssignFindings", { action: "escalate_stale", apply: false });
      setPolicy(response.data || null);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const effective = policy?.effective_hours || policy?.policy_hours || null;

  return (
    <div className="min-h-screen p-4 space-y-3" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <Gauge size={22} className="text-amber-400 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-white">Risk thresholds in force</h1>
            <p className="text-xs text-slate-500">
              The age policy that escalates a finding, read from the engine that applies it. Per-department risk limits are
              not shown because they cannot be evaluated on this platform.
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 disabled:opacity-50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="rounded-xl p-3 space-y-1.5" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-orange-400" />
          <p className="text-[11px] font-bold text-white">Per-department risk limits are not recorded here</p>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          No department threshold store exists. More importantly, the dimension does not exist: a finding carries no department, team or
          unit, so there is nothing to compare a department limit against. Saving one would record an intention that no part
          of the platform can act on.
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Slack channel selection is unavailable for the same reason it always was: this host holds a webhook URL and nothing
          else, and listing a workspace's channels needs a bot token. No Slack member ID is stored for anyone on this
          platform either, so an alert raised here cannot @-mention a person.
        </p>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-[11px] border bg-red-500/10 border-red-500/40 text-red-300">
          The escalation policy could not be read: {error}
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="px-3 py-2 border-b border-slate-800">
          <p className="text-[11px] font-bold text-white">Age policy per severity</p>
          <p className="text-[10px] text-slate-500">
            {policy?.policy_source ? `Source: ${policy.policy_source}.` : "Source not reported."}{" "}
            A tenant override set on the platform settings page replaces an individual severity, and any severity left unset keeps
            the platform ladder.
          </p>
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="px-3 py-1.5 font-medium">Severity</th>
              <th className="px-3 py-1.5 font-medium">Escalates after</th>
            </tr>
          </thead>
          <tbody>
            {SEVERITIES.map((severity) => (
              <tr key={severity} className="border-t border-slate-800">
                <td className="px-3 py-1.5 text-slate-300 uppercase tracking-wide">{severity}</td>
                <td className="px-3 py-1.5 text-white">
                  {effective && effective[severity] != null ? `${effective[severity]}h` : loading ? "reading…" : "not reported"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed">
        This is a preview and writes nothing. Escalating runs from the assignment rules page or the cron job, and the resulting
        in-app notification is recorded in notifications.
        {policy?.stale != null ? ` Right now ${policy.stale} of ${policy.checked} open findings are past their policy.` : ""}
      </p>
    </div>
  );
}
