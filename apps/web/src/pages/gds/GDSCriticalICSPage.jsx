import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Activity, Wifi, WifiOff, Cpu } from "lucide-react";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { OTBreadcrumb, OTBanner, OTBadge, OTGauge, OT_PAGE_BG, OT_CARD, OT_AMBER, OT_ORANGE, OT_RED, OT_CRITICAL, OT_BLUE, OT_GREEN, BORDER, MUTED, PROTOCOL_COLORS } from "@/components/gds/CriticalInfrastructureShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCriticalICSPage() {
  const [tab, setTab] = useState("controllers");
  const { data: controllers = [] } = useQuery({ queryKey: ["ci-ics-controllers"], queryFn: () => base44.entities.ICSController.list("-risk_score", 100).catch(() => []) });
  const { data: plcs = [] } = useQuery({ queryKey: ["ci-plcs"], queryFn: () => base44.entities.PLC.list("-risk_score", 100).catch(() => []) });

  return (
    <div style={OT_PAGE_BG}>
      <OTBreadcrumb items={[{ label: "ICS & PLC Security Center" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">ICS & PLC SECURITY CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-005 · OT/ICS SECURITY</p>
        </div>
        <LiveDataBadge />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("controllers")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === "controllers" ? "ring-2 ring-amber-500" : ""}`} style={{ background: tab === "controllers" ? OT_AMBER + "20" : OT_CARD.background, color: tab === "controllers" ? OT_AMBER : MUTED, border: `1px solid ${BORDER}` }}>Controllers</button>
        <button onClick={() => setTab("plcs")} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === "plcs" ? "ring-2 ring-amber-500" : ""}`} style={{ background: tab === "plcs" ? OT_AMBER + "20" : OT_CARD.background, color: tab === "plcs" ? OT_AMBER : MUTED, border: `1px solid ${BORDER}` }}>PLCs</button>
      </div>

      {tab === "controllers" ? (
        <Card className="p-5" style={OT_CARD}>
          <h3 className="text-sm font-bold text-white mb-4">ICS Controllers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Firmware</th>
                  <th className="py-3 px-3">OS</th>
                  <th className="py-3 px-3">Language</th>
                  <th className="py-3 px-3">Protocols</th>
                  <th className="py-3 px-3">Purdue</th>
                  <th className="py-3 px-3">Process</th>
                  <th className="py-3 px-3">Safety</th>
                  <th className="py-3 px-3">Remote</th>
                  <th className="py-3 px-3">Last Change</th>
                  <th className="py-3 px-3">Unauthorized</th>
                  <th className="py-3 px-3">Anomaly</th>
                  <th className="py-3 px-3">Risk</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {controllers.map(ctrl => (
                  <tr key={ctrl.id} className="border-t" style={{ borderColor: BORDER }}>
                    <td className="py-3 px-3"><OTBadge color={ctrl.controller_type === "safety_plc" ? OT_CRITICAL : OT_AMBER}>{ctrl.controller_type}</OTBadge></td>
                    <td className="py-3 px-3 text-white font-bold">{ctrl.vendor}</td>
                    <td className="py-3 px-3 text-white">{ctrl.model}</td>
                    <td className="py-3 px-3 font-mono text-[10px]">{ctrl.firmware}</td>
                    <td className="py-3 px-3 font-mono text-[10px]">{ctrl.os}</td>
                    <td className="py-3 px-3"><OTBadge color={OT_BLUE}>{ctrl.programming_language}</OTBadge></td>
                    <td className="py-3 px-3"><div className="flex gap-1">{ctrl.protocols?.slice(0, 2).map((p, i) => <OTBadge key={i} color={PROTOCOL_COLORS[p] || OT_AMBER}>{p}</OTBadge>)}</div></td>
                    <td className="py-3 px-3"><OTBadge color={ctrl.purdue_level === "L0" ? OT_RED : ctrl.purdue_level === "L1" ? OT_ORANGE : OT_BLUE}>{ctrl.purdue_level}</OTBadge></td>
                    <td className="py-3 px-3 text-[10px] italic text-white">{ctrl.controls_process}</td>
                    <td className="py-3 px-3 text-center">{ctrl.safety_critical ? <Shield className="w-4 h-4 inline" style={{ color: OT_CRITICAL }} /> : "—"}</td>
                    <td className="py-3 px-3 text-center">{ctrl.remote_access ? <Wifi className="w-4 h-4 inline" style={{ color: OT_RED }} /> : <WifiOff className="w-4 h-4 inline" style={{ color: MUTED }} />}</td>
                    <td className="py-3 px-3 text-[10px]">{ctrl.last_program_change ? new Date(ctrl.last_program_change).toLocaleDateString() : "—"}</td>
                    <td className="py-3 px-3 text-center">{ctrl.unauthorized_command_detected ? <AlertTriangle className="w-4 h-4 inline animate-pulse" style={{ color: OT_CRITICAL }} /> : "—"}</td>
                    <td className="py-3 px-3 text-center">{ctrl.anomalous_behavior ? <Activity className="w-4 h-4 inline" style={{ color: OT_RED }} /> : "—"}</td>
                    <td className="py-3 px-3 text-center"><OTGauge score={ctrl.risk_score || 0} size={40} /></td>
                    <td className="py-3 px-3"><OTBadge color={ctrl.status === "compromised" ? OT_CRITICAL : ctrl.status === "offline" ? MUTED : OT_GREEN}>{ctrl.status}</OTBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-5" style={OT_CARD}>
          <h3 className="text-sm font-bold text-white mb-4">PLC Inventory</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Protocol</th>
                  <th className="py-3 px-3">IP</th>
                  <th className="py-3 px-3">Purdue</th>
                  <th className="py-3 px-3">Safety</th>
                  <th className="py-3 px-3">Process</th>
                  <th className="py-3 px-3">Last Change</th>
                  <th className="py-3 px-3">Unauth Write</th>
                  <th className="py-3 px-3">Comm Anomaly</th>
                  <th className="py-3 px-3">Auth Change</th>
                  <th className="py-3 px-3">Risk</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {plcs.map(plc => (
                  <tr key={plc.id} className="border-t" style={{ borderColor: BORDER }}>
                    <td className="py-3 px-3 text-white font-bold">{plc.name}</td>
                    <td className="py-3 px-3 text-white">{plc.vendor}</td>
                    <td className="py-3 px-3 text-white">{plc.model}</td>
                    <td className="py-3 px-3"><OTBadge color={PROTOCOL_COLORS[plc.protocol] || OT_RED}>{plc.protocol}</OTBadge></td>
                    <td className="py-3 px-3 font-mono text-[10px]">{plc.ip_address}</td>
                    <td className="py-3 px-3"><OTBadge color={plc.purdue_level === "L0" ? OT_RED : plc.purdue_level === "L1" ? OT_ORANGE : OT_BLUE}>{plc.purdue_level}</OTBadge></td>
                    <td className="py-3 px-3 text-center">{plc.safety_plc ? <Shield className="w-4 h-4 inline" style={{ color: OT_CRITICAL }} /> : "—"}</td>
                    <td className="py-3 px-3 text-[10px] italic text-white">{plc.controls_process}</td>
                    <td className="py-3 px-3 text-[10px]">{plc.last_program_change ? new Date(plc.last_program_change).toLocaleDateString() : "—"}</td>
                    <td className="py-3 px-3 text-center">{plc.unauthorized_write ? <AlertTriangle className="w-4 h-4 inline animate-pulse" style={{ color: OT_CRITICAL }} /> : "—"}</td>
                    <td className="py-3 px-3 text-center">{plc.communication_anomaly ? <Activity className="w-4 h-4 inline animate-pulse" style={{ color: OT_ORANGE }} /> : "—"}</td>
                    <td className="py-3 px-3 text-center">{plc.code_change_authorized ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : <AlertTriangle className="w-4 h-4 inline" style={{ color: OT_RED }} />}</td>
                    <td className="py-3 px-3 text-center"><OTGauge score={plc.risk_score || 0} size={40} /></td>
                    <td className="py-3 px-3"><OTBadge color={plc.status === "compromised" ? OT_CRITICAL : plc.status === "quarantined" ? OT_RED : OT_GREEN}>{plc.status}</OTBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}