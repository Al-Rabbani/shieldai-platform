import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { toast } from "sonner";

const PILLARS = [
  { key: "code_security_score",    label: "Code Security",   icon: "💻", path: "/code" },
  { key: "cloud_security_score",   label: "Cloud Security",  icon: "☁️", path: "/cloud" },
  { key: "attack_surface_score",   label: "Attack Surface",  icon: "🎯", path: "/attack-surface" },
  { key: "runtime_score",          label: "Runtime",         icon: "🛡️", path: "/runtime" },
  { key: "supply_chain_score",     label: "Supply Chain",    icon: "🔗", path: "/protect/supply-chain" },
  { key: "governance_score",       label: "Governance",      icon: "⚖️", path: "/governance" },
  { key: "identity_score",         label: "Identity (CIEM)", icon: "🪪", path: "/ciem" },
  { key: "data_score",             label: "Data (DSPM)",     icon: "🗄️", path: "/dspm" },
];

function getGrade(score) {
  if (score >= 90) return { grade: "A", color: "#22c55e" };
  if (score >= 80) return { grade: "B", color: "#14b8a6" };
  if (score >= 65) return { grade: "C", color: "#eab308" };
  if (score >= 50) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#ef4444" };
}

function ScoreBar({ score, height = 6 }) {
  const { color } = getGrade(score);
  return (
    <div className="w-full rounded-full bg-slate-800" style={{ height }}>
      <div className="rounded-full transition-all" style={{ width: `${score}%`, background: color, height }} />
    </div>
  );
}

function ComplianceCard({ fw }) {
  const score = fw.score || 0;
  const { color } = getGrade(score);
  const r = 22; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const status = score >= 80 ? "compliant" : score >= 50 ? "partial" : "non_compliant";
  const statusColor = { compliant: "#22c55e", partial: "#eab308", non_compliant: "#ef4444" }[status];

  return (
    <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-white">{fw.framework || fw.name}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: statusColor, background: `${statusColor}18` }}>{status.replace("_", " ")}</span>
      </div>
      <div className="flex items-center gap-3">
        <svg width={54} height={54} className="flex-shrink-0" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={27} cy={27} r={r} fill="none" stroke="#1e293b" strokeWidth={4} />
          <circle cx={27} cy={27} r={r} fill="none" stroke={color} strokeWidth={4}
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div>
          <p className="text-xl font-black font-mono" style={{ color }}>{score}</p>
          <p className="text-[10px] text-slate-500">{fw.passing_controls || 0} passing · {fw.failing_controls || 0} failing</p>
          {fw.next_audit_date && <p className="text-[9px] text-slate-600">Audit: {new Date(fw.next_audit_date).toLocaleDateString()}</p>}
        </div>
      </div>
    </div>
  );
}

