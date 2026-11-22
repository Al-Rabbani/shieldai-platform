import React, { useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import StatTile, { RiskScoreTile } from "@/components/commandcenter/StatTile";
import CloudAndScansColumn from "@/components/commandcenter/CloudAndScansColumn";
import ThreatAndIncidentsColumn from "@/components/commandcenter/ThreatAndIncidentsColumn";
import ComplianceAndCIEMColumn from "@/components/commandcenter/ComplianceAndCIEMColumn";
import QuickActionsBar from "@/components/commandcenter/QuickActionsBar";
import CriticalAlertBanner from "@/components/commandcenter/CriticalAlertBanner";
import ScanJobStuckBanner from "@/components/commandcenter/ScanJobStuckBanner";
import GdprCountdownCard from "@/components/commandcenter/GdprCountdownCard";
import TopFindingsTable from "@/components/commandcenter/TopFindingsTable";
import TopCloudFindingsTable from "@/components/commandcenter/TopCloudFindingsTable";
import VulnClusterHeatmap from "@/components/commandcenter/VulnClusterHeatmap";
import VulnAgeHeatmap from "@/components/commandcenter/VulnAgeHeatmap";
import DashboardScopeBar from "@/components/commandcenter/DashboardScopeBar";
import AssetRiskBubbleCluster from "@/components/commandcenter/AssetRiskBubbleCluster";
import AssetDependencyMap from "@/components/assets/AssetDependencyMap";
import CloudAssetVulnHeatmap from "@/components/dashboard/CloudAssetVulnHeatmap";
import HighRiskAreasHeatmap from "@/components/dashboard/HighRiskAreasHeatmap";
import GenerateExecutiveReportButton from "@/components/dashboard/GenerateExecutiveReportButton";
import { scopeFindings, readDashboardScope, saveDashboardScope } from "@/lib/dashboardScope";
import SectorDrillDown from "@/components/commandcenter/SectorDrillDown";
import ScanStatusBar from "@/components/commandcenter/ScanStatusBar";
import IntelligenceFeedStrip from "@/components/commandcenter/IntelligenceFeedStrip";
import NationalCampaignFeed from "@/components/commandcenter/NationalCampaignFeed";
import AgentActivityStrip from "@/components/commandcenter/AgentActivityStrip";
import RiskReductionChart from "@/components/dashboard/RiskReductionChart";
import RiskScoreSixMonthChart from "@/components/dashboard/RiskScoreSixMonthChart";
import SlaBreachWeeklyReport from "@/components/dashboard/SlaBreachWeeklyReport";
import { Link } from "react-router-dom";
import DailyIntelligenceSummary from "@/components/dashboard/DailyIntelligenceSummary";
import { invokeAction } from "@/lib/invokeAction";
import GlobeHero from "@/components/home/GlobeHero";
import ExecutiveOverviewLink from "@/components/commandcenter/ExecutiveOverviewLink";
import RiskTrendChart from "@/components/home/RiskTrendChart";
import ThreatBreakdownDonut from "@/components/home/ThreatBreakdownDonut";
import SecurityFeaturesRow from "@/components/home/SecurityFeaturesRow";

export default function CommandCenter() {
  const [dailySummary, setDailySummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    invokeAction("gdsAgentOS", {
      action: "command", command_type: "soc_summary",
      input: "Daily intelligence summary for the GDS Command Centre dashboard. 3 paragraphs max. Lead with most critical issue. Include risk score, top CVE, cloud status, active incident if any. End with single most important action for today.",
      priority: "normal",
    }).then(r => setDailySummary(r.response)).catch(() => setDailySummary("Summary unavailable.")).finally(() => setSummaryLoading(false));
  }, []);
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState(null);
  const [cloudFindings, setCloudFindings] = useState([]);
  const [triagedFindings, setTriagedFindings] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [scanJobs, setScanJobs] = useState([]);
  const [darkWebAlerts, setDarkWebAlerts] = useState([]);
  const [ciemFindings, setCiemFindings] = useState([]);
  const [msspCustomers, setMsspCustomers] = useState(0);
  const [intelFeeds, setIntelFeeds] = useState([]);
  const [agents, setAgents] = useState([]);
  const [attackPaths, setAttackPaths] = useState([]);
  const [assets, setAssets] = useState([]);
  const [runtimeThreats, setRuntimeThreats] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [scope, setScope] = useState(readDashboardScope);

  useEffect(() => { saveDashboardScope(scope); }, [scope]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [riskList, cloud, triaged, inc, comp, scans, dw, ciem, tenants, feeds, agentList, paths, rtThreats, assetList, kpiList] = await Promise.all([
      base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
      base44.entities.CloudFinding.list("-detected_at", 500).catch(() => []),
      // Open only: asking for the newest rows regardless of status spent the page on fixed findings and
      // then counted the remainder as the estate total.
      base44.entities.TriagedFinding.filter({ status: "open" }, "-detected_at", 500).catch(() => []),
      base44.entities.Incident.list("-opened_at", 20).catch(() => []),
      base44.entities.ComplianceFramework.list("-created_date", 10).catch(() => []),
      base44.entities.ScanJob.list("-created_date", 10).catch(() => []),
      base44.entities.DarkWebAlert.list("-detected_at", 10).catch(() => []),
      base44.entities.CIEMFinding.list("-detected_at", 20).catch(() => []),
      base44.entities.CustomerTenant.list().catch(() => []),
      base44.entities.ThreatIntelFeed.list("-detected_at", 20).catch(() => []),
      base44.entities.Agent.list("-last_heartbeat", 8).catch(() => []),
      base44.entities.CloudAttackPath.list("-detected_at", 50).catch(() => []),
      base44.entities.RuntimeThreat.list("-last_seen", 50).catch(() => []),
      base44.entities.Asset.list("-created_date", 300).catch(() => []),
      base44.entities.KPI.list("-last_updated", 100).catch(() => []),
    ]);
    setAttackPaths(paths);
    setRuntimeThreats(rtThreats);
    setAssets(assetList);
    setKpis(kpiList);
    setRisk(riskList[0] || null);
    setCloudFindings(cloud);
    setTriagedFindings(triaged);
    setIncidents(inc);
    setFrameworks(comp);
    setScanJobs(scans);
    setDarkWebAlerts(dw);
    setCiemFindings(ciem);
    setMsspCustomers(tenants.filter(t => t.status === "active").length);
    setIntelFeeds(feeds.filter(f => f.affects_you).slice(0, 5));
    setAgents(agentList);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCloud = cloudFindings.filter(f => f.status === "open");
  const cloudCritical = openCloud.filter(f => f.severity === "critical");
  const openTriaged = triagedFindings.filter(f => f.status === "open");
  const criticalTriaged = openTriaged.filter(f => f.normalized_severity === "critical" || f.severity === "critical");
  const complianceAvg = frameworks.length ? Math.round(frameworks.reduce((s, f) => s + (f.score || 0), 0) / frameworks.length) : 0;
  const openIncidents = incidents.filter(i => ["open", "investigating"].includes(i.status));
  const investigatingIncident = incidents.find(i => i.status === "investigating");
  const gdprIncident = incidents.find(i => i.status === "investigating" && i.title?.toLowerCase().includes("lockbit"));
  const stuckScan = scanJobs.find(s => s.status === "running" && s.started_at && (Date.now() - new Date(s.started_at).getTime()) > 24 * 60 * 60 * 1000);

  /* The estate counts come from the platform, not from the page of rows loaded above. A fetched page is a
   * sample: it is capped at 500 rows, so its length can never be presented as "how many are open". */
  const kpiNumber = (key) => {
    const row = kpis.find((k) => (k.key ?? k.name) === key);
    const value = row?.value ?? row?.current_value;
    return typeof value === "number" ? value : null;
  };
  const openTotal = kpiNumber("open_findings");
  const criticalTotal = kpiNumber("critical_open");

  // The role view narrows every finding visual below to that person's remit.
  const scopedOpen = scopeFindings(openTriaged, scope.role, scope.severity);
  const scopedCritical = scopedOpen.filter(f => (f.severity || f.normalized_severity) === "critical");
  const topFindings = [...scopedOpen].sort((a, b) => (b.cvss_score || 0) - (a.cvss_score || 0)).slice(0, 10);
  const topCloudFindings = cloudFindings.filter(f => f.severity === "critical")
    .sort((a, b) => new Date(b.detected_at || 0) - new Date(a.detected_at || 0)).slice(0, 8);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  const featureStats = {
    attackPaths: attackPaths.filter(p => p.status === "active" && p.severity === "critical").length,
    runtimeThreats: runtimeThreats.filter(t => t.status === "active").length,
    openIncidents: openIncidents.length,
    darkWebAlerts: darkWebAlerts.length,
    complianceAvg,
    riskGrade: risk?.grade ?? "—",
  };

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <GlobeHero risk={risk} activeIncident={incidents.find(i => !i.closed_at && i.status !== "resolved")} />

      <ExecutiveOverviewLink />

      <DashboardScopeBar
        role={scope.role}
        severity={scope.severity}
        onRole={(role) => setScope((prev) => ({ ...prev, role }))}
        onSeverity={(severity) => setScope((prev) => ({ ...prev, severity }))}
        shown={scopedOpen.length}
        total={openTotal ?? openTriaged.length}
      />

      <RiskScoreSixMonthChart />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RiskTrendChart />
        <ThreatBreakdownDonut />
      </div>

      <SecurityFeaturesRow stats={featureStats} />

      <ScanJobStuckBanner scanJob={stuckScan} onReset={loadAll} />
      <CriticalAlertBanner incident={investigatingIncident} />
      <GdprCountdownCard incident={gdprIncident} />

      {/* Row 1 */}
      <div className="grid grid-cols-4 gap-4">
        <RiskScoreTile risk={risk} />
        <StatTile label="Open Findings" value={openTotal == null ? "—" : openTotal} subtext={`${criticalTotal == null ? "—" : criticalTotal} critical`} subtextColor="text-red-400" danger={(criticalTotal ?? 0) > 0} />
        <StatTile label="Cloud Findings" value={openCloud.length} subtext={`${cloudCritical.length} critical`} subtextColor="text-red-400" danger={cloudCritical.length > 0} />
        <StatTile label="SLA Breached" value={risk?.sla_breached ?? 0} danger={(risk?.sla_breached ?? 0) > 0} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Active Incidents" value={openIncidents.length} danger={openIncidents.length > 0} pulse={openIncidents.length > 0} />
        <StatTile label="Compliance Avg" value={`${complianceAvg}%`} subtext={`${frameworks.length} frameworks`} danger={complianceAvg < 50} />
        <StatTile label="KEV Unpatched" value={risk?.kev_unpatched ?? 0} danger />
      </div>

      <ScanStatusBar scanJobs={scanJobs} />
      <NationalCampaignFeed />
      <IntelligenceFeedStrip feeds={intelFeeds} />
      <AgentActivityStrip agents={agents} />

      {/* 90-Day Risk Reduction Trend Analysis */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <GenerateExecutiveReportButton />
        <Link to="/reports/risk-reduction" className="px-3 py-2 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition">📄 Risk reduction report</Link>
      </div>
      <SlaBreachWeeklyReport />
      <RiskReductionChart days={90} />

      <CloudAssetVulnHeatmap findings={scopedOpen} cloudFindings={openCloud} />
      <HighRiskAreasHeatmap findings={scopedOpen} />
      <AssetDependencyMap assets={assets} />
      <AssetRiskBubbleCluster findings={scopedOpen} cloudFindings={openCloud} />
      <VulnAgeHeatmap findings={scopedOpen} />
      <VulnClusterHeatmap findings={scopedOpen} />
      <SectorDrillDown findings={scopedOpen} />

      <TopFindingsTable findings={topFindings} />
      <TopCloudFindingsTable findings={topCloudFindings} />

      <div className="grid grid-cols-3 gap-4">
        <CloudAndScansColumn criticalCloud={cloudCritical} scanJobs={scanJobs} />
        <ThreatAndIncidentsColumn criticalThreats={criticalTriaged} incidents={openIncidents} />
        <ComplianceAndCIEMColumn frameworks={frameworks} ciemFindings={ciemFindings} />
      </div>

      <DailyIntelligenceSummary loading={summaryLoading} text={dailySummary} />

      <QuickActionsBar onRefresh={loadAll} />
    </div>
  );
}