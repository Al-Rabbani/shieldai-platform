import React, { useMemo, useState } from "react";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LineChart, Line, Legend,
} from "recharts";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";

const INTENT_TYPES = ["scan", "remediate", "investigate", "report", "approve", "configure", "query", "orchestrate"];
const INTENT_COLORS = {
  scan: DANGER, remediate: HIGH, investigate: MEDIUM,
  report: "#60a5fa", approve: "#8b5cf6", configure: "#06b6d4",
  query: LOW, orchestrate: "#f472b6",
};
const AGENT_A_COLOR = "#00d4ff";
const AGENT_B_COLOR = "#f472b6";

const TOOLTIP_STYLE = {
  background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0",
};

function computeAgentStats(sessions, agent) {
  const s = sessions.filter(s => (s.intent_type || "unknown") === agent);
  const runs = s.length;
  if (runs === 0) return null;
  const total_ms = s.reduce((a, b) => a + (b.duration_ms || 0), 0);
  const failed = s.filter(x => x.status === "failed").length;
  const completed = s.filter(x => x.status === "completed").length;
  const pending = s.filter(x => x.status === "awaiting_approval").length;
  const avg_duration = Math.round(total_ms / runs);
  const failure_rate = Math.round((failed / runs) * 100);
  const success_rate = Math.round((completed / runs) * 100);
  const durations = s.filter(x => x.duration_ms > 0).map(x => x.duration_ms);
  const max_duration = durations.length ? Math.max(...durations) : 0;
  const min_duration = durations.length ? Math.min(...durations) : 0;
  return { agent, runs, avg_duration, failure_rate, success_rate, pending, max_duration, min_duration, total_ms };
}

function buildDailyTrend(sessions, agent) {
  const days = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const daySessions = sessions.filter(s => {
      if ((s.intent_type || "unknown") !== agent) return false;
      const t = new Date(s.created_date || s.started_at || 0).getTime();
      return t >= d.getTime() && t < nextD.getTime();
    });
    const completed = daySessions.filter(s => s.status === "completed").length;
    const total = daySessions.length;
    days.push({ date: label, runs: total, success_rate: total > 0 ? Math.round((completed / total) * 100) : 0 });
  }
  return days.filter((_, i) => i % 2 === 0 || i === 13);
}

function DeltaBadge({ a, b, higherBetter = true, suffix = "" }) {
  if (a == null || b == null) return <span style={{ color: MUTED }}>—</span>;
  const diff = a - b;
  if (Math.abs(diff) < 0.5) return <span className="text-[10px] font-bold" style={{ color: MUTED }}>≈ same</span>;
  const better = higherBetter ? diff > 0 : diff < 0;
  const color = better ? LOW : DANGER;
  const Icon = better ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-black" style={{ color }}>
      <Icon className="w-3 h-3" />
      {diff > 0 ? "+" : ""}{Math.round(diff)}{suffix}
    </span>
  );
}

function StatRow({ label, aVal, bVal, higherBetter = true, suffix = "", format }) {
  const fmt = v => v == null ? "—" : format ? format(v) : `${v}${suffix}`;
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b items-center" style={{ borderColor: `${BORDER}50` }}>
      <span className="text-[11px]" style={{ color: MUTED }}>{label}</span>
      <span className="text-[11px] font-black font-mono text-center" style={{ color: AGENT_A_COLOR }}>{fmt(aVal)}</span>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black font-mono" style={{ color: AGENT_B_COLOR }}>{fmt(bVal)}</span>
        <DeltaBadge a={aVal} b={bVal} higherBetter={higherBetter} suffix={suffix} />
      </div>
    </div>
  );
}

