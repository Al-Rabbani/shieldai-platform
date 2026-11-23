import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Activity, Database, Wifi } from "lucide-react";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { OTBreadcrumb, OTBadge, OTGauge, OT_PAGE_BG, OT_CARD, OT_AMBER, OT_RED, OT_GREEN, OT_BLUE, OT_CRITICAL, BORDER, MUTED, PROTOCOL_COLORS } from "@/components/gds/CriticalInfrastructureShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCriticalSCADAPage() {
  const { data: scadaServers = [] } = useQuery({ queryKey: ["ci-scada"], queryFn: () => base44.entities.SCADAServer.list("-risk_score", 100).catch(() => []) });
  const { data: protocols = [] } = useQuery({ queryKey: ["ci-protocols"], queryFn: () => base44.entities.IndustrialProtocol.list("-risk_level", 100).catch(() => []) });

  const stats = {
    scadaServers: scadaServers.length,
    protocolAnomalies: protocols.filter(p => p.status === "anomalous").length,
    unauthorizedWrites: protocols.reduce((s, p) => s + (p.unauthorized_writes || 0), 0),
    unencrypted: protocols.filter(p => !p.encrypted).length,
  };

  return (
    <div style={OT_PAGE_BG}>
      <OTBreadcrumb items={[{ label: "SCADA Security Center" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">SCADA SECURITY CENTER</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-005 · OT/ICS SECURITY</p>
        </div>
        <LiveDataBadge />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>SCADA Servers</p>
          <p className="text-3xl font-black" style={{ color: OT_AMBER }}>{stats.scadaServers}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.protocolAnomalies > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.protocolAnomalies > 0 ? OT_RED + "40" : OT_AMBER + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Protocol Anomalies</p>
          <p className="text-3xl font-black" style={{ color: stats.protocolAnomalies > 0 ? OT_RED : OT_AMBER }}>{stats.protocolAnomalies}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.unauthorizedWrites > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${stats.unauthorizedWrites > 0 ? OT_RED + "60" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Unauthorized Writes</p>
          <p className="text-3xl font-black" style={{ color: stats.unauthorizedWrites > 0 ? OT_RED : OT_GREEN }}>{stats.unauthorizedWrites}</p>
        </Card>
        <Card className={`p-4 text-center`} style={{ ...OT_CARD, border: `2px solid ${stats.unencrypted > 0 ? OT_RED + "40" : OT_GREEN + "40"}` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Unencrypted Protocols</p>
          <p className="text-3xl font-black" style={{ color: stats.unencrypted > 0 ? OT_RED : OT_GREEN }}>{stats.unencrypted}</p>
        </Card>
      </div>

      <Card className="p-5 mb-6" style={OT_CARD}>
        <h3 className="text-sm font-bold text-white mb-4">SCADA Servers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Vendor</th>
                <th className="py-3 px-3">OS</th>
                <th className="py-3 px-3">Patch Level</th>
                <th className="py-3 px-3">Internet</th>
                <th className="py-3 px-3">Historian</th>
                <th className="py-3 px-3">Controllers</th>
                <th className="py-3 px-3">Data Points</th>
                <th className="py-3 px-3">Last Backup</th>
                <th className="py-3 px-3">Offsite</th>
                <th className="py-3 px-3">Vulns</th>
                <th className="py-3 px-3">Critical</th>
                <th className="py-3 px-3">Anomaly</th>
                <th className="py-3 px-3">Risk</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {scadaServers.map(server => (
                <tr key={server.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 px-3 text-white font-bold">{server.name}</td>
                  <td className="py-3 px-3 text-white">{server.vendor}</td>
                  <td className="py-3 px-3 font-mono text-[10px]">{server.os}</td>
                  <td className="py-3 px-3"><OTBadge color={server.patch_level === "current" ? OT_GREEN : server.patch_level === "1_month" ? OT_BLUE : server.patch_level === "3_months" ? OT_AMBER : server.patch_level === "6_months" ? OT_RED : OT_CRITICAL}>{server.patch_level}</OTBadge></td>
                  <td className="py-3 px-3 text-center">{server.internet_facing ? <Wifi className="w-4 h-4 inline" style={{ color: OT_CRITICAL }} /> : <Wifi className="w-4 h-4 inline" style={{ color: MUTED }} />}</td>
                  <td className="py-3 px-3 text-center">{server.historian ? <Database className="w-4 h-4 inline" style={{ color: OT_BLUE }} /> : "—"}</td>
                  <td className="py-3 px-3 text-center"><span className="text-white font-bold">{server.connected_controllers || 0}</span></td>
                  <td className="py-3 px-3 text-[10px]">{(server.data_points_monitored / 1000).toFixed(1)}K</td>
                  <td className="py-3 px-3 text-[10px]">{server.last_backup ? new Date(server.last_backup).toLocaleDateString() : "—"}</td>
                  <td className="py-3 px-3 text-center">{server.offsite_backup ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : <Shield className="w-4 h-4 inline" style={{ color: OT_RED }} />}</td>
                  <td className="py-3 px-3 text-center"><span className={server.vulnerability_count > 5 ? "text-red-500 font-bold" : "text-white"}>{server.vulnerability_count || 0}</span></td>
                  <td className="py-3 px-3 text-center"><span className={server.critical_vulns > 0 ? "text-red-500 font-bold animate-pulse" : "text-white"}>{server.critical_vulns || 0}</span></td>
                  <td className="py-3 px-3 text-center">{server.anomaly_detected ? <Activity className="w-4 h-4 inline animate-pulse" style={{ color: OT_RED }} /> : "—"}</td>
                  <td className="py-3 px-3 text-center"><OTGauge score={server.risk_score || 0} size={40} /></td>
                  <td className="py-3 px-3"><OTBadge color={server.status === "compromised" ? OT_CRITICAL : server.status === "degraded" ? OT_RED : OT_GREEN}>{server.status}</OTBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5" style={OT_CARD}>
        <h3 className="text-sm font-bold text-white mb-4">Industrial Protocols</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider" style={{ color: MUTED }}>
                <th className="py-3 px-3">Protocol</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Traffic (MB/d)</th>
                <th className="py-3 px-3">Devices</th>
                <th className="py-3 px-3">Anomalous</th>
                <th className="py-3 px-3">Replay</th>
                <th className="py-3 px-3">Unauth Writes</th>
                <th className="py-3 px-3">Encrypted</th>
                <th className="py-3 px-3">Authenticated</th>
                <th className="py-3 px-3">Risk</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map(proto => (
                <tr key={proto.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-3 px-3 text-white font-bold">{proto.protocol_name}</td>
                  <td className="py-3 px-3"><OTBadge color={PROTOCOL_COLORS[proto.protocol_type] || OT_AMBER}>{proto.protocol_type}</OTBadge></td>
                  <td className="py-3 px-3 text-[10px]">{(proto.traffic_volume_mb_day / 1000).toFixed(1)}</td>
                  <td className="py-3 px-3 text-white">{proto.devices_using || 0}</td>
                  <td className="py-3 px-3 text-center"><span className={proto.anomalous_commands > 0 ? "text-red-500 font-bold" : "text-white"}>{proto.anomalous_commands || 0}</span></td>
                  <td className="py-3 px-3 text-center"><span className={proto.replay_attacks > 0 ? "text-red-500 font-bold animate-pulse" : "text-white"}>{proto.replay_attacks || 0}</span></td>
                  <td className="py-3 px-3 text-center"><span className={proto.unauthorized_writes > 0 ? "text-red-500 font-bold" : "text-white"}>{proto.unauthorized_writes || 0}</span></td>
                  <td className="py-3 px-3 text-center">{proto.encrypted ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : <Shield className="w-4 h-4 inline" style={{ color: OT_RED }} />}</td>
                  <td className="py-3 px-3 text-center">{proto.authenticated ? <Shield className="w-4 h-4 inline" style={{ color: OT_GREEN }} /> : <Shield className="w-4 h-4 inline" style={{ color: OT_RED }} />}</td>
                  <td className="py-3 px-3"><OTBadge color={proto.risk_level === "critical" ? OT_CRITICAL : proto.risk_level === "high" ? OT_RED : OT_AMBER}>{proto.risk_level}</OTBadge></td>
                  <td className="py-3 px-3"><OTBadge color={proto.status === "under_attack" ? OT_CRITICAL : proto.status === "anomalous" ? OT_RED : OT_GREEN}>{proto.status}</OTBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}