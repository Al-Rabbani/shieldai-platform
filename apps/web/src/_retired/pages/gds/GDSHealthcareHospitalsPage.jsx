import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Building, MapPin, Users, Cpu, Database, AlertTriangle, Shield, Activity, Heart } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, AnimatedArc } from "@/components/gds/GDSOSShared";
import { HCBreadcrumb, HCBanner, HCBadge, HCStat, HC_PAGE_BG, HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, HC_PURPLE, BORDER, MUTED, TEXT, HOSPITAL_TYPE_COLORS } from "@/components/gds/HealthcareSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSHealthcareHospitalsPage() {
  const { data: hospitals = [], isLoading } = useQuery({ queryKey: ["hc-hospitals"], queryFn: () => base44.entities.Hospital.list("-risk_score", 100).catch(() => []) });

  const stats = {
    total: hospitals.length,
    level1Trauma: hospitals.filter(h => h.is_level_1_trauma).length,
    avgRiskScore: hospitals.length > 0 ? Math.round(hospitals.reduce((s, h) => s + (h.risk_score || 0), 0) / hospitals.length) : 0,
    totalPHI: hospitals.reduce((s, h) => s + (h.patient_records_protected || 0), 0),
  };

  return (
    <div style={HC_PAGE_BG}>
      <HCBreadcrumb items={[{ label: "Hospital Portfolio" }]} />
      <HCBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">HOSPITAL PORTFOLIO</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-004 · Healthcare Facility Security</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Hospitals</p>
          <p className="text-3xl font-black" style={{ color: HC_TEAL }}>{stats.total}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Level 1 Trauma Centers</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.level1Trauma}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.avgRiskScore > 65 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${stats.avgRiskScore > 65 ? HC_RED + "40" : HC_ORANGE + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Average Risk Score</p>
          <p className="text-3xl font-black" style={{ color: stats.avgRiskScore > 65 ? HC_RED : HC_ORANGE }}>{stats.avgRiskScore}</p>
        </Card>
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total PHI Protected</p>
          <p className="text-2xl font-black" style={{ color: HC_GREEN }}>{(stats.totalPHI / 1000000).toFixed(1)}M</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? <Skeleton lines={10} /> : hospitals.length === 0 ? (
          <EmptyState icon={Building} title="No Hospitals" description="No hospitals registered" />
        ) : (
          hospitals.slice(0, 20).map(h => (
            <Card key={h.id} className="p-5" style={{ ...HC_CARD, border: `2px solid ${HOSPITAL_TYPE_COLORS[h.hospital_type] || HC_TEAL}30` }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-white">{h.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <HCBadge color={HOSPITAL_TYPE_COLORS[h.hospital_type] || HC_TEAL}>{h.hospital_type}</HCBadge>
                    <span className="text-[9px]" style={{ color: MUTED }}>{h.country}</span>
                  </div>
                </div>
                <AnimatedArc score={h.risk_score || 0} size={70} strokeWidth={8} />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Beds</p>
                  <p className="text-xl font-black text-white">{h.bed_count || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Staff</p>
                  <p className="text-xl font-black text-white">{h.staff_count || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold uppercase" style={{ color: MUTED }}>Devices</p>
                  <p className="text-xl font-black" style={{ color: HC_TEAL }}>{h.critical_devices_at_risk || 0}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {h.is_level_1_trauma && <HCBadge color={HC_RED}>Level 1 Trauma</HCBadge>}
                  {h.has_icu && <HCBadge color={HC_RED}>ICU</HCBadge>}
                  {h.has_oncology && <HCBadge color={HC_PURPLE}>Oncology</HCBadge>}
                  {h.has_radiology && <HCBadge color={HC_ORANGE}>Radiology</HCBadge>}
                </div>
                {h.hipaa_compliant ? <Shield className="w-4 h-4" style={{ color: HC_GREEN }} /> : <Shield className="w-4 h-4" style={{ color: HC_ORANGE }} />}
              </div>

              <div className="flex items-center justify-between text-[9px]">
                <span style={{ color: MUTED }}>EHR: {h.ehr_system || "—"}</span>
                <span style={{ color: h.active_incidents > 0 ? HC_RED : HC_GREEN }}>
                  {h.active_incidents > 0 ? `${h.active_incidents} active incidents` : "No active incidents"}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t" style={{ borderColor: BORDER }}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px]" style={{ color: MUTED }}>Threat Level</span>
                  <HCBadge color={h.threat_level === "critical" ? HC_RED : h.threat_level === "elevated" ? HC_ORANGE : HC_GREEN}>{h.threat_level}</HCBadge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px]" style={{ color: MUTED }}>PHI Records</span>
                  <span className="text-[9px] font-bold" style={{ color: HC_TEAL }}>{(h.patient_records_protected / 1000000).toFixed(1)}M</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}