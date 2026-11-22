import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { buildImpactModel } from "@/lib/patchImpact";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Trophy, TrendingDown, Bot } from "lucide-react";

function monthKeys(count) {
  const keys = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function monthLabel(key) {
  return new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: "short" });
}

export default function AgentRiskReductionPage() {
  const [fixed, setFixed] = useState([]);
  const [open, setOpen] = useState([]);
  const [agents, setAgents] = useState([]);
  const [score, setScore] = useState(null);
  const [scoreAt, setScoreAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topN, setTopN] = useState("all");

  useEffect(() => {
    (async () => {
      const [risk, fixedRows, openRows, agentRows] = await Promise.all([
        base44.entities.GlobalRiskScore.list("-calculated_at", 1).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: "fixed" }, "-fixed_at", 500).catch(() => []),
        base44.entities.TriagedFinding.filter({ status: "open" }, "-detected_at", 500).catch(() => []),
        base44.entities.Agent.list("-last_heartbeat", 100).catch(() => []),
      ]);
      setScore(risk[0]?.overall_score ?? null);
      setScoreAt(risk[0]?.calculated_at ?? null);
      setFixed(fixedRows || []);
      setOpen(openRows || []);
      setAgents(agentRows || []);
      setLoading(false);
    })();
  }, []);

  const months = useMemo(() => monthKeys(6), []);
  const model = useMemo(() => buildImpactModel([...open, ...fixed], score), [open, fixed, score]);
  const pointsByFinding = useMemo(() => {
    const map = new Map();
    model.rows.forEach((row) => map.set(row.finding.id, row.delta));
    return map;
  }, [model]);

  const agentName = (key) => {
    const match = agents.find((a) => a.canonical_agent_id === key || a.agent_id === key || a.name === key || a.display_name === key);
    return match ? match.display_name || match.name : key;
  };

  const leaderboard = useMemo(() => {
    const groups = new Map();
    fixed.forEach((finding) => {
      const key = finding.fixed_by_agent_id || finding.assigned_to || "Unattributed";
      const row = groups.get(key) || { key, fixes: 0, critical: 0, points: 0, lastFix: null, monthly: {} };
      row.fixes += 1;
      if ((finding.severity || finding.normalized_severity) === "critical") row.critical += 1;
      row.points += pointsByFinding.get(finding.id) || 0;
      const monthKey = typeof finding.fixed_at === "string" ? finding.fixed_at.slice(0, 7) : null;
      if (monthKey) row.monthly[monthKey] = (row.monthly[monthKey] || 0) + 1;
      if (finding.fixed_at && (!row.lastFix || finding.fixed_at > row.lastFix)) row.lastFix = finding.fixed_at;
      groups.set(key, row);
    });
    return [...groups.values()].sort((a, b) => b.points - a.points);
  }, [fixed, pointsByFinding]);

  const monthlySeries = useMemo(() => months.map((key) => {
    const rows = fixed.filter((f) => typeof f.fixed_at === "string" && f.fixed_at.slice(0, 7) === key);
    return {
      month: monthLabel(key),
      points: Number(rows.reduce((sum, f) => sum + (pointsByFinding.get(f.id) || 0), 0).toFixed(1)),
      fixes: rows.length,
    };
  }), [months, fixed, pointsByFinding]);

  const totalPoints = leaderboard.reduce((sum, row) => sum + row.points, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="w-8 h-8 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 space-y-4" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center gap-3">
        <Trophy size={24} className="text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Agent Risk Reduction</h1>
          <p className="text-xs text-slate-500">Monthly risk removed per agent, ranked by effectiveness</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          <p className="text-[10px] uppercase text-slate-500">Recorded risk score</p>
          <p className="text-xl font-bold font-mono text-white">{score == null ? "—" : `${Number(score).toFixed(1)}/100`}</p>
          <p className="text-[10px] text-slate-500">{scoreAt ? `Snapshot ${new Date(scoreAt).toLocaleDateString()}` : "No snapshot recorded"}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #10b98140" }}>
          <p className="text-[10px] uppercase text-slate-500">Fixes attributed</p>
          <p className="text-xl font-bold text-emerald-400 font-mono">{fixed.length}</p>
          <p className="text-[10px] text-slate-500">across {leaderboard.length} agent(s)</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #3b82f640" }}>
          <p className="text-[10px] uppercase text-slate-500">Estimated points reduced</p>
          <p className="text-xl font-bold text-blue-400 font-mono flex items-center gap-1"><TrendingDown size={15} /> {totalPoints.toFixed(1)}</p>
          <p className="text-[10px] text-slate-500">from stored score snapshot</p>
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-sm font-bold text-white mb-2">Points reduced per month</p>
        {fixed.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No fixed findings recorded yet.</p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", fontSize: 11 }} />
                <Bar dataKey="points" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Points reduced" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <div className="px-3 py-2 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <Bot size={14} className="text-blue-400" />
          <p className="text-sm font-bold text-white">Leaderboard</p>
          <span className="text-[10px] text-slate-500 ml-auto">Ranked by estimated points removed</span>
          <div className="flex items-center gap-1 w-full sm:w-auto">
            {[["10", "Top 10"], ["20", "Top 20"], ["50", "Top 50"], ["all", "All"]].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTopN(value)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                  topN === value ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800/40 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {leaderboard.length === 0 ? (
          <p className="text-center py-8 text-xs text-slate-500">No attributed fixes yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {leaderboard.slice(0, topN === "all" ? leaderboard.length : Number(topN)).map((row, index) => (
              <div key={row.key} className="px-3 py-2.5 flex flex-wrap items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${index === 0 ? "bg-amber-500/20 text-amber-300" : index === 1 ? "bg-slate-400/20 text-slate-300" : index === 2 ? "bg-orange-700/30 text-orange-300" : "bg-slate-700/40 text-slate-400"}`}>{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{agentName(row.key)}</p>
                  <p className="text-[10px] text-slate-500">
                    {row.fixes} fix{row.fixes === 1 ? "" : "es"}{row.critical > 0 ? ` · ${row.critical} critical` : ""}{row.lastFix ? ` · last ${new Date(row.lastFix).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {months.map((key) => (
                    <span key={key} title={`${monthLabel(key)}: ${row.monthly[key] || 0} fix(es)`} className={`w-7 text-center text-[9px] rounded px-1 py-0.5 ${row.monthly[key] ? "bg-blue-500/20 text-blue-300" : "bg-slate-800/40 text-slate-600"}`}>
                      {monthLabel(key)}
                    </span>
                  ))}
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 w-14 text-right">-{row.points.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-500">
        Points are a planning estimate: the recorded score's gap to 100 is distributed across findings by severity and CVSS, so each agent's total reflects the findings attributed to it in stored records, not a measured platform calculation.
      </p>
    </div>
  );
}