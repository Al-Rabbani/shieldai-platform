import React, { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card } from "@/components/gds/GDSOSShared";
import { Cpu, TrendingUp, Clock, Zap } from "lucide-react";

const TOOLTIP_STYLE = {
  background: "#0a1628", border: `1px solid ${CYAN}40`, borderRadius: 8, fontSize: 11, color: "#e2e8f0"
};

const INTENT_COLORS = {
  scan: DANGER,
  remediate: HIGH,
  investigate: MEDIUM,
  report: "#60a5fa",
  approve: "#8b5cf6",
  configure: "#06b6d4",
  query: LOW,
  orchestrate: "#f472b6",
};

function costColor(ratio) {
  if (ratio >= 0.75) return DANGER;
  if (ratio >= 0.5)  return HIGH;
  if (ratio >= 0.25) return MEDIUM;
  return LOW;
}

export default function KernelAgentBreakdown({ sessions = [], isLoading = false }) {
  const [sortBy, setSortBy] = useState("avg_duration"); // avg_duration | total_runs | failure_rate

  const agentData = useMemo(() => {
    // Group by intent_type as the "agent type"
    const map = {};
    sessions.forEach(s => {
      const key = s.intent_type || "unknown";
      if (!map[key]) {
        map[key] = { agent: key, runs: 0, total_ms: 0, failed: 0, completed: 0, pending: 0 };
      }
      map[key].runs++;
      map[key].total_ms += s.duration_ms || 0;
      if (s.status === "failed")    map[key].failed++;
      if (s.status === "completed") map[key].completed++;
      if (s.status === "awaiting_approval") map[key].pending++;
    });

    return Object.values(map).map(d => ({
      ...d,
      avg_duration: d.runs > 0 ? Math.round(d.total_ms / d.runs) : 0,
      failure_rate: d.runs > 0 ? Math.round((d.failed / d.runs) * 100) : 0,
      success_rate: d.runs > 0 ? Math.round((d.completed / d.runs) * 100) : 0,
    })).sort((a, b) => b[sortBy] - a[sortBy]);
  }, [sessions, sortBy]);

  const maxAvg = Math.max(...agentData.map(d => d.avg_duration), 1);
  const maxRuns = Math.max(...agentData.map(d => d.runs), 1);

  if (isLoading) {
    return (
      <Card className="p-5 mb-6">
        <div className="h-6 w-48 rounded animate-pulse mb-4" style={{ background: "rgba(0,212,255,0.06)" }} />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)" }} />
          ))}
        </div>
      </Card>
    );
  }

  if (agentData.length === 0) {
    return (
      <Card className="p-5 mb-6 flex flex-col items-center justify-center py-12">
        <Cpu className="w-8 h-8 mb-3" style={{ color: MUTED }} />
        <p className="text-sm font-bold text-white mb-1">No agent data yet</p>
        <p className="text-xs" style={{ color: MUTED }}>Start kernel sessions to see resource breakdown</p>
      </Card>
    );
  }

  return (
    <Card className="p-5 mb-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4" style={{ color: CYAN }} />
            <h3 className="text-sm font-bold text-white">Agent Resource Breakdown</h3>
          </div>
          <p className="text-[10px]" style={{ color: MUTED }}>
            Cost analysis by agent type — identify expensive workloads to optimise
          </p>
        </div>
        {/* Sort controls */}
        <div className="flex items-center gap-1.5">
          {[
            { key: "avg_duration", label: "Avg Cost" },
            { key: "total_runs",   label: "Runs" },
            { key: "failure_rate", label: "Failure %" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSortBy(key)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: sortBy === key ? `${CYAN}18` : "rgba(255,255,255,0.04)",
                border: `1px solid ${sortBy === key ? CYAN + "50" : BORDER}`,
                color: sortBy === key ? CYAN : MUTED,
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {
            icon: Cpu,
            label: "Most Expensive",
            value: agentData[0]?.agent || "—",
            sub: `${agentData[0]?.avg_duration ?? 0}ms avg`,
            color: DANGER,
          },
          {
            icon: Zap,
            label: "Most Active",
            value: [...agentData].sort((a, b) => b.runs - a.runs)[0]?.agent || "—",
            sub: `${[...agentData].sort((a, b) => b.runs - a.runs)[0]?.runs ?? 0} runs`,
            color: HIGH,
          },
          {
            icon: Clock,
            label: "Highest Failure %",
            value: [...agentData].sort((a, b) => b.failure_rate - a.failure_rate)[0]?.agent || "—",
            sub: `${[...agentData].sort((a, b) => b.failure_rate - a.failure_rate)[0]?.failure_rate ?? 0}% failure`,
            color: MEDIUM,
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="p-3 rounded-xl"
            style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3 h-3" style={{ color }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>{label}</span>
            </div>
            <p className="text-sm font-black capitalize" style={{ color }}>{value}</p>
            <p className="text-[10px]" style={{ color: MUTED }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart — avg duration by agent */}
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: MUTED }}>
          Avg Execution Time by Agent (ms)
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={agentData} margin={{ left: -10, right: 8, top: 4, bottom: 0 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} />
            <YAxis type="category" dataKey="agent" tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} width={70} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}ms`, "Avg Duration"]} />
            <Bar dataKey="avg_duration" radius={[0, 3, 3, 0]} maxBarSize={16}>
              {agentData.map((entry) => (
                <Cell key={entry.agent} fill={INTENT_COLORS[entry.agent] || CYAN} opacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Agent Type", "Runs", "Avg ms", "Success %", "Failure %", "Cost Tier"].map(h => (
                <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: MUTED }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agentData.map((d, i) => {
              const costRatio = d.avg_duration / maxAvg;
              const cc = costColor(costRatio);
              const tier = costRatio >= 0.75 ? "Critical" : costRatio >= 0.5 ? "High" : costRatio >= 0.25 ? "Medium" : "Low";
              return (
                <tr key={d.agent} className="hover:bg-white/[0.02] transition-all"
                  style={{ borderBottom: `1px solid ${BORDER}20` }}>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: INTENT_COLORS[d.agent] || CYAN }} />
                      <span className="capitalize font-semibold text-white">{d.agent}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-mono font-black" style={{ color: CYAN }}>{d.runs}</td>
                  <td className="py-2 px-3 font-mono" style={{ color: TEXT }}>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full" style={{ width: `${costRatio * 100}%`, background: cc }} />
                      </div>
                      {d.avg_duration}
                    </div>
                  </td>
                  <td className="py-2 px-3 font-mono font-bold" style={{ color: d.success_rate >= 80 ? LOW : MEDIUM }}>
                    {d.success_rate}%
                  </td>
                  <td className="py-2 px-3 font-mono font-bold" style={{ color: d.failure_rate >= 20 ? DANGER : d.failure_rate > 0 ? HIGH : MUTED }}>
                    {d.failure_rate}%
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded"
                      style={{ color: cc, background: `${cc}15`, border: `1px solid ${cc}30` }}>
                      {tier}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}