import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

const data = [
  { name: "Passing", value: 84, color: "#22c55e" },
  { name: "Failing", value: 12, color: "#ef4444" },
  { name: "Not Tested", value: 4, color: "#64748b" },
];

const FRAMEWORKS = [
  { name: "NIS2", score: 84, color: "#3b82f6" },
  { name: "SOC2", score: 91, color: "#8b5cf6" },
  { name: "ISO27001", score: 78, color: "#f59e0b" },
  { name: "GDPR", score: 93, color: "#22c55e" },
];

export default function ComplianceDonut() {
  return (
    <div className="space-y-4">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {FRAMEWORKS.map(fw => (
          <div key={fw.name} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white">{fw.name}</span>
              <span className="text-xs font-bold" style={{ color: fw.color }}>{fw.score}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${fw.score}%`, background: fw.color }} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-2 text-center">
        <button className="text-xs text-blue-400 hover:underline">Full compliance report →</button>
      </div>
    </div>
  );
}