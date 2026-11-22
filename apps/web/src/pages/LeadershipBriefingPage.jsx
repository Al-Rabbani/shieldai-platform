import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import FrameworkComplianceBars from "@/components/dashboard/FrameworkComplianceBars";
import RiskReductionTargetWidget from "@/components/leadership/RiskReductionTargetWidget";
import { Briefcase, ShieldCheck, TrendingDown, Wrench, AlertTriangle } from "lucide-react";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#64748b" };

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function LeadershipBriefingPage() {
  const [checklist, setChecklist] = useState([]);
  const [scores, setScores] = useState([]);
  const [fixed, setFixed] = useState([]);
  const [openFindings, setOpenFindings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [items, scoreRows, fixedRows, openRows] = await Promise.all([
        base44.entities.ComplianceChecklistItem.list("-created_date", 500).catch(() => []),
        base44.entities.GlobalRiskScore.list("-calculated_at", 200).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: "fixed" }, "-fixed_at", 500).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 500).catch(() => []),
      ]);
      setChecklist(items || []);
      setScores(scoreRows || []);
      setFixed(fixedRows || []);
      setOpenFindings(openRows || []);
      setLoading(false);
    })();
  }, []);

  const compliance = useMemo(() => {
    const byFramework = new Map();
    checklist.forEach((item) => {
      const key = item.framework || "other";
      const row = byFramework.get(key) || { framework: key, total: 0, complete: 0, missingEvidence: 0 };
      row.total += 1;
      if (item.status === "complete") {
        row.complete += 1;
        if (item.evidence_missing) row.missingEvidence += 1;
      }
      byFramework.set(key, row);
    });
    const rows = [...byFramework.values()].map((row) => ({ ...row, percent: row.total ? Math.round((row.complete / row.total) * 100) : 0 }));
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const complete = rows.reduce((sum, row) => sum + row.complete, 0);
    return { rows: rows.sort((a, b) => a.framework.localeCompare(b.framework)), total, complete, percent: total ? Math.round((complete / total) * 100) : 0 };
  }, [checklist]);

  const risk = useMemo(() => {
    const start = monthStart().getTime();
    const thisMonth = scores
      .filter((row) => row.calculated_at && new Date(row.calculated_at).getTime() >= start)
      .sort((a, b) => new Date(a.calculated_at) - new Date(b.calculated_at));
    const first = thisMonth[0];
    const last = thisMonth[thisMonth.length - 1];
    const reduction = first && last ? Math.max(0, (first.overall_score ?? 0) - (last.overall_score ?? 0)) : 0;
    const fixedThisMonth = fixed.filter((f) => f.fixed_at && new Date(f.fixed_at).getTime() >= start);
    return {
      current: last?.overall_score ?? scores[0]?.overall_score ?? null,
      grade: last?.grade ?? scores[0]?.grade ?? null,
      createdAt: last?.calculated_at ?? null,
      reduction,
      fixedThisMonth,
      hasSnapshots: thisMonth.length > 0,
    };
  }, [scores, fixed]);

  const openCritical = openFindings.filter((f) => (f.severity || f.normalized_severity) === "critical");
  const topExposures = [...openFindings]
    .sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0))
    .slice(0, 6);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Briefcase size={22} className="text-emerald-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">EXE-001 | LEADERSHIP BRIEFING</span>
            <h1 className="text-xl font-bold text-white mt-1">Leadership briefing</h1>
            <p className="text-xs text-slate-500">Compliance coverage across all frameworks and the risk reduced so far this month.</p>
          </div>
        </div>
        <Link to="/executive-dashboard" className="px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition">
          Executive dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #10b981" }}>
          <div className="flex items-center gap-2 mb-1"><ShieldCheck size={14} className="text-emerald-400" /><p className="text-[10px] uppercase text-slate-500">Compliance</p></div>
          <p className="text-2xl font-bold text-white font-mono">{compliance.percent}%</p>
          <p className="text-[10px] text-slate-500">{compliance.complete} of {compliance.total} controls · {compliance.rows.length} frameworks</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #3b82f6" }}>
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={14} className="text-blue-400" /><p className="text-[10px] uppercase text-slate-500">Risk reduced this month</p></div>
          <p className="text-2xl font-bold text-white font-mono">{risk.hasSnapshots ? risk.reduction.toFixed(1) : "—"}</p>
          <p className="text-[10px] text-slate-500">{risk.hasSnapshots ? "score points, month to date" : "no score snapshot this month yet"}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #a855f7" }}>
          <div className="flex items-center gap-2 mb-1"><Wrench size={14} className="text-purple-400" /><p className="text-[10px] uppercase text-slate-500">Fixes shipped</p></div>
          <p className="text-2xl font-bold text-white font-mono">{risk.fixedThisMonth.length}</p>
          <p className="text-[10px] text-slate-500">{risk.fixedThisMonth.filter((f) => (f.severity || f.normalized_severity) === "critical").length} critical · this month</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: "3px solid #ef4444" }}>
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-red-400" /><p className="text-[10px] uppercase text-slate-500">Current risk posture</p></div>
          <p className="text-2xl font-bold text-white font-mono">{risk.current ?? "—"}<span className="text-sm text-slate-500 ml-1">{risk.grade ?? ""}</span></p>
          <p className="text-[10px] text-slate-500">{openCritical.length} open critical finding(s)</p>
        </div>
      </div>

      <RiskReductionTargetWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">Compliance by framework</p>
            <p className="text-[10px] text-slate-500">checklist completion</p>
          </div>
          <FrameworkComplianceBars frameworks={compliance.rows} />
          <p className="text-[10px] text-slate-600 mt-3">Percentages count checklist controls marked complete, not audit attestations.</p>
        </div>

        <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-sm font-bold text-white mb-3">Month at a glance</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <span className="text-[11px] text-slate-400">Risk score at month start</span>
              <span className="text-[11px] font-mono text-white">{risk.hasSnapshots ? (risk.reduction + (risk.current || 0)).toFixed(1) : "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <span className="text-[11px] text-slate-400">Risk score now</span>
              <span className="text-[11px] font-mono text-emerald-400">{risk.current ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <span className="text-[11px] text-slate-400">Findings still open</span>
              <span className="text-[11px] font-mono text-white">{openFindings.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
              <span className="text-[11px] text-slate-400">Snapshot timestamp</span>
              <span className="text-[11px] font-mono text-slate-400">{risk.createdAt ? new Date(risk.createdAt).toLocaleString("en-GB") : "—"}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 mt-3">Risk reduction compares the first and latest recorded score snapshot inside this month.</p>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-2">Highest open exposures</p>
        {topExposures.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No open findings.</p>
        ) : (
          <div className="space-y-1">
            {topExposures.map((finding) => (
              <div key={finding.id} className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <span className="text-[9px] font-bold uppercase w-14" style={{ color: SEV_COLOR[finding.severity || finding.normalized_severity] || SEV_COLOR.info }}>
                  {finding.severity || finding.normalized_severity}
                </span>
                <span className="text-[11px] text-slate-200 flex-1 min-w-0 truncate">{finding.title}</span>
                <span className="text-[10px] text-slate-500 font-mono">{finding.asset_name}</span>
                <span className="text-[10px] font-mono text-slate-400">{finding.cvss_score ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}