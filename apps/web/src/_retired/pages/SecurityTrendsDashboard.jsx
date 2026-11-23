import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";
import { format, parseISO, subDays, formatDistanceToNow } from "date-fns";
import {
  TrendingUp, TrendingDown, Minus, Shield, Award,
  ArrowUp, ArrowDown, Target, Zap, CheckCircle, AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";

const PILLARS = [
  { key: "code_security_score",  label: "Code Security",  icon: "💻", color: "#6366f1", path: "/code" },
  { key: "cloud_security_score", label: "Cloud Security", icon: "☁️", color: "#0ea5e9", path: "/cloud" },
  { key: "attack_surface_score", label: "Attack Surface", icon: "🎯", color: "#f97316", path: "/attack-surface" },
  { key: "runtime_score",        label: "Runtime",        icon: "🛡️", color: "#22c55e", path: "/runtime" },
  { key: "supply_chain_score",   label: "Supply Chain",   icon: "🔗", color: "#a78bfa", path: "/protect/supply-chain" },
  { key: "governance_score",     label: "Governance",     icon: "⚖️", color: "#eab308", path: "/governance" },
  { key: "identity_score",       label: "Identity",       icon: "🪪", color: "#ec4899", path: "/ciem" },
  { key: "data_score",           label: "Data (DSPM)",    icon: "🗄️", color: "#14b8a6", path: "/dspm" },
];

function getGrade(score) {
  if (score >= 90) return { grade: "A", color: "#22c55e" };
  if (score >= 80) return { grade: "B", color: "#14b8a6" };
  if (score >= 65) return { grade: "C", color: "#eab308" };
  if (score >= 50) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl text-xs" style={{ background: "#1e293b", border: "1px solid #334155" }}>
      <div className="font-semibold text-slate-400 mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-black text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function ImprovementChip({ delta, size = "sm" }) {
  if (delta == null) return <span className="text-slate-600 text-xs">—</span>;
  const up = delta >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  const color = up ? "#22c55e" : "#ef4444";
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      <Icon className="w-3 h-3" />
      {up ? "+" : ""}{delta}
    </span>
  );
}

