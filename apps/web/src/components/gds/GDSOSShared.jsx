import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, AlertCircle, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const BG = "#020817";
export const CARD = "#0a1628";
export const BORDER = "#1e3a5f";
export const CYAN = "#00d4ff";
export const DANGER = "#ff3b3b";
export const HIGH = "#ff8c00";
export const MEDIUM = "#ffd700";
export const LOW = "#00ff88";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

export const SEV_COLOR = {
  critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW,
  info: "#38bdf8", none: MUTED
};

export const TOOLTIP_STYLE = {
  background: "#0a1628", border: `1px solid ${CYAN}40`,
  borderRadius: 8, fontSize: 11, color: TEXT,
};

export function SevBadge({ sev }) {
  const color = SEV_COLOR[sev?.toLowerCase()] || MUTED;
  return (
    <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {sev || "—"}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    open:          [DANGER,  `${DANGER}15`],
    in_remediation:["#f97316","rgba(249,115,22,0.15)"],
    resolved:      [LOW,     `${LOW}15`],
    fixed:         [LOW,     `${LOW}15`],
    accepted_risk: [MUTED,   "rgba(100,116,139,0.15)"],
    active:        [LOW,     `${LOW}15`],
    inactive:      [MUTED,   "rgba(100,116,139,0.15)"],
    connected:     [LOW,     `${LOW}15`],
    error:         [DANGER,  `${DANGER}15`],
    critical:      [DANGER,  `${DANGER}15`],
    new:           [CYAN,    `${CYAN}15`],
  };
  const [color, bg] = map[status?.toLowerCase()] || [MUTED, "rgba(100,116,139,0.15)"];
  return (
    <span className="text-[10px] capitalize px-2 py-0.5 rounded-full font-semibold"
      style={{ color, background: bg }}>
      {(status || "—").replace(/_/g, " ")}
    </span>
  );
}

export function Skeleton({ lines = 5 }) {
  return (
    <div className="space-y-3 p-4">
      {[...Array(lines)].map((_, i) => (
        <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(0,212,255,0.04)", width: `${70 + (i * 7) % 30}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = null, title, description, action, actionLabel, actionPath }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(0,212,255,0.08)", border: `1px solid ${BORDER}` }}>
          <Icon className="w-8 h-8" style={{ color: MUTED }} />
        </div>
      )}
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-sm max-w-sm" style={{ color: MUTED }}>{description}</p>
      {actionPath && (
        <Link to={actionPath}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
          style={{ background: `${CYAN}18`, border: `1px solid ${CYAN}40`, color: CYAN }}>
          {actionLabel || "Take Action"}
        </Link>
      )}
    </div>
  );
}

export function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-6">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
          {item.path
            ? <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? CYAN : MUTED }}>{item.label}</Link>
            : <span style={{ color: i === items.length - 1 ? CYAN : MUTED }}>{item.label}</span>
          }
        </React.Fragment>
      ))}
    </div>
  );
}

export function Card({ children, className = "", style = {}, glow }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`rounded-2xl transition-all duration-300 ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: CARD,
        border: `1px solid ${hovered && glow ? CYAN + "60" : BORDER}`,
        boxShadow: hovered && glow ? `0 0 20px rgba(0,212,255,0.08)` : "none",
        ...style
      }}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, sub, color, icon: Icon, pulse, link }) {
  const inner = (
    <Card glow className="p-5 h-full cursor-pointer hover:scale-[1.01]" style={{ transition: "all 0.2s" }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>{label}</span>
        {Icon && <Icon className="w-4 h-4" style={{ color }} />}
      </div>
      <div className="flex items-baseline gap-1.5">
        {pulse && <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: color }} />}
        <span className="text-3xl font-black font-mono leading-none" style={{ color }}>{value ?? "—"}</span>
      </div>
      {sub && <p className="text-[11px] mt-2" style={{ color: MUTED }}>{sub}</p>}
    </Card>
  );
  return link ? <Link to={link} className="block h-full">{inner}</Link> : inner;
}

export function AnimatedArc({ score, size = 80, strokeWidth = 8 }) {
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(score ?? 0), 150); return () => clearTimeout(t); }, [score]);
  const r = size / 2 - strokeWidth;
  const cx = size / 2, cy = size / 2;
  const color = anim >= 70 ? LOW : anim >= 40 ? MEDIUM : DANGER;
  const circumference = Math.PI * r;
  const pct = (anim / 100) * circumference;
  const toXY = (pct) => {
    const a = Math.PI * (1 + pct);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const start = toXY(0), end = toXY(anim / 100);
  const large = anim > 50 ? 1 : 0;
  return (
    <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
      <path d={`M ${toXY(0).x} ${toXY(0).y} A ${r} ${r} 0 1 1 ${toXY(1).x} ${toXY(1).y}`}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} strokeLinecap="round" />
      {anim > 0 && (
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}88)`, transition: "all 1s cubic-bezier(.4,0,.2,1)" }} />
      )}
      <text x={cx} y={size * 0.55} fill={color} fontSize={size * 0.22} textAnchor="middle" fontWeight="900" fontFamily="monospace">{score ?? "—"}</text>
    </svg>
  );
}

export function SearchFilter({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: MUTED }} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none transition-all"
        style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
      />
    </div>
  );
}

export function timeAgo(date) {
  if (!date) return "—";
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return "—"; }
}

export function ProviderBadge({ provider }) {
  const map = {
    aws:    { color: "#ff9900", label: "AWS" },
    azure:  { color: "#0078d4", label: "Azure" },
    gcp:    { color: "#4285f4", label: "GCP" },
    github: { color: "#e2e8f0", label: "GitHub" },
    gitlab: { color: "#fc6d26", label: "GitLab" },
    npm:    { color: "#cb3837", label: "npm" },
    pypi:   { color: "#3776ab", label: "PyPI" },
    go:     { color: "#00add8", label: "Go" },
  };
  const m = map[provider?.toLowerCase()] || { color: MUTED, label: provider || "—" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: m.color, background: `${m.color}15`, border: `1px solid ${m.color}30` }}>
      {m.label}
    </span>
  );
}

export const PAGE_BG = { minHeight: "100vh", background: BG, padding: "24px" };