import React, { useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, TrendingDown, Shield, AlertTriangle, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const GOLD = "#C9A84C";

const TOP_FINDINGS = [
  { title: "SQL Injection in /api/users", asset: "api-gateway", severity: "critical", ale: 4200000, prob: 0.35, impact: 12000000 },
  { title: "Hardcoded AWS Admin Key", asset: "data-pipeline", severity: "critical", ale: 2800000, prob: 0.28, impact: 10000000 },
  { title: "S3 Bucket Public ACL (PII)", asset: "data-pipeline", severity: "high", ale: 1400000, prob: 0.45, impact: 3100000 },
  { title: "CVE-2024-21626 (runc escape)", asset: "payment-svc", severity: "high", ale: 980000, prob: 0.22, impact: 4400000 },
  { title: "Broken Auth in Admin Panel", asset: "admin-portal", severity: "high", ale: 750000, prob: 0.18, impact: 4200000 },
  { title: "Missing Rate Limiting (API)", asset: "api-gateway", severity: "medium", ale: 210000, prob: 0.40, impact: 525000 },
  { title: "Unencrypted SQS Queue", asset: "notification-svc", severity: "medium", ale: 95000, prob: 0.15, impact: 633000 },
  { title: "Outdated numpy (data leakage)", asset: "ml-inference", severity: "low", ale: 22000, prob: 0.08, impact: 275000 },
];

const REGULATORY = [
  { framework: "GDPR Art. 83 (high)", max_fine: "€20M or 4% revenue", risk_pct: 35, est_fine: 7000000 },
  { framework: "PCI-DSS non-compliance", max_fine: "$100k/month", risk_pct: 28, est_fine: 1200000 },
  { framework: "NIS2 Directive", max_fine: "€10M or 2% revenue", risk_pct: 18, est_fine: 3600000 },
];

const CHART_DATA = TOP_FINDINGS.slice(0, 6).map(f => ({
  name: f.title.length > 22 ? f.title.slice(0, 22) + "…" : f.title,
  ale: Math.round(f.ale / 1000),
}));

const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };

function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

