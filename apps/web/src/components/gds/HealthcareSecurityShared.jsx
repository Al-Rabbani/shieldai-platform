import React from "react";
import { Link } from "react-router-dom";
import { Heart, Shield, Activity, AlertTriangle } from "lucide-react";
import { Card } from "@/components/gds/GDSOSShared";

export const HC_DARK = "#0a1014";
export const HC_BASE = "#0f1a20";
export const HC_LIGHT = "#1a2a30";
export const HC_TEAL = "#14b8a6";
export const HC_TEAL_LIGHT = "#2dd4bf";
export const HC_GREEN = "#10b981";
export const HC_GREEN_DARK = "#059669";
export const HC_RED = "#dc2626";
export const HC_ORANGE = "#f97316";
export const HC_PURPLE = "#a855f7";
export const BORDER = "#1e2a30";
export const MUTED = "#64748b";
export const TEXT = "#e2e8f0";

export const HC_CARD = { background: HC_BASE, border: `1px solid ${BORDER}` };
export const HC_PAGE_BG = { minHeight: "100vh", background: HC_DARK, padding: "24px" };

export const DEVICE_TYPE_COLORS = {
  mri: "#dc2626",
  ct_scanner: "#dc2626",
  ventilator: "#dc2626",
  infusion_pump: "#dc2626",
  patient_monitor: "#ef4444",
  insulin_pump: "#dc2626",
  pacemaker: "#dc2626",
  defibrillator: "#dc2626",
  anesthesia_machine: "#ef4444",
  dialysis_machine: "#ef4444",
  ultrasound: "#f97316",
  xray: "#f97316",
  pet_scanner: "#f59e0b",
  ecg: "#10b981",
  eeg: "#10b981",
  surgical_robot: "#dc2626",
};

export const THREAT_TYPE_COLORS = {
  medical_ransomware: "#dc2626",
  medical_device_exploit: "#ef4444",
  pharmaceutical_espionage: "#a855f7",
  apt_healthcare: "#dc2626",
  medical_iot_botnet: "#f97316",
  phi_targeting: "#ef4444",
  ransomware_as_service: "#dc2626",
  insider_threat: "#f59e0b",
  supply_chain_attack: "#a855f7",
  telemedicine_exploit: "#f97316",
  clinical_research_theft: "#a855f7",
  medical_identity_theft: "#ef4444",
  healthcare_fraud: "#f97316",
  botnet_c2: "#dc2626",
  zero_day_exploit: "#dc2626",
};

export const INCIDENT_TYPE_COLORS = {
  ransomware: "#dc2626",
  data_breach: "#ef4444",
  device_compromise: "#f97316",
  insider_threat: "#f59e0b",
  service_disruption: "#ef4444",
  phi_exposure: "#dc2626",
  credential_theft: "#f97316",
  malware: "#dc2626",
  unauthorized_access: "#f59e0b",
  denial_of_service: "#ef4444",
};

export const HOSPITAL_TYPE_COLORS = {
  academic_medical_center: "#dc2626",
  community_hospital: "#3b82f6",
  specialty_hospital: "#10b981",
  childrens_hospital: "#f59e0b",
  cancer_center: "#a855f7",
  psychiatric_hospital: "#6366f1",
  rehabilitation_hospital: "#14b8a6",
  long_term_acute_care: "#f97316",
  critical_access_hospital: "#ef4444",
  veterans_hospital: "#dc2626",
};

export const DEPARTMENT_COLORS = {
  emergency: "#dc2626",
  icu: "#dc2626",
  or: "#dc2626",
  radiology: "#ef4444",
  oncology: "#a855f7",
  cardiology: "#ef4444",
  neurology: "#f97316",
  pediatrics: "#f59e0b",
  pharmacy: "#10b981",
  laboratory: "#3b82f6",
};

export function HCBreadcrumb({ items }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-4">
      <Link to="/" className="hover:text-white transition-colors" style={{ color: MUTED }}>GDS OS</Link>
      <span style={{ color: MUTED }}>›</span>
      <Link to="/healthcare" className="hover:text-white transition-colors" style={{ color: HC_TEAL }}>Healthcare Security</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span style={{ color: MUTED }}>›</span>
          {item.path ? (
            <Link to={item.path} className="hover:text-white transition-colors" style={{ color: i === items.length - 1 ? HC_TEAL : MUTED }}>{item.label}</Link>
          ) : (
            <span style={{ color: i === items.length - 1 ? HC_TEAL : MUTED }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function HCBanner() {
  return (
    <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl mb-6"
      style={{ background: `linear-gradient(90deg, transparent, ${HC_TEAL}15, transparent)`, border: `1px solid ${HC_TEAL}40` }}>
      <Heart className="w-4 h-4" style={{ color: HC_TEAL }} />
      <span className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: HC_TEAL }}>SEP-004 | HEALTHCARE SECURITY</span>
      <Heart className="w-4 h-4" style={{ color: HC_TEAL }} />
    </div>
  );
}

export function HCBadge({ children, color, className = "" }) {
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${className}`}
      style={{ color: color || HC_TEAL, background: `${color || HC_TEAL}15`, border: `1px solid ${color || HC_TEAL}30` }}>
      {children}
    </span>
  );
}

export function PatientSafetyBanner({ active }) {
  if (active) {
    return (
      <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl mb-6 animate-pulse"
        style={{ background: `${HC_RED}15`, border: `2px solid ${HC_RED}40` }}>
        <AlertTriangle className="w-5 h-5" style={{ color: HC_RED }} />
        <span className="text-sm font-black uppercase tracking-widest" style={{ color: HC_RED }}>⚠️ PATIENT SAFETY INCIDENT ACTIVE — Immediate Attention Required</span>
        <AlertTriangle className="w-5 h-5" style={{ color: HC_RED }} />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-xl mb-6"
      style={{ background: `${HC_GREEN}15`, border: `1px solid ${HC_GREEN}40` }}>
      <Shield className="w-4 h-4" style={{ color: HC_GREEN }} />
      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: HC_GREEN }}>All Clinical Systems Nominal — No Patient Safety Incidents</span>
      <Shield className="w-4 h-4" style={{ color: HC_GREEN }} />
    </div>
  );
}

export function RiskGauge({ score, size = 60, patientCritical = false }) {
  const radius = (size - 12) / 2;
  const circumference = Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 75 ? HC_GREEN : pct >= 50 ? "#f59e0b" : HC_RED;

  return (
    <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`}>
      <path d={`M 6 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M 6 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 6 - offset} ${size / 2}`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: "all 1s ease-out" }} />
      <text x={size / 2} y={size / 2 + 12} fill={color} fontSize="14" textAnchor="middle" fontWeight="900" fontFamily="monospace">{Math.round(pct)}</text>
    </svg>
  );
}

export function HCStat({ label, value, sub, critical, color = HC_TEAL }) {
  return (
    <Card className={`p-5 ${critical ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${color}40` }}>
      <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{label}</p>
      <p className={`text-4xl font-black font-mono ${critical ? 'animate-pulse' : ''}`} style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: MUTED }}>{sub}</p>}
    </Card>
  );
}

export function formatPHI(n) {
  if (!n) return "0";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}