import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const data = [
  { name: "Ransomware", value: 35 },
  { name: "Supply Chain", value: 20 },
  { name: "Cloud Misconfig", value: 25 },
  { name: "Identity", value: 15 },
  { name: "AI/LLM Security", value: 5 },
];

const COLORS = ["#3b82f6", "#3b82f6cc", "#3b82f699", "#3b82f666", "#3b82f633"];

export default function ThreatBreakdownDonut() {
  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Attack Surface Breakdown</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
          </Pie>
          <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }} />
          <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}