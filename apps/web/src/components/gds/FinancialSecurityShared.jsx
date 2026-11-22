import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { Card } from "@/components/gds/GDSOSShared";

export const FIN_DARK = "#0a1018";
export const FIN_BASE = "#0f1a28";
export const FIN_LIGHT = "#1a2a3a";
export const FIN_GOLD = "#c9a84c";
export const FIN_GOLD_LIGHT = "#d4af37";
export const FIN_GREEN = "#10b981";
export const FIN_GREEN_DARK = "#059669";
export const FIN_RED = "#dc2626";
export const FIN_RED_DARK = "#991b1b";
export const FIN_ORANGE = "#f97316";
export const FIN_ORANGE_DARK = "#c2410c";
export const BORDER = "#1e2a3a";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

export const FIN_CARD = { background: FIN_BASE, border: `1px solid ${BORDER}` };
export const FIN_PAGE_BG = { minHeight: "100vh", background: FIN_DARK, padding: "24px" };

export const INSTITUTION_TYPE_COLORS = {
  retail_bank: "#3b82f6",
  investment_bank: "#c9a84c",
  payment_processor: "#10b981",
  credit_union: "#06b6d4",
  insurance: "#8b5cf6",
  wealth_management: "#f59e0b",
  hedge_fund: "#dc2626",
  private_equity: "#a855f7",
  fintech: "#14b8a6",
  crypto_exchange: "#f97316",
  broker_dealer: "#ec4899",
  asset_manager: "#6366f1",
  pension_fund: "#10b981",
  sovereign_wealth: "#c9a84c",
  central_bank: "#dc2626",
};

export const FRAUD_TYPE_COLORS = {
  account_takeover: "#dc2626",
  authorized_push_payment: "#ef4444",
  card_fraud: "#f97316",
  synthetic_identity: "#f59e0b",
  insider_fraud: "#dc2626",
  money_mule: "#dc2626",
  application_fraud: "#f97316",
  check_fraud: "#f59e0b",
  wire_fraud: "#dc2626",
  phishing: "#ef4444",
  business_email_compromise: "#dc2626",
  identity_theft: "#f97316",
  loan_fraud: "#f59e0b",
  mortgage_fraud: "#dc2626",
  investment_fraud: "#a855f7",
};

export const AML_TYPE_COLORS = {
  structuring: "#f97316",
  layering: "#dc2626",
  integration: "#f59e0b",
  pep_transaction: "#c9a84c",
  high_risk_country: "#f97316",
  crypto_ml: "#a855f7",
  trade_based: "#ec4899",
  shell_company: "#dc2626",
  rapid_movement: "#ef4444",
  round_tripping: "#f59e0b",
  smurfing: "#f97316",
  placement: "#dc2626",
  cash_intensive: "#f59e0b",
  third_party: "#ef4444",
  correspondent_banking: "#a855f7",
  private_banking: "#c9a84c",
  trade_mispricing: "#ec4899",
  hawala: "#dc2626",
  digital_assets: "#a855f7",
};

export const SAR_TYPE_COLORS = {
  money_laundering: "#dc2626",
  fraud: "#f97316",
  terrorist_financing: "#dc2626",
  structuring: "#f59e0b",
  insider_trading: "#a855f7",
  market_manipulation: "#ef4444",
  bribery: "#dc2626",
  corruption: "#dc2626",
  tax_evasion: "#f59e0b",
  sanctions_evasion: "#dc2626",
  cyber_crime: "#a855f7",
};

export const KYC_LEVEL_COLORS = {
  simplified: "#3b82f6",
  standard: "#10b981",
  enhanced: "#f59e0b",
  continuous: "#c9a84c",
};

export const RISK_RATING_COLORS = {
  low: "#10b981",
  medium: "#3b82f6",
  high: "#f97316",
  very_high: "#dc2626",
  pep: "#c9a84c",
  unacceptable: "#dc2626",
};

