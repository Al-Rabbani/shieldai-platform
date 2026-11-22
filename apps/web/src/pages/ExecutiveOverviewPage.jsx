import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Briefcase, ShieldCheck, Inbox, Wrench, AlertTriangle, Bug, Clock } from "lucide-react";
import ExecSummaryStrip from "@/components/executive/ExecSummaryStrip";
import ExecRiskTrendPanel from "@/components/executive/ExecRiskTrendPanel";
import ExecCompliancePanel from "@/components/executive/ExecCompliancePanel";
import ExecRecentTrendsPanel from "@/components/executive/ExecRecentTrendsPanel";
import ExecTopRisksPanel from "@/components/executive/ExecTopRisksPanel";
import GenerateExecutiveReportButton from "@/components/dashboard/GenerateExecutiveReportButton";

const DAY = 86400000;
const TREND_DAYS = 180;

export default function ExecutiveOverviewPage() {
  const [snapshots, setSnapshots] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [openFindings, setOpenFindings] = useState([]);
  const [findingSummary, setFindingSummary] = useState(null);
  const [opened30, setOpened30] = useState(null);
  const [fixed30, setFixed30] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cutoff = new Date(Date.now() - 30 * DAY).toISOString();
      const [riskRows, frameworkRows, openRows, openedCount, fixedCount, findingSummary] = await Promise.all([
        base44.entities.GlobalRiskScore.list("-calculated_at", 500).catch(() => []),
        base44.entities.ComplianceFramework.list("-created_date", 50).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: { $in: ["open", "in_remediation"] } }, "-cvss_score", 200).catch(() => []),
        base44.entities.TriagedFinding.count({ detected_at: { $gte: cutoff } }).catch(() => null),
        base44.entities.TriagedFinding.count({ status: "fixed", fixed_at: { $gte: cutoff } }).catch(() => null),
        base44.entities.TriagedFinding.summary().catch(() => null),
      ]);
      setSnapshots((riskRows || []).filter((row) => Number.isFinite(Number(row.overall_score)) && row.calculated_at));
      setFrameworks(frameworkRows || []);
      setOpenFindings(openRows || []);
      setOpened30(openedCount);
      setFixed30(fixedCount);
      setFindingSummary(findingSummary || null);
      setLoading(false);
    })();
  }, []);

  const view = useMemo(() => {
    const ordered = [...snapshots].sort((a, b) => new Date(a.calculated_at) - new Date(b.calculated_at));
    const latest = ordered[ordered.length - 1] || null;
    const cutoff30 = Date.now() - 30 * DAY;
    const baseline = [...ordered].reverse().find((row) => new Date(row.calculated_at).getTime() <= cutoff30) || ordered[0] || null;
    const delta30 = latest && baseline ? Math.round((Number(latest.overall_score) - Number(baseline.overall_score)) * 10) / 10 : 0;

    const since = Date.now() - TREND_DAYS * DAY;
    const points = ordered
      .filter((row) => new Date(row.calculated_at).getTime() >= since)
      .map((row) => ({
        label: format(new Date(row.calculated_at), "d MMM"),
        score: Number(row.overall_score),
        grade: row.grade,
      }));

    const critical = openFindings.filter((f) => (f.severity || f.normalized_severity) === "critical");
    const high = openFindings.filter((f) => (f.severity || f.normalized_severity) === "high");
    const readiness = frameworks.length
      ? Math.round(frameworks.reduce((sum, framework) => sum + (Number(framework.score) || 0), 0) / frameworks.length)
      : 0;
    const clean = frameworks.filter((framework) => framework.status === "compliant").length;
    const partial = frameworks.filter((framework) => framework.status === "partial").length;
    const overdue = openFindings.filter((finding) => {
      if (finding.sla_breached === true) return true;
      if (!finding.sla_deadline) return false;
      return new Date(finding.sla_deadline).getTime() < Date.now();
    }).length;

    return { ordered, latest, baseline, delta30, points, critical, high, readiness, clean, partial, overdue };
  }, [snapshots, frameworks, openFindings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-emerald-400 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  const { latest, baseline, delta30, points, critical, high, readiness, clean, partial, overdue } = view;
  const score = latest ? Number(latest.overall_score) : null;
  const grade = latest?.grade || "—";
  /* The estate counts come from the platform's summary. openFindings is a 200-row sample: it can describe
   * the findings it holds, never how many exist. */
  const totalOpen = typeof findingSummary?.open === "number" ? findingSummary.open : null;
  const criticalTotal = typeof findingSummary?.critical === "number" ? findingSummary.critical : null;
  const highTotal = typeof findingSummary?.high === "number" ? findingSummary.high : null;

  const trendWord = delta30 > 0 ? "improved" : delta30 < 0 ? "slipped" : "held steady";
  const headline = score == null
    ? "No posture score has been recorded yet — run an evaluation to start the leadership trend."
    : `Posture ${trendWord}${delta30 ? ` ${Math.abs(delta30)} points` : ""} over the last 30 days to ${score}/100 (grade ${grade}), with compliance readiness at ${readiness}% across ${frameworks.length} framework${frameworks.length === 1 ? "" : "s"}. ${criticalTotal == null ? "The critical finding count is unavailable." : `${criticalTotal} critical finding${criticalTotal === 1 ? "" : "s"} remain open.`}`;

  const tiles = [
    {
      label: "Risk score",
      value: score == null ? "—" : `${score}`,
      note: score == null ? "no snapshot recorded" : `grade ${grade} · ${delta30 > 0 ? "+" : ""}${delta30} pts in 30 days`,
      tone: score == null ? "slate" : score >= 80 ? "green" : score >= 60 ? "amber" : "red",
    },
    {
      label: "Compliance readiness",
      value: `${readiness}%`,
      note: `${clean} compliant · ${partial} partial of ${frameworks.length}`,
      tone: readiness >= 80 ? "green" : readiness >= 50 ? "amber" : "red",
    },
    {
      label: "Open critical",
      value: criticalTotal == null ? "—" : criticalTotal,
      note: `${highTotal == null ? "—" : highTotal} high · ${totalOpen == null ? "—" : totalOpen} open in total`,
      tone: criticalTotal == null ? "slate" : criticalTotal ? "red" : "green",
    },
    {
      label: "SLA deadlines missed",
      value: latest?.sla_breached ?? overdue,
      note: overdue ? "findings past their fix deadline" : "every open finding is inside its SLA",
      tone: overdue ? "red" : "green",
    },
  ];

  const trendRows = [
    {
      label: "Risk score movement (30 days)",
      value: `${delta30 > 0 ? "+" : ""}${delta30} pts`,
      note: baseline ? `${baseline.overall_score} on ${format(new Date(baseline.calculated_at), "d MMM")} → ${score} now` : "no 30-day baseline yet",
      direction: delta30 > 0 ? "up" : delta30 < 0 ? "down" : "flat",
      icon: ShieldCheck,
    },
    {
      label: "Findings opened (30 days)",
      value: opened30 == null ? "—" : opened30,
      note: "new findings detected by the scanners",
      direction: "flat",
      icon: Inbox,
    },
    {
      label: "Findings resolved (30 days)",
      value: fixed30 == null ? "—" : fixed30,
      note: "closed as fixed and verified",
      direction: (fixed30 || 0) > 0 ? "up" : "flat",
      icon: Wrench,
    },
    {
      label: "Critical findings trend",
      value: critical.length,
      note: latest?.critical_findings != null ? `${latest.critical_findings} in the latest score snapshot` : "from the live open queue",
      direction: "down",
      icon: AlertTriangle,
    },
    {
      label: "Unpatched known-exploited",
      value: latest?.kev_unpatched ?? "—",
      note: "CISA KEV entries still unpatched",
      direction: (latest?.kev_unpatched || 0) > 0 ? "down" : "up",
      icon: Bug,
    },
  ];

  const topRisks = [...openFindings]
    .filter((finding) => ["critical", "high"].includes(finding.severity || finding.normalized_severity))
    .sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0))
    .slice(0, 6);

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Briefcase size={22} className="text-emerald-400 mt-0.5" />
          <div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              EXE-002 | EXECUTIVE OVERVIEW
            </span>
            <h1 className="text-xl font-bold text-white mt-1">Executive overview</h1>
            <p className="text-xs text-slate-500">
              Risk scores, compliance readiness and recent security trends in one leadership report.
            </p>
            <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
              <Clock size={10} />
              {latest ? `Posture snapshot ${format(new Date(latest.calculated_at), "d MMM yyyy, HH:mm")}` : "No posture snapshot recorded"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GenerateExecutiveReportButton />
          <Link
            to="/executive-dashboard"
            className="px-3 py-2 rounded-lg text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition"
          >
            Operational dashboard
          </Link>
        </div>
      </div>

      <ExecSummaryStrip tiles={tiles} headline={headline} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExecRiskTrendPanel points={points} windowLabel="last 6 months" delta={delta30} />
        <ExecCompliancePanel frameworks={frameworks} readiness={readiness} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExecRecentTrendsPanel rows={trendRows} />
        <ExecTopRisksPanel findings={topRisks} />
      </div>

      <p className="text-[10px] text-slate-600">
        Figures are read live from stored posture snapshots, framework assessments and the open finding queue at the moment this page loads.
      </p>
    </div>
  );
}