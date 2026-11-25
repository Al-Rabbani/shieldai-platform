import React, { useEffect, useState } from "react";
import { sloStatus } from "@/api/base44Client";
import { Activity, AlertTriangle, CheckCircle2, Clock, Info, ShieldQuestion } from "lucide-react";

/* Service levels, measured.
 *
 * The platform sells SLA tiers and had no statement of its own service level anywhere in the product. This page
 * renders GET /slo, which measures five objectives from real telemetry (Prometheus counters for the API, scan_runs
 * for scanner freshness, missions and approvals for the operational ones).
 *
 * It renders exactly what the endpoint says and nothing more:
 *   - an objective the server could not measure is shown as UNMEASURED with the reason, never as a green tick;
 *   - every objective prints its BASIS, so the reader knows what the number excludes;
 *   - the blind spots the endpoint declares are printed under the table, because a status page that hides its own
 *     limits is the thing this page exists to avoid. */

const STATUS_STYLE = {
  met: { label: "Met", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", Icon: CheckCircle2 },
  at_risk: { label: "At risk", className: "border-amber-500/40 bg-amber-500/10 text-amber-300", Icon: AlertTriangle },
  breached: { label: "Breached", className: "border-red-500/40 bg-red-500/10 text-red-300", Icon: AlertTriangle },
  unmeasured: { label: "Unmeasured", className: "border-slate-500/40 bg-slate-500/10 text-slate-300", Icon: ShieldQuestion },
};

function StatusChip({ status }) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.unmeasured;
  const Icon = style.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.className}`}>
      <Icon className="h-3 w-3" />
      {style.label}
    </span>
  );
}

function formatValue(objective) {
  if (objective.actual === null || objective.actual === undefined) return "no measurement";
  return `${objective.actual}${objective.unit === "%" ? "%" : ` ${objective.unit}`}`;
}

function formatTarget(objective) {
  return `${objective.target}${objective.unit === "%" ? "%" : ` ${objective.unit}`}`;
}

function DetailRow({ objective }) {
  const detail = objective.detail || {};
  const bits = [];
  if (objective.id === "api_availability") {
    if (detail.requests_counted !== undefined) bits.push(`${detail.requests_counted.toLocaleString()} requests counted`);
    if (detail.failed_requests !== undefined) bits.push(`${detail.failed_requests} answered 5xx`);
  } else if (objective.id === "api_latency") {
    if (detail.requests_counted !== undefined && detail.requests_counted !== null) {
      bits.push(`${detail.requests_counted.toLocaleString()} requests counted`);
    }
    if (detail.threshold_ms !== undefined) bits.push(`threshold ${detail.threshold_ms} ms`);
  } else if (objective.id === "scanner_freshness") {
    if (detail.registered !== undefined) bits.push(`${detail.registered} registered`);
    (detail.overdue || []).forEach((name) => bits.push(`overdue: ${name}`));
    (detail.silent || []).forEach((name) => bits.push(`silent: ${name}`));
    (detail.never_run || []).forEach((name) => bits.push(`never ran: ${name}`));
  } else if (objective.id === "mission_success") {
    if (detail.completed !== undefined) bits.push(`${detail.completed} completed`);
    if (detail.failed !== undefined) bits.push(`${detail.failed} failed`);
    if (detail.cancelled_excluded) bits.push(`${detail.cancelled_excluded} cancelled, excluded`);
    Object.entries(detail.failed_by_type || {}).forEach(([type, count]) => bits.push(`${count} failed: ${type}`));
    if (detail.internal_runs_excluded) {
      bits.push(`${detail.internal_runs_excluded} internal proof or stage runs, excluded`);
    }
  } else if (objective.id === "approval_timeliness") {
    if (detail.decided !== undefined) bits.push(`${detail.decided} decided`);
    if (detail.within_threshold !== undefined) bits.push(`${detail.within_threshold} within ${detail.threshold_hours}h`);
    if (detail.pending_excluded) bits.push(`${detail.pending_excluded} pending, excluded`);
    if (detail.oldest_pending_hours !== null && detail.oldest_pending_hours !== undefined) {
      bits.push(`oldest pending ${detail.oldest_pending_hours}h`);
    }
  }
  if (bits.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {bits.map((bit) => (
        <span key={bit} className="rounded border border-slate-700 bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
          {bit}
        </span>
      ))}
    </div>
  );
}

function ObjectiveCard({ objective }) {
  return (
    <div className="rounded-xl border border-slate-800 p-4" style={{ background: "#111827" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">{objective.name}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{objective.question}</p>
        </div>
        <StatusChip status={objective.status} />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono text-slate-100">{formatValue(objective)}</span>
        <span className="text-[11px] text-slate-500">
          against {formatTarget(objective)}
          {objective.direction === "lower" ? " or lower" : " or higher"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
          window {objective.window}
        </span>
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
          {objective.scope === "platform" ? "platform-wide" : "this tenant"}
        </span>
        {objective.budget_remaining_pct !== null && objective.budget_remaining_pct !== undefined && (
          <span className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            {objective.budget_remaining_pct}% of the allowance left
          </span>
        )}
      </div>

      {objective.status === "unmeasured" && (
        <p className="mt-2 rounded border border-slate-700 bg-slate-900/60 p-2 text-[11px] text-slate-400">
          Not measured: {objective.unmeasured_reason}. This is not a pass.
        </p>
      )}

      <DetailRow objective={objective} />

      <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] leading-snug text-slate-500">{objective.basis}</p>
    </div>
  );
}

export default function SloPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const payload = await sloStatus();
        if (alive) setData(payload);
      } catch (err) {
        if (alive) setError(err?.message || "Could not read the service levels.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const overall = data?.overall;
  const measurement = data?.measurement || {};

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100">
            <Activity className="h-5 w-5 text-cyan-400" />
            Service levels
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Five objectives, each measured from the platform's own telemetry. Every card states where its number comes
            from and what it excludes.
          </p>
        </div>
        {overall && <StatusChip status={overall.status} />}
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-800 p-6 text-sm text-slate-400" style={{ background: "#111827" }}>
          Reading the measurements...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error} The objectives are not shown, because an unread status page is not an empty one.
        </div>
      )}

      {!loading && !error && overall && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Objectives", value: overall.objectives },
              { label: "Met", value: overall.met },
              { label: "Breached", value: overall.breached },
              { label: "Unmeasured", value: overall.unmeasured },
            ].map((tile) => (
              <div key={tile.label} className="rounded-lg border border-slate-800 p-3" style={{ background: "#111827" }}>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{tile.label}</p>
                <p className="mt-1 text-xl font-bold font-mono text-slate-100">{tile.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-[11px] text-slate-400">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            {measurement.first_sample_at ? (
              <span>
                API counters first sampled {new Date(measurement.first_sample_at).toLocaleString()}
                {measurement.days_of_history !== null && ` (${measurement.days_of_history} days of history)`}
                {measurement.longest_assertable_window && `, so no window longer than ${measurement.longest_assertable_window} is asserted`}
              </span>
            ) : (
              <span>No Prometheus history could be read, so no API objective is asserted.</span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {data.objectives.map((objective) => (
              <ObjectiveCard key={objective.id} objective={objective} />
            ))}
          </div>

          <div className="rounded-xl border border-slate-800 p-4" style={{ background: "#111827" }}>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              <Info className="h-3.5 w-3.5" />
              What these numbers do not cover
            </p>
            <ul className="mt-2 space-y-1.5">
              {(data.blind_spots || []).map((spot) => (
                <li key={spot} className="text-[11px] leading-snug text-slate-500">
                  {spot}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-slate-600">
              Generated {data.generated_at ? new Date(data.generated_at).toLocaleString() : "unknown"}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
