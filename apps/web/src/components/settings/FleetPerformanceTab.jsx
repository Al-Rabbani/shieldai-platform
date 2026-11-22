import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Area, AreaChart, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const DAY = 86400000;
const WINDOW_DAYS = 14;

function dayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function labelFor(day) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

export default function FleetPerformanceTab() {
  const [runs, setRuns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [runRows, taskRows] = await Promise.all([
        base44.entities.FleetScalingRun.list("-run_at", 500).catch(() => []),
        base44.entities.CopilotTask.list("-created_date", 500).catch(() => []),
      ]);
      setRuns(runRows || []);
      setTasks(taskRows || []);
      setLoading(false);
    })();
  }, []);

  const series = useMemo(() => {
    const now = Date.now();
    const days = Array.from({ length: WINDOW_DAYS }, (_, index) =>
      new Date(now - (WINDOW_DAYS - 1 - index) * DAY).toISOString().slice(0, 10)
    );

    const tasksByDay = {};
    tasks.forEach((task) => {
      if (!task.created_date) return;
      const key = dayKey(task.created_date);
      tasksByDay[key] = (tasksByDay[key] || 0) + 1;
    });

    const agentsByDay = {};
    runs.forEach((run) => {
      const stamp = run.run_at || run.created_date;
      if (!stamp) return;
      const key = dayKey(stamp);
      agentsByDay[key] = agentsByDay[key] || [];
      agentsByDay[key].push(Number(run.active_agents) || 0);
    });

    return days.map((day) => {
      const readings = agentsByDay[day] || [];
      return {
        day,
        label: labelFor(day),
        tasks: tasksByDay[day] || 0,
        agents: readings.length
          ? Math.round((readings.reduce((sum, value) => sum + value, 0) / readings.length) * 10) / 10
          : null,
      };
    });
  }, [runs, tasks]);

  const peakBacklog = runs.reduce((max, run) => Math.max(max, Number(run.backlog) || 0), 0);
  const agentDays = series.filter((row) => row.agents != null);
  const avgAgents = agentDays.length
    ? Math.round((agentDays.reduce((sum, row) => sum + row.agents, 0) / agentDays.length) * 10) / 10
    : null;
  const peakDay = series.reduce((best, row) => (row.tasks > (best?.tasks || 0) ? row : best), null);
  const latest = runs[0];

  if (loading) {
    return <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-16" />;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "Agents now", value: latest?.active_agents ?? "—", color: "#3b82f6" },
          { label: "Avg agents / day", value: avgAgents ?? "—", color: "#a855f7" },
          { label: "Peak backlog", value: peakBacklog, color: "#f97316" },
          { label: "Busiest day", value: peakDay?.tasks ? `${peakDay.tasks} tasks` : "—", sub: peakDay?.tasks ? peakDay.label : null, color: "#22c55e" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937", borderLeft: `3px solid ${tile.color}` }}>
            <p className="text-lg font-bold font-mono text-white">{tile.value}</p>
            <p className="text-[10px] text-slate-500">{tile.label}{tile.sub ? ` · ${tile.sub}` : ""}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-xs font-bold text-white mb-1">Task volume vs fleet size</p>
        <p className="text-[10px] text-slate-500 mb-2">Green is the volume of incoming tasks that day; blue is the average live agent count recorded by the autoscale runs.</p>
        <div style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} interval={1} axisLine={false} tickLine={false} />
              <YAxis yAxisId="tasks" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis yAxisId="agents" orientation="right" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#e2e8f0" }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line yAxisId="tasks" type="monotone" dataKey="tasks" name="Tasks" stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
              <Line yAxisId="agents" type="monotone" dataKey="agents" name="Avg agents" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
        <p className="text-xs font-bold text-white mb-2">Average agents per day</p>
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="agentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} interval={1} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#e2e8f0" }} />
              <Area type="monotone" dataKey="agents" name="Avg agents" stroke="#a855f7" strokeWidth={2} fill="url(#agentFill)" connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {agentDays.length === 0 && (
          <p className="text-[10px] text-slate-500 mt-2">No autoscale runs recorded yet — the chart fills in as the scheduled run fires.</p>
        )}
      </div>

      <p className="text-[10px] text-slate-600">
        Recorded from every autoscale run (every 15 minutes) and the fleet's own task queue, so peak scan windows show up as a rising bar with the fleet following it.
      </p>
    </div>
  );
}