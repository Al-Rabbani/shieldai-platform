import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

const data = [
  { subject: "Code Security", A: 82, B: 75, C: 70, fullMark: 100 },
  { subject: "Cloud Security", A: 78, B: 72, C: 68, fullMark: 100 },
  { subject: "Runtime", A: 88, B: 80, C: 75, fullMark: 100 },
  { subject: "Attack Surface", A: 90, B: 82, C: 78, fullMark: 100 },
  { subject: "Governance", A: 75, B: 70, C: 65, fullMark: 100 },
  { subject: "Threat Intel", A: 85, B: 78, C: 72, fullMark: 100 },
];

export default function PillarRadarChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
          {/* Current score - gold */}
          <Radar name="Current" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
          {/* Last month - gray dotted */}
          <Radar name="Last Month" dataKey="B" stroke="#64748b" fill="none" strokeDasharray="4 4" strokeWidth={2} />
          {/* Industry avg - white dashed */}
          <Radar name="Industry Avg" dataKey="C" stroke="#e2e8f0" fill="none" strokeDasharray="2 2" strokeWidth={2} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}