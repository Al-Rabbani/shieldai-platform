import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Cpu, Shield, AlertTriangle, Wifi, WifiOff, Activity } from "lucide-react";
import { Card, Skeleton, EmptyState } from "@/components/gds/GDSOSShared";
import { OTBreadcrumb, OTBadge, OTStat, OTGauge, OT_PAGE_BG, OT_CARD, OT_AMBER, OT_ORANGE, OT_RED, OT_GREEN, OT_CRITICAL, OT_BLUE, BORDER, MUTED, OT_ASSET_COLORS, formatPopulation } from "@/components/gds/CriticalInfrastructureShared";
import LiveDataBadge from "@/components/gds/LiveDataBadge";

export default function GDSCriticalOTAssetsPage() {
  const { data: assets = [], isLoading } = useQuery({ queryKey: ["ci-ot-assets"], queryFn: () => base44.entities.OTAsset.list("-risk_score", 100).catch(() => []) });

  const [selectedAsset, setSelectedAsset] = useState(null);

  const stats = {
    total: assets.length,
    safetyCritical: assets.filter(a => a.safety_critical).length,
    quarantined: assets.filter(a => a.status === "quarantined").length,
    anomalous: assets.filter(a => a.anomaly_detected).length,
  };

  return (
    <div style={OT_PAGE_BG}>
      <OTBreadcrumb items={[{ label: "OT Asset Inventory" }]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">OT ASSET INVENTORY</h1>
          <p className="text-[10px] mt-1 font-bold uppercase tracking-widest" style={{ color: MUTED }}>SEP-005 · Operational Technology Assets</p>
        </div>
        <LiveDataBadge label="OT/ICS LIVE" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center" style={OT_CARD}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Total OT Assets</p>
          <p className="text-3xl font-black" style={{ color: OT_AMBER }}>{stats.total}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.safetyCritical > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${OT_CRITICAL}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Safety Critical</p>
          <p className="text-3xl font-black" style={{ color: OT_CRITICAL }}>{stats.safetyCritical}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.quarantined > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${OT_RED}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Quarantined</p>
          <p className="text-3xl font-black" style={{ color: OT_RED }}>{stats.quarantined}</p>
        </Card>
        <Card className={`p-4 text-center ${stats.anomalous > 0 ? 'animate-pulse' : ''}`} style={{ ...OT_CARD, border: `2px solid ${OT_ORANGE}40` }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: MUTED }}>Anomalous</p>
          <p className="text-3xl font-black" style={{ color: OT_ORANGE }}>{stats.anomalous}</p>
        </Card>
      </div>

      {isLoading ? <Skeleton lines={10} /> : assets.length === 0 ? (
        <EmptyState icon={Cpu} title="No OT Assets" description="No operational technology assets registered" />
      ) : (
        <Card className="p-5" style={OT_CARD}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: BORDER }}>
                  <th className="text-left py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Asset Name</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Type</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Manufacturer</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Purdue</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Protocols</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Safety</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Internet</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Days Patch</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Vulns</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Risk</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Anomaly</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold uppercase" style={{ color: MUTED }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id} className="border-b hover:bg-white/5 cursor-pointer" style={{ borderColor: BORDER }} onClick={() => setSelectedAsset(asset)}>
                    <td className="py-3 px-3 font-bold text-white">{asset.name}</td>
                    <td className="py-3 px-3"><OTBadge color={OT_ASSET_COLORS[asset.asset_type] || OT_AMBER}>{asset.asset_type}</OTBadge></td>
                    <td className="py-3 px-3 text-white">{asset.manufacturer}</td>
                    <td className="py-3 px-3"><OTBadge color={asset.purdue_level === "L0" ? OT_RED : asset.purdue_level === "L1" ? OT_ORANGE : asset.purdue_level === "L2" ? OT_AMBER : OT_BLUE}>{asset.purdue_level}</OTBadge></td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        {asset.protocols?.slice(0, 2).map((p, i) => <OTBadge key={i} color={OT_AMBER}>{p}</OTBadge>)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">{asset.safety_critical ? <Shield className="w-4 h-4 inline" style={{ color: OT_CRITICAL }} /> : "—"}</td>
                    <td className="py-3 px-3 text-center">{asset.internet_facing ? <Wifi className="w-4 h-4 inline" style={{ color: OT_RED }} /> : <WifiOff className="w-4 h-4 inline" style={{ color: MUTED }} />}</td>
                    <td className="py-3 px-3 text-center"><span className={asset.days_since_patch > 180 ? "text-red-500 font-bold" : asset.days_since_patch > 90 ? "text-amber-500 font-bold" : "text-green-500 font-bold"}>{asset.days_since_patch || 0}</span></td>
                    <td className="py-3 px-3 text-center"><span className={asset.vulnerability_count > 5 ? "text-red-500 font-bold" : asset.vulnerability_count > 0 ? "text-amber-500 font-bold" : "text-green-500 font-bold"}>{asset.vulnerability_count || 0}</span></td>
                    <td className="py-3 px-3 text-center"><OTGauge score={asset.risk_score || 0} size={40} /></td>
                    <td className="py-3 px-3 text-center">{asset.anomaly_detected ? <Activity className="w-4 h-4 inline animate-pulse" style={{ color: OT_RED }} /> : "—"}</td>
                    <td className="py-3 px-3"><OTBadge color={asset.status === "quarantined" ? OT_RED : asset.status === "offline" ? MUTED : OT_GREEN}>{asset.status}</OTBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Asset Detail Overlay */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAsset(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" style={OT_CARD} onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-white mb-4">{selectedAsset.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[9px] uppercase" style={{ color: MUTED }}>Type</p><p className="text-white font-bold">{selectedAsset.asset_type}</p></div>
              <div><p className="text-[9px] uppercase" style={{ color: MUTED }}>Manufacturer</p><p className="text-white font-bold">{selectedAsset.manufacturer}</p></div>
              <div><p className="text-[9px] uppercase" style={{ color: MUTED }}>Model</p><p className="text-white font-bold">{selectedAsset.model}</p></div>
              <div><p className="text-[9px] uppercase" style={{ color: MUTED }}>Serial</p><p className="text-white font-mono">{selectedAsset.serial_number}</p></div>
              <div><p className="text-[9px] uppercase" style={{ color: MUTED }}>MAC</p><p className="text-white font-mono">{selectedAsset.mac_address}</p></div>
              <div><p className="text-[9px] uppercase" style={{ color: MUTED }}>IP</p><p className="text-white font-mono">{selectedAsset.ip_address}</p></div>
              <div><p className="text-[9px] uppercase" style={{ color: MUTED }}>Firmware</p><p className="text-white font-mono">{selectedAsset.firmware_version}</p></div>
              <div><p className="text-[9px] uppercase" style={{ color: MUTED }}>Purdue Level</p><p className="text-white font-bold">{selectedAsset.purdue_level}</p></div>
            </div>
            <button onClick={() => setSelectedAsset(null)} className="mt-6 px-4 py-2 rounded-xl text-sm font-bold w-full" style={{ background: OT_AMBER + "20", border: `1px solid ${OT_AMBER}40`, color: OT_AMBER }}>Close</button>
          </Card>
        </div>
      )}
    </div>
  );
}