import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { observeAgent } from "@/lib/agentObservation";
import {
  Activity, AlertTriangle, Shield, Crosshair, TrendingUp, Clock, Zap, Target,
  Users, Eye, AlertCircle, CheckCircle, AlertOctagon, RefreshCw, Download,
  Bot, Cloud, Code2, DollarSign, Scale, Brain, Play, FileText, Server,
  Package, GitBranch, BarChart2, ChevronRight, Network, Radar, Cpu, Layers,
  Globe, Lock, Database, Eye as EyeIcon, Radio, ScanLine, Terminal, Pin, PinOff
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge, PAGE_BG,
  KpiCard, AnimatedArc
} from "@/components/gds/GDSOSShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";
import GlobalThreatMap from "@/components/gds/GlobalThreatMap";
import ThreatIntelGraph from "@/components/gds/ThreatIntelGraph";
import AssetKnowledgeGraph from "@/components/gds/AssetKnowledgeGraph";
import CrossSectorTimeline from "@/components/gds/CrossSectorTimeline";
import DependencyGraph from "@/components/gds/DependencyGraph";
import PredictiveRiskHeatmap from "@/components/gds/PredictiveRiskHeatmap";
import CloudRiskHeatmap from "@/components/gds/CloudRiskHeatmap";

const BG = "#020817";
const GOLD = "#c9a84c";

