import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const WINDOW_DAYS = 30;

export default function RiskTrendChart() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    base44.entities.GlobalRiskScore.list("-calculated_at", 60)
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
      .map((record) => ({
        label: format(new Date(record.calculated_at), "MMM d"),
        score: Number(record.overall_score),
      }));
  }, [records]);

  const latest = points[points.length - 1];
  const delta = points.length > 1 ? latest.score - points[0].score : 0;
  const improving = delta >= 0;

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Security Posture — 30 Days</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-white">{latest ? latest.score : "—"}</span>
          {points.length > 1 && (
            <span className={`flex items-center gap-0.5 text-xs font-bold ${improving ? "text-emerald-400" : "text-red-400"}`}>
              {improving ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {improving ? "+" : ""}{delta} pts
            </span>
          )}
        </div>
      </div>
      {loading ? (
        <div className="h-[220px] rounded-lg animate-shimmer" style={{ background: "#0a0f1e" }} />
      ) : points.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-center px-4">
          <p className="text-[11px] text-slate-500">No posture snapshots in the last {WINDOW_DAYS} days yet.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={points} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval={4} />
            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[50, 100]} />
            <Tooltip contentStyle={{ background: "#0a0f1e", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }} />
            <Area type="monotone" dataKey="score" name="Posture score" stroke="#3b82f6" strokeWidth={2} fill="url(#riskFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
      <p className="text-[10px] text-slate-600 mt-1">Higher is better — each point is a stored posture snapshot.</p>
    </div>
  );
}