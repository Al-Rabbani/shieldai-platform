import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { subDays, format, startOfDay } from "date-fns";

const GOLD = "#C9A84C";

function generateSimulatedTrend(findings) {
  const today = startOfDay(new Date());
  const days = 90;

  // Build a map of findings by day they were detected
  const detectedByDay = {};
  const fixedByDay = {};
  findings.forEach(f => {
    if (f.detected_at) {
      const d = format(startOfDay(new Date(f.detected_at)), "yyyy-MM-dd");
      detectedByDay[d] = (detectedByDay[d] || 0) + 1;
    }
    if (f.fixed_at && f.status === "fixed") {
      const d = format(startOfDay(new Date(f.fixed_at)), "yyyy-MM-dd");
      fixedByDay[d] = (fixedByDay[d] || 0) + 1;
    }
  });

  // Walk backwards 90 days, accumulating open count
  const totalFindings = findings.length;
  let openCount = totalFindings;
  const points = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const key = format(date, "yyyy-MM-dd");
    const added = detectedByDay[key] || 0;
    const fixed = fixedByDay[key] || 0;
    // Simulate risk score: higher open = higher risk, add some noise
    const noise = (Math.sin(i * 0.3) * 4 + Math.sin(i * 0.7) * 3);
    const riskScore = Math.min(95, Math.max(10, Math.round(40 + (openCount / Math.max(totalFindings, 1)) * 40 + noise)));
    points.push({
      date: format(date, "MMM d"),
      riskScore,
      openVulns: Math.max(0, openCount),
    });
    openCount = Math.max(0, openCount + added - fixed);
  }

  return points;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-xl" style={{ background: "#1F2937", border: "1px solid #374151" }}>
      <div className="font-semibold text-white mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function RiskTrendChart() {
  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["trend-findings"],
    queryFn: () => base44.entities.TriagedFinding.list("-detected_at", 500).catch(() => []),
    initialData: [],
  });

  const chartData = useMemo(() => generateSimulatedTrend(findings), [findings]);

  // Sample every 3rd point to avoid overcrowding
  const thinned = chartData.filter((_, i) => i % 3 === 0 || i === chartData.length - 1);

  return (
    <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
          <h3 className="text-sm font-semibold text-white">90-Day Risk & Vulnerability Trend</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">Last 90 days</span>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-[#6366F1]/30 border-t-[#6366F1] animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={thinned} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 9 }} interval={4} />
            <YAxis yAxisId="risk" domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 9 }} />
            <YAxis yAxisId="vulns" orientation="right" tick={{ fill: "#6B7280", fontSize: 9 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 10, color: "#9CA3AF", paddingTop: 8 }} />
            <Line
              yAxisId="risk"
              type="monotone"
              dataKey="riskScore"
              name="Risk Score"
              stroke={GOLD}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: GOLD }}
            />
            <Line
              yAxisId="vulns"
              type="monotone"
              dataKey="openVulns"
              name="Open Vulns"
              stroke="#6366F1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#6366F1" }}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}