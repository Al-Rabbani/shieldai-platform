import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, AlertTriangle, Shield, Radio, Activity, Crown, Globe, RadioTower } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Telecom 5G/6G Security Theme - SEP-008
export const TEL_BLUE = "#0ea5e9";
export const TEL_CYAN = "#06b6d4";
export const TEL_RED = "#dc2626";
export const TEL_CRITICAL = "#991b1b";
export const TEL_ORANGE = "#f97316";
export const TEL_AMBER = "#f59e0b";
export const TEL_GREEN = "#10b981";
export const TEL_PURPLE = "#8b5cf6";
export const TEL_TEAL = "#14b8a6";
export const TEL_GOLD = "#eab308";
export const TEL_INDIGO = "#6366f1";

export const TEL_PAGE_BG = { minHeight: "100vh", background: "#0a0f14", padding: "24px" };
export const TEL_CARD = { background: "#111821", border: "1px solid #1f2a33" };
export const BORDER = "#1f2a33";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

// Network node type colors (20 types)
export const NODE_TYPE_COLORS = {
  core_router: TEL_CRITICAL,
  bgp_route_reflector: TEL_CRITICAL,
  "5g_amf": TEL_BLUE,
  "5g_upf": TEL_TEAL,
  dns_server: TEL_AMBER,
  sepp: TEL_GREEN,
  mec_host: TEL_PURPLE,
  hss: TEL_BLUE,
  mme: TEL_TEAL,
  sgw: TEL_GREEN,
  pgw: TEL_AMBER,
  pcrf: TEL_PURPLE,
  oss: TEL_INDIGO,
  bsc: TEL_ORANGE,
  rnc: TEL_ORANGE,
  enodeb: TEL_BLUE,
  gnodeb: TEL_CYAN,
  v2x_edge: TEL_RED,
  iot_gateway: TEL_AMBER,
  submarine_cable_station: TEL_CRITICAL,
};

// Core function type colors (20 types - 3GPP standard)
export const CORE_FUNCTION_COLORS = {
  amf: TEL_BLUE,
  smf: TEL_TEAL,
  upf: TEL_GREEN,
  ausf: TEL_AMBER,
  udm: TEL_PURPLE,
  sepp: TEL_RED,
  nrf: TEL_CYAN,
  nssf: TEL_INDIGO,
  pcf: TEL_ORANGE,
  udr: TEL_AMBER,
  uir: TEL_PURPLE,
  bsf: TEL_TEAL,
  chf: TEL_GREEN,
  lmf: TEL_BLUE,
  gmlc: TEL_AMBER,
  smsf: TEL_GREEN,
  scp: TEL_CYAN,
  ccf: TEL_PURPLE,
  af: TEL_ORANGE,
  nef: TEL_INDIGO,
};

// Network slice type colors
export const SLICE_TYPE_COLORS = {
  embb: TEL_BLUE,
  urllc: TEL_RED,
  mmtc: TEL_GREEN,
  government: TEL_GOLD,
  emergency: TEL_CRITICAL,
  v2x: TEL_ORANGE,
  iot: TEL_PURPLE,
  enterprise: TEL_TEAL,
  consumer: TEL_CYAN,
  wholesale: TEL_INDIGO,
};

// Fraud type colors
export const FRAUD_TYPE_COLORS = {
  sim_swap: TEL_CRITICAL,
  irsf_fraud: TEL_RED,
  account_takeover: TEL_CRITICAL,
  bypass_fraud: TEL_ORANGE,
  wangiri: TEL_AMBER,
  smishing_campaign: TEL_PURPLE,
  subscription_fraud: TEL_ORANGE,
  interconnect_fraud: TEL_RED,
  pbx_hacking: TEL_AMBER,
  wangiri_2: TEL_ORANGE,
  iccp_fraud: TEL_RED,
  roi_fraud: TEL_AMBER,
  traffic_pumping: TEL_ORANGE,
  sim_boxing: TEL_CRITICAL,
  gsm_gateway_fraud: TEL_RED,
  false_answer_supervision: TEL_AMBER,
  short_stopping: TEL_ORANGE,
  international_revenue_share: TEL_RED,
};

// Incident type colors
export const TELECOM_INCIDENT_COLORS = {
  bgp_hijack: TEL_CRITICAL,
  ss7_attack: TEL_RED,
  telecom_ransomware: TEL_CRITICAL,
  sim_swap_mass: TEL_AMBER,
  nation_state_carrier: TEL_CRITICAL,
  diameter_attack: TEL_RED,
  gtp_exploit: TEL_ORANGE,
  signaling_storm: TEL_AMBER,
  fiber_cut: TEL_ORANGE,
  ddos_carrier: TEL_RED,
  roaming_fraud: TEL_AMBER,
  imsi_catcher: TEL_CRITICAL,
  location_tracking: TEL_RED,
  subscriber_data_breach: TEL_CRITICAL,
  core_network_compromise: TEL_CRITICAL,
};

