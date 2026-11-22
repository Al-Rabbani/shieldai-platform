import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SlaCountdown, { slaDeadline } from "@/components/triage/SlaCountdown";
import { loadSlaTargets } from "@/lib/slaTargets";
import { Timer, RefreshCw, ArrowRight, Flame, AlertTriangle, ShieldCheck } from "lucide-react";

const SEV_STYLE = {
  critical: "text-red-300 border-red-500/40 bg-red-500/10",
  high: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  low: "text-blue-300 border-blue-500/40 bg-blue-500/10",
  info: "text-slate-300 border-slate-600 bg-slate-700/20",
};

const BUCKETS = [
  { key: "breached", label: "Already breached", color: "#ef4444", test: (ms) => ms < 0 },
  { key: "under6", label: "Under 6 hours", color: "#f97316", test: (ms) => ms >= 0 && ms < 6 * 3600000 },
  { key: "under24", label: "Under 24 hours", color: "#f59e0b", test: (ms) => ms >= 6 * 3600000 && ms < 24 * 3600000 },
  { key: "under72", label: "Under 72 hours", color: "#eab308", test: (ms) => ms >= 24 * 3600000 && ms < 72 * 3600000 },
];

export default function SlaBreachRadarPage() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const rows = await base44.entities.TriagedFinding
      .filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 200)
      .catch(() => []);
    setFindings((rows || []).filter((finding) => !finding.snoozed_until || new Date(finding.snoozed_until) <= new Date()));
    setLoading(false);
  }

  useEffect(() => { loadSlaTargets(); load(); }, []);

  const ranked = useMemo(() => {
    const now = Date.now();
    return findings
      .map((finding) => {
        const deadline = slaDeadline(finding);
        return { finding, deadline, remaining: deadline ? deadline.getTime() - now : null };
      })
      .filter((row) => row.remaining !== null)
      .sort((a, b) => a.remaining - b.remaining);
  }, [findings]);

  const counts = BUCKETS.map((bucket) => ({
    ...bucket,
    value: ranked.filter((row) => bucket.test(row.remaining)).length,
  }));

  return (
    <div className="space-y-4" style={{ background: "#0a0f1e", minHeight: "100vh" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Timer size={22} className="text-blue-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">TRQ-004 | SLA RADAR</span>
            <h1 className="text-xl font-bold text-white mt-1">Closest to breaching SLA</h1>
            <p className="text-xs text-slate-500">Every open finding across the fleet, ranked by the time left before its fix deadline.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/triage" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition">
            Triage queue <ArrowRight size={13} />
          </Link>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 text-slate-300 border border-slate-700 hover:bg-white/10 transition">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {counts.map((bucket) => (
          <div key={bucket.key} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${bucket.color}` }}>
            <p className="text-xl font-bold font-mono" style={{ color: bucket.color }}>{loading ? "—" : bucket.value}</p>
            <p className="text-[10px] text-slate-500">{bucket.label}</p>
          </div>
        ))}
      </div>

      {!loading && ranked[0] && (
        <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <Flame size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-[11px] text-slate-300">
            Most urgent right now: <span className="font-bold text-white">{ranked[0].finding.title}</span> on {ranked[0].finding.asset_name || "an unassigned asset"} —{" "}
            <SlaCountdown finding={ranked[0].finding} />
          </p>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        {loading ? (
          <div className="py-16 flex justify-center">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
          </div>
        ) : ranked.length === 0 ? (
          <div className="py-16 text-center">
            <ShieldCheck size={22} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-xs text-slate-500">No open findings with a remediation deadline.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {ranked.map(({ finding }, index) => (
              <div key={finding.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-6 text-[11px] font-bold font-mono text-slate-600 text-right flex-shrink-0">{index + 1}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${SEV_STYLE[finding.severity] || SEV_STYLE.info}`}>
                  {finding.severity || "info"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{finding.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {finding.asset_name || "No asset"} · {finding.owner_team || "unowned"} · {finding.assigned_to || "unassigned"}
                  </p>
                </div>
                <SlaCountdown finding={finding} />
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-600 flex items-center gap-1">
        <AlertTriangle size={11} /> Deadlines come from each finding's SLA, or its severity when none is set. Snoozed findings are excluded.
      </p>
    </div>
  );
}