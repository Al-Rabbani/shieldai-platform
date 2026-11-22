import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function ExecRiskTrendPanel({ points = [], windowLabel = "last 6 months", delta = 0 }) {
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#f59e0b";
  const latest = points[points.length - 1];
  const average = points.length
    ? Math.round((points.reduce((sum, point) => sum + point.score, 0) / points.length) * 10) / 10
    : null;

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-white">Aggregate risk score — {windowLabel}</p>
          <p className="text-[10px] text-slate-500">Higher is stronger. Each point is a recorded posture evaluation.</p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white font-mono">{latest ? latest.score : "—"}</span>
          {latest?.grade && <span className="text-[11px] text-slate-500">grade {latest.grade}</span>}
          {points.length > 1 && (
            <span className="flex items-center gap-0.5 text-[11px] font-bold" style={{ color: trendColor }}>
              <TrendIcon size={12} />{delta > 0 ? "+" : ""}{delta}
            </span>
          )}
        </div>
      </div>

      {points.length < 2 ? (
        <div className="h-[190px] flex items-center justify-center text-center px-4">
          <p className="text-[11px] text-slate-500">Not enough stored posture snapshots in this period to draw a trend yet.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: -26, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis dataKey="label" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={30} />
            <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }} />
            {average != null && <ReferenceLine y={average} stroke="#475569" strokeDasharray="4 4" label={{ value: "avg", fill: "#64748b", fontSize: 9, position: "insideTopRight" }} />}
            <Line type="monotone" dataKey="score" name="Risk score" stroke={trendColor} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="text-[10px] text-slate-600 mt-1">
        {points.length} snapshot{points.length === 1 ? "" : "s"}
        {latest ? ` · latest ${latest.score} on ${latest.label}` : ""}
        {average != null ? ` · period average ${average}` : ""}
      </p>
    </div>
  );
}