export default function RiskQuantificationPage() {
  const [years, setYears] = useState(1);
  // Canonical: $4.2M total = $1.8M cloud + $1.4M code + $0.7M runtime + $0.3M governance
  const totalALE = 4200000;
  const savedByFixingCriticals = 3400000; // If fix all 12 criticals → drops to $0.8M
  const roi = 28; // 28% below industry average
  const industryAvg = 5800000;
  const insuranceImpact = 34; // 34% premium increase

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <Link to="/" className="hover:text-white">Overview</Link><span>/</span>
        <span style={{ color: GOLD }}>Risk Quantification</span>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Financial Risk Quantification</h1>
          <p className="text-slate-400 text-sm mt-0.5">Total potential financial exposure from open security findings</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black" style={{ background: GOLD }}>
          <FileText className="w-4 h-4" /> Export Board Report
        </button>
      </div>

      {/* Hero KPIs — Canonical: $4.2M total */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl p-5 border col-span-2" style={{ background: "#111827", borderColor: "#ef444433" }}>
          <div className="text-[10px] text-slate-500 mb-1">Total Potential Financial Exposure</div>
          <div className="text-5xl font-black mb-1" style={{ color: "#ef4444" }}>$4.2M</div>
          <div className="text-[10px] text-slate-600">Annual Loss Expectancy from open findings</div>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "#111827", borderColor: "#22c55e33" }}>
          <div className="text-[10px] text-slate-500 mb-1">If Fix 12 Criticals Today</div>
          <div className="text-2xl font-black mb-1" style={{ color: "#22c55e" }}>$3.4M saved</div>
          <div className="text-[10px] text-slate-600">Exposure drops to $0.8M</div>
        </div>
        <div className="rounded-xl p-5 border" style={{ background: "#111827", borderColor: "#eab30833" }}>
          <div className="text-[10px] text-slate-500 mb-1">Insurance Impact</div>
          <div className="text-2xl font-black mb-1" style={{ color: "#eab308" }}>+{insuranceImpact}%</div>
          <div className="text-[10px] text-slate-600">Premium increase at current risk</div>
        </div>
      </div>

      {/* Breakdown Donut Chart */}
      <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
        <h3 className="text-sm font-bold text-white mb-4">Exposure by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[
                { name: "Cloud Misconfigs", value: 1800000, color: "#ef4444" },
                { name: "Code Vulns", value: 1400000, color: "#f97316" },
                { name: "Runtime", value: 700000, color: "#eab308" },
                { name: "Governance", value: 300000, color: "#8b5cf6" },
              ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                <Cell fill="#ef4444" />
                <Cell fill="#f97316" />
                <Cell fill="#eab308" />
                <Cell fill="#8b5cf6" />
              </Pie>
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 6, color: "#F9FAFB", fontSize: 11 }}
                formatter={v => [fmt(v), "Exposure"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            {[
              { label: "Cloud Misconfigs", value: "$1.8M", pct: "43%", color: "#ef4444" },
              { label: "Code Vulnerabilities", value: "$1.4M", pct: "33%", color: "#f97316" },
              { label: "Runtime/Application", value: "$0.7M", pct: "17%", color: "#eab308" },
              { label: "Governance Gaps", value: "$0.3M", pct: "7%", color: "#8b5cf6" },
            ].map(b => (
              <div key={b.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: b.color }} />
                  <span className="text-xs text-slate-400">{b.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">{b.value}</div>
                  <div className="text-[10px] text-slate-500">{b.pct}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Industry Benchmark */}
      <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#22c55e33" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Industry Benchmark</h3>
            <p className="text-xs text-slate-400">Your exposure vs. sector average</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400">28% below average</div>
            <div className="text-xs text-slate-500">Your $4.2M vs. ${fmt(industryAvg)} industry avg</div>
          </div>
        </div>
      </div>

      {/* Top Findings by ALE */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
        <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white">Top Risk Findings (Ranked by ALE)</h3>
        </div>
        <table className="w-full text-xs">
          <thead><tr style={{ background: "#0d1220", borderBottom: "1px solid #1F2937" }}>
            {["Rank", "Finding", "Asset", "Severity", "Annualised Probability", "Single Loss ($)", "ALE", ""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {TOP_FINDINGS.map((f, i) => (
              <tr key={i} className="hover:bg-white/5" style={{ borderBottom: "1px solid #1F2937", borderLeft: `2px solid ${SEV_COLORS[f.severity]}` }}>
                <td className="px-4 py-3 text-slate-500 font-bold">#{i + 1}</td>
                <td className="px-4 py-3 text-white font-medium max-w-[220px]">{f.title}</td>
                <td className="px-4 py-3 text-slate-400">{f.asset}</td>
                <td className="px-4 py-3"><span className="text-[10px] font-bold" style={{ color: SEV_COLORS[f.severity] }}>{f.severity}</span></td>
                <td className="px-4 py-3 text-slate-300">{(f.prob * 100).toFixed(0)}%</td>
                <td className="px-4 py-3 text-slate-300">{fmt(f.impact)}</td>
                <td className="px-4 py-3 font-black" style={{ color: f.ale > 1000000 ? "#ef4444" : f.ale > 500000 ? "#f97316" : "#eab308" }}>{fmt(f.ale)}</td>
                <td className="px-4 py-3"><button className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-black" style={{ background: GOLD }}>Remediate</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Regulatory Risk */}
      <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
        <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white">Regulatory Fine Risk</h3>
        </div>
        <div className="divide-y" style={{ borderColor: "#1F2937" }}>
          {REGULATORY.map(r => (
            <div key={r.framework} className="flex items-center gap-4 p-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-bold text-white">{r.framework}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Max: {r.max_fine}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32">
                  <div className="text-[10px] text-slate-500 mb-1">Likelihood</div>
                  <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${r.risk_pct}%` }} />
                  </div>
                  <div className="text-[10px] text-red-400 mt-0.5">{r.risk_pct}%</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-red-400">{fmt(r.est_fine)}</div>
                  <div className="text-[10px] text-slate-500">Estimated fine</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}