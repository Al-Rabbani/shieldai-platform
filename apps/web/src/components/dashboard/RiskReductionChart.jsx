import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function RiskReductionChart({ days = 90 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [riskScores, setRiskScores] = useState([]);
  const [remediationActions, setRemediationActions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch historical risk scores (GlobalRiskScore entities with calculated_at)
        const scores = await base44.entities.GlobalRiskScore.list("-calculated_at", 500).catch(() => []);
        
        // Fetch remediation actions (TriagedFinding with fixed status)
        const findings = await base44.entities.TriagedFinding.list("-fixed_at", 500).catch(() => []);
        const fixed = findings.filter(f => f.status === "fixed" && f.fixed_at);

        // Process risk scores into daily snapshots
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const dailyData = {};

        // Initialize all days
        for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split("T")[0];
          dailyData[dateKey] = { date: dateKey, score: null, fixed_count: 0 };
        }

        // Map risk scores to dates
        scores.forEach(s => {
          if (!s.calculated_at || s.overall_score == null) return;
          const dateKey = new Date(s.calculated_at).toISOString().split("T")[0];
          if (dailyData[dateKey]) {
            dailyData[dateKey].score = s.overall_score;
          }
        });

        // Count fixed findings per day
        fixed.forEach(f => {
          if (!f.fixed_at) return;
          const dateKey = new Date(f.fixed_at).toISOString().split("T")[0];
          if (dailyData[dateKey]) {
            dailyData[dateKey].fixed_count += 1;
          }
        });

        // Forward-fill missing scores and build chart data
        let lastScore = null;
        const chartData = Object.values(dailyData)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(d => {
            if (d.score != null) lastScore = d.score;
            return {
              date: d.date.slice(5), // MM-DD format
              score: d.score ?? lastScore,
              fixed: d.fixed_count,
              fullDate: d.date,
            };
          })
          .filter(d => d.score != null);

        setData(chartData);
        setRiskScores(scores.filter(s => s.calculated_at && new Date(s.calculated_at) >= startDate));
        setRemediationActions(fixed.filter(f => new Date(f.fixed_at) >= startDate));
      } catch (err) {
        console.error("Failed to load risk reduction data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [days]);

  const stats = useMemo(() => {
    if (data.length < 2) return { startScore: null, endScore: null, delta: null, totalFixed: 0, trend: "stable" };
    
    const startScore = data[0].score;
    const endScore = data[data.length - 1].score;
    const delta = endScore - startScore;
    const totalFixed = data.reduce((sum, d) => sum + d.fixed, 0);
    
    let trend = "stable";
    if (delta >= 5) trend = "improving";
    else if (delta <= -5) trend = "degrading";
    
    return { startScore, endScore, delta, totalFixed, trend };
  }, [data]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-blue-500 border-white/10 rounded-full animate-spin" />
      </div>
    );
  }

  const trendColor = stats.trend === "improving" ? "#10b981" : stats.trend === "degrading" ? "#ef4444" : "#f59e0b";
  const trendIcon = stats.trend === "improving" ? "↗" : stats.trend === "degrading" ? "↘" : "→";

  return (
    <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid #1F2937" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">90-Day Risk Reduction Progress</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Tracking remediation impact on overall risk score</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Risk Score Change</p>
            <p className={`text-lg font-black ${trendColor}`}>
              {stats.delta != null && stats.delta !== 0 ? `${stats.delta > 0 ? "+" : ""}${stats.delta}` : "0"}
              <span className="ml-1">{trendIcon}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Vulns Fixed</p>
            <p className="text-lg font-black text-emerald-400">{stats.totalFixed}</p>
          </div>
        </div>
      </div>

      {data.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{ background: "#0d1428", border: "1px solid #1F2937", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
                formatter={(value, name) => [
                  name === "score" ? `${value}` : `${value} fixed`,
                  name === "score" ? "Risk Score" : "Vulnerabilities Fixed"
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#scoreGradient)" 
                name="score"
              />
              <Area 
                type="step" 
                dataKey="fixed" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={0}
                name="fixed"
              />
              {stats.startScore != null && (
                <ReferenceLine 
                  y={stats.startScore} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3"
                  label={{ value: `Start: ${stats.startScore}`, position: "right", fill: "#f59e0b", fontSize: 10 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          No risk score data available for the last {days} days
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 pt-3 border-t" style={{ borderColor: "#1F2937" }}>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-[11px] text-slate-400">Risk Score Trend</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-slate-400">Vulnerabilities Fixed</span>
        </div>
        <div className="ml-auto text-[11px] text-slate-500">
          {riskScores.length} score snapshots · {remediationActions.length} remediation actions
        </div>
      </div>
    </div>
  );
}