export default function GlobalRiskScorePage() {
  const [recalcLoading, setRecalcLoading] = useState(false);
  const qc = useQueryClient();

  const { data: scoreHistory = [], isLoading } = useQuery({
    queryKey: ["global-risk-history"],
    queryFn: () => base44.entities.GlobalRiskScore.list("-calculated_at", 30).catch(() => []),
    initialData: [],
  });

  const { data: frameworks = [] } = useQuery({
    queryKey: ["compliance-fw"],
    queryFn: () => base44.entities.ComplianceFramework.list().catch(() => []),
    initialData: [],
  });

  const current = scoreHistory[0] || null;
  const previous = scoreHistory[1] || null;
  const score = current?.overall_score ?? null;
  const prevScore = previous?.overall_score ?? null;
  const delta = score != null && prevScore != null ? score - prevScore : null;
  const { grade, color: scoreColor } = score != null ? getGrade(score) : { grade: "—", color: "#64748b" };

  // Pillar data for radar
  const radarData = PILLARS.map(p => ({
    subject: p.label.split(" ")[0],
    score: current?.[p.key] ?? 50,
    fullMark: 100,
  }));

  const avgPillarScore = radarData.reduce((s, d) => s + d.score, 0) / radarData.length;
  const radarColor = avgPillarScore >= 70 ? "#22c55e" : avgPillarScore >= 40 ? "#eab308" : "#ef4444";

  // Trend chart
  const trendData = useMemo(() =>
    [...scoreHistory].reverse().map(s => ({
      date: s.calculated_at ? format(parseISO(s.calculated_at), "MMM dd") : "—",
      score: s.overall_score,
    })),
    [scoreHistory]
  );

  // Priority actions — worst 3 pillars
  const priorityActions = useMemo(() =>
    PILLARS
      .map(p => ({ ...p, score: current?.[p.key] ?? 50, findings: current?.[`${p.key.replace("_score", "_findings")}`] || 0 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3),
    [current]
  );

  const handleRecalculate = async () => {
    setRecalcLoading(true);
    try {
      await base44.functions.invoke("shieldGlobalScore", { action: "calculate", save_to_db: true });
      qc.invalidateQueries({ queryKey: ["global-risk-history"] });
      toast.success("Risk score recalculated");
    } catch { toast.error("Recalculation failed — check backend function"); }
    finally { setRecalcLoading(false); }
  };

  const TrendIcon = delta == null ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const trendColor = delta == null ? "#64748b" : delta > 0 ? "#22c55e" : "#ef4444";

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ background: "#0d1117" }}>

      {/* Hero */}
      <div className="rounded-2xl p-8 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0d1117,#111827,#0d1117)", border: `1px solid ${scoreColor}40` }}>
        <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 50% 50%, ${scoreColor}, transparent 70%)` }} />
        <div className="relative z-10">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Overall Security Posture Score</p>
          <div className="flex items-center justify-center gap-6 mb-4">
            {isLoading ? (
              <div className="w-32 h-32 rounded-full bg-slate-800 animate-pulse" />
            ) : (
              <div className="relative flex items-center justify-center w-36 h-36 rounded-full"
                style={{ border: `4px solid ${scoreColor}`, boxShadow: `0 0 40px ${scoreColor}40` }}>
                <span className="text-6xl font-black font-mono" style={{ color: scoreColor }}>{score ?? "—"}</span>
              </div>
            )}
            <div className="text-left">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-black"
                  style={{ background: `${scoreColor}20`, color: scoreColor, border: `2px solid ${scoreColor}40` }}>
                  {grade}
                </div>
                <div>
                  {delta != null && (
                    <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: trendColor }}>
                      <TrendIcon className="w-4 h-4" />
                      {delta > 0 ? "+" : ""}{delta} from last scan
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {current?.calculated_at ? `Calculated ${formatDistanceToNow(new Date(current.calculated_at), { addSuffix: true })}` : "Never calculated"}
                  </p>
                </div>
              </div>
              <button onClick={handleRecalculate} disabled={recalcLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}>
                {recalcLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Recalculate Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Open Findings", val: current?.total_open_findings ?? "—", color: "#f97316" },
          { label: "Critical", val: current?.critical_findings ?? "—", color: "#ef4444", pulse: (current?.critical_findings || 0) > 0 },
          { label: "SLA Breached", val: current?.sla_breached ?? "—", color: "#ef4444", pulse: (current?.sla_breached || 0) > 0 },
          { label: "CISA KEV Unpatched", val: current?.kev_unpatched ?? "—", color: "#ef4444", pulse: (current?.kev_unpatched || 0) > 0 },
          { label: "Assets Protected", val: current?.assets_protected ?? "—", color: "#22c55e" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#161b22", border: s.pulse ? "1px solid rgba(239,68,68,0.4)" : "1px solid #30363d" }}>
            {s.pulse && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mb-1.5" />}
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 8-Pillar Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-2">Security Posture Radar</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Radar name="Score" dataKey="score" stroke={radarColor} fill={radarColor} fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Pillar List */}
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Pillar Breakdown</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {PILLARS.map(p => {
              const s = current?.[p.key] ?? 50;
              const { grade: g, color: c } = getGrade(s);
              return (
                <div key={p.key} className="flex items-center gap-3">
                  <span className="text-base w-6 flex-shrink-0">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-300 font-medium">{p.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ color: c, background: `${c}20` }}>{g}</span>
                        <span className="text-[10px] font-mono font-bold" style={{ color: c }}>{s}</span>
                      </div>
                    </div>
                    <ScoreBar score={s} />
                  </div>
                  <Link to={p.path} className="text-[10px] text-blue-400 hover:underline whitespace-nowrap flex-shrink-0">View →</Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score Trend */}
      <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Score Trend</h3>
        {trendData.length < 2 ? (
          <div className="h-40 flex items-center justify-center text-slate-500 text-sm">Need at least 2 scans to show trend</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 0, left: -15 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#475569" }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 11 }}
                formatter={(v) => [v, "Score"]} />
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "A", fill: "#22c55e", fontSize: 9 }} />
              <ReferenceLine y={80} stroke="#14b8a6" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: "B", fill: "#14b8a6", fontSize: 9 }} />
              <ReferenceLine y={65} stroke="#eab308" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "C", fill: "#eab308", fontSize: 9 }} />
              <ReferenceLine y={50} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: "D", fill: "#f97316", fontSize: 9 }} />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Priority Actions */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">🎯 Priority Actions — Worst Pillars</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {priorityActions.map((p, i) => {
            const { grade: g, color: c } = getGrade(p.score);
            return (
              <div key={p.key} className="rounded-xl p-4" style={{ background: "#161b22", border: `1px solid ${c}30` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-lg font-black px-2 py-0.5 rounded" style={{ color: c, background: `${c}20` }}>{g}</span>
                </div>
                <p className="text-sm font-bold text-white mb-1">{p.label}</p>
                <p className="text-2xl font-black font-mono mb-2" style={{ color: c }}>{p.score}/100</p>
                {p.findings > 0 && <p className="text-[10px] text-slate-500 mb-3">{p.findings} findings dragging score down</p>}
                <Link to={p.path}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-90 w-fit"
                  style={{ background: `${c}20`, color: c }}>
                  Fix it <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance Snapshot */}
      {frameworks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Compliance Snapshot</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {frameworks.map(fw => <ComplianceCard key={fw.id} fw={fw} />)}
          </div>
        </div>
      )}
    </div>
  );
}