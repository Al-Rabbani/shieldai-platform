import React, { useEffect, useState } from "react";

const THREAT_DOTS = [
  { x: 52, y: 38, label: "Eastern Europe", color: "#ef4444" },
  { x: 48, y: 42, label: "Russia", color: "#ef4444" },
  { x: 72, y: 45, label: "East Asia", color: "#f97316" },
  { x: 20, y: 50, label: "North America", color: "#3b82f6", isTarget: true },
  { x: 22, y: 62, label: "South America", color: "#eab308" },
  { x: 60, y: 35, label: "Middle East", color: "#ef4444" },
  { x: 47, y: 55, label: "Central Africa", color: "#f97316" },
  { x: 75, y: 55, label: "Southeast Asia", color: "#ef4444" },
];

export default function ThreatMapWidget() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="rounded-xl overflow-hidden relative" style={{
      background: "#050d1a",
      border: "1px solid rgba(30,58,95,0.5)",
      height: 260
    }}>
      {/* Header */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="text-[10px] font-mono font-bold text-slate-400 tracking-widest">GLOBAL THREAT MAP</span>
        <span className="text-[10px] font-mono text-red-400">— LIVE</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1" />
      </div>

      {/* Grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Simplified world map continents as SVG shapes */}
      <svg viewBox="0 0 100 70" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* North America */}
        <ellipse cx="20" cy="42" rx="12" ry="14" fill="#0f1a2e" stroke="#1e3a5f" strokeWidth="0.3" />
        {/* South America */}
        <ellipse cx="26" cy="60" rx="7" ry="9" fill="#0f1a2e" stroke="#1e3a5f" strokeWidth="0.3" />
        {/* Europe */}
        <ellipse cx="48" cy="35" rx="8" ry="8" fill="#0f1a2e" stroke="#1e3a5f" strokeWidth="0.3" />
        {/* Africa */}
        <ellipse cx="50" cy="52" rx="8" ry="11" fill="#0f1a2e" stroke="#1e3a5f" strokeWidth="0.3" />
        {/* Asia */}
        <ellipse cx="68" cy="38" rx="16" ry="12" fill="#0f1a2e" stroke="#1e3a5f" strokeWidth="0.3" />
        {/* Australia */}
        <ellipse cx="78" cy="58" rx="6" ry="5" fill="#0f1a2e" stroke="#1e3a5f" strokeWidth="0.3" />

        {/* Attack lines */}
        {THREAT_DOTS.filter(d => !d.isTarget).map((dot, i) => (
          <line key={i}
            x1={dot.x} y1={dot.y}
            x2={20} y2={42}
            stroke={dot.color}
            strokeWidth="0.3"
            strokeDasharray="2,2"
            opacity={0.3 + (tick % 3 === i % 3 ? 0.3 : 0)}
            style={{ transition: "opacity 1s" }}
          />
        ))}

        {/* Threat dots */}
        {THREAT_DOTS.map((dot, i) => (
          <g key={i}>
            <circle cx={dot.x} cy={dot.y} r="2.5" fill={dot.color} opacity="0.2" />
            <circle cx={dot.x} cy={dot.y} r="1.2" fill={dot.color} opacity="0.9" />
            <circle cx={dot.x} cy={dot.y} r={dot.isTarget ? "4" : "3"}
              fill="none" stroke={dot.color} strokeWidth="0.4"
              opacity={tick % 4 === i % 4 ? 0.8 : 0.2}
              style={{ transition: "opacity 0.5s" }}
            />
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex items-center gap-3">
        {[["#ef4444", "Critical"], ["#f97316", "High"], ["#3b82f6", "Protected"]].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[9px] font-mono text-slate-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}