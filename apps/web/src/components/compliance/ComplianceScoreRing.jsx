import React from "react";

export default function ComplianceScoreRing({ score }) {
  const color = score < 40 ? "#ef4444" : score < 80 ? "#f59e0b" : "#22c55e";
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(score, 100) / 100) * c;

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1F2937" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}