import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { base44 } from "@/api/base44Client";

// Forecasts risk score improvement over 90 days based on count of currently planned remediation tasks.
export default function RiskForecastChart({ currentScore = 88 }) {
  const [plannedTasks, setPlannedTasks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ScanJob.filter({ job_type: "remediation", status: "pending" })
      .then(tasks => setPlannedTasks(tasks?.length ?? 0))
      .catch(() => setPlannedTasks(0))
      .finally(() => setLoading(false));
  }, []);

  // Each planned remediation task contributes ~0.6 points of risk reduction, capped at 100.
  const totalGain = Math.min(100 - currentScore, plannedTasks * 0.6);
  const weeks = 13; // ~90 days
  const data = Array.from({ length: weeks + 1 }, (_, i) => {
    const progress = i / weeks;
    // ease-out curve — faster early gains, tapering off
    const eased = 1 - Math.pow(1 - progress, 2);
    return {
      day: i * 7,
      score: Math.round((currentScore + totalGain * eased) * 10) / 10,
    };
  });

  const projectedScore = data[data.length - 1].score;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold">📈 90-DAY RISK REDUCTION FORECAST</p>
          <p className="text-[11px] text-muted-foreground">Based on {loading ? "…" : plannedTasks} planned remediation tasks</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Projected Score</p>
          <p className="text-xl font-black text-emerald-500">{projectedScore}<span className="text-xs text-muted-foreground">/100</span></p>
        </div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="day" tickFormatter={(d) => `D${d}`} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(d) => `Day ${d}`}
              formatter={(v) => [`${v}/100`, "Risk Score"]}
            />
            <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}