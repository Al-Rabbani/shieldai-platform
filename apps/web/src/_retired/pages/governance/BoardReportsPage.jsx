import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow, format } from "date-fns";
import { FileText, Plus, DollarSign, AlertTriangle, Shield, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const WARN = "#eab308"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const GRADE_COLOR = { A: SUCCESS, B: "#22c55e", C: WARN, D: "#f97316", F: DANGER };

function MiniGauge({ score, label, color }) {
  const r = 28, cx = 36, cy = 38;
  const toXY = pct => ({ x: cx + r * Math.cos(Math.PI * (1 + pct)), y: cy + r * Math.sin(Math.PI * (1 + pct)) });
  const pct = (score || 0) / 100;
  const start = toXY(0), end = toXY(pct);
  const large = pct > 0.5 ? 1 : 0;
  return (
    <div className="flex flex-col items-center">
      <svg width={72} height={50} viewBox="0 0 72 50">
        <path d={`M ${toXY(0).x} ${toXY(0).y} A ${r} ${r} 0 1 1 ${toXY(1).x} ${toXY(1).y}`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} strokeLinecap="round" />
        {(score || 0) > 0 && <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color}66)` }} />}
        <text x={cx} y={cy - 6} fill={color} fontSize={13} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
      </svg>
      <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 text-center">{label}</p>
    </div>
  );
}

export default function BoardReportsPage() {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["board-reports"],
    queryFn: () => base44.entities.BoardRiskReport.list("-generated_at", 50).catch(() => []),
    initialData: [],
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["financial-risks-board"],
    queryFn: () => base44.entities.FinancialRisk.list("-estimated_exposure_usd", 5).catch(() => []),
    initialData: [],
  });

  const latest = reports[0];

  const trendData = reports.slice(0, 12).reverse().map(r => ({
    period: r.report_period || r.generated_at?.slice(0, 7) || "—",
    score: r.overall_risk_score || 0,
  }));

  const histRows = reports.slice(1).map(r => ({
    _key: r.id,
    _cells: [
      <span className="text-[10px] font-semibold text-white">{r.report_period || "—"}</span>,
      <span className="text-[11px] font-black" style={{ color: GRADE_COLOR[r.risk_grade] || "#64748b" }}>{r.risk_grade || "—"}</span>,
      <span className="text-[10px] font-mono" style={{ color: DANGER }}>{r.total_financial_exposure ? `$${(r.total_financial_exposure/1e6).toFixed(1)}M` : "—"}</span>,
      <span className="text-[10px] font-mono text-slate-300">{r.critical_findings ?? "—"}</span>,
      <span className="text-[9px]" style={{ color: r.sla_breached ? DANGER : SUCCESS }}>{r.sla_breached ? "⚠ Breached" : "✓ On Track"}</span>,
      <span className="text-[9px] text-slate-500">{r.generated_at ? format(new Date(r.generated_at), "MMM d, yyyy") : "—"}</span>,
    ],
  }));

  const topRiskRows = risks.map(r => ({
    _key: r.id,
    _cells: [
      <span className="text-[11px] font-semibold text-white">{r.title || "—"}</span>,
      <span className="text-[9px] font-bold capitalize px-2 py-0.5 rounded" style={{ color: r.severity==="critical"?DANGER:r.severity==="high"?"#f97316":WARN, background: "rgba(255,255,255,0.05)" }}>{r.severity || "—"}</span>,
      <span className="text-[10px] font-mono" style={{ color: DANGER }}>{r.estimated_exposure_usd ? `$${(r.estimated_exposure_usd/1e6).toFixed(1)}M` : "—"}</span>,
      <span className="text-[9px] capitalize text-slate-400">{(r.status || "—").replace(/_/g," ")}</span>,
    ],
  }));

  const fmtMoney = n => n >= 1e9 ? `$${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${(n||0).toLocaleString()}`;

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Governance", path: "/governance" }, { label: "Board Reports" }]}
      title="Board Reports" subtitle="EXECUTIVE RISK BRIEFING · FINANCIAL EXPOSURE · BOARD-READY"
      actions={
        <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: GOLD, color: "#0a0e17" }}>
          <Plus className="w-3.5 h-3.5" /> Generate New Report
        </button>
      }>

      {/* Latest Report Card */}
      {latest ? (
        <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid rgba(201,168,76,0.25)` }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-white">Report: {latest.report_period || "—"}</h2>
                <span className="text-2xl font-black" style={{ color: GRADE_COLOR[latest.risk_grade] || "#64748b" }}>{latest.risk_grade || "—"}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-0.5">{latest.generated_at ? `Generated ${format(new Date(latest.generated_at), "MMMM d, yyyy")}` : "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{fmtMoney(latest.total_financial_exposure || 0)}</p>
              <p className="text-[9px] text-slate-500">Financial Exposure</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard label="Risk Score" value={latest.overall_risk_score ?? "—"} color={GOLD} icon={Shield} />
            <StatCard label="Critical Findings" value={latest.critical_findings ?? 0} color={DANGER} icon={AlertTriangle} />
            <StatCard label="SLA Status" value={latest.sla_breached ? "Breached" : "On Track"} color={latest.sla_breached ? DANGER : SUCCESS} icon={AlertTriangle} />
            <StatCard label="Report Period" value={latest.report_period || "—"} color={CYAN} icon={FileText} />
          </div>

          {/* 4 Mini Gauges */}
          <div className="flex items-center justify-around py-4 mb-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
            <MiniGauge score={latest.compliance_score} label="Compliance" color="#a78bfa" />
            <MiniGauge score={latest.ai_security_score} label="AI Security" color={CYAN} />
            <MiniGauge score={latest.cloud_posture_score} label="Cloud Posture" color="#3b82f6" />
            <MiniGauge score={latest.code_security_score} label="Code Security" color="#10b981" />
          </div>

          {latest.executive_summary && (
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Executive Summary</p>
              <p className="text-xs text-slate-300 leading-relaxed">{latest.executive_summary}</p>
            </div>
          )}

          {latest.board_recommendations && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Board Recommendations</p>
              <div className="space-y-1.5">
                {latest.board_recommendations.split("\n").filter(Boolean).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0" style={{ background: GOLDDIM, color: GOLD }}>{i+1}</span>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !isLoading ? (
        <div className="py-16 text-center rounded-2xl" style={{ border: `1px dashed ${BORDER}` }}>
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-500">No board reports generated yet</p>
        </div>
      ) : null}

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <div className="rounded-2xl p-5" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white mb-4">Risk Score Trend</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trendData}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 8 }} />
              <YAxis domain={[0,100]} tick={{ fill: "#64748b", fontSize: 8 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: `1px solid ${BORDER}`, fontSize: 10 }} />
              <Line type="monotone" dataKey="score" stroke={GOLD} strokeWidth={2} dot={{ fill: GOLD, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top 5 Risks */}
      {risks.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Top 5 Financial Risks</h3>
          <GDSTable columns={["Risk","Severity","Exposure","Status"]} rows={topRiskRows} isLoading={false} emptyText="No risk data" />
        </div>
      )}

      {/* Historical Reports */}
      {histRows.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Historical Reports</h3>
          <GDSTable columns={["Period","Grade","Exposure","Critical Findings","SLA","Generated"]} rows={histRows} isLoading={isLoading} emptyText="No historical reports" />
        </div>
      )}
    </GDSPageShell>
  );
}

const GOLDDIM = "rgba(201,168,76,0.15)";