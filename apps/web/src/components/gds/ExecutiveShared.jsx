import React from "react";
import { Shield, Lock, TrendingUp, AlertTriangle, DollarSign, Target, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/components/gds/GDSOSShared";

export const GOLD = "#B8860B";
export const GOLD_LIGHT = "#D4AF37";
export const GOLD_DARK = "#8B6914";
export const BG = "#0a0e1a";
export const CARD_BG = "#0f1422";
export const BORDER = "#1e2a3a";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

export const AUDIENCE_COLORS = {
  CEO: "#D4AF37",
  CISO: "#0EA5E9",
  Board: "#A855F7",
  CRO: "#EF4444",
  CFO: "#10B981",
};

export const POSTURE_COLORS = {
  excellent: "#10B981",
  good: "#0EA5E9",
  fair: "#F59E0B",
  poor: "#F97316",
  critical: "#EF4444",
};

export const PILLAR_COLORS = {
  security: "#0EA5E9",
  compliance: "#A855F7",
  resilience: "#10B981",
  digital_transformation: "#F59E0B",
  ai_adoption: "#14B8A6",
  innovation: "#EC4899",
  growth: "#8B5CF6",
  operational: "#6366F1",
};

export const RISK_CATEGORY_COLORS = {
  cyber: "#EF4444",
  operational: "#F97316",
  strategic: "#F59E0B",
  financial: "#D4AF37",
  regulatory: "#A855F7",
  reputational: "#EC4899",
  geopolitical: "#8B5CF6",
  technological: "#06B6D4",
  environmental: "#10B981",
  social: "#F43F5E",
  governance: "#6366F1",
  market: "#84CC16",
};

export const INVESTMENT_CATEGORY_COLORS = {
  detection: "#EF4444",
  prevention: "#F97316",
  response: "#F59E0B",
  recovery: "#10B981",
  insurance: "#0EA5E9",
  compliance: "#A855F7",
  training: "#EC4899",
  infrastructure: "#6366F1",
  automation: "#14B8A6",
  intelligence: "#8B5CF6",
  research: "#F43F5E",
};

export function ExecutiveBadge({ children, color, className = "" }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${className}`}
      style={{ color: color || GOLD, background: `${color || GOLD}15`, border: `1px solid ${color || GOLD}30` }}>
      {children}
    </span>
  );
}

export function BoardConfidentialBanner() {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl mb-6"
      style={{ background: `linear-gradient(90deg, transparent, ${GOLD_DARK}20, transparent)`, border: `1px solid ${GOLD}30` }}>
      <Lock className="w-3.5 h-3.5" style={{ color: GOLD }} />
      <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: GOLD }}>Board Confidential</span>
      <Lock className="w-3.5 h-3.5" style={{ color: GOLD }} />
    </div>
  );
}

export function ExecutiveBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-4">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <span style={{ color: MUTED }}>›</span>
      <Link to="/executive" className="hover:text-white transition-colors" style={{ color: GOLD }}>Executive</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span style={{ color: MUTED }}>›</span>
          {item.path
            ? <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? GOLD : MUTED }}>{item.label}</Link>
            : <span style={{ color: i === items.length - 1 ? GOLD : MUTED }}>{item.label}</span>
          }
        </React.Fragment>
      ))}
    </div>
  );
}

export function ExecutiveKpiCard({ label, value, sub, icon: Icon, trend, trendValue, color, link, pulse }) {
  const content = (
    <Card className="p-5 h-full cursor-pointer hover:scale-[1.01] transition-transform"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>{label}</span>
        {Icon && <Icon className="w-4 h-4" style={{ color: color || GOLD }} />}
      </div>
      <div className="flex items-baseline gap-2">
        {pulse && <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: color || GOLD }} />}
        <span className="text-3xl font-black font-mono leading-none" style={{ color: color || GOLD }}>{value ?? "—"}</span>
        {trend && (
          <span className={`text-xs font-bold ${trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-slate-400"}`}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
          </span>
        )}
      </div>
      {sub && <p className="text-[11px] mt-2" style={{ color: MUTED }}>{sub}</p>}
    </Card>
  );
  return link ? <Link to={link} className="block h-full">{content}</Link> : content;
}

export function ExecutiveGauge({ value, max = 100, label, size = 80, color = GOLD }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - 16) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 8} ${size / 2}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
        <path d={`M 8 ${size / 2} A ${radius} ${radius} 0 0 1 ${8 + circumference * (pct / 100)} ${size / 2}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)`, transition: "all 1s ease-out" }} />
        <text x={size / 2} y={size / 2 + 8} fill={color} fontSize="18" textAnchor="middle" fontWeight="900" fontFamily="monospace">{value}</text>
      </svg>
      {label && <p className="text-[9px] font-bold uppercase mt-1" style={{ color: MUTED }}>{label}</p>}
    </div>
  );
}

export function ExecutiveProgressBar({ value, max = 100, color = GOLD, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between text-[9px] mb-1">
          <span style={{ color: MUTED }}>{label}</span>
          <span className="font-bold" style={{ color }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function ExecutiveHeatmap({ data }) {
  const likelihoods = ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
  const impacts = ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"];

  return (
    <div className="grid grid-cols-6 gap-1">
      <div className="text-[8px] font-bold" style={{ color: MUTED }}>Likelihood →<br/>Impact ↓</div>
      {likelihoods.map((l, i) => (
        <div key={l} className="text-[8px] font-bold text-center pb-1" style={{ color: MUTED }}>{l}</div>
      ))}
      {impacts.map((impact, row) => (
        <React.Fragment key={impact}>
          <div className="text-[8px] font-bold pr-1 text-right" style={{ color: MUTED }}>{impact}</div>
          {likelihoods.map((_, col) => {
            const riskLevel = row + col;
            const color = riskLevel >= 7 ? "#EF4444" : riskLevel >= 5 ? "#F59E0B" : riskLevel >= 3 ? "#10B981" : "#6366F1";
            const risks = data?.filter(r => r.likelihood_score === col + 1 && r.impact_score === row + 1) || [];
            return (
              <div key={`${row}-${col}`} className="h-12 rounded-lg flex items-center justify-center relative"
                style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                {risks.length > 0 && (
                  <>
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {risks.length > 1 && (
                      <span className="absolute top-0.5 right-0.5 text-[7px] font-bold" style={{ color }}>{risks.length}</span>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

export const EXECUTIVE_PAGE_BG = { minHeight: "100vh", background: BG, padding: "24px" };