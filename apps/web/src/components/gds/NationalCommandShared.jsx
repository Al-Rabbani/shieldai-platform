import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, AlertTriangle, Crown, FileText } from "lucide-react";
import { Card } from "@/components/gds/GDSOSShared";

export const NAVY_DARK = "#0a1628";
export const NAVY_BASE = "#0f2342";
export const NAVY_LIGHT = "#1a3a5c";
export const SOVEREIGN_GOLD = "#c9a84c";
export const SOVEREIGN_GOLD_LIGHT = "#d4b865";
export const CRITICAL_RED = "#dc2626";
export const EXISTENTIAL_DEEP_RED = "#7f1d1d";
export const BORDER = "#1e3a5f";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

export const SOVEREIGN_CARD = { background: NAVY_BASE, border: `1px solid ${BORDER}` };
export const SOVEREIGN_PAGE_BG = { minHeight: "100vh", background: NAVY_DARK, padding: "24px" };

export function SovereignBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-4">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <span style={{ color: MUTED }}>›</span>
      <Link to="/national-command" className="hover:text-white transition-colors" style={{ color: SOVEREIGN_GOLD }}>National Command</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span style={{ color: MUTED }}>›</span>
          {item.path ? (
            <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? SOVEREIGN_GOLD : MUTED }}>{item.label}</Link>
          ) : (
            <span style={{ color: i === items.length - 1 ? SOVEREIGN_GOLD : MUTED }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function SovereignBanner() {
  return (
    <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl mb-6"
      style={{ background: `linear-gradient(90deg, transparent, ${SOVEREIGN_GOLD}15, transparent)`, border: `1px solid ${SOVEREIGN_GOLD}40` }}>
      <Shield className="w-4 h-4" style={{ color: SOVEREIGN_GOLD }} />
      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: SOVEREIGN_GOLD }}>SEP-001 | NATIONAL CYBER DEFENSE</span>
      <Shield className="w-4 h-4" style={{ color: SOVEREIGN_GOLD }} />
    </div>
  );
}

export function SovereignBadge({ children, color, className = "" }) {
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${className}`}
      style={{ color: color || SOVEREIGN_GOLD, background: `${color || SOVEREIGN_GOLD}15`, border: `1px solid ${color || SOVEREIGN_GOLD}30` }}>
      {children}
    </span>
  );
}

export function ThreatLevelGauge({ value, size = 60 }) {
  const radius = (size - 12) / 2;
  const circumference = Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 75 ? CRITICAL_RED : pct >= 50 ? "#f97316" : "#f59e0b";

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      <path d={`M 6 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M 6 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 6 - offset} ${size / 2}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: "all 1s ease-out" }} />
      <text x={size / 2} y={size / 2 + 12} fill={color} fontSize="14" textAnchor="middle" fontWeight="900" fontFamily="monospace">{Math.round(pct)}</text>
    </svg>
  );
}

export function ClassificationBanner({ level = "OFFICIAL" }) {
  return (
    <div className="w-full py-2 px-4 mb-6 text-center"
      style={{ background: `linear-gradient(90deg, ${SOVEREIGN_GOLD}15, ${SOVEREIGN_GOLD}25, ${SOVEREIGN_GOLD}15)`, border: `2px solid ${SOVEREIGN_GOLD}40` }}>
      <span className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: SOVEREIGN_GOLD }}>
        {level} — NATIONAL CYBER COMMAND
      </span>
    </div>
  );
}

export function ThreatLevelDisplay({ level, score, updatedAt }) {
  const colors = {
    low: "#6b7280",
    elevated: "#3b82f6",
    high: "#f59e0b",
    severe: "#f97316",
    critical: "#dc2626",
  };
  const color = colors[level?.toLowerCase()] || colors.elevated;
  const isPulsing = level?.toLowerCase() === "critical" || level?.toLowerCase() === "severe";

  return (
    <div className={`text-center py-8 px-4 rounded-2xl mb-6 ${isPulsing ? 'animate-pulse' : ''}`}
      style={{ background: `${color}15`, border: `2px solid ${color}40`, boxShadow: isPulsing ? `0 0 40px ${color}30` : "none" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>National Threat Level</p>
      <p className="text-6xl font-black uppercase tracking-wide" style={{ color, textShadow: `0 0 40px ${color}60` }}>{level || "ELEVATED"}</p>
      <p className="text-2xl font-bold mt-2" style={{ color }}>National Threat Score: {score ?? "—"}/100</p>
      {updatedAt && <p className="text-[9px] mt-3" style={{ color: MUTED }}>Updated: {new Date(updatedAt).toLocaleString()}</p>}
    </div>
  );
}