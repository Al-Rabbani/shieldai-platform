import React, { useCallback, useEffect, useState } from "react";
import { attemptWrite } from "@/lib/writeFailure";
import { decideApproval, listApprovals, standingApprovals } from "@/api/base44Client";

/**
 * The approval queue, which did not exist.
 *
 * MEASURED 26 Nov 2026: seven approvals were pending and the platform had no page that listed them. The adapter
 * mapped an ApprovalRequest entity to /approvals and nothing routed to it, so the only way to decide a request was to
 * call the API by hand. The reminder job added the same day tells a decider that something is waiting, and until this
 * page existed that message had nowhere to send them.
 *
 * Every number here is the server's: hours_remaining is computed from the one window definition the expiry job and the
 * reminder job also read, so the countdown on this page cannot disagree with the job that will kill the request.
 */

const RISK_STYLES = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  medium: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  low: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

function riskStyle(riskClass) {
  return RISK_STYLES[(riskClass || "").toLowerCase()] || RISK_STYLES.low;
}

function remainingTone(hours) {
  if (hours === null || hours === undefined) return "text-slate-400";
  if (hours <= 0) return "text-slate-500";
  if (hours < 4) return "text-red-400";
  if (hours < 10) return "text-amber-300";
  return "text-emerald-300";
}

function remainingLabel(hours) {
  if (hours === null || hours === undefined) return "no deadline recorded";
  if (hours <= 0) return "window closed";
  if (hours < 1) return `expires in ${Math.round(hours * 60)} min`;
  return `expires in ${hours.toFixed(1)}h`;
}

function ageLabel(createdAt) {
  if (!createdAt) return "age unknown";
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hours < 1) return `raised ${Math.round(hours * 60)} min ago`;
  return `raised ${hours.toFixed(1)}h ago`;
}

export default function ApprovalsQueuePage() {
  const [pending, setPending] = useState([]);
  const [decided, setDecided] = useState([]);
  const [standing, setStanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [open, closed, standingRows] = await Promise.all([
        listApprovals("pending"),
        listApprovals(""),
        standingApprovals().catch(() => []),
      ]);
      setStanding(standingRows || []);
      setPending(open);
      setDecided(
        (closed || [])
          .filter((row) => row.status !== "pending")
          .sort((a, b) => new Date(b.decided_at || b.created_at) - new Date(a.decided_at || a.created_at))
          .slice(0, 10),
      );
      setError(null);
    } catch (err) {
      setError(err?.message || "the queue could not be read");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(approval, decision) {
    setBusy(approval.id);
    const saved = await attemptWrite(`record the ${decision} decision`, () =>
      decideApproval(approval.id, decision),
    );
    setBusy(null);
    if (saved !== null) await load();
  }

  const expired = pending.filter((row) => (row.hours_remaining ?? 1) <= 0).length;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-white">Approval queue</h1>
        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300">
          {pending.length} awaiting a decision
        </span>
        {expired > 0 && (
          <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-300">
            {expired} past the window
          </span>
        )}
      </div>

      <p className="max-w-3xl text-xs leading-relaxed text-slate-400">
        An approval is decidable for 24 hours from the moment it is raised. The countdown below is computed from the
        same window the expiry job uses, so a request that reads 3h here is killed by that job in three hours and the
        action it gates does not run. Reminders go to everyone holding approvals:decide at 12h and 20h.
      </p>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          The queue could not be read: {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400">Reading the queue...</div>
      ) : pending.length === 0 ? (
        <div className="rounded border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
          Nothing is waiting for a decision.
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((approval) => (
            <div
              key={approval.id}
              className="rounded border border-slate-800 bg-slate-900/60 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase ${riskStyle(approval.risk_class)}`}
                >
                  {approval.risk_class || "unclassified"}
                </span>
                <span className={`text-xs font-mono ${remainingTone(approval.hours_remaining)}`}>
                  {remainingLabel(approval.hours_remaining)}
                </span>
                <span className="text-xs text-slate-500">{ageLabel(approval.created_at)}</span>
              </div>
              <div className="mt-1.5 text-sm text-slate-100">{approval.action_description}</div>
              <div className="mt-1 text-[11px] font-mono text-slate-500">
                requested by {String(approval.requested_by_user_id).slice(0, 8)} · {approval.id.slice(0, 8)}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy === approval.id}
                  onClick={() => decide(approval, "approved")}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy === approval.id}
                  onClick={() => decide(approval, "rejected")}
                  className="rounded border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <h2 className="text-sm font-semibold text-slate-200">Standing authority</h2>
        <p className="mt-0.5 max-w-3xl text-[11px] leading-relaxed text-slate-500">
          An approval here authorises the same action again without asking a human, until the stated time. It is the
          most consequential state an approval holds, so it is listed separately from single decisions.
        </p>
        {standing.length === 0 ? (
          <div className="mt-1 text-xs text-slate-500">No action currently holds standing authority.</div>
        ) : (
          <div className="mt-1 space-y-1">
            {standing.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-2 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase ${riskStyle(row.risk_class)}`}>
                  {row.risk_class || "unclassified"}
                </span>
                <span className={`text-[11px] font-mono ${remainingTone(row.hours_remaining)}`}>
                  {row.hours_remaining === null ? "no expiry" : `until ${new Date(row.standing_until).toISOString().slice(0, 16).replace("T", " ")} UTC (${row.hours_remaining.toFixed(1)}h)`}
                </span>
                <span className="text-[11px] text-slate-300">{row.action_description}</span>
                <span className="text-[10px] font-mono text-slate-500">
                  {row.uses} use(s){row.last_used ? `, last ${new Date(row.last_used).toISOString().slice(0, 16).replace("T", " ")}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <h2 className="text-sm font-semibold text-slate-200">Recently decided</h2>
        {decided.length === 0 ? (
          <div className="mt-1 text-xs text-slate-500">No decisions recorded yet.</div>
        ) : (
          <div className="mt-1 space-y-1">
            {decided.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono uppercase text-slate-300">{row.status}</span>
                <span className="truncate">{row.action_description}</span>
                {row.decided_at && (
                  <span className="text-slate-600">
                    {new Date(row.decided_at).toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
