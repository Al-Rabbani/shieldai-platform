import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { AlarmClock, ArrowRight } from "lucide-react";
import { format, startOfWeek } from "date-fns";

const OPEN_STATUSES = ["open", "in_remediation", "accepted_risk"];
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const SEV_STYLE = {
  critical: "text-red-300 border-red-500/40 bg-red-500/10",
  high: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  low: "text-blue-300 border-blue-500/40 bg-blue-500/10",
  info: "text-slate-300 border-slate-500/40 bg-slate-500/10",
};

export default function SlaBreachWeeklyReport() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    base44.entities.TriagedFinding.list("-sla_deadline", 500)
      .then((rows) => { if (active) setFindings(rows || []); })
      .catch(() => { if (active) setFindings([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const overdue = useMemo(() => {
    const now = Date.now();
    return findings
      .filter((f) => f.sla_deadline && OPEN_STATUSES.includes(f.status))
      .filter((f) => new Date(f.sla_deadline).getTime() < now)
      .map((f) => ({
        ...f,
        daysOverdue: Math.floor((now - new Date(f.sla_deadline).getTime()) / 86400000),
      }))
      .sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9) || b.daysOverdue - a.daysOverdue);
  }, [findings]);

  const counts = useMemo(() => overdue.reduce((acc, f) => {
    acc[f.severity || "info"] = (acc[f.severity || "info"] || 0) + 1;
    return acc;
  }, {}), [overdue]);

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMM yyyy");

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2">
          <AlarmClock size={16} className="text-red-400 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Weekly SLA Breach Summary</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Week of {weekStart} · every finding currently past its remediation deadline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-white">{loading ? "—" : overdue.length}</span>
          <Link to="/sla-radar" className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300">
            SLA radar <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="h-24 rounded-lg animate-shimmer" style={{ background: "#0a0f1e" }} />
      ) : overdue.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-6 text-center">Nothing is past its deadline this week — every open finding is inside its SLA.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {["critical", "high", "medium", "low"].filter((sev) => counts[sev]).map((sev) => (
              <span key={sev} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${SEV_STYLE[sev]}`}>
                {counts[sev]} {sev}
              </span>
            ))}
          </div>

          <div className="space-y-1">
            {overdue.slice(0, 8).map((finding) => (
              <div key={finding.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex-shrink-0 ${SEV_STYLE[finding.severity] || SEV_STYLE.info}`}>
                  {finding.severity || "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-200 truncate">{finding.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {finding.asset_name || "Unassigned asset"}{finding.owner_team ? ` · ${finding.owner_team}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] font-bold flex-shrink-0 ${finding.daysOverdue >= 7 ? "text-red-400" : "text-amber-400"}`}>
                  {finding.daysOverdue}d over
                </span>
              </div>
            ))}
          </div>

          {overdue.length > 8 && (
            <p className="text-[10px] text-slate-500 mt-2">
              +{overdue.length - 8} more past deadline —{" "}
              <Link to="/triage" className="text-blue-400 hover:text-blue-300 font-bold">open the triage queue</Link>.
            </p>
          )}
        </>
      )}
    </div>
  );
}