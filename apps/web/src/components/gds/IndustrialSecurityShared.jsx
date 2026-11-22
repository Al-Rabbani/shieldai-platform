import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, AlertTriangle, Shield, Factory, Activity, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Industrial OT/ICS Security Theme - SEP-007
export const IND_AMBER = "#f59e0b";
export const IND_ORANGE = "#f97316";
export const IND_RED = "#dc2626";
export const IND_CRITICAL = "#991b1b";
export const IND_YELLOW = "#eab308";
export const IND_GREEN = "#10b981";
export const IND_BLUE = "#0ea5e9";
export const IND_PURPLE = "#8b5cf6";
export const IND_TEAL = "#14b8a6";
export const IND_LIME = "#84cc16";
export const IND_CYAN = "#06b6d4";
export const IND_PINK = "#ec4899";
export const IND_INDIGO = "#6366f1";

export const IND_PAGE_BG = { minHeight: "100vh", background: "#0a0f14", padding: "24px" };
export const IND_CARD = { background: "#111821", border: "1px solid #1f2a33" };
export const BORDER = "#1f2a33";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

// Industry type colors
export const INDUSTRY_COLORS = {
  automotive: IND_BLUE,
  aerospace: IND_INDIGO,
  pharmaceutical: IND_GREEN,
  semiconductor: IND_CYAN,
  chemical: IND_PURPLE,
  defense_mfg: IND_CRITICAL,
  food_processing: IND_LIME,
  electronics: IND_TEAL,
  steel: IND_ORANGE,
  textile: IND_PINK,
};

// Robot type colors
export const ROBOT_TYPE_COLORS = {
  articulated_arm: IND_BLUE,
  welding_robot: IND_ORANGE,
  agv: IND_GREEN,
  collaborative_cobot: IND_CYAN,
  inspection_robot: IND_PURPLE,
  assembly_robot: IND_TEAL,
  painting_robot: IND_PINK,
};

// Maintenance type colors
export const MAINTENANCE_TYPE_COLORS = {
  firmware_update: IND_BLUE,
  predictive: IND_GREEN,
  cyber_hardening: IND_PURPLE,
  safety_inspection: IND_ORANGE,
  security_patch: IND_CYAN,
  calibration: IND_TEAL,
  preventive: IND_LIME,
  corrective: IND_AMBER,
  emergency: IND_RED,
  inspection: IND_BLUE,
};

// PLC protocol colors
export const PROTOCOL_COLORS = {
  Modbus: IND_CRITICAL,
  S7Comm: IND_RED,
  DNP3: IND_ORANGE,
  IEC_60870: IND_AMBER,
  EtherNet_IP: IND_BLUE,
  OPC_UA: IND_GREEN,
  Profinet: IND_RED,
  Modbus_TCP: IND_CRITICAL,
  BACnet: IND_ORANGE,
  KNX: IND_AMBER,
  Zigbee: IND_PURPLE,
  WirelessHART: IND_ORANGE,
  ISA100: IND_AMBER,
  MQTT: IND_BLUE,
  CoAP: IND_GREEN,
};

// Gateway type colors
export const GATEWAY_TYPE_COLORS = {
  it_ot_gateway: IND_CRITICAL,
  cloud_gateway: IND_BLUE,
  data_diode: IND_GREEN,
  protocol_converter: IND_ORANGE,
  edge_gateway: IND_CYAN,
  field_gateway: IND_TEAL,
  enterprise_gateway: IND_PURPLE,
};

// Risk category colors
export const INDUSTRIAL_RISK_COLORS = {
  operational_technology: IND_AMBER,
  supply_chain: IND_ORANGE,
  insider_threat: IND_RED,
  nation_state: IND_CRITICAL,
  ransomware: IND_RED,
  safety_systems: IND_CRITICAL,
  production_disruption: IND_ORANGE,
  ip_theft: IND_PURPLE,
  regulatory_compliance: IND_BLUE,
  equipment_failure: IND_AMBER,
};

// Threat type colors
export const INDUSTRIAL_THREAT_COLORS = {
  factory_ransomware: IND_CRITICAL,
  insider_sabotage: IND_RED,
  safety_system_bypass: IND_CRITICAL,
  agv_hijack: IND_ORANGE,
  supply_chain_ot: IND_RED,
  industrial_espionage: IND_PURPLE,
  plc_reprogramming: IND_CRITICAL,
  scada_compromise: IND_RED,
  robot_malfunction: IND_ORANGE,
  firmware_tampering: IND_CRITICAL,
  protocol_exploit: IND_RED,
  network_intrusion: IND_ORANGE,
  data_exfiltration: IND_RED,
  denial_of_service: IND_ORANGE,
  physical_cyber_attack: IND_CRITICAL,
};

