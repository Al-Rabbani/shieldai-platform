import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { DashboardPage, StatTile, SectionCard, SeverityBadge, ProgressBar, LoadingSpinner, EmptyState, gradeFromScore, gradeColor } from "@/components/dashboards/DashboardShared";
import PatchImpactSimulator from "@/components/dashboards/PatchImpactSimulator";
import RiskTargetTrendChart from "@/components/dashboards/RiskTargetTrendChart";
import AgentFixLeaderboard from "@/components/dashboards/AgentFixLeaderboard";
import AgentFleetMapCard from "@/components/dashboards/AgentFleetMapCard";
import GeographicThreatHeatmap from "@/components/dashboards/GeographicThreatHeatmap";
import RiskExposureHeatmap90d from "@/components/dashboards/RiskExposureHeatmap90d";
import VulnerabilityTrend90d from "@/components/dashboards/VulnerabilityTrend90d";
import GenerateExecutiveReportButton from "@/components/dashboard/GenerateExecutiveReportButton";
import { Link } from "react-router-dom";
import { Shield, FileCheck, AlertTriangle, Fingerprint, TrendingUp, TrendingDown, Minus, FileText, Briefcase, ChevronRight } from "lucide-react";

const RISK_KPI_NAME = "Overall Risk Score";

export default function ExecutiveDashboardPage() {
  const [riskRecords, setRiskRecords] = useState([]);
  const [openFindings, setOpenFindings] = useState([]);
  const [fixedFindings, setFixedFindings] = useState([]);
  const [agents, setAgents] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [insights, setInsights] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetError, setTargetError] = useState(null);

  const load = useCallback(async () => {
    const [risk, open, fixed, agentRows, fw, k, i, r] = await Promise.all([
      base44.entities.GlobalRiskScore.list("-calculated_at", 200).catch(() => []),
      base44.entities.TriagedFinding.filter({ status: "open" }, "-cvss_score", 500).catch(() => []),
      base44.entities.TriagedFinding.filter({ status: "fixed" }, "-fixed_at", 500).catch(() => []),
      base44.entities.Agent.list("-last_heartbeat", 100).catch(() => []),
      base44.entities.ComplianceFramework.list("-created_date", 50).catch(() => []),
      base44.entities.KPI.list("-last_updated", 100).catch(() => []),
      base44.entities.ExecutiveInsight.list("-created_date", 20).catch(() => []),
      base44.entities.BoardReport.list("-generated_at", 10).catch(() => []),
    ]);
    setRiskRecords(risk);
    setOpenFindings(open);
    setFixedFindings(fixed);
    setAgents(agentRows);
    setFrameworks(fw);
    setKpis(k);
    setInsights(i);
    setReports(r);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveRiskTarget(value) {
    setSavingTarget(true);
    setTargetError(null);
    try {
      const existing = kpis.find((k) => (k.name || "").toLowerCase() === RISK_KPI_NAME.toLowerCase());
      if (existing) {
        await base44.entities.KPI.update(existing.id, { target_value: value, last_updated: new Date().toISOString() });
      } else {
        await base44.entities.KPI.create({
          name: RISK_KPI_NAME,
          category: "risk",
          unit: "/100",
          target_value: value,
          current_value: latest?.overall_score ?? 0,
          direction: "up",
          last_updated: new Date().toISOString(),
        });
      }
      await load();
    } catch (error) {
      setTargetError(error.message);
    }
    setSavingTarget(false);
  }

  if (loading) return <DashboardPage title="Executive Dashboard" badge="EDP-020"><LoadingSpinner /></DashboardPage>;

  const latest = riskRecords.find((r) => Number.isFinite(Number(r.overall_score))) || null;
  const currentScore = latest ? Number(latest.overall_score) : null;
  const criticalOpen = openFindings.filter((f) => (f.severity || f.normalized_severity) === "critical");

  /* A fetched page is not a total. The API answers the count directly through /executive/kpis, and when
   * that is unavailable the tile says so rather than printing the size of the page it happened to load. */
  const kpiNumber = (key) => {
    const row = kpis.find((k) => (k.key ?? k.name) === key);
    const value = row?.value ?? row?.current_value;
    return typeof value === "number" ? value : null;
  };
  const openTotal = kpiNumber("open_findings");
  const criticalOpenTotal = kpiNumber("critical_open");
  const complianceAvg = frameworks.length
    ? Math.round(frameworks.reduce((sum, f) => sum + (f.overall_score ?? f.score ?? 0), 0) / frameworks.length)
    : null;
  const targetKpi = kpis.find((k) => (k.name || "").toLowerCase() === RISK_KPI_NAME.toLowerCase());
  const targetScore = targetKpi ? Number(targetKpi.target_value) : null;

  return (
    <DashboardPage title="Executive Dashboard" badge="EDP-020" subtitle="Board-level security posture, patch simulation, and strategic insights">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-slate-500">Board-ready PDF with the 30-day risk trend, top resolved incidents and current compliance status.</p>
        <GenerateExecutiveReportButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={Shield}
          label="Risk Score"
          value={currentScore == null ? "—" : `${currentScore}/100`}
          sublabel={latest ? `Grade ${latest.grade || gradeFromScore(currentScore)} · recorded ${new Date(latest.calculated_at).toLocaleDateString()}` : "No score snapshot recorded"}
          accent={latest ? gradeColor(latest.grade || gradeFromScore(currentScore)) : "#64748b"}
        />
        <StatTile
          icon={FileCheck}
          label="Compliance Avg"
          value={complianceAvg == null ? "—" : `${complianceAvg}%`}
          sublabel={`${frameworks.length} framework${frameworks.length === 1 ? "" : "s"} scored`}
          accent="#3b82f6"
        />
        <StatTile
          icon={AlertTriangle}
          label="Open Critical Findings"
          value={criticalOpenTotal == null ? "—" : criticalOpenTotal}
          sublabel={openTotal == null ? "open findings total unavailable" : `${openTotal} open findings total`}
          accent={criticalOpenTotal == null ? "#64748b" : criticalOpenTotal > 0 ? "#ef4444" : "#10b981"}
        />
        <StatTile
          icon={Fingerprint}
          label="Unpatched KEV"
          value={latest?.kev_unpatched ?? "—"}
          sublabel="From the latest stored score snapshot"
          accent={(latest?.kev_unpatched ?? 0) > 0 ? "#f97316" : "#10b981"}
        />
      </div>

      <Link
        to="/briefing"
        className="flex flex-wrap items-center gap-3 rounded-xl p-4 transition hover:border-emerald-500/60"
        style={{ background: "#111827", border: "1px solid #1F2937" }}
      >
        <Briefcase size={18} className="text-emerald-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Leadership briefing</p>
          <p className="text-[11px] text-slate-400">Compliance coverage across every framework and the risk reduced this month, in one view.</p>
        </div>
        <ChevronRight size={16} className="text-slate-500" />
      </Link>

      <SectionCard
        title="Patch Impact Simulator"
        action={<span className="text-[11px] text-slate-500">Critical open findings · projection</span>}
      >
        <PatchImpactSimulator
          findings={criticalOpen}
          currentScore={currentScore}
          agents={agents}
          onRecorded={load}
        />
      </SectionCard>

      <SectionCard
        title="Overall Risk Score vs Target"
        action={<span className="text-[11px] text-slate-500">Recorded snapshots</span>}
      >
        <RiskTargetTrendChart
          records={riskRecords}
          target={Number.isFinite(targetScore) ? targetScore : null}
          onSaveTarget={saveRiskTarget}
          savingTarget={savingTarget}
        />
        {targetError && <p className="text-[11px] text-red-400 mt-2">{targetError}</p>}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Vulnerabilities Fixed by Agent">
          <AgentFixLeaderboard fixedFindings={fixedFindings} agents={agents} />
        </SectionCard>

        <SectionCard title="Agent Fleet Status">
          <AgentFleetMapCard agents={agents} />
        </SectionCard>
      </div>

      <SectionCard
        title="Threat Exposure by Region"
        action={<span className="text-[11px] text-slate-500">Geographic pressure · sector drill-down</span>}
      >
        <GeographicThreatHeatmap />
      </SectionCard>

      <SectionCard
        title="Vulnerability Trend — Last 90 Days"
        action={<span className="text-[11px] text-slate-500">Found vs resolved · open backlog</span>}
      >
        <VulnerabilityTrend90d />
      </SectionCard>

      <SectionCard
        title="Risk Exposure — Last 90 Days"
        action={<span className="text-[11px] text-slate-500">Finding density by week and asset type · click to drill down</span>}
      >
        <RiskExposureHeatmap90d />
      </SectionCard>

      <SectionCard title="KPI Grid" action={<span className="text-[11px] text-slate-500">{kpis.length} KPIs tracked</span>}>
        {kpis.length === 0 ? <EmptyState message="No KPIs configured" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {kpis.map((kpi) => {
              const onTarget = kpi.status === "on_track" || kpi.status === "exceeded";
              const pct = kpi.target_value ? (kpi.current_value / kpi.target_value) * 100 : 0;
              const TrendIcon = kpi.direction === "up" ? TrendingUp : kpi.direction === "down" ? TrendingDown : Minus;
              return (
                <div key={kpi.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: `1px solid ${onTarget ? "#10b981" : "#ef4444"}30` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-white truncate">{kpi.name}</p>
                    <TrendIcon size={14} className={onTarget ? "text-emerald-400" : "text-red-400"} />
                  </div>
                  <p className="text-[10px] text-slate-500 mb-2">{kpi.category}</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold" style={{ color: onTarget ? "#10b981" : "#ef4444" }}>{kpi.current_value}</span>
                    <span className="text-[11px] text-slate-500">/ {kpi.target_value} {kpi.unit}</span>
                  </div>
                  <ProgressBar value={pct} color={onTarget ? "#10b981" : "#ef4444"} />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Executive Insights">
        {insights.length === 0 ? <EmptyState message="No executive insights generated" /> : (
          <div className="space-y-2">
            {insights.map((insight) => (
              <div key={insight.id} className="rounded-lg p-3 flex items-start gap-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <SeverityBadge severity={insight.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{insight.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{insight.description}</p>
                  {insight.recommendation && <p className="text-[11px] text-blue-400 mt-1">→ {insight.recommendation}</p>}
                </div>
                {insight.financial_impact_usd != null && (
                  <span className="text-xs font-bold text-amber-400 flex-shrink-0">${(insight.financial_impact_usd / 1000).toFixed(0)}K</span>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Board Reports">
        {reports.length === 0 ? <EmptyState message="No board reports generated" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.map((rep) => (
              <div key={rep.id} className="rounded-lg p-3" style={{ background: "#0a0f1e", border: "1px solid #1F2937" }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-blue-400" />
                  <p className="text-sm font-semibold text-white">{rep.period}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div><span className="text-slate-500">Risk:</span> <span className="font-bold" style={{ color: gradeColor(rep.risk_grade || gradeFromScore(rep.risk_score)) }}>{rep.risk_score ?? "—"}</span></div>
                  <div><span className="text-slate-500">Compliance:</span> <span className="font-bold text-white">{rep.compliance_score ?? "—"}%</span></div>
                </div>
                <button className="mt-3 w-full px-3 py-1.5 rounded-lg text-[11px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition">View Report</button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </DashboardPage>
  );
}