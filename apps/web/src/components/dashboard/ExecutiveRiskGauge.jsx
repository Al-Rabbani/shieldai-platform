import React from "react";

export default function ExecutiveRiskGauge({ score = 73, trend = -8, benchmark = 61 }) {
  const size = 280;
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;
  
  const getColor = (s) => {
    if (s >= 80) return { color: "#22c55e", label: "Strong", bg: "rgba(34,197,94,0.1)" };
    if (s >= 60) return { color: "#f59e0b", label: "Managed", bg: "rgba(245,158,11,0.1)" };
    if (s >= 40) return { color: "#f97316", label: "Elevated", bg: "rgba(249,115,22,0.1)" };
    return { color: "#ef4444", label: "Critical", bg: "rgba(239,68,68,0.1)" };
  };

  const { color, label, bg } = getColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.08} />
        {/* Score arc */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.08}
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
        {/* Score number */}
        <text x={size/2} y={size/2 - 10} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="900" fontFamily="JetBrains Mono">{pct}</text>
        <text x={size/2} y={size/2 + 20} textAnchor="middle" fill="#94a3b8" fontSize={size * 0.05} fontWeight="600">/ 100</text>
        {/* Label */}
        <text x={size/2} y={size/2 + 50} textAnchor="middle" fill={color} fontSize={size * 0.06} fontWeight="700">{label} Risk</text>
      </svg>
      
      {/* Trend indicator */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: bg, border: `1px solid ${color}30` }}>
        {trend < 0 ? (
          <svg className="w-4 h-4" style={{ color: "#22c55e" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        ) : (
          <svg className="w-4 h-4" style={{ color: "#ef4444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )}
        <span className="text-xs font-bold" style={{ color }}>
          {Math.abs(trend)} pts {trend < 0 ? "improved" : "declined"} vs last month
        </span>
      </div>

      {/* Industry benchmark */}
      <div className="absolute top-1/2 -right-32 -translate-y-1/2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: "#94a3b8" }} />
          <span className="text-xs text-slate-400">Industry avg: {benchmark}</span>
        </div>
        <div className="text-xs text-slate-500">
          You're <span className="font-bold" style={{ color: score > benchmark ? "#22c55e" : "#ef4444" }}>
            {score > benchmark ? "+" : ""}{score - benchmark}
          </span> points {score > benchmark ? "above" : "below"} average
        </div>
      </div>
    </div>
  );
}