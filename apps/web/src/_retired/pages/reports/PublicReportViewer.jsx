import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Copy, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const urlParams = new URLSearchParams(window.location.search);
const SHARE_TOKEN = urlParams.get("token");
const REPORT_ID = urlParams.get("id");

function RiskGauge({ score }) {
  if (score == null) return null;
  const color = score >= 70 ? "#ef4444" : score >= 40 ? "#f59e0b" : "#22c55e";
  const label = score >= 70 ? "HIGH RISK" : score >= 40 ? "MEDIUM RISK" : "LOW RISK";
  const r = 60; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
        <text x="80" y="75" textAnchor="middle" fill={color} fontSize="28" fontWeight="900">{score}</text>
        <text x="80" y="96" textAnchor="middle" fill="#64748b" fontSize="11">/100</text>
      </svg>
      <span className="text-sm font-bold" style={{ color }}>{label}</span>
    </div>
  );
}

export default function PublicReportViewer() {
  const [copied, setCopied] = useState(false);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["public-report", REPORT_ID],
    queryFn: () => base44.entities.RiskReport.list("-created_date", 50),
    enabled: !!(REPORT_ID || SHARE_TOKEN),
  });

  const report = REPORT_ID
    ? reports.find(r => r.id === REPORT_ID)
    : reports.find(r => r.share_token === SHARE_TOKEN);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const topRisks = (() => { try { return JSON.parse(report?.top_risks || "[]"); } catch { return []; } })();
  const recs = (() => { try { return JSON.parse(report?.recommendations || "[]"); } catch { return []; } })();

  const severityData = [
    { name: "Critical", value: report?.critical_issues || 0, color: "#ef4444" },
    { name: "High", value: report?.high_issues || 0, color: "#f97316" },
    { name: "Medium", value: Math.max((report?.total_findings || 0) - (report?.critical_issues || 0) - (report?.high_issues || 0), 0), color: "#eab308" },
  ].filter(d => d.value > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center text-[#e2e8f0]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Report Not Found</h2>
          <p className="text-muted-foreground">This report may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 print:bg-white">
      {/* Print styles */}
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      {/* Header */}
      <div className="bg-[#050c18] text-white px-8 py-6 flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <span className="text-lg font-bold">ShieldAI</span>
            <p className="text-xs text-[#64748b]">Autonomous Security Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={copyLink} variant="outline" size="sm" className="border-[#334155] text-[#94a3b8] hover:text-white gap-2">
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm" className="border-[#334155] text-[#94a3b8] hover:text-white gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>
      </div>

      {/* Confidential label */}
      <div className="bg-red-600 text-white text-center py-2 text-xs font-bold tracking-widest uppercase no-print">
        ⚠ CONFIDENTIAL SECURITY REPORT — INTERNAL USE ONLY
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* Meta */}
        <div className="text-center border-b border-gray-200 pb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-3">{report.title}</h1>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>Generated by <strong>{report.generated_by || "ShieldAI"}</strong></span>
            {report.period_start && <span>Period: {new Date(report.period_start).toLocaleDateString()} – {new Date(report.period_end || Date.now()).toLocaleDateString()}</span>}
          </div>
        </div>

        {/* Risk Score */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Overall Risk Score</h2>
          <RiskGauge score={report.overall_risk_score} />
        </div>

        {/* Findings Breakdown */}
        {severityData.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Findings Breakdown</h2>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={severityData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                      {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {severityData.map(d => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-sm font-medium text-gray-700">{d.name}</span>
                    <span className="text-sm font-black text-gray-900 ml-auto">{d.value}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                  <span className="text-gray-500">Total Findings</span>
                  <span className="font-black text-gray-900">{report.total_findings || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Risks */}
        {topRisks.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Executive Summary — Top Risks</h2>
            <div className="space-y-3">
              {topRisks.map((risk, i) => (
                <div key={i} className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <span className="text-red-500 font-bold text-sm flex-shrink-0">{i + 1}.</span>
                  <p className="text-sm text-gray-700">{risk}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recommendations</h2>
            <div className="space-y-2">
              {recs.map((rec, i) => (
                <div key={i} className="flex gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <span className="text-emerald-600 font-bold text-sm flex-shrink-0">{i + 1}.</span>
                  <p className="text-sm text-gray-700">{rec.replace(/^\w+:\s*/, "")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
          Generated by <strong>ShieldAI — Autonomous Security Intelligence</strong>
          <br />© 2026 ShieldAI. All rights reserved.
        </div>
      </div>
    </div>
  );
}