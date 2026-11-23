import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, CARD,
  SevBadge, Skeleton, EmptyState, Card, Breadcrumb, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";
import { RegulationCards, DeadlineTimeline } from "@/components/gds/RegulationCards";

function usd(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

const INDUSTRIES = ["Technology","Finance","Healthcare","Retail","Government"];

export default function GDSGovernancePage() {
  const [fairData, setFairData] = useState(null);
  const [fairLoading, setFairLoading] = useState(false);
  const [regData, setRegData] = useState(null);
  const [regLoading, setRegLoading] = useState(false);

  // Peer Benchmarking
  const [benchIndustry, setBenchIndustry] = useState("Technology");
  const [benchData, setBenchData] = useState(null);
  const [benchLoading, setBenchLoading] = useState(false);

  // SLA Breach Forecast
  const [slaData, setSlaData] = useState(null);
  const [slaLoading, setSlaLoading] = useState(false);
  const [slaForecast, setSlaForecast] = useState(null);
  const [slaForecastLoading, setSlaForecastLoading] = useState(false);

  const runBench = async (industry) => {
    setBenchLoading(true);
    try {
      const r = await base44.functions.invoke("gdsPeerBenchmark", { action: "compare", industry: (industry || benchIndustry).toLowerCase() });
      if (r.data) setBenchData(r.data);
    } catch (e) { console.error(e); }
    finally { setBenchLoading(false); }
  };

  const runSLA = async () => {
    setSlaLoading(true);
    try {
      const r = await base44.functions.invoke("gdsSLABreachPredictor", { action: "predict" });
      if (r.data) setSlaData(r.data);
    } catch (e) { console.error(e); }
    finally { setSlaLoading(false); }
  };

  const runSLAForecast = async () => {
    setSlaForecastLoading(true);
    try {
      const r = await base44.functions.invoke("gdsSLABreachPredictor", { action: "forecast", days_ahead: 7 });
      if (r.data) setSlaForecast(r.data);
    } catch (e) { console.error(e); }
    finally { setSlaForecastLoading(false); }
  };

  useEffect(() => { runBench("Technology"); runSLA(); }, []);

  // Risk score history from entity
  const { data: riskHistory = [] } = useQuery({
    queryKey: ["gov-risk-history"],
    queryFn: () => base44.entities.GlobalRiskScore.list("-calculated_at", 30).catch(() => []),
  });

  const runFAIR = async () => {
    setFairLoading(true);
    try {
      const res = await base44.functions.invoke("gdsFAIRRisk", { action: "quantify" });
      if (res.data) setFairData(res.data);
    } catch (e) { console.error(e); }
    finally { setFairLoading(false); }
  };

  const runReg = async () => {
    setRegLoading(true);
    try {
      const res = await base44.functions.invoke("gdsRegulatoryIntel", { action: "digest" });
      if (res.data) setRegData(res.data);
    } catch (e) { console.error(e); }
    finally { setRegLoading(false); }
  };

  const ale = fairData?.formatted_full || fairData?.total_annual_risk_usd
    ? usd(fairData.total_annual_risk_usd)
    : "$14.6M";
  const topRisks = fairData?.top_risk_drivers || fairData?.top_findings || [];
  const board = fairData?.board_summary || fairData?.summary || null;
  const lec = fairData?.loss_exceedance_curve || [
    { percentile: 10, loss: 1200000 }, { percentile: 25, loss: 3800000 },
    { percentile: 50, loss: 7200000 }, { percentile: 75, loss: 11500000 },
    { percentile: 90, loss: 16800000 }, { percentile: 95, loss: 21000000 },
    { percentile: 99, loss: 32000000 },
  ];

  const regulations = regData?.regulations || regData?.at_risk_regulations || [];
  const deadlines = regData?.upcoming_deadlines || [
    { regulation: "EU AI Act", days_remaining: 41, deadline_type: "High-Risk Systems Compliance" },
    { regulation: "DORA", days_remaining: 92, deadline_type: "ICT Risk Framework" },
    { regulation: "NIS2", days_remaining: 156, deadline_type: "Incident Reporting" },
    { regulation: "UK Cyber Essentials", days_remaining: 203, deadline_type: "Annual Renewal" },
  ];

  const scoreHistory = riskHistory.map(r => ({
    date: new Date(r.calculated_at || r.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: r.overall_score,
    grade: r.risk_grade,
  })).reverse();

  return (
    <div className="space-y-8" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Governance" }]} />
      <div>
        <h1 className="text-2xl font-black text-white">Risk Governance & Financial Intelligence</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>FAIR quantification, regulatory compliance, and risk score history</p>
      </div>

      {/* ── FAIR Risk Quantification ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">FAIR Risk Quantification</h2>
          <button onClick={runFAIR} disabled={fairLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-3.5 h-3.5 ${fairLoading ? "animate-spin" : ""}`} />
            {fairLoading ? "Calculating…" : "Recalculate FAIR Risk"}
          </button>
        </div>

        {/* ALE Hero + sub-tiles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="md:col-span-1 p-5 flex flex-col items-center justify-center text-center"
            style={{ border: `1px solid ${DANGER}30` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Annual Loss Exposure</p>
            <p className="text-3xl font-black font-mono" style={{ color: DANGER }}>{ale}</p>
            <p className="text-[10px] mt-1" style={{ color: MUTED }}>/ year (ALE)</p>
          </Card>
          {[
            { label: "Base ALE", value: usd(fairData?.base_ale ?? 9800000), color: DANGER },
            { label: "Regulatory ALE", value: usd(fairData?.regulatory_ale ?? 4800000), color: HIGH },
            { label: "ROSI at 50%", value: usd(fairData?.rosi?.rosi_at_50_pct ?? 7300000), color: LOW },
            { label: "ROSI Ratio", value: `${fairData?.rosi?.rosi_ratio ?? "18.3"}:1`, color: CYAN },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 flex flex-col justify-center">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{label}</p>
              <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
            </Card>
          ))}
        </div>

        {/* Loss Exceedance Curve */}
        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-1">Loss Exceedance Curve</h3>
          <p className="text-[10px] mb-3" style={{ color: MUTED }}>Probability distribution of potential loss outcomes</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={lec} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="lecGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CYAN} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="percentile" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false}
                tickFormatter={v => `P${v}`} />
              <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `$${(v / 1000000).toFixed(0)}M` : `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0" }}
                formatter={v => [`$${(v / 1000000).toFixed(2)}M`, "Loss"]}
                labelFormatter={l => `Percentile P${l}`}
              />
              <Area type="monotone" dataKey="loss" stroke={CYAN} strokeWidth={2} fill="url(#lecGrad)" dot={{ fill: CYAN, r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Risk Drivers Table */}
        {topRisks.length > 0 && (
          <Card className="overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: BORDER }}>
              <h3 className="font-bold text-white">Top Risk Drivers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                    {["Title", "Severity", "CVE", "EPSS %", "ALE Contribution", "Priority"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topRisks.slice(0, 10).map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                      <td className="px-4 py-2 text-xs text-white max-w-[200px] truncate">{r.title}</td>
                      <td className="px-4 py-2"><SevBadge sev={r.severity} /></td>
                      <td className="px-4 py-2 text-[10px] font-mono" style={{ color: HIGH }}>{r.cve_id || r.cve || "—"}</td>
                      <td className="px-4 py-2 text-xs font-mono" style={{ color: MEDIUM }}>{r.epss_score != null ? `${(r.epss_score * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-2 text-sm font-black font-mono" style={{ color: DANGER }}>{usd(r.ale || r.ale_contribution)}</td>
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase"
                          style={{ color: DANGER, background: `${DANGER}15` }}>{r.remediation_priority || "P1"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Board Summary */}
        {board && (
          <Card className="p-5" style={{ border: `1px solid ${CYAN}20` }}>
            <h3 className="text-sm font-bold text-white mb-3">Board Executive Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {board.headline && <div><p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Headline</p><p style={{ color: "#e2e8f0" }}>{board.headline}</p></div>}
              {board.key_driver && <div><p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Key Driver</p><p style={{ color: HIGH }}>{board.key_driver}</p></div>}
              {board.immediate_action && <div><p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Immediate Action</p><p style={{ color: DANGER }}>{board.immediate_action}</p></div>}
              {board.compliance_risk && <div><p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Compliance Risk</p><p style={{ color: MEDIUM }}>{board.compliance_risk}</p></div>}
            </div>
          </Card>
        )}
      </section>

      {/* ── Regulatory Intelligence ──────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Regulatory Intelligence</h2>
          <button onClick={runReg} disabled={regLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <RefreshCw className={`w-3.5 h-3.5 ${regLoading ? "animate-spin" : ""}`} />
            {regLoading ? "Refreshing…" : "Refresh Regulatory Intel"}
          </button>
        </div>

        {regulations.length > 0 && <RegulationCards regulations={regulations} />}

        <Card className="p-5">
          <h3 className="text-sm font-bold text-white mb-3">Upcoming Compliance Deadlines</h3>
          <DeadlineTimeline deadlines={deadlines} />
        </Card>
      </section>

      {/* ── Peer Benchmarking ────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-black text-white">Peer Benchmarking</h2>
          <div className="flex items-center gap-2">
            <select value={benchIndustry} onChange={e => { setBenchIndustry(e.target.value); runBench(e.target.value); }}
              className="px-3 py-1.5 rounded-xl text-xs outline-none"
              style={{ background: "#050e1f", border: `1px solid ${BORDER}`, color: MUTED }}>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
            <button onClick={() => runBench(benchIndustry)} disabled={benchLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
              <RefreshCw className={`w-3.5 h-3.5 ${benchLoading ? "animate-spin" : ""}`} />
              {benchLoading ? "Comparing…" : "Compare"}
            </button>
          </div>
        </div>
        {benchLoading ? null : benchData ? (
          <div className="space-y-4">
            {/* Percentile hero */}
            <div className="flex items-center gap-4 flex-wrap">
              <Card className="p-5 flex-1 min-w-[200px]" style={{ border: `1px solid ${CYAN}30` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Your Percentile</p>
                <p className="text-3xl font-black font-mono" style={{ color: CYAN }}>
                  {benchData.your_percentile != null ? `Top ${100 - benchData.your_percentile}%` : "—"}
                </p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>of {benchIndustry} companies</p>
              </Card>
              {benchData.overall_verdict && (
                <Card className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Overall Verdict</p>
                  <span className="text-sm font-black px-3 py-1.5 rounded-xl"
                    style={{
                      color: benchData.overall_verdict.toUpperCase().includes("ABOVE") ? LOW : DANGER,
                      background: benchData.overall_verdict.toUpperCase().includes("ABOVE") ? `${LOW}15` : `${DANGER}15`,
                      border: `1px solid ${benchData.overall_verdict.toUpperCase().includes("ABOVE") ? LOW + "40" : DANGER + "40"}`,
                    }}>
                    {benchData.overall_verdict}
                  </span>
                </Card>
              )}
            </div>
            {/* Comparison table */}
            {(benchData.comparison || []).length > 0 && (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                        {["Metric","Yours","Industry Avg","Delta"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {benchData.comparison.map((row, i) => {
                        const better = row.delta > 0;
                        const deltaColor = better ? LOW : DANGER;
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                            <td className="px-4 py-2 text-xs text-white">{row.metric}</td>
                            <td className="px-4 py-2 text-xs font-mono font-bold text-white">{row.yours}</td>
                            <td className="px-4 py-2 text-xs font-mono" style={{ color: MUTED }}>{row.industry_avg}</td>
                            <td className="px-4 py-2 text-xs font-black font-mono flex items-center gap-1" style={{ color: deltaColor }}>
                              {row.delta > 0 ? <TrendingUp className="w-3 h-3" /> : row.delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {row.delta != null ? (row.delta > 0 ? "+" : "") + row.delta : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
            {/* Top threats */}
            {benchData.industry_top_threats?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Top Industry Threats:</span>
                {benchData.industry_top_threats.map(t => (
                  <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: DANGER, background: `${DANGER}15`, border: `1px solid ${DANGER}30` }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl text-center text-xs" style={{ color: MUTED, border: `1px solid ${BORDER}` }}>
            Click Compare to load benchmarking data
          </div>
        )}
      </section>

      {/* ── SLA Breach Forecast ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-black text-white">SLA Breach Forecast</h2>
          <div className="flex items-center gap-2">
            <button onClick={runSLAForecast} disabled={slaForecastLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${MEDIUM}12`, border: `1px solid ${MEDIUM}30`, color: MEDIUM }}>
              <RefreshCw className={`w-3.5 h-3.5 ${slaForecastLoading ? "animate-spin" : ""}`} />
              {slaForecastLoading ? "Forecasting…" : "7-Day Forecast"}
            </button>
            <button onClick={runSLA} disabled={slaLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
              <RefreshCw className={`w-3.5 h-3.5 ${slaLoading ? "animate-spin" : ""}`} />
              {slaLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
        {slaData && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Predicted Breaches", value: slaData.predicted_breaches ?? 0, color: DANGER  },
                { label: "Imminent",            value: slaData.imminent ?? 0,           color: DANGER  },
                { label: "At Risk",             value: slaData.at_risk ?? 0,            color: MEDIUM  },
                { label: "AutoFix Prevents",    value: slaData.autofix_prevents ?? 0,   color: LOW     },
              ].map(({ label, value, color }) => (
                <Card key={label} className="p-4 text-center" style={{ border: `1px solid ${color}20` }}>
                  <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
                  <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
                </Card>
              ))}
            </div>
            {/* At-risk table */}
            {(slaData.at_risk_findings || []).length > 0 && (
              <Card className="overflow-hidden">
                <div className="p-4 border-b" style={{ borderColor: BORDER }}>
                  <h3 className="font-bold text-white">Top At-Risk Findings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "#050e1f", borderBottom: `1px solid ${BORDER}` }}>
                        {["Title","Severity","Probability","Days Remaining","Risk","AutoFix"].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase" style={{ color: MUTED }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slaData.at_risk_findings.slice(0, 10).map((f, i) => {
                        const riskColor = f.risk_label === "critical" ? DANGER : f.risk_label === "high" ? HIGH : MEDIUM;
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 === 0 ? CARD : "#050e1f" }}>
                            <td className="px-4 py-2 text-xs text-white max-w-[180px] truncate">{f.title}</td>
                            <td className="px-4 py-2"><SevBadge sev={f.severity} /></td>
                            <td className="px-4 py-2 text-xs font-mono font-bold" style={{ color: DANGER }}>{f.probability != null ? `${f.probability}%` : "—"}</td>
                            <td className="px-4 py-2 text-xs font-mono" style={{ color: f.days_remaining <= 1 ? DANGER : MEDIUM }}>{f.days_remaining ?? "—"}d</td>
                            <td className="px-4 py-2">
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: riskColor, background: `${riskColor}18` }}>{f.risk_label || "—"}</span>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {f.autofix_available ? <span className="text-[9px] font-black" style={{ color: LOW }}>✓</span> : <span style={{ color: MUTED, fontSize: 9 }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
        {/* 7-day forecast chart */}
        {slaForecast?.daily_forecast && (
          <Card className="p-5">
            <h3 className="text-sm font-bold text-white mb-3">7-Day Breach Forecast</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={slaForecast.daily_forecast} margin={{ left: -10, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0" }} />
                <Bar dataKey="cumulative_breaches" name="Cumulative Breaches" fill={DANGER} opacity={0.8} radius={[3,3,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </section>

      {/* ── Risk Score History ───────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-black text-white mb-4">Risk Score History</h2>
        <Card className="p-5">
          {scoreHistory.length === 0
            ? <EmptyState icon={TrendingUp} title="No history yet" description="Risk scores will appear here as scans run" />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scoreHistory} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0" }}
                    formatter={(v, _, props) => [`${v} (${props?.payload?.grade || "?"})`, "Risk Score"]}
                  />
                  <Line type="monotone" dataKey="score" stroke={CYAN} strokeWidth={2}
                    dot={{ fill: CYAN, r: 3 }} style={{ filter: `drop-shadow(0 0 4px ${CYAN}66)` }} />
                </LineChart>
              </ResponsiveContainer>
            )}
        </Card>
      </section>
    </div>
  );
}