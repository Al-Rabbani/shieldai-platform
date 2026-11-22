import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { TrendingUp, AlertTriangle, DollarSign, Target, Clock, CheckCircle, Shield, Cloud, Code2, Package, Activity } from "lucide-react";
import {
  ExecutiveBreadcrumb, BoardConfidentialBanner, ExecutiveKpiCard, ExecutiveGauge, ExecutiveBadge,
  ExecutiveProgressBar, ExecutiveHeatmap, AUDIENCE_COLORS, POSTURE_COLORS, PILLAR_COLORS, GOLD, GOLD_LIGHT, CARD_BG, BORDER, MUTED, TEXT, EXECUTIVE_PAGE_BG
} from "@/components/gds/ExecutiveShared";
import { Card } from "@/components/gds/GDSOSShared";

export default function GDSExecutiveCommandPage() {
  const { data: globalRisk } = useQuery({ queryKey: ["exec-global-risk"], queryFn: () => base44.entities.GlobalRiskScore.list("-calculated_at", 1).then(r => r[0]).catch(() => null) });
  const { data: briefings = [] } = useQuery({ queryKey: ["exec-briefings"], queryFn: () => base44.entities.ExecutiveBriefing.list("-generated_at", 10).catch(() => []) });
  const { data: objectives = [] } = useQuery({ queryKey: ["exec-objectives"], queryFn: () => base44.entities.StrategicObjective.list("-priority", 20).catch(() => []) });
  const { data: investments = [] } = useQuery({ queryKey: ["exec-investments"], queryFn: () => base44.entities.InvestmentRecommendation.list("-roi_pct", 10).catch(() => []) });
  const { data: risks = [] } = useQuery({ queryKey: ["exec-risks"], queryFn: () => base44.entities.EnterpriseRisk.filter({ status: "open" }).catch(() => []) });
  const { data: findings = [] } = useQuery({ queryKey: ["exec-findings"], queryFn: () => base44.entities.TriagedFinding.filter({ status: "open" }).catch(() => []) });
  const { data: cyberRisks = [] } = useQuery({ queryKey: ["exec-cyber-risks"], queryFn: () => base44.entities.CyberRisk.list("-fair_ale_usd", 20).catch(() => []) });

  const SCORE = globalRisk?.overall_score || 0;
  const GRADE = globalRisk?.risk_grade || (SCORE >= 75 ? "A" : SCORE >= 50 ? "C" : "F");
  const OPEN = findings.length;
  const CRIT = findings.filter(f => f.normalized_severity === "critical").length;
  const FINANCIAL_EXPOSURE = cyberRisks.reduce((sum, r) => sum + (r.uninsured_exposure_usd || 0), 0);
  const latestBriefing = briefings[0];

  const domainScores = [
    { name: "Code", score: 78, icon: Code2, color: "#0EA5E9" },
    { name: "Cloud", score: 82, icon: Cloud, color: "#10B981" },
    { name: "Attack", score: 71, icon: Target, color: "#F59E0B" },
    { name: "Runtime", score: 85, icon: Activity, color: "#A855F7" },
    { name: "Supply Chain", score: 68, icon: Package, color: "#EF4444" },
  ];

  return (
    <div style={EXECUTIVE_PAGE_BG}>
      <ExecutiveBreadcrumb items={[{ label: "Command Center" }]} />
      <BoardConfidentialBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">EXECUTIVE COMMAND CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>Board Confidential · Strategic Security Intelligence</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold" style={{ color: GOLD }}>LIVE OPERATIONS</p>
          <p className="text-[9px]" style={{ color: MUTED }}>{new Date().toUTCString().slice(0, 16)} UTC</p>
        </div>
      </div>

      {/* TOP ROW - Global Risk Score */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
        <Card className="p-6 md:col-span-2" style={{ background: `linear-gradient(135deg, ${GOLD}15, ${GOLD_LIGHT}08)`, border: `2px solid ${GOLD}40` }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Global Risk Score</p>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-black" style={{ color: GOLD }}>{SCORE}</span>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${SCORE >= 75 ? "#10B981" : SCORE >= 50 ? "#F59E0B" : "#EF4444"}20`, border: `2px solid ${SCORE >= 75 ? "#10B981" : SCORE >= 50 ? "#F59E0B" : "#EF4444"}40` }}>
                  <span className="text-2xl font-black" style={{ color: SCORE >= 75 ? "#10B981" : SCORE >= 50 ? "#F59E0B" : "#EF4444" }}>{GRADE}</span>
                </div>
              </div>
            </div>
            {globalRisk?.score_delta && (
              <div className={`text-right ${globalRisk.score_delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${globalRisk.score_delta < 0 ? "rotate-180" : ""}`} />
                <span className="text-sm font-black">{globalRisk.score_delta >= 0 ? "+" : ""}{globalRisk.score_delta}</span>
              </div>
            )}
          </div>
          <ExecutiveProgressBar value={SCORE} color={GOLD} />
        </Card>

        {domainScores.map((domain, i) => (
          <ExecutiveKpiCard key={i} label={domain.name} value={domain.score} icon={domain.icon} color={domain.color} />
        ))}
      </div>

      {/* SECOND ROW - Critical Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <ExecutiveKpiCard label="Open Findings" value={OPEN} sub={`${CRIT} critical`} icon={AlertTriangle} color="#EF4444" pulse={CRIT > 0} />
        <ExecutiveKpiCard label="Financial Exposure" value={`$${(FINANCIAL_EXPOSURE / 1000000).toFixed(1)}M`} icon={DollarSign} color="#F59E0B" />
        <ExecutiveKpiCard label="MTTD" value="24m" icon={Clock} color="#10B981" />
        <ExecutiveKpiCard label="Automation Rate" value="67%" icon={Activity} color="#0EA5E9" />
        <ExecutiveKpiCard label="Compliance Score" value="94%" icon={CheckCircle} color="#A855F7" />
        <ExecutiveKpiCard label="SLA Breaches" value="3" icon={AlertTriangle} color="#EF4444" pulse />
      </div>

      {/* THIRD ROW - Latest Briefing */}
      {latestBriefing && (
        <Card className="p-6 mb-6" style={{ background: CARD_BG, border: `1px solid ${GOLD}30` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: GOLD }} />
              Latest Executive Briefing
            </h3>
            <Link to="/executive/briefings" className="text-[10px] font-bold" style={{ color: GOLD }}>View All →</Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <ExecutiveBadge color={AUDIENCE_COLORS[latestBriefing.audience] || GOLD}>{latestBriefing.audience || "CISO"}</ExecutiveBadge>
                <ExecutiveBadge color={POSTURE_COLORS[latestBriefing.security_posture] || GOLD}>{latestBriefing.security_posture || "good"}</ExecutiveBadge>
              </div>
              <p className="text-base font-bold text-white mb-3">{latestBriefing.headline || "Executive Security Briefing"}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {(latestBriefing.top_3_risks || ["Risk 1", "Risk 2", "Risk 3"]).slice(0, 3).map((risk, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: `${GOLD}15`, color: GOLD, border: `1px solid ${GOLD}30` }}>{risk}</span>
                ))}
              </div>
              {(latestBriefing.immediate_actions || []).length > 0 && (
                <ol className="text-[11px] space-y-1" style={{ color: MUTED }}>
                  {(latestBriefing.immediate_actions || []).slice(0, 3).map((action, i) => (
                    <li key={i}><span style={{ color: GOLD }}>{i + 1}.</span> {action}</li>
                  ))}
                </ol>
              )}
            </div>
            <div className="flex items-center">
              <Link to="/executive/briefings"
                className="w-full py-3 rounded-xl text-xs font-bold text-center transition-all hover:opacity-80"
                style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40`, color: GOLD }}>
                View Full Briefing
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* FOURTH ROW - Three Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategic Objectives */}
        <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Strategic Objectives</h3>
            <Link to="/executive/strategy" className="text-[10px] font-bold" style={{ color: GOLD }}>All →</Link>
          </div>
          <div className="space-y-3">
            {objectives.slice(0, 5).map((obj, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-semibold text-white">{obj.name || `Objective ${i + 1}`}</span>
                  <ExecutiveBadge color={PILLAR_COLORS[obj.pillar] || GOLD}>{obj.pillar || "security"}</ExecutiveBadge>
                </div>
                <ExecutiveProgressBar value={obj.progress_pct || 0} color={obj.priority === "critical" ? "#EF4444" : obj.priority === "high" ? "#F59E0B" : GOLD} />
              </div>
            ))}
          </div>
        </Card>

        {/* Investment Recommendations */}
        <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Top Investments</h3>
            <Link to="/executive/investments" className="text-[10px] font-bold" style={{ color: GOLD }}>All →</Link>
          </div>
          <div className="space-y-3">
            {investments.slice(0, 5).map((inv, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div>
                  <p className="text-[10px] font-semibold text-white">{inv.name || `Investment ${i + 1}`}</p>
                  <p className="text-[9px]" style={{ color: MUTED }}>${(inv.investment_usd || 0) / 1000}K</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: (inv.roi_pct || 0) > 200 ? "#10B981" : GOLD }}>{inv.roi_pct || 0}% ROI</p>
                  <p className="text-[9px]" style={{ color: MUTED }}>{inv.payback_months || 0} mo</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Risk Heatmap */}
        <Card className="p-5" style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Risk Heatmap</h3>
            <Link to="/executive/risk-register" className="text-[10px] font-bold" style={{ color: GOLD }}>Register →</Link>
          </div>
          <ExecutiveHeatmap data={risks} />
        </Card>
      </div>
    </div>
  );
}