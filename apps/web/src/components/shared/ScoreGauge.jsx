import React from "react";

export default function ScoreGauge({ score = 0, size = 80, strokeWidth = 8, label }) {
  const r = (size / 2) - strokeWidth;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(Math.max(score, 0), 100) / 100 * circ;
  const color = score >= 90 ? "#16a34a" : score >= 75 ? "#0891b2" : score >= 60 ? "#d97706" : "#dc2626";
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(30,58,95,0.5)" strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x={cx} y={cy + (label ? 2 : 5)} textAnchor="middle" fill={color}
        fontSize={size < 60 ? size * 0.22 : size * 0.2} fontWeight="bold" fontFamily="JetBrains Mono, monospace">
        {score}%
      </text>
      {label && (
        <text x={cx} y={cy + size * 0.18} textAnchor="middle" fill="#64748b"
          fontSize={size * 0.1} fontFamily="Inter, sans-serif">
          {label}
        </text>
      )}
    </svg>
  );
}