import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, Shield, Heart, Users, FileText, TrendingUp, Clock, AlertCircle, Building, Cpu, Database } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";
import { HCBreadcrumb, HCBanner, HCBadge, PatientSafetyBanner, HCStat, HC_PAGE_BG, HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, HC_BASE, BORDER, MUTED, TEXT, DEVICE_TYPE_COLORS, THREAT_TYPE_COLORS, formatPHI } from "@/components/gds/HealthcareSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSHealthcarePage() {
  const { data: hospitals = [] } = useQuery({ queryKey: ["hc-hospitals"], queryFn: () => base44.entities.Hospital.list().catch(() => []) });
  const { data: devices = [] } = useQuery({ queryKey: ["hc-devices"], queryFn: () => base44.entities.MedicalDevice.list().catch(() => []) });
  const { data: patientRecords = [] } = useQuery({ queryKey: ["hc-phi"], queryFn: () => base44.entities.PatientRecord.list().catch(() => []) });
  const { data: incidents = [] } = useQuery({ queryKey: ["hc-incidents"], queryFn: () => base44.entities.HealthcareIncident.filter({ status: { $ne: "closed" } }).catch(() => []) });
  const { data: threats = [] } = useQuery({ queryKey: ["hc-threats"], queryFn: () => base44.entities.HealthcareThreat.filter({ status: "active" }, "-last_seen", 50).catch(() => []) });
  const { data: risks = [] } = useQuery({ queryKey: ["hc-risks"], queryFn: () => base44.entities.MedicalRisk.filter({ risk_category: "ransomware" }).catch(() => []) });

  const patientSafetyIncidents = incidents.filter(i => i.patient_safety_risk && i.status !== "closed");
  const totalPHI = hospitals.reduce((s, h) => s + (h.patient_records_protected || 0), 0);
  const maxRansomwareRisk = risks.length > 0 ? Math.max(...risks.map(r => r.risk_score || 0)) : 0;

  const stats = {
    hospitals: hospitals.length,
    devices: devices.length,
    phi: totalPHI,
    patientSafetyAlerts: patientSafetyIncidents.length,
    hipaaCompliance: 71,
    ransomwareRisk: maxRansomwareRisk,
  };

  return (
    <div style={HC_PAGE_BG}>
      <HCBreadcrumb items={[{ label: "HealthSOC" }]} />
      <HCBanner />
      <PatientSafetyBanner active={patientSafetyIncidents.length > 0} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">HEALTHCARE SECURITY OPERATIONS CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-004 · AI Healthcare & Hospital Cyber Defense Platform</p>
        </div>
        <LiveDataBadge />
      </div>

      {/* HERO STATS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Hospitals Protected</p>
          <p className="text-3xl font-black text-white">{stats.hospitals}</p>
        </Card>
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Medical Devices</p>
          <p className="text-3xl font-black" style={{ color: HC_TEAL }}>{stats.devices}</p>
        </Card>
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>PHI Records</p>
          <p className="text-2xl font-black" style={{ color: HC_GREEN }}>{formatPHI(stats.phi)}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.patientSafetyAlerts > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Patient Safety</p>
          <p className="text-3xl font-black" style={{ color: stats.patientSafetyAlerts > 0 ? HC_RED : HC_GREEN }}>{stats.patientSafetyAlerts}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_ORANGE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>HIPAA Compliance</p>
          <p className="text-3xl font-black" style={{ color: HC_ORANGE }}>{stats.hipaaCompliance}%</p>
        </Card>
        <Card className={`p-4 text-center ${stats.ransomwareRisk > 80 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${stats.ransomwareRisk > 80 ? HC_RED + "40" : HC_TEAL + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Ransomware Risk</p>
          <p className="text-3xl font-black" style={{ color: stats.ransomwareRisk > 80 ? HC_RED : HC_TEAL }}>{stats.ransomwareRisk}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Healthcare Threats */}
        <Card className="p-5" style={HC_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: HC_TEAL }} />
              Healthcare Threats
            </h3>
            <Link to="/healthcare/threats" className="text-[10px] font-bold" style={{ color: HC_TEAL }}>View All →</Link>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {threats.slice(0, 10).map(threat => (
              <div key={threat.id} className="p-3 rounded-lg" style={{ background: HC_BASE, border: `1px solid ${THREAT_TYPE_COLORS[threat.threat_type] || HC_ORANGE}30` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <HCBadge color={THREAT_TYPE_COLORS[threat.threat_type] || HC_ORANGE}>{threat.threat_type}</HCBadge>
                    <p className="text-xs font-bold text-white mt-1 truncate">{threat.title}</p>
                  </div>
                  {threat.patient_safety_risk && <Heart className="w-4 h-4" style={{ color: HC_RED }} />}
                </div>
                <div className="flex items-center justify-between text-[9px]">
                  <span style={{ color: MUTED }}>{threat.threat_actor || "Unknown"}</span>
                  <div className="w-16 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${threat.probability_30d || 0}%`, background: (threat.probability_30d || 0) > 50 ? HC_RED : HC_ORANGE }} /></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* CENTER: Healthcare Incidents */}
        <Card className="p-5" style={HC_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: HC_RED }} />
              Clinical Incidents
            </h3>
            <Link to="/healthcare/incidents" className="text-[10px] font-bold" style={{ color: HC_TEAL }}>View All →</Link>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {incidents.filter(i => i.status !== "closed").slice(0, 10).map(inc => (
              <div key={inc.id} className="p-3 rounded-lg" style={{ background: HC_BASE, border: `1px solid ${inc.patient_safety_risk ? HC_RED : inc.severity === "critical" ? HC_RED : HC_ORANGE}30` }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <HCBadge color={inc.patient_safety_risk ? HC_RED : HC_ORANGE}>{inc.incident_type}</HCBadge>
                    <p className="text-xs font-bold text-white mt-1">{inc.incident_ref}</p>
                  </div>
                  <SevBadge sev={inc.severity} />
                </div>
                {inc.patient_safety_risk && <p className="text-[9px] italic mb-2" style={{ color: HC_RED }}>{inc.patient_safety_description}</p>}
                <div className="flex items-center justify-between text-[9px]">
                  <span style={{ color: MUTED }}>{timeAgo(inc.detected_at)}</span>
                  <HCBadge color={inc.status === "investigating" ? HC_ORANGE : HC_GREEN}>{inc.status}</HCBadge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* RIGHT: Hospital Risk Grid */}
        <Card className="p-5" style={HC_CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4" style={{ color: HC_TEAL }} />
              Hospital Portfolio
            </h3>
            <Link to="/healthcare/hospitals" className="text-[10px] font-bold" style={{ color: HC_TEAL }}>View All →</Link>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {hospitals.slice(0, 10).map(h => (
              <div key={h.id} className="p-3 rounded-lg" style={{ background: HC_BASE, border: `1px solid ${h.risk_score > 75 ? HC_RED : h.risk_score > 60 ? HC_ORANGE : HC_GREEN}30` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-white truncate">{h.name}</p>
                  <HCBadge color={h.threat_level === "critical" ? HC_RED : HC_ORANGE}>{h.threat_level}</HCBadge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-8 rounded bg-white/5 flex items-center justify-center">
                      <span className="text-xs font-bold" style={{ color: h.risk_score > 75 ? HC_RED : h.risk_score > 60 ? HC_ORANGE : HC_GREEN }}>{h.risk_score}</span>
                    </div>
                    <span className="text-[9px]" style={{ color: MUTED }}>{h.hospital_type}</span>
                  </div>
                  {h.critical_devices_at_risk > 0 && <span className="text-[9px] font-bold" style={{ color: HC_RED }}>{h.critical_devices_at_risk} at risk</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}