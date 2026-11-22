import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, AlertTriangle, Shield, Zap, Activity, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Industrial OT/ICS Security Theme - SEP-005
export const OT_AMBER = "#f59e0b";
export const OT_ORANGE = "#f97316";
export const OT_RED = "#dc2626";
export const OT_CRITICAL = "#991b1b";
export const OT_YELLOW = "#eab308";
export const OT_GREEN = "#10b981";
export const OT_BLUE = "#0ea5e9";
export const OT_PURPLE = "#8b5cf6";
export const OT_TEAL = "#14b8a6";

export const OT_PAGE_BG = { minHeight: "100vh", background: "#0a0f14", padding: "24px" };
export const OT_CARD = { background: "#111821", border: "1px solid #1f2a33" };
export const BORDER = "#1f2a33";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

// Sector type colors (29 types)
export const SECTOR_COLORS = {
  electricity: OT_AMBER,
  pipelines: OT_ORANGE,
  water_utilities: OT_BLUE,
  railways: OT_TEAL,
  telecom: OT_PURPLE,
  refineries: OT_RED,
  defense: OT_CRITICAL,
  airports: OT_GREEN,
  seaports: "#059669",
  nuclear: "#dc2626",
  oil_gas: "#ea580c",
  chemical: "#a855f7",
  dams: "#0891b2",
  emergency_services: "#dc2626",
  food_agriculture: "#65a30d",
  government: "#4f46e5",
  healthcare: "#db2777",
  it_comms: "#7c3aed",
  manufacturing: "#c2410c",
  postal_shipping: "#0284c7",
  transportation: "#0369a1",
  wastewater: "#059669",
  financial: "#16a34a",
  energy: "#f59e0b",
  communications: "#7c3aed",
  critical_manufacturing: "#b91c1c",
  national_monuments: "#0d9488",
  commercial_facilities: "#0891b2",
  educational: "#2563eb",
};

// PLC Protocol risk colors (15 protocols)
export const PROTOCOL_COLORS = {
  Modbus: OT_CRITICAL,
  S7Comm: OT_RED,
  DNP3: OT_ORANGE,
  IEC_60870: OT_AMBER,
  EtherNet_IP: OT_BLUE,
  OPC_UA: OT_GREEN,
  Profinet: OT_RED,
  Modbus_TCP: OT_CRITICAL,
  BACnet: OT_ORANGE,
  KNX: OT_AMBER,
  Zigbee: OT_PURPLE,
  WirelessHART: OT_ORANGE,
  ISA100: OT_AMBER,
  MQTT: OT_BLUE,
  CoAP: OT_GREEN,
};

// OT Asset type colors (26 types)
export const OT_ASSET_COLORS = {
  plc: OT_AMBER,
  rtu: OT_ORANGE,
  ied: OT_BLUE,
  hmi: OT_TEAL,
  scada_server: OT_RED,
  safety_plc: OT_CRITICAL,
  turbine: OT_ORANGE,
  generator: OT_ORANGE,
  transformer: OT_AMBER,
  breaker: OT_RED,
  relay: OT_ORANGE,
  sensor: OT_BLUE,
  actuator: OT_TEAL,
  valve: OT_ORANGE,
  pump: OT_AMBER,
  compressor: OT_ORANGE,
  motor: OT_YELLOW,
  drive: OT_AMBER,
  controller: OT_ORANGE,
  gateway: OT_PURPLE,
  switch: OT_BLUE,
  router: OT_PURPLE,
  firewall: OT_RED,
  historian: OT_TEAL,
  engineering_workstation: OT_BLUE,
  operator_station: OT_TEAL,
};

