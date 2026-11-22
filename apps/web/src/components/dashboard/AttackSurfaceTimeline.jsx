import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const data = [
  { date: "Jun 1", findings: 45, critical: 8, fixed: 3, event: "New repo connected" },
  { date: "Jun 3", findings: 52, critical: 10, fixed: 5, event: null },
  { date: "Jun 5", findings: 48, critical: 9, fixed: 8, event: null },
  { date: "Jun 7", findings: 55, critical: 12, fixed: 6, event: null },
  { date: "Jun 9", findings: 50, critical: 10, fixed: 10, event: "AutoFix batch applied" },
  { date: "Jun 11", findings: 42, critical: 8, fixed: 12, event: null },
  { date: "Jun 13", findings: 38, critical: 6, fixed: 15, event: null },
  { date: "Jun 15", findings: 35, critical: 5, fixed: 18, event: null },
];

export default function AttackSurfaceTimeline() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorFindings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorFixed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px" }}
            labelStyle={{ color: "#f1f5f9" }}
          />
          <Area type="monotone" dataKey="findings" stroke="#64748b" fillOpacity={1} fill="url(#colorFindings)" strokeWidth={2} name="Total Findings" />
          <Area type="monotone" dataKey="critical" stroke="#ef4444" fillOpacity={0} strokeWidth={2} name="Critical" />
          <Area type="monotone" dataKey="fixed" stroke="#22c55e" fillOpacity={1} fill="url(#colorFixed)" strokeWidth={2} name="Fixed" />
          {data.filter(d => d.event).map((d, i) => (
            <ReferenceLine key={i} x={d.date} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: "top", value: d.event, fill: "#f59e0b", fontSize: 10 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}