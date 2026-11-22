import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, AlertTriangle, Shield, DollarSign } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Skeleton, EmptyState, Breadcrumb, AnimatedArc } from "@/components/gds/GDSOSShared";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";

const CONFIDENCE_COLORS = { high: LOW, medium: MEDIUM, low: DANGER };
const RISK_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GDSConfidenceRiskPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["planning-metrics"],
    queryFn: () => base44.functions.invoke("gdsPlanningReasoningEngine", { action: "metrics" }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: confidenceData } = useQuery({
    queryKey: ["confidence-scores"],
    queryFn: () => base44.entities.ConfidenceScore.list("-created_date", 20).catch(() => []),
  });

  const { data: riskData } = useQuery({
    queryKey: ["risk-estimates"],
    queryFn: () => base44.entities.RiskEstimate.list("-created_date", 20).catch(() => []),
  });

  const m = metrics || {};
  const confidenceDist = Object.entries(m.confidence?.distribution || {}).map(([level, count]) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1), count, color: CONFIDENCE_COLORS[level] || MUTED
  }));

  const riskDist = Object.entries(m.risk?.distribution || {}).map(([level, count]) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1), count, color: RISK_COLORS[level] || MUTED
  }));

  const riskColor = (score) => score >= 70 ? DANGER : score >= 50 ? HIGH : LOW;

  return (
    <div className="space-y-6" style={{ background: "#020817", minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Confidence & Risk Assessment" }]} />
      
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Confidence & Risk Assessment</h1>
          <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Evidence-Based Scoring</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
            <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Confidence Scores</h3>
          </div>
          {isLoading ? <Skeleton lines={6} /> : confidenceData && confidenceData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Plan ID", "Score", "Level", "Evidence", "Completeness", "Reliability", "Risk", "Recommendation"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {confidenceData.map((c, i) => {
                    const levelColor = CONFIDENCE_COLORS[c.score_level] || MUTED;
                    return (
                      <tr key={c.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-mono text-white truncate max-w-[100px]">{c.plan_id || "—"}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <AnimatedArc score={c.overall_score || 0} size={40} strokeWidth={4} />
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded uppercase" style={{ color: levelColor, background: `${levelColor}18`, border: `1px solid ${levelColor}30` }}>
                            {c.score_level || "unknown"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: c.evidence_quality >= 70 ? LOW : c.evidence_quality >= 50 ? MEDIUM : DANGER }}>{c.evidence_quality ?? 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: c.data_completeness >= 70 ? LOW : c.data_completeness >= 50 ? MEDIUM : DANGER }}>{c.data_completeness ?? 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: c.plan_reliability >= 70 ? LOW : c.plan_reliability >= 50 ? MEDIUM : DANGER }}>{c.plan_reliability ?? 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: c.execution_risk >= 70 ? DANGER : c.execution_risk >= 50 ? HIGH : LOW }}>{c.execution_risk ?? 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{c.recommendation || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={TrendingUp} title="No confidence scores" description="Run planning analyses to see scores" />
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
            <AlertTriangle className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Risk Estimates</h3>
          </div>
          {riskData && riskData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Plan ID", "Risk", "Score", "Ops", "Sec", "Comp", "Biz", "Fail %", "Blast", "Rollback", "Impact"].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riskData.map((r, i) => {
                    const riskColorVal = RISK_COLORS[r.overall_risk] || MUTED;
                    return (
                      <tr key={r.id || i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                        <td className="py-2 px-3 font-mono text-white truncate max-w-[100px]">{r.plan_id || "—"}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded uppercase" style={{ color: riskColorVal, background: `${riskColorVal}18`, border: `1px solid ${riskColorVal}30` }}>
                            {r.overall_risk || "unknown"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <div className="h-full rounded-full" style={{ width: `${r.overall_risk_score || 0}%`, background: riskColor(r.overall_risk_score) }} />
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: riskColor(r.overall_risk_score) }}>{r.overall_risk_score ?? 0}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: r.operational >= 70 ? DANGER : r.operational >= 50 ? HIGH : LOW }}>{r.operational ?? 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: r.security >= 70 ? DANGER : r.security >= 50 ? HIGH : LOW }}>{r.security ?? 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: r.compliance >= 70 ? DANGER : r.compliance >= 50 ? HIGH : LOW }}>{r.compliance ?? 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: r.business_impact >= 70 ? DANGER : r.business_impact >= 50 ? HIGH : LOW }}>{r.business_impact ?? 0}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: r.failure_probability >= 50 ? DANGER : MEDIUM }}>{r.failure_probability ?? 0}%</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{r.blast_radius || "—"}</td>
                        <td className="py-2 px-3 text-[10px]" style={{ color: MUTED }}>{r.rollback_difficulty || "—"}</td>
                        <td className="py-2 px-3 font-mono text-[10px]" style={{ color: r.estimated_financial_impact >= 1000000 ? DANGER : r.estimated_financial_impact >= 100000 ? HIGH : LOW }}>
                          ${r.estimated_financial_impact?.toLocaleString() || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={AlertTriangle} title="No risk estimates" description="Run planning analyses to see estimates" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Confidence Distribution</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Average confidence by level</p>
          </div>
          {confidenceDist.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No data" description="" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={confidenceDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} allowDecimals={false} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {confidenceDist.map((d, i) => (<Cell key={i} fill={d.color} opacity={0.8} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white">Risk Distribution</h3>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Risk level breakdown</p>
          </div>
          {riskDist.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No data" description="" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} allowDecimals={false} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {riskDist.map((d, i) => (<Cell key={i} fill={d.color} opacity={0.8} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}