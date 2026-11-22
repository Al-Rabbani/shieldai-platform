import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, Minus, Download } from "lucide-react";
import { format } from "date-fns";
import { exportRiskTrendPdf } from "@/lib/riskTrendPdf";

const WINDOW_DAYS = 180;

export default function RiskScoreSixMonthChart() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    base44.entities.GlobalRiskScore.list("-calculated_at", 500)
      .then((rows) => { if (active) setRecords(rows || []); })
      .catch(() => { if (active) setRecords([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const points = useMemo(() => {
    const cutoff = Date.now() - WINDOW_DAYS * 86400000;
    return records
      .filter((record) => Number.isFinite(Number(record.overall_score)) && record.calculated_at)
      .filter((record) => new Date(record.calculated_at).getTime() >= cutoff)
      .sort((a, b) => new Date(a.calculated_at) - new Date(b.calculated_at))
      .map((record, index, list) => ({
        label: format(new Date(record.calculated_at), "MMM d"),
        score: Number(record.overall_score),
        grade: record.grade || "—",
        delta: index === 0 ? null : Number(record.overall_score) - Number(list[index - 1].overall_score),
      }));
  }, [records]);

  const first = points[0];
  const latest = points[points.length - 1];
  const delta = first && latest ? latest.score - first.score : 0;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor = delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#f59e0b";

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Maturity — Last 6 Months</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Aggregate risk score across every control area, for quarterly reviews</p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">{latest ? latest.score : "—"}</span>
          {latest && <span className="text-[11px] text-slate-500">grade {latest.grade}</span>}
          {points.length > 1 && (
            <span className="flex items-center gap-0.5 text-xs font-bold" style={{ color: trendColor }}>
              <TrendIcon size={12} />{delta > 0 ? "+" : ""}{delta} pts
            </span>
          )}
          <button
            onClick={() => exportRiskTrendPdf({ points, windowDays: WINDOW_DAYS })}
            disabled={points.length < 2}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/40 hover:bg-blue-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={12} /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-[240px] rounded-lg animate-shimmer" style={{ background: "#0a0f1e" }} />
      ) : points.length < 2 ? (
        <div className="h-[240px] flex items-center justify-center px-4 text-center">
          <p className="text-[11px] text-slate-500">Not enough posture snapshots in the last six months to draw a trend yet.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={points} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }} />
            <Line type="monotone" dataKey="score" name="Risk score" stroke={trendColor} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-600">
        <span>Higher is better — {points.length} stored snapshot(s), {first ? `${first.score} in ${first.label}` : "no baseline"}.</span>
        {latest && <span>Latest {latest.score} on {latest.label}</span>}
      </div>
    </div>
  );
}