function ThreatLevelBanner({ level, score, reason, factors, actions, assessedAt }) {
  const config = {
    critical: { color: DANGER, bg: `${DANGER}08`, pulse: true, border: DANGER },
    elevated: { color: HIGH, bg: `${HIGH}08`, pulse: true, border: HIGH },
    guarded: { color: MEDIUM, bg: `${MEDIUM}08`, pulse: false, border: MEDIUM },
    low: { color: LOW, bg: `${LOW}08`, pulse: false, border: LOW }
  };
  const c = config[level?.toLowerCase()] || config.guarded;
  return (
    <Card className={`p-6 border-2 ${c.pulse ? 'animate-pulse' : ''}`} style={{ background: c.bg, borderColor: c.border }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className={`w-6 h-6 ${c.pulse ? 'animate-pulse' : ''}`} style={{ color: c.color }} />
            <div>
              <h2 className="text-xl font-black text-white">GLOBAL THREAT LEVEL: <span style={{ color: c.color }}>{level?.toUpperCase()}</span></h2>
              <p className="text-xs" style={{ color: MUTED }}>{reason || "Continuous monitoring active"}</p>
            </div>
          </div>
          {factors?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {factors.slice(0, 5).map((f, i) => (
                <span key={i} className="text-[10px] px-2 py-1 rounded-lg font-bold" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>{f}</span>
              ))}
            </div>
          )}
          {actions?.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {actions.slice(0, 3).map((a, i) => (
                <span key={i} className="text-[10px] px-2 py-1 rounded-lg font-bold flex items-center gap-1" style={{ background: `${HIGH}15`, color: HIGH, border: `1px solid ${HIGH}30` }}>
                  <CheckCircle className="w-3 h-3" /> {a}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Assessed</p>
          <p className="text-xs" style={{ color: TEXT }}>{timeAgo(assessedAt)}</p>
        </div>
      </div>
    </Card>
  );
}

function RiskGauge({ score, grade, label }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimated(score || 0), 200); return () => clearTimeout(t); }, [score]);
  const color = score >= 75 ? LOW : score >= 50 ? MEDIUM : DANGER;
  return (
    <Card className="p-4 flex flex-col items-center">
      <AnimatedArc score={animated} size={100} strokeWidth={10} />
      <p className="text-[9px] font-bold uppercase mt-2" style={{ color: MUTED }}>{label}</p>
      <p className="text-xs font-black mt-1" style={{ color }}>{grade || (score >= 75 ? "A" : score >= 50 ? "C" : "F")}</p>
    </Card>
  );
}

function ScanTimeline({ scans }) {
  const SCAN_ICONS = { cloud: Cloud, code: Code2, dast: Zap, pentest: Target, container: Server, sca: Package, k8s: Server };
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
      {scans.slice(0, 10).map((job, i) => {
        const ScanIcon = SCAN_ICONS[job.scan_type] || Zap;
        const statusColor = job.status === "completed" ? LOW : job.status === "running" ? CYAN : job.status === "failed" ? DANGER : MUTED;
        return (
          <div key={job.id || i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.04)` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${CYAN}08`, border: `1px solid ${CYAN}20` }}>
              <ScanIcon className="w-4 h-4" style={{ color: CYAN }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white truncate">{job.name || job.target || `Scan ${i + 1}`}</p>
              <p className="text-[9px]" style={{ color: MUTED }}>
                {job.findings_count != null ? `${job.findings_count} findings` : ""}
                {job.created_date ? ` · ${formatDistanceToNow(new Date(job.created_date), { addSuffix: true })}` : ""}
              </p>
            </div>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ color: statusColor, background: `${statusColor}15` }}>
              {job.status || "completed"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function GDSCommandCenter() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("gds-pinned-vulns") || "[]")); } catch { return new Set(); }
  });

  const togglePin = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("gds-pinned-vulns", JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

  // Live data queries
  const { data: threatLevel } = useQuery({ queryKey: ["global-threat-level"], queryFn: () => base44.entities.GlobalThreatLevel.list("-assessed_at", 1).then(r => r[0]).catch(() => null) });
  const { data: execRisk } = useQuery({ queryKey: ["exec-risk"], queryFn: () => base44.entities.ExecutiveRiskScore.list("-assessed_at", 1).then(r => r[0]).catch(() => null) });
  const { data: incidents = [] } = useQuery({ queryKey: ["soc-incidents"], queryFn: () => base44.entities.Incident.filter({ status: { $in: ["new", "investigating", "contained"] } }, "-created_at", 50).catch(() => []) });
  const { data: alerts = [] } = useQuery({ queryKey: ["soc-alerts"], queryFn: () => base44.entities.Alert.list("-detected_at", 100).catch(() => []) });
  const { data: predictions = [] } = useQuery({ queryKey: ["threat-predictions"], queryFn: () => base44.entities.ThreatPrediction.filter({ affects_you: true }, "-confidence", 20).catch(() => []) });
  const { data: campaigns = [] } = useQuery({ queryKey: ["active-campaigns"], queryFn: () => base44.entities.Campaign.filter({ is_active: true }, "-severity", 20).catch(() => []) });
  const { data: socMetrics = [] } = useQuery({ queryKey: ["soc-metrics"], queryFn: () => base44.entities.SOCMetrics.list("-measured_at", 30).catch(() => []) });
  const { data: queueItems = [] } = useQuery({ queryKey: ["soc-queue"], queryFn: () => base44.entities.SOCQueue.list("-queued_at", 100).catch(() => []) });
  const { data: detectionGaps = [] } = useQuery({ queryKey: ["purple-gaps"], queryFn: () => base44.entities.DetectionGap.filter({ status: { $ne: "remediated" } }).catch(() => []) });
  const { data: coverageScores = [] } = useQuery({ queryKey: ["purple-coverage"], queryFn: () => base44.entities.CoverageScore.list("-scored_at", 10).catch(() => []) });
  const { data: cloudFindings = [] } = useQuery({ queryKey: ["cloud-findings-count"], queryFn: () => base44.entities.CloudFinding.list("", 1000).catch(() => []) });
  const { data: identityFindings = [] } = useQuery({ queryKey: ["identity-findings-count"], queryFn: () => base44.entities.IdentityFinding.list("", 1000).catch(() => []) });
  const { data: k8sFindings = [] } = useQuery({ queryKey: ["k8s-findings-count"], queryFn: () => base44.entities.K8sFinding.list("", 1000).catch(() => []) });
  const { data: iocs = [] } = useQuery({ queryKey: ["active-iocs"], queryFn: () => base44.entities.IOCRecord.filter({ status: "active" }).catch(() => []) });
  const { data: darkWebAlerts = [] } = useQuery({ queryKey: ["darkweb-alerts"], queryFn: () => base44.entities.DarkWebAlert.filter({ status: "active" }).catch(() => []) });
  const { data: credentialLeaks = [] } = useQuery({ queryKey: ["credential-leaks"], queryFn: () => base44.entities.CredentialLeak.filter({ status: "active" }).catch(() => []) });
  const { data: scanJobs = [] } = useQuery({ queryKey: ["gcc-scans"], queryFn: () => base44.entities.ScanJob.list("-created_date", 10).catch(() => []) });
  const { data: agents = [] } = useQuery({ queryKey: ["gcc-agents"], queryFn: () => base44.entities.Agent.list().then(rows => rows.map(a => observeAgent(a))).catch(() => []) });
  const { data: triaged = [] } = useQuery({ queryKey: ["gcc-triaged"], queryFn: () => base44.entities.TriagedFinding.filter({}).catch(() => []) });
  const { data: riskHistory = [] } = useQuery({ queryKey: ["gcc-risk"], queryFn: () => base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []) });
  const { data: riskScoreHistory = [] } = useQuery({ queryKey: ["gcc-risk-history-6m"], queryFn: () => base44.entities.GlobalRiskScore.list("-calculated_at", 180).catch(() => []) });
  const { data: actors = [] } = useQuery({ queryKey: ["threat-actors"], queryFn: () => base44.entities.ThreatActor.list("-last_seen", 12).catch(() => []) });
  const { data: pentests = [] } = useQuery({ queryKey: ["pentest-campaigns"], queryFn: () => base44.entities.PentestCampaign.list("-started_at", 8).catch(() => []) });
  const { data: attackPaths = [] } = useQuery({ queryKey: ["attack-paths"], queryFn: () => base44.entities.AttackPath.filter({ status: "active" }).catch(() => []) });
  const { data: complianceStatus = [] } = useQuery({ queryKey: ["compliance-status"], queryFn: () => base44.entities.ComplianceControlStatus.list("-assessed_at", 20).catch(() => []) });
  const { data: connectors = [] } = useQuery({ queryKey: ["connectors"], queryFn: () => base44.entities.ConnectorInstance.list().catch(() => []) });
  const { data: dataStreams = [] } = useQuery({ queryKey: ["data-streams"], queryFn: () => base44.entities.DataStream.list().catch(() => []) });
  
  // Cross-sector incident data for timeline
  const { data: nationalSectorIncidents = [] } = useQuery({ queryKey: ["national-incidents"], queryFn: () => base44.entities.NationalIncident.filter({ status: { $in: ["investigating", "contained", "recovering"] } }, "-detected_at", 50).catch(() => []) });
  const { data: msspSectorIncidents = [] } = useQuery({ queryKey: ["mssp-incidents"], queryFn: () => base44.entities.IncidentResponse.filter({ status: { $in: ["investigating", "contained", "recovering"] } }, "-detected_at", 50).catch(() => []) });
  const { data: financialSectorIncidents = [] } = useQuery({ queryKey: ["financial-incidents"], queryFn: () => base44.entities.FraudCase.filter({ status: { $in: ["investigating", "active"] } }, "-detected_at", 50).catch(() => []) });
  const { data: healthcareSectorIncidents = [] } = useQuery({ queryKey: ["healthcare-incidents"], queryFn: () => base44.entities.HealthcareIncident.filter({ status: { $in: ["investigating", "contained", "recovering"] } }, "-detected_at", 50).catch(() => []) });
  const { data: criticalSectorIncidents = [] } = useQuery({ queryKey: ["critical-incidents"], queryFn: () => base44.entities.IndustrialIncident.filter({ status: { $in: ["investigating", "contained", "recovering"] } }, "-detected_at", 50).catch(() => []) });
  const { data: industrialSectorIncidents = [] } = useQuery({ queryKey: ["industrial-incidents"], queryFn: () => base44.entities.IndustrialIncident.filter({ status: { $in: ["investigating", "contained", "recovering"] } }, "-detected_at", 50).catch(() => []) });
  const { data: smartCitySectorIncidents = [] } = useQuery({ queryKey: ["smartcity-incidents"], queryFn: () => base44.entities.CityIncident.filter({ status: { $in: ["investigating", "contained", "recovering"] } }, "-detected_at", 50).catch(() => []) });
  const { data: telecomSectorIncidents = [] } = useQuery({ queryKey: ["telecom-incidents"], queryFn: () => base44.entities.TelecomIncident.filter({ status: { $in: ["investigating", "contained", "recovering"] } }, "-detected_at", 50).catch(() => []) });
  
  // Cross-sector assets for dependency graph
  const { data: industrialAssets = [] } = useQuery({ queryKey: ["industrial-assets"], queryFn: () => base44.entities.IndustrialAsset.list().catch(() => []) });
  const { data: telecomNetworkNodes = [] } = useQuery({ queryKey: ["telecom-network-nodes"], queryFn: () => base44.entities.NetworkNode.list().catch(() => []) });
  const { data: smartCityAssets = [] } = useQuery({ queryKey: ["smart-city-assets"], queryFn: () => base44.entities.UrbanInfrastructure.list().catch(() => []) });
  const { data: riskPredictions = [] } = useQuery({ queryKey: ["risk-predictions"], queryFn: () => base44.entities.RiskForecast.list("-predicted_at", 50).catch(() => []) });

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 900);
  };

  // Calculate metrics
  const criticalIncidents = incidents.filter(i => i.severity === "critical").length;
  const slaBreached = incidents.filter(i => i.sla_deadline && new Date(i.sla_deadline) < new Date()).length;
  const latestMetrics = socMetrics[0];
  const openQueue = queueItems.filter(q => q.status !== "resolved").length;
  const avgCoverage = coverageScores.length > 0 ? Math.round(coverageScores.reduce((s, c) => s + (c.coverage_pct || 0), 0) / coverageScores.length) : 0;
  const rs = riskHistory[0];
  const SCORE = rs?.overall_score ?? execRisk?.overall_score ?? 0;
  const GRADE = rs?.risk_grade || execRisk?.risk_grade || (SCORE >= 75 ? "A" : SCORE >= 50 ? "C" : "F");
  const OPEN = rs?.total_open_findings ?? triaged.filter(f => f.status === "open").length;
  const CRIT = rs?.critical_count ?? triaged.filter(f => f.normalized_severity === "critical").length;
  const KEV = rs?.kev_unpatched ?? 0;

  const securityPosture = [
    { name: "Cloud Security", count: cloudFindings.length, grade: cloudFindings.length > 50 ? "D" : cloudFindings.length > 20 ? "C" : cloudFindings.length > 5 ? "B" : "A", color: CYAN, link: "/cloud" },
    { name: "Identity Security", count: identityFindings.length, grade: identityFindings.length > 30 ? "D" : identityFindings.length > 10 ? "C" : identityFindings.length > 3 ? "B" : "A", color: HIGH, link: "/identity" },
    { name: "K8s & Containers", count: k8sFindings.length, grade: k8sFindings.length > 20 ? "D" : k8sFindings.length > 10 ? "C" : k8sFindings.length > 2 ? "B" : "A", color: MEDIUM, link: "/devsecops" },
    { name: "Threat Intel", count: iocs.length + campaigns.length, grade: iocs.length > 10 ? "D" : iocs.length > 5 ? "C" : iocs.length > 1 ? "B" : "A", color: DANGER, link: "/threat-intel" },
    { name: "Dark Web", count: darkWebAlerts.length + credentialLeaks.length, grade: darkWebAlerts.length > 5 ? "D" : darkWebAlerts.length > 2 ? "C" : darkWebAlerts.length > 0 ? "B" : "A", color: "#a855f7", link: "/threat-intel/dark-web" },
    { name: "Purple Team", count: detectionGaps.length, grade: avgCoverage >= 80 ? "A" : avgCoverage >= 60 ? "B" : avgCoverage >= 40 ? "C" : "D", color: LOW, sub: `${avgCoverage}% coverage`, link: "/purple" }
  ];

  const donutData = [
    { name: "Critical", value: CRIT, color: DANGER },
    { name: "High", value: rs?.high_count ?? triaged.filter(f => f.normalized_severity === "high").length, color: HIGH },
    { name: "Medium", value: rs?.medium_count ?? triaged.filter(f => f.normalized_severity === "medium").length, color: MEDIUM },
    { name: "Low", value: rs?.low_count ?? triaged.filter(f => f.normalized_severity === "low").length, color: LOW },
  ].filter(d => d.value > 0);

  // Build monthly posture score trend for last 6 months
  const postureChartData = (() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { label: d.toLocaleString("default", { month: "short", year: "2-digit" }), year: d.getFullYear(), month: d.getMonth() };
    });
    return months.map(({ label, year, month }) => {
      const records = riskScoreHistory.filter(r => {
        const d = new Date(r.calculated_at || r.created_date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      const avg = records.length > 0
        ? Math.round(records.reduce((s, r) => s + (r.overall_score || 0), 0) / records.length)
        : null;
      return { month: label, score: avg };
    });
  })();

  const hasPostureData = postureChartData.some(d => d.score !== null);

  const topCritical = triaged
    .filter(f => (f.normalized_severity || f.severity) === "critical" && (f.status || f.finding_status) === "open")
    .sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return new Date(a.sla_deadline || 0) - new Date(b.sla_deadline || 0);
    })
    .slice(0, 8);

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <div className="flex items-center justify-between animate-fadeIn">
        <Breadcrumb items={[{ label: "Command Center" }]} />
        <LiveDataBadge />
      </div>

      {/* CINEMATIC HERO - 3D THREAT MAP */}
      <div className="animate-slideInUp" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <GlobalThreatMap incidents={incidents} actors={actors} alerts={alerts} />
      </div>

      {/* KNOWLEDGE GRAPH - ASSET-VULNERABILITY-THREAT RELATIONSHIPS */}
      <div className="animate-slideInUp" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
        <AssetKnowledgeGraph 
          assets={cloudFindings} 
          vulnerabilities={triaged} 
          threats={actors}
          incidents={incidents}
        />
      </div>

      {/* CINEMATIC HEADER */}
      <div className="flex items-center justify-between mb-6 animate-slideInUp" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight">GDS OS GLOBAL COMMAND CENTER</h1>
            <Shield className="w-8 h-8" style={{ color: CYAN }} />
          </div>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>Global Digital Security Operating System · Live Operations</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh Data
          </button>
          <div className="text-right">
            <p className="text-xs font-bold text-white">{currentTime.toUTCString().slice(0, 16)} UTC</p>
            <p className="text-[9px]" style={{ color: MUTED }}>Live Operations</p>
          </div>
        </div>
      </div>

      {/* THREAT LEVEL BANNER */}
      {threatLevel && (
        <div className="animate-slideInUp" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <ThreatLevelBanner level={threatLevel.level} score={threatLevel.level_score} reason={threatLevel.change_reason} factors={threatLevel.contributing_factors} actions={threatLevel.recommended_actions} assessedAt={threatLevel.assessed_at} />
        </div>
      )}

      {/* EXECUTIVE KPIs - CLICKABLE */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 animate-slideInUp" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
        <Link to="/executive/risk-overview">
          <Card className="p-4 text-center cursor-pointer hover:scale-105 transition-transform">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Risk Grade</p>
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${SCORE >= 75 ? LOW : SCORE >= 50 ? MEDIUM : DANGER}15`, border: `2px solid ${SCORE >= 75 ? LOW : SCORE >= 50 ? MEDIUM : DANGER}40` }}>
              <span className="text-3xl font-black" style={{ color: SCORE >= 75 ? LOW : SCORE >= 50 ? MEDIUM : DANGER }}>{GRADE}</span>
            </div>
          </Card>
        </Link>
        <Link to="/soc/incidents"><KpiCard label="Open Incidents" value={incidents.length} color={CYAN} icon={AlertCircle} link /></Link>
        <Link to="/soc/incidents"><KpiCard label="Critical" value={criticalIncidents} color={DANGER} icon={AlertTriangle} pulse={criticalIncidents > 0} link /></Link>
        <Link to="/threat-intel/iocs"><KpiCard label="Active IOCs" value={iocs.length} color={HIGH} icon={Target} link /></Link>
        <Link to="/threat-intel/campaigns"><KpiCard label="Campaigns" value={campaigns.length} color="#f97316" icon={Crosshair} link /></Link>
        <Link to="/threat-intel/predictions"><KpiCard label="Threat Predictions" value={predictions.length} color="#a855f7" icon={Brain} link /></Link>
        <Link to="/soc/queue"><KpiCard label="Queue Depth" value={openQueue} color={MEDIUM} icon={Clock} link /></Link>
        <Link to="/sla-templates"><KpiCard label="SLA Breached" value={slaBreached} color={DANGER} icon={AlertOctagon} pulse={slaBreached > 0} link /></Link>
      </div>

      {/* MAIN GRID - CLICKABLE CINEMATIC SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slideInUp" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
        {/* LEFT - Security Posture */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: CYAN }} />
            Cross-Module Security Posture
          </h3>
          {securityPosture.map((domain, i) => (
            <Link key={i} to={domain.link} className="block group">
              <Card className="p-4 hover:scale-[1.02] transition-all cursor-pointer" style={{ border: `1px solid ${domain.color}30` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">{domain.name}</p>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${domain.color}15`, border: `2px solid ${domain.color}40` }}>
                    <span className="text-xl font-black" style={{ color: domain.color }}>{domain.grade}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px]" style={{ color: MUTED }}>{domain.count} findings</p>
                  {domain.sub && <p className="text-[10px] font-bold" style={{ color: domain.color }}>{domain.sub}</p>}
                </div>
                <div className="mt-2 flex items-center gap-1 text-[9px]" style={{ color: domain.color }}>
                  <span>View Details</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* CENTER - Live SOC Feed */}
        <div className="space-y-3">
          <Link to="/soc" className="block">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition-colors">
              <Activity className="w-4 h-4" style={{ color: LOW }} />
              Live SOC Operations
              <ChevronRight className="w-4 h-4 ml-auto" />
            </h3>
          </Link>
          <Link to="/soc/queue" className="block">
            <Card className="p-4 hover:scale-[1.01] transition-all cursor-pointer">
              <p className="text-xs font-bold mb-3" style={{ color: MUTED }}>Latest Alerts</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.slice(0, 10).map((alert, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <SevBadge sev={alert.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-white truncate">{alert.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN }}>{alert.source_type || "UNKNOWN"}</span>
                        <span className="text-[9px]" style={{ color: MUTED }}>{timeAgo(alert.detected_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Link>
          <Link to="/soc/incidents" className="block">
            <Card className="p-4 hover:scale-[1.01] transition-all cursor-pointer">
              <p className="text-xs font-bold mb-3" style={{ color: MUTED }}>Active Incidents</p>
              <div className="space-y-2">
                {incidents.slice(0, 5).map((inc, i) => (
                  <div key={i} className="p-3 rounded-lg hover:bg-white/5 transition-colors" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs font-bold text-white">{inc.title}</p>
                      <SevBadge sev={inc.severity} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${MUTED}15`, color: MUTED }}>{inc.incident_type || "UNKNOWN"}</span>
                      {inc.sla_deadline && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${new Date(inc.sla_deadline) < new Date() ? 'animate-pulse' : ''}`} style={{ color: new Date(inc.sla_deadline) < new Date() ? DANGER : HIGH, background: `${DANGER}15` }}>
                          {new Date(inc.sla_deadline) < new Date() ? "BREACHED" : `${Math.round((new Date(inc.sla_deadline) - new Date()) / (1000 * 60 * 60))}h left`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </Link>
        </div>

        {/* RIGHT - AI Intelligence */}
        <div className="space-y-3">
          <Link to="/threat-intel/predictions" className="block">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 cursor-pointer hover:text-cyan-400 transition-colors">
              <Crosshair className="w-4 h-4" style={{ color: HIGH }} />
              AI Intelligence & Predictions
              <ChevronRight className="w-4 h-4 ml-auto" />
            </h3>
          </Link>
          <Link to="/threat-intel/predictions" className="block">
            <Card className="p-4 hover:scale-[1.01] transition-all cursor-pointer">
              <p className="text-xs font-bold mb-3" style={{ color: MUTED }}>Threat Predictions</p>
              <div className="space-y-2">
                {predictions.slice(0, 3).map((pred, i) => (
                  <div key={i} className="p-3 rounded-lg hover:bg-white/5 transition-colors" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}20` }}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-xs font-bold text-white">{pred.title}</p>
                      <SevBadge sev={pred.severity} />
                    </div>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[9px] mb-1" style={{ color: MUTED }}>
                        <span>Confidence</span>
                        <span>{pred.confidence || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pred.confidence || 0}%`, background: HIGH }} />
                      </div>
                    </div>
                    {(pred.recommended_actions || []).slice(0, 1).map((a, j) => (
                      <p key={j} className="text-[9px]" style={{ color: MUTED }}>→ {a}</p>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </Link>
          <Link to="/threat-intel/campaigns" className="block">
            <Card className="p-4 hover:scale-[1.01] transition-all cursor-pointer">
              <p className="text-xs font-bold mb-3" style={{ color: MUTED }}>Active Campaigns</p>
              <div className="space-y-2">
                {campaigns.slice(0, 3).map((camp, i) => (
                  <div key={i} className="p-3 rounded-lg hover:bg-white/5 transition-colors" style={{ background: `${"#f97316"}08`, border: `1px solid ${"#f97316"}20` }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-white">{camp.name}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${LOW}15`, color: LOW }}>ACTIVE</span>
                    </div>
                    <p className="text-[9px]" style={{ color: MUTED }}>{camp.target_sectors || "No specific targets"}</p>
                  </div>
                ))}
              </div>
            </Card>
          </Link>
          {execRisk && (
            <Link to="/executive" className="block">
              <Card className="p-4 hover:scale-[1.01] transition-all cursor-pointer">
                <p className="text-xs font-bold mb-3" style={{ color: MUTED }}>Executive Risk Breakdown</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-2xl font-black" style={{ color: CYAN }}>{execRisk.security_score || 0}</p>
                    <p className="text-[8px] font-bold uppercase" style={{ color: MUTED }}>Security</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black" style={{ color: LOW }}>{execRisk.compliance_score || 0}</p>
                    <p className="text-[8px] font-bold uppercase" style={{ color: MUTED }}>Compliance</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black" style={{ color: MEDIUM }}>{execRisk.operational_score || 0}</p>
                    <p className="text-[8px] font-bold uppercase" style={{ color: MUTED }}>Ops</p>
                  </div>
                </div>
              </Card>
            </Link>
          )}
        </div>
      </div>

      {/* ROW 4 - CLICKABLE CINEMATIC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slideInUp" style={{ animationDelay: "0.6s", animationFillMode: "both" }}>
        {/* Critical Findings */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
              Critical Findings — Immediate Action
              {pinnedIds.size > 0 && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}40` }}>
                  <Pin className="w-2.5 h-2.5" /> {pinnedIds.size} pinned
                </span>
              )}
            </h3>
            <Link to="/vulnerabilities/assign" className="text-[10px] font-bold hover:opacity-80" style={{ color: GOLD }}>AutoTriage →</Link>
          </div>
          {topCritical.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: LOW }} />
              <p className="text-sm font-bold" style={{ color: LOW }}>All Clear — No Critical Findings</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {topCritical.map((f, i) => {
                const isPinned = pinnedIds.has(f.id);
                return (
                  <div key={f.id || i} className="p-3 rounded-lg transition-colors group relative"
                    style={{ background: isPinned ? `${GOLD}08` : `${DANGER}04`, border: `1px solid ${isPinned ? GOLD + "40" : DANGER + "14"}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isPinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: GOLD }} />}
                          <p className="text-[11px] font-semibold text-white truncate">{f.title || f.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px]" style={{ color: MUTED }}>{f.asset_name || f.resource}</span>
                          {f.sla_deadline && (
                            <span className={`text-[9px] font-mono ${new Date(f.sla_deadline) < new Date() ? 'font-bold' : ''}`}
                              style={{ color: new Date(f.sla_deadline) < new Date() ? DANGER : MUTED }}>
                              {new Date(f.sla_deadline) < new Date() ? "⚠ BREACHED" : timeAgo(f.sla_deadline)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => togglePin(e, f.id)}
                        title={isPinned ? "Unpin" : "Pin to top"}
                        className="flex-shrink-0 p-1 rounded opacity-40 group-hover:opacity-100 transition-opacity hover:opacity-100"
                        style={{ color: isPinned ? GOLD : MUTED }}>
                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Scans */}
        <Link to="/scan-history" className="block">
          <Card className="p-5 hover:scale-[1.01] transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: CYAN }} />
                Recent Scans
              </h3>
              <span className="text-[10px] font-bold" style={{ color: CYAN }}>View all →</span>
            </div>
            <ScanTimeline scans={scanJobs} />
          </Card>
        </Link>

        {/* AI Agents */}
        <Link to="/agents" className="block">
          <Card className="p-5 hover:scale-[1.01] transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="w-4 h-4" style={{ color: CYAN }} />
                AI Agents
              </h3>
              <span className="text-[10px] font-bold" style={{ color: CYAN }}>All →</span>
            </div>
            <p className="text-[9px] mb-2" style={{ color: MUTED }}>Stored heartbeat records · tool execution unverified</p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {agents.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: a.status === "online" ? `${MEDIUM}15` : `${MUTED}15` }}>
                    <Bot className="w-3.5 h-3.5" style={{ color: a.status === "online" ? MEDIUM : MUTED }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-white truncate">{a.name || `Agent ${i + 1}`}</p>
                    <p className="text-[8px]" style={{ color: MUTED }}>{a.role || a.type || "autonomous"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: a.status === "online" ? MEDIUM : MUTED }} />
                    <span className="text-[8px] capitalize" style={{ color: a.status === "online" ? MEDIUM : MUTED }}>{a.status === "online" ? "recent heartbeat" : a.status === "stale" ? "stale heartbeat" : "no valid heartbeat"}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Link>
      </div>

      {/* SOC METRICS - CLICKABLE CINEMATIC */}
      <Link to="/soc/metrics" className="block animate-slideInUp" style={{ animationDelay: "0.7s", animationFillMode: "both" }}>
        <Card className="p-5 hover:scale-[1.01] transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
              SOC Performance Metrics
              <ChevronRight className="w-4 h-4 ml-auto" />
            </h3>
            <span className="text-[10px]" style={{ color: MUTED }}>Latest: {timeAgo(latestMetrics?.measured_at)}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="p-3 text-center hover:scale-105 transition-transform">
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Alerts</p>
              <p className="text-2xl font-black" style={{ color: TEXT }}>{latestMetrics?.total_alerts || 0}</p>
            </Card>
            <Card className="p-3 text-center hover:scale-105 transition-transform">
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>MTTD</p>
              <p className={`text-2xl font-black ${latestMetrics?.mttd_minutes > 60 ? 'text-red-400' : latestMetrics?.mttd_minutes > 15 ? 'text-orange-400' : 'text-green-400'}`}>{latestMetrics?.mttd_minutes || 0}m</p>
            </Card>
            <Card className="p-3 text-center hover:scale-105 transition-transform">
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>MTTR</p>
              <p className="text-2xl font-black" style={{ color: latestMetrics?.mttr_hours > 4 ? DANGER : latestMetrics?.mttr_hours > 2 ? HIGH : LOW }}>{latestMetrics?.mttr_hours || 0}h</p>
            </Card>
            <Card className="p-3 text-center hover:scale-105 transition-transform">
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Automation</p>
              <p className="text-2xl font-black" style={{ color: CYAN }}>{latestMetrics?.automation_rate || 0}%</p>
            </Card>
            <Card className="p-3 text-center hover:scale-105 transition-transform">
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SOC Health</p>
              <p className="text-2xl font-black" style={{ color: latestMetrics?.soc_health_score >= 80 ? LOW : latestMetrics?.soc_health_score >= 60 ? MEDIUM : DANGER }}>{latestMetrics?.soc_health_score || 0}</p>
            </Card>
            <Card className="p-3 text-center hover:scale-105 transition-transform">
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Playbooks</p>
              <p className="text-2xl font-black" style={{ color: HIGH }}>{latestMetrics?.playbooks_executed || 0}</p>
            </Card>
            <Card className="p-3 text-center hover:scale-105 transition-transform">
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Avg Queue Age</p>
              <p className="text-2xl font-black" style={{ color: latestMetrics?.avg_queue_age_hours > 24 ? DANGER : latestMetrics?.avg_queue_age_hours > 8 ? HIGH : LOW }}>{latestMetrics?.avg_queue_age_hours || 0}h</p>
            </Card>
          </div>
        </Card>
      </Link>

      {/* SECURITY POSTURE SCORE — 6-MONTH TREND */}
      <div className="animate-slideInUp" style={{ animationDelay: "0.72s", animationFillMode: "both" }}>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
              Security Posture Score — 6-Month Trend
            </h3>
            <div className="flex items-center gap-3 text-[10px]">
              {hasPostureData && (() => {
                const scores = postureChartData.filter(d => d.score !== null);
                const first = scores[0]?.score, last = scores[scores.length - 1]?.score;
                const delta = last - first;
                return (
                  <span className="font-bold px-2 py-0.5 rounded-full" style={{ color: delta >= 0 ? LOW : DANGER, background: delta >= 0 ? `${LOW}15` : `${DANGER}15` }}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} pts vs 6mo ago
                  </span>
                );
              })()}
              <Link to="/executive/risk-overview" className="font-bold hover:opacity-80" style={{ color: CYAN }}>Full Report →</Link>
            </div>
          </div>
          <p className="text-[10px] mb-4" style={{ color: MUTED }}>Monthly average overall risk score (0–100, higher = better posture) across all security domains</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={postureChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="postureGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CYAN} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CYAN} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} opacity={0.4} />
                <XAxis dataKey="month" stroke={MUTED} tick={{ fill: MUTED, fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke={MUTED} tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={v => `${v}`} width={30} />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: CYAN, fontWeight: "bold" }}
                  formatter={v => v === null ? ["No data", "Score"] : [`${v} / 100`, "Posture Score"]}
                />
                <Area type="monotone" dataKey="score" stroke={CYAN} strokeWidth={2.5} fill="url(#postureGrad)" dot={{ fill: CYAN, r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: CYAN }} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {!hasPostureData && (
            <p className="text-center text-xs mt-2" style={{ color: MUTED }}>No historical score data yet — scores will appear as GlobalRiskScore records accumulate.</p>
          )}
        </Card>
      </div>

      {/* CLOUD RISK HEATMAP */}
      <div className="animate-slideInUp" style={{ animationDelay: "0.75s", animationFillMode: "both" }}>
        <CloudRiskHeatmap
          cloudFindings={cloudFindings}
          identityFindings={identityFindings}
          k8sFindings={k8sFindings}
        />
      </div>

      {/* PREDICTIVE RISK HEATMAP */}
      <div className="animate-slideInUp" style={{ animationDelay: "0.8s", animationFillMode: "both" }}>
        <PredictiveRiskHeatmap
          incidents={incidents}
          threats={actors}
          assets={cloudFindings}
          predictions={predictions}
        />
      </div>

      {/* CROSS-SECTOR DEPENDENCY GRAPH */}
      <div className="animate-slideInUp" style={{ animationDelay: "0.85s", animationFillMode: "both" }}>
        <DependencyGraph
          industrialAssets={industrialAssets}
          telecomNodes={telecomNetworkNodes}
          smartCityAssets={smartCityAssets}
          incidents={incidents}
        />
      </div>

      {/* CROSS-SECTOR THREAT TIMELINE */}
      <div className="animate-slideInUp" style={{ animationDelay: "0.9s", animationFillMode: "both" }}>
        <CrossSectorTimeline
          nationalIncidents={nationalSectorIncidents}
          msspIncidents={msspSectorIncidents}
          financialIncidents={financialSectorIncidents}
          healthcareIncidents={healthcareSectorIncidents}
          criticalIncidents={criticalSectorIncidents}
          industrialIncidents={industrialSectorIncidents}
          smartCityIncidents={smartCitySectorIncidents}
          telecomIncidents={telecomSectorIncidents}
          socIncidents={incidents}
        />
      </div>
    </div>
  );
}