import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Users, AlertTriangle, Activity, TrendingUp, Crosshair, Lock, Key } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, SevBadge, timeAgo } from "@/components/gds/GDSOSShared";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

function RiskGauge({ score, size = 100 }) {
  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 80 ? LOW : score >= 60 ? MEDIUM : score >= 40 ? HIGH : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 4} fill={color} fontSize={size * 0.25} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

function MITREBadge({ technique }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${CYAN}15`, color: CYAN, border: `1px solid ${CYAN}30` }}>
      {technique}
    </span>
  );
}

export default function GDSIdentitySecurityPage() {
  const { data: domains = [] } = useQuery({
    queryKey: ["identity-domains"],
    queryFn: () => base44.entities.ADDomain?.list().catch(() => []),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["identity-users"],
    queryFn: () => base44.entities.ADUser?.list().catch(() => []),
  });

  const { data: attackPaths = [] } = useQuery({
    queryKey: ["identity-attack-paths"],
    queryFn: () => base44.entities.IdentityAttackPath?.list("-risk_score", 500).catch(() => []),
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["identity-findings"],
    queryFn: () => base44.entities.IdentityFinding?.filter({ severity: "critical" }, "-risk_score", 50).catch(() => []),
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["identity-assessments"],
    queryFn: () => base44.entities.IdentityAssessment?.list("-completed_at", 10).catch(() => []),
  });

  // Calculate stats
  const totalUsers = users.length;
  const domainAdmins = users.filter(u => u.privilege_level === "domain_admin" || u.is_admin === true).length;
  const kerberoastable = users.filter(u => u.kerberoastable === true).length;
  const asrepRoastable = users.filter(u => u.asrep_roastable === true).length;
  const activeAttackPaths = attackPaths.filter(p => p.status === "active").length;

  // Attack path type distribution
  const attackPathTypes = attackPaths.reduce((acc, p) => {
    const type = p.path_type || "unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(attackPathTypes).map(([name, value]) => ({ name, value }));
  const COLORS = [DANGER, HIGH, MEDIUM, CYAN, LOW, "#a855f7", "#ec4899", "#14b8a6"];

  // Overall risk calculation
  const overallRiskScore = Math.round(
    (kerberoastable > 0 ? 30 : 0) +
    (asrepRoastable > 0 ? 25 : 0) +
    (domainAdmins > 3 ? 25 : 0) +
    (activeAttackPaths > 0 ? 20 : 0)
  );

  const riskGrade = overallRiskScore >= 80 ? "A" : overallRiskScore >= 60 ? "B" : overallRiskScore >= 40 ? "C" : overallRiskScore >= 20 ? "D" : "F";

  const latestAssessment = assessments[0];

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Identity Security Center</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Active Directory security posture and identity threat detection</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${CYAN}15`, border: `1px solid ${CYAN}30` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CYAN }} />
          <span className="text-[10px] font-bold" style={{ color: CYAN }}>LIVE DATA</span>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4" style={{ color: CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Domains</p>
          </div>
          <p className="text-2xl font-black text-white">{domains.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" style={{ color: CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Total Users</p>
          </div>
          <p className="text-2xl font-black text-white">{totalUsers}</p>
        </Card>

        <Card className="p-4" style={{ background: domainAdmins > 3 ? `${DANGER}08` : "transparent", border: domainAdmins > 3 ? `1px solid ${DANGER}30` : BORDER }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4" style={{ color: domainAdmins > 3 ? DANGER : CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Domain Admins</p>
          </div>
          <p className="text-2xl font-black" style={{ color: domainAdmins > 3 ? DANGER : TEXT }}>{domainAdmins}</p>
          {domainAdmins > 3 && <p className="text-[8px] mt-1" style={{ color: DANGER }}>Excessive admins!</p>}
        </Card>

        <Card className="p-4" style={{ background: kerberoastable > 0 ? `${DANGER}08` : "transparent", border: kerberoastable > 0 ? `1px solid ${DANGER}30` : BORDER }}>
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-4 h-4" style={{ color: kerberoastable > 0 ? DANGER : CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Kerberoastable</p>
          </div>
          <p className="text-2xl font-black" style={{ color: kerberoastable > 0 ? DANGER : TEXT }}>{kerberoastable}</p>
        </Card>

        <Card className="p-4" style={{ background: asrepRoastable > 0 ? `${DANGER}08` : "transparent", border: asrepRoastable > 0 ? `1px solid ${DANGER}30` : BORDER }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4" style={{ color: asrepRoastable > 0 ? DANGER : CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>AS-REP Roastable</p>
          </div>
          <p className="text-2xl font-black" style={{ color: asrepRoastable > 0 ? DANGER : TEXT }}>{asrepRoastable}</p>
        </Card>

        <Card className="p-4" style={{ background: activeAttackPaths > 0 ? `${DANGER}08` : "transparent", border: activeAttackPaths > 0 ? `1px solid ${DANGER}30` : BORDER }}>
          <div className="flex items-center gap-2 mb-2">
            <Crosshair className={`w-4 h-4 ${activeAttackPaths > 0 ? "animate-pulse" : ""}`} style={{ color: activeAttackPaths > 0 ? DANGER : CYAN }} />
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Active Attack Paths</p>
          </div>
          <p className="text-2xl font-black" style={{ color: activeAttackPaths > 0 ? DANGER : TEXT }}>{activeAttackPaths}</p>
        </Card>
      </div>

      {/* Risk Grade & Attack Path Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-bold text-white mb-4">Overall Risk Grade</h3>
          <div className="flex items-center gap-6">
            <RiskGauge score={overallRiskScore} size={120} />
            <div className="flex-1">
              <div className="text-5xl font-black" style={{ color: riskGrade === "A" || riskGrade === "B" ? LOW : riskGrade === "C" ? MEDIUM : riskGrade === "D" ? HIGH : DANGER }}>
                {riskGrade}
              </div>
              <p className="text-sm mt-2" style={{ color: MUTED }}>
                {riskGrade === "F" ? "Critical - Immediate action required" :
                 riskGrade === "D" ? "Poor - Significant vulnerabilities" :
                 riskGrade === "C" ? "Moderate - Improvements needed" :
                 riskGrade === "B" ? "Good - Minor issues" : "Excellent - Well secured"}
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: MUTED }}>Kerberoastable Users</span>
                  <span style={{ color: kerberoastable > 0 ? DANGER : LOW }}>{kerberoastable}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: MUTED }}>AS-REP Roastable</span>
                  <span style={{ color: asrepRoastable > 0 ? DANGER : LOW }}>{asrepRoastable}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: MUTED }}>Domain Admins</span>
                  <span style={{ color: domainAdmins > 3 ? DANGER : LOW }}>{domainAdmins}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-white mb-4">Attack Path Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Critical Findings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Top 5 Critical Findings</h3>
          <Activity className="w-4 h-4" style={{ color: DANGER }} />
        </div>
        <div className="space-y-3">
          {findings.slice(0, 5).map((finding, i) => (
            <Card key={finding.id || i} className="p-4" style={{ background: `${DANGER}05`, border: `1px solid ${DANGER}20` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <SevBadge sev={finding.severity} />
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${CYAN}15`, color: CYAN }}>
                      {finding.finding_type || "Unknown"}
                    </span>
                    {finding.mitre_technique && <MITREBadge technique={finding.mitre_technique} />}
                  </div>
                  <p className="text-sm font-semibold text-white">{finding.title}</p>
                  {finding.affected_identity && (
                    <p className="text-[10px] mt-1" style={{ color: MUTED }}>Affected: {finding.affected_identity}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black" style={{ color: DANGER }}>{finding.risk_score || 0}</p>
                  <p className="text-[9px]" style={{ color: MUTED }}>Risk Score</p>
                </div>
              </div>
            </Card>
          ))}
          {findings.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: MUTED }}>No critical findings detected</p>
          )}
        </div>
      </Card>

      {/* Latest Assessment */}
      {latestAssessment && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-white mb-4">Latest Assessment Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Assessment ID</p>
              <p className="text-sm font-mono" style={{ color: CYAN }}>{latestAssessment.assessment_id || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Type</p>
              <p className="text-sm" style={{ color: TEXT }}>{latestAssessment.assessment_type || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Users Analyzed</p>
              <p className="text-sm font-bold" style={{ color: TEXT }}>{latestAssessment.users_analyzed || 0}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Critical Findings</p>
              <p className="text-sm font-bold" style={{ color: DANGER }}>{latestAssessment.critical_count || 0}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Completed</p>
              <p className="text-sm" style={{ color: MUTED }}>{timeAgo(latestAssessment.completed_at)}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}