// Incident type colors (15 types)
export const INCIDENT_TYPE_COLORS = {
  scada_compromise: OT_CRITICAL,
  plc_reprogramming: OT_CRITICAL,
  ot_ransomware: OT_RED,
  protocol_anomaly: OT_AMBER,
  unauthorized_access: OT_ORANGE,
  malware_detected: OT_RED,
  safety_system_bypass: OT_CRITICAL,
  data_exfiltration: OT_RED,
  denial_of_service: OT_ORANGE,
  firmware_tampering: OT_CRITICAL,
  credential_theft: OT_RED,
  network_segmentation_breach: OT_ORANGE,
  remote_access_abuse: OT_RED,
  supply_chain_compromise: OT_CRITICAL,
  insider_threat: OT_RED,
};

// Risk category colors (13 types)
export const RISK_CATEGORY_COLORS = {
  nation_state: OT_CRITICAL,
  ics_malware: OT_RED,
  ransomware_ot: OT_ORANGE,
  plc_reprogramming: OT_CRITICAL,
  cascading_failure: OT_AMBER,
  safety_system_compromise: OT_CRITICAL,
  scada_intrusion: OT_RED,
  protocol_exploit: OT_ORANGE,
  supply_chain_attack: OT_CRITICAL,
  insider_threat: OT_RED,
  natural_disaster: OT_AMBER,
  equipment_failure: OT_ORANGE,
  cyber_physical_attack: OT_CRITICAL,
};

export function OTBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-6">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
      <Link to="/critical-infrastructure" className="hover:text-white transition-colors" style={{ color: OT_AMBER }}>Critical Infrastructure</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
          {item.path
            ? <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? OT_AMBER : MUTED }}>{item.label}</Link>
            : <span style={{ color: i === items.length - 1 ? OT_AMBER : MUTED }}>{item.label}</span>
          }
        </React.Fragment>
      ))}
    </div>
  );
}

export function OTBanner({ safetyIncident, existentialThreat }) {
  if (safetyIncident) {
    return (
      <div className="w-full p-4 mb-6 rounded-2xl animate-pulse flex items-center gap-3" style={{ background: `${OT_CRITICAL}20`, border: `2px solid ${OT_CRITICAL}` }}>
        <AlertTriangle className="w-6 h-6" style={{ color: OT_CRITICAL }} />
        <div>
          <p className="text-sm font-black text-white">🚨 OPERATIONAL SAFETY INCIDENT ACTIVE</p>
          <p className="text-[10px]" style={{ color: OT_CRITICAL }}>Safety systems triggered — Immediate response required</p>
        </div>
      </div>
    );
  }
  if (existentialThreat > 0) {
    return (
      <div className="w-full p-4 mb-6 rounded-2xl flex items-center gap-3" style={{ background: `${OT_CRITICAL}20`, border: `2px solid ${OT_CRITICAL}` }}>
        <Crown className="w-6 h-6" style={{ color: OT_CRITICAL }} />
        <div>
          <p className="text-sm font-black text-white">⚡ EXISTENTIAL INFRASTRUCTURE THREAT DETECTED</p>
          <p className="text-[10px]" style={{ color: OT_CRITICAL }}>{existentialThreat} active existential threats</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full p-4 mb-6 rounded-2xl flex items-center gap-3" style={{ background: `${OT_GREEN}10`, border: `1px solid ${OT_GREEN}30` }}>
      <Shield className="w-5 h-5" style={{ color: OT_GREEN }} />
      <div>
        <p className="text-sm font-bold text-white">All systems nominal</p>
        <p className="text-[10px]" style={{ color: MUTED }}>No critical operational incidents</p>
      </div>
    </div>
  );
}

export function OTBadge({ color, children }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

export function OTStat({ label, value, sub, color, pulse }) {
  return (
    <div className={`p-4 rounded-2xl text-center ${pulse ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${color}30` }}>
      <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}

export function OTGauge({ score, size = 60 }) {
  const color = score >= 85 ? OT_RED : score >= 70 ? OT_ORANGE : score >= 50 ? OT_AMBER : OT_GREEN;
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

export function formatPopulation(num) {
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