const PERIOD_OPTIONS = [
  { label: "7 days",  days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

export default function SecurityTrendsDashboard() {
  const [period, setPeriod] = useState(30);
  const [selectedPillars, setSelectedPillars] = useState(PILLARS.map(p => p.key));

  const { data: scoreHistory = [], isLoading } = useQuery({
    queryKey: ["global-risk-history-trends"],
    queryFn: () => base44.entities.GlobalRiskScore.list("-calculated_at", 90).catch(() => []),
    initialData: [],
    refetchInterval: 5 * 60 * 1000,
  });

  // Filter to selected period
  const cutoff = subDays(new Date(), period);
  const periodData = useMemo(() =>
    [...scoreHistory]
      .filter(s => s.calculated_at && new Date(s.calculated_at) >= cutoff)
      .reverse(),
    [scoreHistory, period]
  );

  // Chart data — overall + each pillar per data point
  const trendChartData = useMemo(() =>
    periodData.map(s => {
      const point = { date: s.calculated_at ? format(parseISO(s.calculated_at), "MMM d") : "—", overall: s.overall_score };
      PILLARS.forEach(p => { point[p.key] = s[p.key] ?? null; });
      return point;
    }),
    [periodData]
  );

  // Improvement stats: compare first vs last in period
  const first = periodData[0] || null;
  const last = periodData[periodData.length - 1] || null;
  const overallDelta = first && last ? (last.overall_score ?? 0) - (first.overall_score ?? 0) : null;

  const pillarDeltas = useMemo(() =>
    PILLARS.map(p => ({
      ...p,
      current: last?.[p.key] ?? null,
      delta: first && last ? (last[p.key] ?? 0) - (first[p.key] ?? 0) : null,
    })).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)),
    [first, last]
  );

  // Most improved vs most degraded
  const mostImproved = pillarDeltas.filter(p => (p.delta ?? 0) > 0).slice(0, 3);
  const mostDegraded = pillarDeltas.filter(p => (p.delta ?? 0) < 0).slice(0, 3);

  // Weekly improvement bar chart
  const weeklyBarData = useMemo(() => {
    const weeks = [];
    const sorted = [...scoreHistory].reverse();
    for (let i = 0; i < sorted.length - 1; i++) {
      const prev = sorted[i];
      const curr = sorted[i + 1];
      if (!prev.calculated_at || !curr.calculated_at) continue;
      const change = (curr.overall_score ?? 0) - (prev.overall_score ?? 0);
      weeks.push({
        date: format(parseISO(curr.calculated_at), "MMM d"),
        change,
        fill: change >= 0 ? "#22c55e" : "#ef4444",
      });
    }
    return weeks.slice(-period);
  }, [scoreHistory, period]);

  const togglePillar = (key) =>
    setSelectedPillars(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );

  const { grade: currentGrade, color: gradeColor } = last?.overall_score != null ? getGrade(last.overall_score) : { grade: "—", color: "#64748b" };

  return (
    <div className="space-y-6 pb-10 min-h-screen" style={{ background: "#0d1117" }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Security Posture Trends
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Track risk score improvements over time across all security pillars</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map(o => (
            <button key={o.days} onClick={() => setPeriod(o.days)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: period === o.days ? "rgba(99,102,241,0.2)" : "rgba(30,40,58,0.6)",
                color: period === o.days ? "#818cf8" : "#64748b",
                border: `1px solid ${period === o.days ? "#6366f1" : "#30363d"}`,
              }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Overall score */}
        <div className="col-span-2 md:col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden"
          style={{ background: "#161b22", border: `1px solid ${gradeColor}40` }}>
          <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(circle at 50% 50%, ${gradeColor}, transparent 70%)` }} />
          <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2 relative z-10">Current Score</p>
          <div className="text-5xl font-black font-mono relative z-10" style={{ color: gradeColor }}>
            {last?.overall_score ?? "—"}
          </div>
          <div className="text-lg font-black mt-1 relative z-10" style={{ color: gradeColor }}>Grade {currentGrade}</div>
          {last?.calculated_at && (
            <p className="text-[10px] text-slate-600 mt-2 relative z-10">
              Updated {formatDistanceToNow(new Date(last.calculated_at), { addSuffix: true })}
            </p>
          )}
        </div>

        {[
          {
            label: `${period}d Change`,
            value: overallDelta != null ? `${overallDelta >= 0 ? "+" : ""}${overallDelta}` : "—",
            color: overallDelta == null ? "#64748b" : overallDelta >= 0 ? "#22c55e" : "#ef4444",
            icon: overallDelta == null ? Minus : overallDelta >= 0 ? TrendingUp : TrendingDown,
            sub: "vs period start",
          },
          {
            label: "Best Pillar",
            value: mostImproved[0]?.label ?? "—",
            color: "#22c55e",
            icon: Award,
            sub: mostImproved[0] ? `+${mostImproved[0].delta} pts` : "no data",
          },
          {
            label: "Needs Focus",
            value: mostDegraded[0]?.label ?? (pillarDeltas[pillarDeltas.length - 1]?.label ?? "—"),
            color: "#f97316",
            icon: Target,
            sub: mostDegraded[0] ? `${mostDegraded[0].delta} pts` : "all stable",
          },
        ].map(({ label, value, color, icon: Icon, sub }) => (
          <div key={label} className="rounded-2xl p-5 flex flex-col justify-between"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-xl font-black" style={{ color }}>{value}</p>
            <p className="text-[10px] text-slate-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Main trend chart */}
      <div className="rounded-2xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Overall Risk Score Trend</h3>
            <p className="text-[11px] text-slate-500">Higher = better security posture</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ImprovementChip delta={overallDelta} />
            <span className="text-[10px] text-slate-600">over {period} days</span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          </div>
        ) : trendChartData.length < 2 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <Shield className="w-8 h-8 text-slate-700" />
            No trend data yet — run your first scan to start tracking
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendChartData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "A", fill: "#22c55e", fontSize: 8, position: "right" }} />
              <ReferenceLine y={80} stroke="#14b8a6" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: "B", fill: "#14b8a6", fontSize: 8, position: "right" }} />
              <ReferenceLine y={65} stroke="#eab308" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: "C", fill: "#eab308", fontSize: 8, position: "right" }} />
              <Area type="monotone" dataKey="overall" name="Overall Score" stroke="#6366f1" strokeWidth={2.5}
                fill="url(#overallGrad)" dot={{ r: 3, fill: "#6366f1" }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pillar trend lines */}
      <div className="rounded-2xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Pillar Score Trends</h3>
            <p className="text-[11px] text-slate-500">Toggle pillars to compare</p>
          </div>
        </div>
        {/* Pillar toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PILLARS.map(p => {
            const active = selectedPillars.includes(p.key);
            return (
              <button key={p.key} onClick={() => togglePillar(p.key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                style={{
                  background: active ? `${p.color}18` : "rgba(30,40,58,0.6)",
                  color: active ? p.color : "#4b5563",
                  border: `1px solid ${active ? p.color + "60" : "#30363d"}`,
                }}>
                <span>{p.icon}</span> {p.label}
              </button>
            );
          })}
        </div>

        {trendChartData.length < 2 ? (
          <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendChartData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} />
              <Tooltip content={<CustomTooltip />} />
              {PILLARS.filter(p => selectedPillars.includes(p.key)).map(p => (
                <Line key={p.key} type="monotone" dataKey={p.key} name={p.label}
                  stroke={p.color} strokeWidth={1.8} dot={false} activeDot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Scan-to-scan delta bars */}
      <div className="rounded-2xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <h3 className="text-sm font-bold text-white mb-1">Score Change Per Scan</h3>
        <p className="text-[11px] text-slate-500 mb-4">Green = improvement, red = regression</p>
        {weeklyBarData.length < 2 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-sm">Need multiple scans</div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyBarData} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} />
              <YAxis tick={{ fontSize: 9, fill: "#475569" }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#334155" />
              <Bar dataKey="change" name="Change" radius={[3, 3, 0, 0]}
                fill="#22c55e"
                label={false}
                isAnimationActive={true}>
                {weeklyBarData.map((entry, idx) => (
                  <rect key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pillar improvement table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Most improved */}
        <div className="rounded-2xl p-5" style={{ background: "#161b22", border: "1px solid rgba(34,197,94,0.25)" }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Most Improved Pillars</h3>
          </div>
          {mostImproved.length === 0 ? (
            <p className="text-slate-500 text-sm">No improvements in this period</p>
          ) : (
            <div className="space-y-3">
              {mostImproved.map(p => {
                const { color } = getGrade(p.current ?? 50);
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <span className="text-lg w-7 flex-shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300 font-medium">{p.label}</span>
                        <ImprovementChip delta={p.delta} />
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div className="h-full rounded-full transition-all" style={{ width: `${p.current ?? 0}%`, background: color }} />
                      </div>
                    </div>
                    <Link to={p.path} className="text-[10px] text-blue-400 hover:underline flex-shrink-0">View →</Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs attention */}
        <div className="rounded-2xl p-5" style={{ background: "#161b22", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-white">Needs Attention</h3>
          </div>
          {mostDegraded.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle className="w-4 h-4" /> All pillars stable or improving
            </div>
          ) : (
            <div className="space-y-3">
              {mostDegraded.map(p => {
                const { color } = getGrade(p.current ?? 50);
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <span className="text-lg w-7 flex-shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300 font-medium">{p.label}</span>
                        <ImprovementChip delta={p.delta} />
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div className="h-full rounded-full transition-all" style={{ width: `${p.current ?? 0}%`, background: color }} />
                      </div>
                    </div>
                    <Link to={p.path} className="text-[10px] text-orange-400 hover:underline flex-shrink-0">Fix →</Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* All pillars snapshot */}
      <div className="rounded-2xl p-5" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <h3 className="text-sm font-bold text-white mb-4">All Pillar Snapshot — {period}d Change</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pillarDeltas.map(p => {
            const { grade: g, color: c } = getGrade(p.current ?? 50);
            return (
              <Link key={p.key} to={p.path}
                className="rounded-xl p-4 transition-all hover:scale-[1.02] block"
                style={{ background: "#0d1117", border: `1px solid ${p.color}25` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{p.icon}</span>
                  <ImprovementChip delta={p.delta} />
                </div>
                <p className="text-[10px] text-slate-500 mb-1 font-medium">{p.label}</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black font-mono" style={{ color: c }}>{p.current ?? "—"}</span>
                  <span className="text-sm font-black mb-0.5" style={{ color: c }}>{g}</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-slate-800">
                  <div className="h-full rounded-full" style={{ width: `${p.current ?? 0}%`, background: p.color }} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}