export const SANCTIONS_LIST_COLORS = {
  ofac_sdn: "#dc2626",
  eu_sanctions: "#ef4444",
  un_sanctions: "#f97316",
  uk_sanctions: "#f59e0b",
  fatf_black: "#dc2626",
  fatf_grey: "#f59e0b",
  hmt: "#ef4444",
  dfat: "#f97316",
  mas: "#3b82f6",
};

export const TRANSACTION_TYPE_COLORS = {
  wire_transfer: "#c9a84c",
  card_payment: "#10b981",
  ach_transfer: "#3b82f6",
  check_deposit: "#f59e0b",
  cash_withdrawal: "#6b7280",
  crypto_purchase: "#a855f7",
  forex: "#14b8a6",
  securities_trade: "#dc2626",
  loan_disbursement: "#10b981",
  loan_repayment: "#3b82f6",
  fee_charge: "#6b7280",
  interest_payment: "#10b981",
  dividend_payment: "#f59e0b",
  refund: "#14b8a6",
  chargeback: "#dc2626",
};

export const CHANNEL_COLORS = {
  swift: "#c9a84c",
  mobile_app: "#3b82f6",
  web_banking: "#10b981",
  pos: "#14b8a6",
  atm: "#f59e0b",
  branch: "#6b7280",
  call_center: "#8b5cf6",
  api: "#a855f7",
  correspondent: "#dc2626",
};

export const LIKELIHOOD_COLORS = {
  rare: "#3b82f6",
  unlikely: "#10b981",
  possible: "#f59e0b",
  likely: "#f97316",
  almost_certain: "#dc2626",
};

export const IMPACT_COLORS = {
  negligible: "#6b7280",
  minor: "#3b82f6",
  moderate: "#f59e0b",
  major: "#f97316",
  catastrophic: "#dc2626",
};

export function FINBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-4">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <span style={{ color: MUTED }}>›</span>
      <Link to="/financial" className="hover:text-white transition-colors" style={{ color: FIN_GOLD }}>Financial Security</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span style={{ color: MUTED }}>›</span>
          {item.path ? (
            <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? FIN_GOLD : MUTED }}>{item.label}</Link>
          ) : (
            <span style={{ color: i === items.length - 1 ? FIN_GOLD : MUTED }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function FINBanner() {
  return (
    <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl mb-6"
      style={{ background: `linear-gradient(90deg, transparent, ${FIN_GOLD}15, transparent)`, border: `1px solid ${FIN_GOLD}40` }}>
      <DollarSign className="w-4 h-4" style={{ color: FIN_GOLD }} />
      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: FIN_GOLD }}>SEP-003 | FINANCIAL SECURITY</span>
      <DollarSign className="w-4 h-4" style={{ color: FIN_GOLD }} />
    </div>
  );
}

export function FINBadge({ children, color, className = "" }) {
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${className}`}
      style={{ color: color || FIN_GOLD, background: `${color || FIN_GOLD}15`, border: `1px solid ${color || FIN_GOLD}30` }}>
      {children}
    </span>
  );
}

export function RiskGauge({ score, size = 60 }) {
  const radius = (size - 12) / 2;
  const circumference = Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 75 ? FIN_GREEN : pct >= 50 ? "#f59e0b" : "#dc2626";

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      <path d={`M 6 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M 6 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 6 - offset} ${size / 2}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: "all 1s ease-out" }} />
      <text x={size / 2} y={size / 2 + 12} fill={color} fontSize="14" textAnchor="middle" fontWeight="900" fontFamily="monospace">{Math.round(pct)}</text>
    </svg>
  );
}

export function FINStat({ label, value, sub, critical, color = FIN_GOLD }) {
  return (
    <Card className={`p-5 ${critical ? 'animate-pulse' : ''}`} style={{ ...FIN_CARD, border: `2px solid ${color}40` }}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{label}</p>
      <p className={`text-4xl font-black font-mono ${critical ? 'animate-pulse' : ''}`} style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
    </Card>
  );
}

export function formatCurrency(n) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n}`;
}

export function countdown(dateStr) {
  if (!dateStr) return "—";
  const diff = new Date(dateStr) - new Date();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 0) return "OVERDUE";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}