// Production line type colors
export const LINE_TYPE_COLORS = {
  semiconductor_fab: IND_CYAN,
  pharmaceutical_fill: IND_GREEN,
  welding: IND_ORANGE,
  assembly: IND_BLUE,
  painting: IND_PINK,
  packaging: IND_TEAL,
  testing: IND_PURPLE,
  machining: IND_AMBER,
  molding: IND_ORANGE,
  extrusion: IND_AMBER,
  coating: IND_PINK,
  smt_line: IND_CYAN,
  final_assembly: IND_BLUE,
  quality_inspection: IND_GREEN,
  material_handling: IND_TEAL,
  clean_room: IND_CYAN,
  sterilization: IND_GREEN,
  filling_capping: IND_GREEN,
  labeling: IND_PINK,
  palletizing: IND_TEAL,
};

// Alert type colors
export const ALERT_TYPE_COLORS = {
  plc_behavior_change: IND_CRITICAL,
  robot_malfunction: IND_ORANGE,
  firmware_change: IND_RED,
  scada_anomaly: IND_CRITICAL,
  ip_exfiltration: IND_RED,
  predictive_failure: IND_AMBER,
  safety_system_anomaly: IND_CRITICAL,
  network_intrusion: IND_RED,
  unauthorized_access: IND_RED,
  configuration_drift: IND_ORANGE,
  performance_degradation: IND_AMBER,
  communication_loss: IND_RED,
  protocol_violation: IND_ORANGE,
  malware_detected: IND_CRITICAL,
  data_integrity_issue: IND_RED,
};

export function IndBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-6">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
      <Link to="/industrial" className="hover:text-white transition-colors" style={{ color: IND_AMBER }}>Industrial Security</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="w-3 h-3" style={{ color: MUTED }} />
          {item.path
            ? <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? IND_AMBER : MUTED }}>{item.label}</Link>
            : <span style={{ color: i === items.length - 1 ? IND_AMBER : MUTED }}>{item.label}</span>
          }
        </React.Fragment>
      ))}
    </div>
  );
}

export function IndBanner({ safetyIncident, existentialThreat }) {
  if (safetyIncident) {
    return (
      <div className="w-full p-4 mb-6 rounded-2xl animate-pulse flex items-center gap-3" style={{ background: `${IND_CRITICAL}20`, border: `2px solid ${IND_CRITICAL}` }}>
        <AlertTriangle className="w-6 h-6" style={{ color: IND_CRITICAL }} />
        <div>
          <p className="text-sm font-black text-white">🚨 OPERATIONAL SAFETY INCIDENT ACTIVE</p>
          <p className="text-[10px]" style={{ color: IND_CRITICAL }}>Safety systems triggered — Immediate response required</p>
        </div>
      </div>
    );
  }
  if (existentialThreat > 0) {
    return (
      <div className="w-full p-4 mb-6 rounded-2xl flex items-center gap-3" style={{ background: `${IND_CRITICAL}20`, border: `2px solid ${IND_CRITICAL}` }}>
        <Crown className="w-6 h-6" style={{ color: IND_CRITICAL }} />
        <div>
          <p className="text-sm font-black text-white">⚡ EXISTENTIAL INDUSTRIAL THREAT DETECTED</p>
          <p className="text-[10px]" style={{ color: IND_CRITICAL }}>{existentialThreat} active existential threats</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full p-4 mb-6 rounded-2xl flex items-center gap-3" style={{ background: `${IND_GREEN}10`, border: `1px solid ${IND_GREEN}30` }}>
      <Shield className="w-5 h-5" style={{ color: IND_GREEN }} />
      <div>
        <p className="text-sm font-bold text-white">All systems nominal</p>
        <p className="text-[10px]" style={{ color: MUTED }}>No critical operational incidents</p>
      </div>
    </div>
  );
}

export function IndBadge({ color, children }) {
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
      style={{ color, background: `${color}15`, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

export function IndStat({ label, value, sub, color, pulse }) {
  return (
    <div className={`p-4 rounded-2xl text-center ${pulse ? 'animate-pulse' : ''}`} style={{ ...IND_CARD, border: `2px solid ${color}30` }}>
      <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>{label}</p>
      <p className="text-3xl font-black" style={{ color }}>{value ?? "—"}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}

export function IndGauge({ score, size = 60 }) {
  const color = score >= 85 ? IND_RED : score >= 70 ? IND_ORANGE : score >= 50 ? IND_AMBER : IND_GREEN;
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

export function formatNumberK(num) {
  if (!num) return "—";
  if (num >= 1000) return `${(num/1000).toFixed(1)}K`;
  return num.toString();
}