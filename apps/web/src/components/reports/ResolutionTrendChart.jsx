import React from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ResolutionTrendChart({ data }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <p className="text-[10px] uppercase text-slate-500 mb-2">Resolution time vs SLA · last 8 weeks</p>
      {data.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-10 text-center">No resolved findings in this range yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 10 }} stroke="#1F2937" />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} stroke="#1F2937" unit="h" />
            <Tooltip
              contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#e2e8f0" }}
              formatter={(value, name) => [`${value} h`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
            <Line type="monotone" dataKey="avgHours" name="Avg resolution" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="slaHours" name="SLA target" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}