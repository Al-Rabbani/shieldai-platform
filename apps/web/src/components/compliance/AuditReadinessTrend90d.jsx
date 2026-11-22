import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";

function buildDays() {
  const days = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = 89; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    days.push(day);
  }
  return days;
}

export default function AuditReadinessTrend90d() {
  const [items, setItems] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.ComplianceChecklistItem.list("-created_date", 500).catch(() => []),
      base44.entities.ComplianceAssessment.list("-last_assessed", 100).catch(() => []),
    ]).then(([controls, scores]) => {
      setItems(controls || []);
      setAssessments(scores || []);
      setLoading(false);
    });
  }, []);

  const days = useMemo(buildDays, []);

  const series = useMemo(() => {
    const total = items.length;
    const completions = items
      .filter((item) => item.status === "complete" && item.completed_at)
      .map((item) => new Date(item.completed_at));

    // Preferred signal: controls marked complete, counted cumulatively per day.
    if (completions.length) {
      return days.map((day) => {
        const passing = completions.filter((when) => when <= day).length;
        return {
          label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          readiness: total ? Number(((passing / total) * 100).toFixed(1)) : 0,
          passing,
          total,
          basis: "completed controls",
        };
      });
    }

    // Fallback: recorded assessment scores, averaged as of each day.
    const scored = assessments.filter((row) => row.last_assessed && Number.isFinite(Number(row.compliance_score)));
    if (scored.length) {
      return days.map((day) => {
        const past = scored.filter((row) => new Date(row.last_assessed) <= day);
        const readiness = past.length
          ? past.reduce((sum, row) => sum + Number(row.compliance_score), 0) / past.length
          : 0;
        return {
          label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
          readiness: Number(readiness.toFixed(1)),
          passing: null,
          total,
          basis: `${past.length} assessment(s)`,
        };
      });
    }

    return [];
  }, [items, assessments, days]);

  if (loading) {
    return <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto my-10" />;
  }

  if (series.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp size={18} className="text-slate-600 mx-auto mb-2" />
        <p className="text-xs text-slate-500">No readiness history in the last 90 days.</p>
        <p className="text-[10px] text-slate-600 mt-1">
          The trend starts plotting as soon as a control is marked complete or a compliance assessment is recorded.
        </p>
      </div>
    );
  }

  const latest = series[series.length - 1];
  const first = series[0];
  const change = Number((latest.readiness - first.readiness).toFixed(1));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xl font-bold font-mono text-white">{latest.readiness}%</p>
          <p className="text-[10px] text-slate-500">Readiness today</p>
        </div>
        <div>
          <p className={`text-sm font-bold font-mono ${change > 0 ? "text-emerald-300" : change < 0 ? "text-red-300" : "text-slate-400"}`}>
            {change > 0 ? "+" : ""}{change} pts
          </p>
          <p className="text-[10px] text-slate-500">Over 90 days</p>
        </div>
        {latest.passing != null && (
          <div>
            <p className="text-sm font-bold font-mono text-blue-300">{latest.passing}/{latest.total}</p>
            <p className="text-[10px] text-slate-500">Passing controls</p>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="readinessFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1F2937" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" fontSize={9} interval={14} tickLine={false} />
          <YAxis stroke="#64748b" fontSize={9} domain={[0, 100]} tickLine={false} width={34} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value, name, entry) => [
              `${value}%${entry?.payload?.passing != null ? ` · ${entry.payload.passing}/${entry.payload.total} passing` : ""}`,
              "Audit readiness",
            ]}
          />
          <Area type="monotone" dataKey="readiness" stroke="#3b82f6" strokeWidth={2} fill="url(#readinessFill)" />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-slate-600">
        Plotted from {latest.basis} recorded in GDS OS — nothing is interpolated beyond the stored dates.
      </p>
    </div>
  );
}