import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Cpu, AlertTriangle, Shield, Wifi, Globe, Activity, Clock, AlertCircle } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SevBadge } from "@/components/gds/GDSOSShared";
import { HCBreadcrumb, HCBanner, HCBadge, RiskGauge, HCStat, HC_PAGE_BG, HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, BORDER, MUTED, TEXT, DEVICE_TYPE_COLORS } from "@/components/gds/HealthcareSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSHealthcareDevicesPage() {
  const { data: devices = [], isLoading } = useQuery({ queryKey: ["hc-devices"], queryFn: () => base44.entities.MedicalDevice.list("-risk_score", 200).catch(() => []) });

  const stats = {
    total: devices.length,
    eol: devices.filter(d => d.is_eol).length,
    patientCriticalAtRisk: devices.filter(d => d.is_patient_critical && d.risk_score > 70).length,
    quarantined: devices.filter(d => d.status === "quarantined").length,
  };

  return (
    <div style={HC_PAGE_BG}>
      <HCBreadcrumb items={[{ label: "Medical Device Security" }]} />
      <HCBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">MEDICAL DEVICE SECURITY CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-004 · Device Monitoring & Firmware Management</p>
        </div>
        <LiveDataBadge />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={HC_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total Devices</p>
          <p className="text-3xl font-black" style={{ color: HC_TEAL }}>{stats.total}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.eol > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>EOL Devices</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.eol}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.patientCriticalAtRisk > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Patient-Critical At Risk</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.patientCriticalAtRisk}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_ORANGE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Quarantined</p>
          <p className="text-3xl font-black" style={{ color: HC_ORANGE }}>{stats.quarantined}</p>
        </Card>
      </div>

      {/* DEVICES TABLE */}
      <Card className="p-5" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4" style={{ color: HC_TEAL }} />
            Medical Device Inventory
          </h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{devices.length} devices</span>
        </div>

        {isLoading ? <Skeleton lines={10} /> : devices.length === 0 ? (
          <EmptyState icon={Cpu} title="No Devices" description="No medical devices registered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                  <th className="pb-3">Device Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Manufacturer</th>
                  <th className="pb-3">Hospital</th>
                  <th className="pb-3">OS</th>
                  <th className="pb-3">Patient Critical</th>
                  <th className="pb-3">EOL</th>
                  <th className="pb-3">Vulns</th>
                  <th className="pb-3">Risk Score</th>
                  <th className="pb-3">Anomaly</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {devices.slice(0, 50).map(d => (
                  <tr key={d.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-bold text-white">{d.device_name}</td>
                    <td className="py-3"><HCBadge color={DEVICE_TYPE_COLORS[d.device_type] || HC_ORANGE}>{d.device_type}</HCBadge></td>
                    <td className="py-3 text-white">{d.manufacturer}</td>
                    <td className="py-3 text-white">{d.hospital_id || "—"}</td>
                    <td className="py-3 font-mono" style={{ color: d.os_version?.toLowerCase().includes("xp") || d.os_version?.toLowerCase().includes("7") ? HC_RED : TEXT }}>{d.operating_system} {d.os_version}</td>
                    <td className="py-3">{d.is_patient_critical ? <Heart className="w-4 h-4" style={{ color: HC_RED }} /> : "—"}</td>
                    <td className="py-3">{d.is_eol ? <HCBadge color={HC_RED}>EOL</HCBadge> : "—"}</td>
                    <td className="py-3"><span style={{ color: d.vulnerability_count > 0 ? HC_RED : HC_GREEN }}>{d.vulnerability_count || 0}</span></td>
                    <td className="py-3"><RiskGauge score={d.risk_score || 0} size={50} /></td>
                    <td className="py-3">{d.anomaly_detected ? <AlertTriangle className="w-4 h-4" style={{ color: HC_RED }} title={d.anomaly_description} /> : "—"}</td>
                    <td className="py-3"><HCBadge color={d.status === "quarantined" || d.status === "compromised" ? HC_RED : d.status === "operational" ? HC_GREEN : HC_ORANGE}>{d.status}</HCBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Heart({ className, style }) {
  return <span className={className} style={style}>⚕️</span>;
}