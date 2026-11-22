import React from "react";
import ThreatDot from "@/components/home/ThreatDot";
import MagneticCard from "@/components/home/MagneticCard";
import GdprMiniCountdown from "@/components/home/GdprMiniCountdown";

const MERIDIANS = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
const LATITUDES = [-60, -30, 0, 30, 60];

const THREATS = [
  { label: "LockBit 3.0", location: "Russia", x: "58%", y: "28%", severity: "critical" },
  { label: "Scattered Spider", location: "Western/EN", x: "30%", y: "35%", severity: "critical" },
  { label: "Volt Typhoon", location: "China (PRC)", x: "72%", y: "42%", severity: "critical" },
  { label: "The Gentlemen", location: "Unknown", x: "45%", y: "55%", severity: "high" },
];

const ARCS = [
  "M 58 28 Q 48 15, 38 30",
  "M 30 35 Q 34 20, 38 30",
  "M 72 42 Q 55 30, 38 30",
  "M 45 55 Q 42 40, 38 30",
];

const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i, top: Math.random() * 100, left: Math.random() * 100,
  size: 1 + Math.random() * 2, delay: Math.random() * 3,
}));

export default function GlobeHero({ risk, activeIncident }) {
  return (
    <div className="w-full rounded-2xl p-6 relative overflow-hidden" style={{ background: "#050b14", border: "1px solid #1F2937", minHeight: 520 }}>
      {STARS.map(s => (
        <span key={s.id} className="star-dot" style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
      ))}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div>
          <p className="text-lg font-bold text-white">🌐 GLOBAL THREAT MAP</p>
          <p className="text-xs text-slate-500">Real-time adversary activity across GDS attack surface</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Monitoring
        </span>
      </div>

      <div className="grid grid-cols-5 gap-4 mt-4">
        <div className="col-span-3 relative w-full h-[480px] flex items-center justify-center" style={{ perspective: "1000px" }}>
          <div className="relative w-[380px] h-[380px]" style={{ transformStyle: "preserve-3d", animation: "globeRotate 40s linear infinite" }}>
            {MERIDIANS.map((deg, i) => (
              <div key={i} className="absolute inset-0 rounded-full border border-blue-500/25" style={{ transform: `rotateY(${deg}deg)` }} />
            ))}
            {LATITUDES.map((lat, i) => (
              <div key={`lat-${i}`} className="absolute rounded-full border border-blue-500/20"
                style={{ top: `${50 - lat * 0.55}%`, left: "10%", right: "10%", height: `${Math.cos(lat * Math.PI / 180) * 100}%`, transform: "translateY(-50%)" }} />
            ))}
            <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-blue-600/10 to-transparent blur-xl" />
          </div>

          {THREATS.map(t => <ThreatDot key={t.label} {...t} />)}

          <div className="absolute" style={{ left: "38%", top: "30%" }}>
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-amber-400 relative" />
            <span className="text-[10px] text-amber-300 absolute top-4 -left-4 whitespace-nowrap">GDS HQ · Ireland</span>
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {ARCS.map((d, i) => (
              <path key={i} d={d} stroke="#ef4444" strokeWidth="0.4" fill="none" strokeDasharray="2 2" className="animate-dash" opacity="0.6" />
            ))}
          </svg>
        </div>

        <div className="col-span-2 space-y-3">
          <MagneticCard strength={3} className="rounded-xl p-3" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Active Threats</p>
              <p className="text-xs text-red-400">🔴 4 threat actors tracking GDS</p>
              <p className="text-xs text-red-400 mt-1">🔴 LockBit 3.0 — 47 victims/month</p>
              <p className="text-xs text-red-400 mt-1">🔴 3 EU MSPs named on leak site</p>
            </div>
          </MagneticCard>

          <MagneticCard strength={3} className="rounded-xl p-3" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Global Risk Score</p>
              <p className="text-xl font-bold text-white">{risk?.overall_score ?? "—"} / {risk?.grade ?? "—"} <span className="text-emerald-400 text-sm">{risk?.trend === "improving" ? "↗ Improving" : risk?.trend === "degrading" ? "↘ Degrading" : "→ Stable"}</span></p>
            </div>
          </MagneticCard>

          <MagneticCard strength={3} className="rounded-xl p-3" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Active Incident</p>
              {activeIncident ? (
                <>
                  <p className="text-xs text-red-400 font-semibold">🔴 {activeIncident.title} — $2.4M</p>
                  <p className="text-xs text-amber-300 mt-1">⏰ GDPR deadline: <GdprMiniCountdown /></p>
                </>
              ) : <p className="text-xs text-slate-500">No active incidents</p>}
            </div>
          </MagneticCard>

          <MagneticCard strength={3} className="rounded-xl p-3" as="div">
            <div style={{ background: "#111827", border: "1px solid #1F2937" }} className="rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Dark Web Exposure</p>
              <p className="text-xs text-amber-300">⚠️ GDS domain found in credential dump</p>
            </div>
          </MagneticCard>
        </div>
      </div>
    </div>
  );
}