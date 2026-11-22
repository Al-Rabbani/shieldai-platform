import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ClipboardList, CheckCircle, TrendingUp, Calendar } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, timeAgo } from "@/components/gds/GDSOSShared";

function AssessmentTypeBadge({ type }) {
  const colors = {
    ad_full: { bg: CYAN, text: CYAN },
    entra_id: { bg: "#0ea5e9", text: "#0ea5e9" },
    hybrid: { bg: "#8b5cf6", text: "#8b5cf6" },
  };
  const color = colors[type] || { bg: MUTED, text: MUTED };
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ background: `${color.bg}15`, color: color.text, border: `1px solid ${color.bg}30` }}>
      {type?.replace(/_/g, " ").toUpperCase() || "UNKNOWN"}
    </span>
  );
}

function RiskGauge({ score, size = 40 }) {
  const r = size / 2 - 4;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score || 0, 100) / 100;
  const color = score >= 80 ? LOW : score >= 60 ? MEDIUM : score >= 40 ? HIGH : DANGER;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 2} fill={color} fontSize={size * 0.22} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

export default function GDSIdentityAssessmentsPage() {
  const { data: assessments = [] } = useQuery({
    queryKey: ["identity-assessments"],
    queryFn: () => base44.entities.IdentityAssessment?.list("-completed_at", 500).catch(() => []),
  });

  const getRiskGrade = (score) => {
    const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
    const color = grade === "A" || grade === "B" ? LOW : grade === "C" ? MEDIUM : grade === "D" ? HIGH : DANGER;
    return { grade, color };
  };

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Identity Security" }, { label: "Assessment History" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Assessment History</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Active Directory security assessment history and results</p>
        </div>
      </div>

      {/* Assessments Table */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Assessment History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                {["Assessment ID", "Type", "Domain", "Status", "Users", "Findings", "Critical", "Attack Paths", "Kerberoastable", "AS-REP", "Risk Score", "Grade", "Duration", "Completed"].map(h => (
                  <th key={h} className="text-left py-3 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.map((assessment, i) => {
                const { grade, color } = getRiskGrade(assessment.overall_risk_score);
                return (
                  <tr key={assessment.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-3 px-3">
                      <span className="text-xs font-mono" style={{ color: CYAN }}>{assessment.assessment_id || "—"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <AssessmentTypeBadge type={assessment.assessment_type} />
                    </td>
                    <td className="py-3 px-3" style={{ color: TEXT }}>{assessment.domain_name || "—"}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                        assessment.status === "completed" ? "bg-green-400/15 text-green-400" :
                        assessment.status === "running" ? "bg-cyan-400/15 text-cyan-400" :
                        "bg-gray-400/15 text-gray-400"
                      }`}>
                        {assessment.status || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-3" style={{ color: TEXT }}>{assessment.users_analyzed || 0}</td>
                    <td className="py-3 px-3" style={{ color: TEXT }}>{assessment.findings_count || 0}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-bold" style={{ color: DANGER }}>{assessment.critical_count || 0}</span>
                    </td>
                    <td className="py-3 px-3" style={{ color: TEXT }}>{assessment.attack_paths_count || 0}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs" style={{ color: assessment.kerberoastable_count > 0 ? DANGER : LOW }}>{assessment.kerberoastable_count || 0}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs" style={{ color: assessment.asrep_roastable_count > 0 ? DANGER : LOW }}>{assessment.asrep_roastable_count || 0}</span>
                    </td>
                    <td className="py-3 px-3">
                      <RiskGauge score={assessment.overall_risk_score} size={40} />
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm font-black px-2 py-1 rounded" style={{ color, background: `${color}15` }}>
                        {grade}
                      </span>
                    </td>
                    <td className="py-3 px-3" style={{ color: MUTED }}>
                      {assessment.duration_seconds ? `${Math.round(assessment.duration_seconds / 60)}m` : "—"}
                    </td>
                    <td className="py-3 px-3" style={{ color: MUTED }}>{timeAgo(assessment.completed_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}