// Risk category colors
export const TELECOM_RISK_COLORS = {
  nation_state_espionage: TEL_CRITICAL,
  bgp_route_hijack: TEL_RED,
  ss7_signaling: TEL_ORANGE,
  "5g_core_vulnerability": TEL_BLUE,
  subscriber_fraud: TEL_AMBER,
  ransomware_carrier: TEL_CRITICAL,
  supply_chain_attack: TEL_RED,
  insider_threat: TEL_ORANGE,
  natural_disaster: TEL_AMBER,
  equipment_failure: TEL_ORANGE,
  cyber_physical_attack: TEL_CRITICAL,
  signaling_vulnerability: TEL_RED,
  roaming_vulnerability: TEL_ORANGE,
  iot_botnet: TEL_AMBER,
};

// Operator type colors
export const OPERATOR_TYPE_COLORS = {
  mno: TEL_BLUE,
  isp: TEL_TEAL,
  fiber_operator: TEL_GREEN,
  satellite_operator: TEL_PURPLE,
  emergency_comms: TEL_RED,
  government_network: TEL_CRITICAL,
  mvno: TEL_CYAN,
  cable_operator: TEL_ORANGE,
  fixed_line: TEL_AMBER,
  wireless_isp: TEL_INDIGO,
  data_center_operator: TEL_PURPLE,
  cloud_provider: TEL_BLUE,
};

export function TelBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-6">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
      <Link to="/telecom" className="hover:text-white transition-colors" style={{ color: TEL_BLUE }}>Telecom Security</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
          {item.path
            ? <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? TEL_BLUE : MUTED }}>{item.label}</Link>
            : <span style={{ color: i === items.length - 1 ? TEL_BLUE : MUTED }}>{item.label}</span>
          }
        </React.Fragment>
      ))}
    </div>
  );
}

export function TelBanner({ bgpHijackCount, catastrophicThreatCount }) {
  if (bgpHijackCount > 0) {
    return (
      <div className="w-full p-4 mb-6 rounded-2xl animate-pulse flex items-center gap-3" style={{ background: `${TEL_CRITICAL}20`, border: `2px solid ${TEL_CRITICAL}` }}>
        <AlertTriangle className="w-6 h-6" style={{ color: TEL_CRITICAL }} />
        <div>
          <p className="text-sm font-black text-white">🔴 BGP PREFIX HIJACK DETECTED — {bgpHijackCount} prefixes affected</p>
          <p className="text-[10px]" style={{ color: TEL_CRITICAL }}>Critical routing security incident — Immediate response required</p>
        </div>
      </div>
    );
  }
  if (catastrophicThreatCount > 0) {
    return (
      <div className="w-full p-4 mb-6 rounded-2xl flex items-center gap-3" style={{ background: `${TEL_CRITICAL}20`, border: `2px solid ${TEL_CRITICAL}` }}>
        <Crown className="w-6 h-6" style={{ color: TEL_CRITICAL }} />
        <div>
          <p className="text-sm font-black text-white">⚠️ CARRIER-CATASTROPHIC THREAT ACTIVE</p>
          <p className="text-[10px]" style={{ color: TEL_CRITICAL }}>{catastrophicThreatCount} active carrier-catastrophic threats</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full p-4 mb-6 rounded-2xl flex items-center gap-3" style={{ background: `${TEL_GREEN}10`, border: `1px solid ${TEL_GREEN}30` }}>
      <RadioTower className="w-5 h-5" style={{ color: TEL_GREEN }} />
      <div>
        <p className="text-sm font-bold text-white">Carrier network nominal</p>
        <p className="text-[10px]" style={{ color: MUTED }}>No critical BGP or signaling incidents</p>
      </div>
    </div>
  );
}

export function TelBadge({ color, children }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

export function TelStat({ label, value, sub, color, pulse }) {
  return (
    <div className={`p-4 rounded-2xl text-center ${pulse ? 'animate-pulse' : ''}`} style={{ ...TEL_CARD, border: `2px solid ${color}30` }}>
      <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}

export function TelGauge({ score, size = 60 }) {
  const color = score >= 75 ? TEL_GREEN : score >= 50 ? TEL_AMBER : TEL_RED;
  const circumference = Math.PI * (size / 2 - 6);
  const offset = circumference - (score / 100) * circumference;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize="14" fontWeight="900" fill={color}>{score}</text>
    </svg>
  );
}

export function timeAgo(date) {
  if (!date) return "—";
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return "—"; }
}

export function formatSubscribers(num) {
  if (!num) return "—";
  if (num >= 1000000) return `${(num/1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num/1000).toFixed(1)}K`;
  return num.toString();
}

export function formatCurrencyUSD(num) {
  if (!num) return "—";
  if (num >= 1000000000) return `$${(num/1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `$${(num/1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num/1000).toFixed(1)}K`;
  return `$${num}`;
}

export function formatDataTB(num) {
  if (!num) return "—";
  return `${num.toFixed(1)} TB`;
}

export function formatDataGB(num) {
  if (!num) return "—";
  if (num >= 1000) return `${(num/1000).toFixed(1)} TB`;
  return `${num.toFixed(0)} GB`;
}

export function formatThroughput(num) {
  if (!num) return "—";
  if (num >= 1000) return `${(num/1000).toFixed(1)} Tbps`;
  return `${num.toFixed(0)} Gbps`;
}