export default function KernelAgentComparison({ sessions = [] }) {
  const [agentA, setAgentA] = useState(INTENT_TYPES[0]);
  const [agentB, setAgentB] = useState(INTENT_TYPES[1]);

  const statsA = useMemo(() => computeAgentStats(sessions, agentA), [sessions, agentA]);
  const statsB = useMemo(() => computeAgentStats(sessions, agentB), [sessions, agentB]);
  const trendA = useMemo(() => buildDailyTrend(sessions, agentA), [sessions, agentA]);
  const trendB = useMemo(() => buildDailyTrend(sessions, agentB), [sessions, agentB]);

  // Merge trend data for chart
  const trendMerged = useMemo(() => {
    return trendA.map((d, i) => ({
      date: d.date,
      [`${agentA}_runs`]: d.runs,
      [`${agentB}_runs`]: trendB[i]?.runs || 0,
      [`${agentA}_success`]: d.success_rate,
      [`${agentB}_success`]: trendB[i]?.success_rate || 0,
    }));
  }, [trendA, trendB, agentA, agentB]);

  // Radar chart data
  const radarData = useMemo(() => {
    const maxRuns = Math.max(statsA?.runs || 0, statsB?.runs || 0, 1);
    const maxMs = Math.max(statsA?.avg_duration || 0, statsB?.avg_duration || 0, 1);
    return [
      { metric: "Success %",    A: statsA?.success_rate || 0,                          B: statsB?.success_rate || 0 },
      { metric: "Efficiency",   A: statsA ? Math.round(100 - (statsA.avg_duration / maxMs) * 80) : 0, B: statsB ? Math.round(100 - (statsB.avg_duration / maxMs) * 80) : 0 },
      { metric: "Reliability",  A: statsA ? Math.round(100 - statsA.failure_rate) : 0, B: statsB ? Math.round(100 - statsB.failure_rate) : 0 },
      { metric: "Volume",       A: statsA ? Math.round((statsA.runs / maxRuns) * 100) : 0, B: statsB ? Math.round((statsB.runs / maxRuns) * 100) : 0 },
    ];
  }, [statsA, statsB]);

  const selectStyle = {
    background: "#050e1f", border: `1px solid ${BORDER}`, color: TEXT,
    borderRadius: 10, padding: "6px 12px", fontSize: 12, outline: "none",
  };

  return (
    <Card className="p-5 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4" style={{ color: CYAN }} />
          <h3 className="text-sm font-bold text-white">Agent Comparison</h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded"
            style={{ color: CYAN, background: `${CYAN}12`, border: `1px solid ${CYAN}30` }}>
            Side-by-Side
          </span>
        </div>
        <p className="text-[11px]" style={{ color: MUTED }}>
          Compare resource usage, cost-efficiency, and historical success rates
        </p>
      </div>

      {/* Agent selectors */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-3 rounded-xl" style={{ background: `${AGENT_A_COLOR}08`, border: `1px solid ${AGENT_A_COLOR}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full" style={{ background: AGENT_A_COLOR }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: AGENT_A_COLOR }}>Agent A</span>
          </div>
          <select value={agentA} onChange={e => setAgentA(e.target.value)} style={{ ...selectStyle, width: "100%", borderColor: `${AGENT_A_COLOR}40` }}>
            {INTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {statsA && (
            <p className="text-[10px] mt-1.5" style={{ color: MUTED }}>
              {statsA.runs} sessions · {statsA.avg_duration}ms avg · {statsA.success_rate}% success
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl" style={{ background: `${AGENT_B_COLOR}08`, border: `1px solid ${AGENT_B_COLOR}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 rounded-full" style={{ background: AGENT_B_COLOR }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: AGENT_B_COLOR }}>Agent B</span>
          </div>
          <select value={agentB} onChange={e => setAgentB(e.target.value)} style={{ ...selectStyle, width: "100%", borderColor: `${AGENT_B_COLOR}40` }}>
            {INTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {statsB && (
            <p className="text-[10px] mt-1.5" style={{ color: MUTED }}>
              {statsB.runs} sessions · {statsB.avg_duration}ms avg · {statsB.success_rate}% success
            </p>
          )}
        </div>
      </div>

      {/* Charts + Stats grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Radar chart */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>Performance Profile</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
              <PolarGrid stroke={`${BORDER}`} />
              <PolarAngleAxis dataKey="metric" tick={{ fill: MUTED, fontSize: 10 }} />
              <Radar name={agentA} dataKey="A" stroke={AGENT_A_COLOR} fill={AGENT_A_COLOR} fillOpacity={0.15} strokeWidth={2} />
              <Radar name={agentB} dataKey="B" stroke={AGENT_B_COLOR} fill={AGENT_B_COLOR} fillOpacity={0.12} strokeWidth={2} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend formatter={(v) => <span style={{ color: v === agentA ? AGENT_A_COLOR : AGENT_B_COLOR, fontSize: 10 }}>{v}</span>} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 14-day success rate trend */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>14-Day Success Rate (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendMerged} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey={`${agentA}_success`} name={agentA} stroke={AGENT_A_COLOR} strokeWidth={2} dot={{ r: 2, fill: AGENT_A_COLOR }} />
              <Line type="monotone" dataKey={`${agentB}_success`} name={agentB} stroke={AGENT_B_COLOR} strokeWidth={2} dot={{ r: 2, fill: AGENT_B_COLOR }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-side stats table */}
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="grid grid-cols-3 gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest"
          style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ color: MUTED }}>Metric</span>
          <span className="text-center" style={{ color: AGENT_A_COLOR }}>{agentA} (A)</span>
          <span style={{ color: AGENT_B_COLOR }}>{agentB} (B) vs A</span>
        </div>
        <div className="px-4">
          <StatRow label="Total Runs"         aVal={statsA?.runs}          bVal={statsB?.runs}          higherBetter={true} />
          <StatRow label="Avg Duration"        aVal={statsA?.avg_duration}  bVal={statsB?.avg_duration}  higherBetter={false} suffix="ms" />
          <StatRow label="Min Duration"        aVal={statsA?.min_duration}  bVal={statsB?.min_duration}  higherBetter={false} suffix="ms" />
          <StatRow label="Max Duration"        aVal={statsA?.max_duration}  bVal={statsB?.max_duration}  higherBetter={false} suffix="ms" />
          <StatRow label="Success Rate"        aVal={statsA?.success_rate}  bVal={statsB?.success_rate}  higherBetter={true}  suffix="%" />
          <StatRow label="Failure Rate"        aVal={statsA?.failure_rate}  bVal={statsB?.failure_rate}  higherBetter={false} suffix="%" />
          <StatRow label="Pending Approvals"   aVal={statsA?.pending}       bVal={statsB?.pending}       higherBetter={false} />
          <StatRow label="Total Compute (ms)"  aVal={statsA?.total_ms}      bVal={statsB?.total_ms}      higherBetter={false} suffix="ms"
            format={v => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`} />
        </div>
      </div>

      {/* Cost-effectiveness verdict */}
      {statsA && statsB && (
        <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>Cost-Effectiveness Verdict</p>
          {(() => {
            const aScore = (statsA.success_rate * 0.5) + (100 - Math.min(statsA.failure_rate, 100)) * 0.3 + (statsA.avg_duration > 0 ? Math.round(100 / (statsA.avg_duration / 1000 + 1)) * 0.2 : 20);
            const bScore = (statsB.success_rate * 0.5) + (100 - Math.min(statsB.failure_rate, 100)) * 0.3 + (statsB.avg_duration > 0 ? Math.round(100 / (statsB.avg_duration / 1000 + 1)) * 0.2 : 20);
            const winner = aScore > bScore ? agentA : bScore > aScore ? agentB : null;
            const wColor = winner === agentA ? AGENT_A_COLOR : AGENT_B_COLOR;
            return (
              <div className="flex items-center gap-3 flex-wrap">
                {winner ? (
                  <>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: wColor }} />
                    <span className="text-sm font-black capitalize" style={{ color: wColor }}>{winner}</span>
                    <span className="text-xs text-white">is more cost-effective</span>
                    <span className="text-[11px]" style={{ color: MUTED }}>
                      (composite score: {winner === agentA ? agentA : agentB} {Math.round(Math.max(aScore, bScore))} vs {winner === agentA ? agentB : agentA} {Math.round(Math.min(aScore, bScore))})
                    </span>
                  </>
                ) : (
                  <span className="text-xs" style={{ color: MUTED }}>Both agents are equally cost-effective</span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {(!statsA || !statsB) && (
        <p className="text-center text-xs mt-4" style={{ color: MUTED }}>
          No session data for one or both selected agents — start kernel sessions to populate comparison
        </p>
      )}
    </Card>
  );
}