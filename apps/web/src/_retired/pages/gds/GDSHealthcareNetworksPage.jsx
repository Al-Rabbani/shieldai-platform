import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Wifi, Shield, Lock, AlertTriangle, Activity } from "lucide-react";
import { Card, Breadcrumb, Skeleton, EmptyState, timeAgo, AnimatedArc } from "@/components/gds/GDSOSShared";
import { HCBreadcrumb, HCBanner, HCBadge, HCStat, HC_PAGE_BG, HC_CARD, HC_TEAL, HC_RED, HC_ORANGE, HC_GREEN, BORDER, MUTED, TEXT } from "@/components/gds/HealthcareSecurityShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSHealthcareNetworksPage() {
  const { data: networks = [], isLoading: networksLoading } = useQuery({ queryKey: ["hc-networks"], queryFn: () => base44.entities.ClinicalNetwork.list().catch(() => []) });
  const { data: departments = [] } = useQuery({ queryKey: ["hc-departments"], queryFn: () => base44.entities.ClinicalDepartment.list().catch(() => []) });

  const stats = {
    secure: networks.filter(n => n.status === "secure").length,
    alert: networks.filter(n => n.status === "alert" || n.status === "compromised").length,
    isolated: networks.filter(n => n.is_isolated).length,
    anomalies: networks.filter(n => n.anomalies_detected > 0).length,
  };

  return (
    <div style={HC_PAGE_BG}>
      <HCBreadcrumb items={[{ label: "Clinical Network Security" }]} />
      <HCBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">CLINICAL NETWORK SECURITY</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-004 · Network Segmentation & Monitoring</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_GREEN}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Secure Networks</p>
          <p className="text-3xl font-black" style={{ color: HC_GREEN }}>{stats.secure}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.alert > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Alert/Compromised</p>
          <p className="text-3xl font-black" style={{ color: HC_RED }}>{stats.alert}</p>
        </Card>
        <Card className="p-4 text-center" style={{ ...HC_CARD, border: `2px solid ${HC_TEAL}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Isolated Networks</p>
          <p className="text-3xl font-black" style={{ color: HC_TEAL }}>{stats.isolated}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.anomalies > 0 ? 'animate-pulse' : ''}`} style={{ ...HC_CARD, border: `2px solid ${HC_ORANGE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Networks with Anomalies</p>
          <p className="text-3xl font-black" style={{ color: HC_ORANGE }}>{stats.anomalies}</p>
        </Card>
      </div>

      <Card className="p-5 mb-6" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Wifi className="w-4 h-4" style={{ color: HC_TEAL }} />Clinical Networks</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{networks.length} networks</span>
        </div>

        {networksLoading ? <Skeleton lines={10} /> : networks.length === 0 ? (
          <EmptyState icon={Wifi} title="No Networks" description="No clinical networks registered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                  <th className="pb-3">Network Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">VLAN</th>
                  <th className="pb-3">Devices</th>
                  <th className="pb-3">Isolated</th>
                  <th className="pb-3">Firewall/IDS</th>
                  <th className="pb-3">Risk Score</th>
                  <th className="pb-3">Anomalies</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {networks.slice(0, 50).map(n => (
                  <tr key={n.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                    <td className="py-3 font-bold text-white">{n.network_name}</td>
                    <td className="py-3"><HCBadge color={HC_TEAL}>{n.network_type}</HCBadge></td>
                    <td className="py-3 font-mono" style={{ color: MUTED }}>{n.vlan_id || "—"}</td>
                    <td className="py-3 text-white">{n.device_count || 0}</td>
                    <td className="py-3">{n.is_isolated ? <Lock className="w-4 h-4" style={{ color: HC_GREEN }} /> : <AlertTriangle className="w-4 h-4" style={{ color: HC_ORANGE }} />}</td>
                    <td className="py-3">{n.has_firewall && n.has_ids ? <Shield className="w-4 h-4" style={{ color: HC_GREEN }} /> : "—"}</td>
                    <td className="py-3"><AnimatedArc score={n.risk_score || 0} size={50} /></td>
                    <td className="py-3">{n.anomalies_detected > 0 ? <span className="text-[10px] font-bold" style={{ color: HC_RED }}>{n.anomalies_detected}</span> : "—"}</td>
                    <td className="py-3"><HCBadge color={n.status === "secure" ? HC_GREEN : n.status === "alert" ? HC_ORANGE : HC_RED}>{n.status}</HCBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5" style={HC_CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4" style={{ color: HC_TEAL }} />Clinical Departments</h3>
          <span className="text-[10px]" style={{ color: MUTED }}>{departments.length} departments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase" style={{ color: MUTED }}>
                <th className="pb-3">Department</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Hospital</th>
                <th className="pb-3">Devices</th>
                <th className="pb-3">PHI Volume</th>
                <th className="pb-3">Isolated VLAN</th>
                <th className="pb-3">Risk Score</th>
                <th className="pb-3">Active Incidents</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {departments.slice(0, 50).map(d => (
                <tr key={d.id} className="border-t hover:bg-white/5 transition-colors" style={{ borderColor: BORDER }}>
                  <td className="py-3 font-bold text-white">{d.name}</td>
                  <td className="py-3"><HCBadge color={HC_TEAL}>{d.department_type}</HCBadge></td>
                  <td className="py-3 text-white">{d.hospital_id || "—"}</td>
                  <td className="py-3 text-white">{d.device_count || 0}</td>
                  <td className="py-3 text-white">{d.phi_volume_gb || 0} GB</td>
                  <td className="py-3">{d.is_isolated_vlan ? <Lock className="w-4 h-4" style={{ color: HC_GREEN }} /> : "—"}</td>
                  <td className="py-3"><AnimatedArc score={d.risk_score || 0} size={50} /></td>
                  <td className="py-3">{d.active_incidents > 0 ? <span className="text-[10px] font-bold" style={{ color: HC_RED }}>{d.active_incidents}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}