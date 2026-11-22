import React, { useState, useEffect } from "react";

function AnimatedCounter({ target, duration = 1500 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = 0;
    const steps = 60;
    const increment = target / steps;
    const interval = duration / steps;
    const timer = setInterval(() => {
      start = Math.min(start + increment, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{val.toLocaleString()}</>;
}

export default function HeroStatsBar({ activeThreats, totalFindings, protectedAssets, agentsOnline }) {
  const stats = [
    {
      label: "ACTIVE THREATS",
      value: activeThreats,
      color: "#ef4444",
      glow: "rgba(239,68,68,0.15)",
      border: "rgba(239,68,68,0.3)",
      pulse: "animate-pulse-red",
      icon: "🔴",
      suffix: activeThreats === 1 ? " threat" : " threats",
    },
    {
      label: "TOTAL FINDINGS",
      value: totalFindings,
      color: "#3b82f6",
      glow: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.25)",
      pulse: "animate-pulse-blue",
      icon: "⚡",
      suffix: "",
    },
    {
      label: "PROTECTED ASSETS",
      value: protectedAssets,
      color: "#10b981",
      glow: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.25)",
      pulse: "animate-pulse-green",
      icon: "🛡️",
      suffix: "",
    },
    {
      label: "AGENTS ONLINE",
      value: agentsOnline,
      color: "#06b6d4",
      glow: "rgba(6,182,212,0.12)",
      border: "rgba(6,182,212,0.25)",
      pulse: "",
      icon: "🤖",
      suffix: " active",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-xl p-5 relative overflow-hidden card-hover ${s.pulse}`}
          style={{
            background: `linear-gradient(135deg, ${s.glow}, rgba(15,23,42,0.8))`,
            border: `1px solid ${s.border}`,
          }}
        >
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-1/2 translate-x-1/2"
            style={{ background: s.glow, filter: "blur(20px)" }} />
          <p className="text-[10px] font-mono font-semibold uppercase tracking-widest mb-2"
            style={{ color: s.color, opacity: 0.8 }}>
            {s.label}
          </p>
          <p className="text-4xl font-black font-mono leading-none" style={{ color: s.color }}>
            <AnimatedCounter target={s.value || 0} />
          </p>
          {s.suffix && (
            <p className="text-xs mt-1 font-mono" style={{ color: s.color, opacity: 0.6 }}>{s.suffix}</p>
          )}
          <span className="absolute top-4 right-4 text-2xl opacity-30">{s.icon}</span>
        </div>
      ))}
    </div>
  );
}