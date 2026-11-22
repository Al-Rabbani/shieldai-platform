import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, Activity, TrendingUp, AlertTriangle } from "lucide-react";
import { Card } from "@/components/gds/GDSOSShared";

export const MSSP_DARK = "#0a1620";
export const MSSP_BASE = "#0f2330";
export const MSSP_LIGHT = "#1a3a4a";
export const MSSP_TEAL = "#14b8a6";
export const MSSP_TEAL_LIGHT = "#2dd4bf";
export const MSSP_GREEN = "#10b981";
export const MSSP_GREEN_DARK = "#059669";
export const BORDER = "#1e3a4a";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

export const MSSP_CARD = { background: MSSP_BASE, border: `1px solid ${BORDER}` };
export const MSSP_PAGE_BG = { minHeight: "100vh", background: MSSP_DARK, padding: "24px" };

export const INDUSTRY_COLORS = {
  financial: "#fbbf24",
  healthcare: "#3b82f6",
  government: "#14b8a6",
  manufacturing: "#6b7280",
  energy: "#f97316",
  technology: "#8b5cf6",
  retail: "#ec4899",
  education: "#06b6d4",
  legal: "#6366f1",
  telecom: "#10b981",
};

export const TIER_COLORS = {
  starter: "#6b7280",
  professional: "#3b82f6",
  business: "#f59e0b",
  enterprise: "#10b981",
  elite: "#c9a84c",
  government: "#14b8a6",
};

export const SEVERITY_COLORS = {
  p1: "#dc2626",
  p2: "#ef4444",
  p3: "#f97316",
  p4: "#3b82f6",
  p5: "#6b7280",
};

export const CHURN_COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#dc2626",
};

export const PARTNER_TYPE_COLORS = {
  reseller: "#3b82f6",
  msp: "#14b8a6",
  white_label: "#8b5cf6",
  technology: "#10b981",
  system_integrator: "#f59e0b",
};

export const PARTNER_TIER_COLORS = {
  registered: "#6b7280",
  silver: "#c0c0c0",
  gold: "#fbbf24",
  platinum: "#a855f7",
  elite: "#c9a84c",
};

export function MSSPBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-4">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <span style={{ color: MUTED }}>›</span>
      <Link to="/mssp" className="hover:text-white transition-colors" style={{ color: MSSP_TEAL }}>MSSP Platform</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span style={{ color: MUTED }}>›</span>
          {item.path ? (
            <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? MSSP_TEAL : MUTED }}>{item.label}</Link>
          ) : (
            <span style={{ color: i === items.length - 1 ? MSSP_TEAL : MUTED }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function MSSPBanner() {
  return (
    <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl mb-6"
      style={{ background: `linear-gradient(90deg, transparent, ${MSSP_TEAL}15, transparent)`, border: `1px solid ${MSSP_TEAL}40` }}>
      <Shield className="w-4 h-4" style={{ color: MSSP_TEAL }} />
      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: MSSP_TEAL }}>SEP-002 | MSSP PLATFORM</span>
      <Shield className="w-4 h-4" style={{ color: MSSP_TEAL }} />
    </div>
  );
}

export function MSSPBadge({ children, color, className = "" }) {
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${className}`}
      style={{ color: color || MSSP_TEAL, background: `${color || MSSP_TEAL}15`, border: `1px solid ${color || MSSP_TEAL}30` }}>
      {children}
    </span>
  );
}

export function HealthScoreGauge({ score, size = 60 }) {
  const radius = (size - 12) / 2;
  const circumference = Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 85 ? MSSP_GREEN : pct >= 70 ? "#f59e0b" : "#dc2626";

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      <path d={`M 6 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M 6 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 6 - offset} ${size / 2}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: "all 1s ease-out" }} />
      <text x={size / 2} y={size / 2 + 12} fill={color} fontSize="14" textAnchor="middle" fontWeight="900" fontFamily="monospace">{Math.round(pct)}</text>
    </svg>
  );
}

export function RevenueStat({ label, value, sub, trend, color = MSSP_TEAL }) {
  return (
    <Card className="p-5" style={{ background: MSSP_BASE, border: `1px solid ${BORDER}` }}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{label}</p>
      <p className="text-3xl font-black font-mono" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-[10px] font-bold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </Card>
  );
}