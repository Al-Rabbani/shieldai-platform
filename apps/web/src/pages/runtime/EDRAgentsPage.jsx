import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Cpu, Plus, AlertTriangle, Shield, Activity } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff"; const GOLD = "#c9a84c";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const OS_COLOR = { macos: "#94a3b8", linux: "#22c55e", windows: "#3b82f6" };
const OS_ICON  = { macos: "🍎", linux: "🐧", windows: "🪟" };

const STATUS_DOT = { active: SUCCESS, inactive: "#64748b", blocked: DANGER };

function DeviceCard({ device, selected, onClick }) {
  const statusColor = STATUS_DOT[device.status] || "#64748b";
  const osColor = OS_COLOR[device.os] || "#64748b";
  const riskColor = (device.risk_score||0) >= 70 ? DANGER : (device.risk_score||0) >= 40 ? "#eab308" : SUCCESS;
  return (
    <div className="rounded-xl p-4 cursor-pointer transition-all"
      style={{ background: CARD, border: `1px solid ${selected ? GOLD : BORDER}` }}
      onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{OS_ICON[device.os] || "💻"}</span>
          <div>
            <p className="text-xs font-bold text-white">{device.device_name || "Device"}</p>
            <p className="text-[9px] text-slate-500">{device.username || "—"} · {device.team || "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
          <span className="text-[8px] capitalize" style={{ color: statusColor }}>{device.status || "—"}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[9px]">
        <div><span className="text-slate-500">Risk</span><p className="font-black font-mono" style={{ color: riskColor }}>{device.risk_score ?? "—"}</p></div>
        <div><span className="text-slate-500">Pkgs</span><p className="font-mono text-white">{device.packages_monitored ?? 0}</p></div>
        <div><span className="text-slate-500">Blocked</span><p className="font-mono" style={{ color: (device.blocked_packages||0)>0?DANGER:"#64748b" }}>{device.blocked_packages ?? 0}</p></div>
      </div>
      <div className="flex items-center justify-between mt-2 text-[8px] text-slate-600">
        <span className="font-bold uppercase" style={{ color: osColor }}>{device.os || "—"}</span>
        <span>v{device.agent_version || "—"}</span>
        <span>{device.last_heartbeat ? formatDistanceToNow(new Date(device.last_heartbeat), { addSuffix: true }) : "Never"}</span>
      </div>
    </div>
  );
}

export default function EDRAgentsPage() {
  const [osF, setOsF]       = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { data: devices = [], isLoading: loadD } = useQuery({
    queryKey: ["edr-devices"],
    queryFn: () => base44.entities.DeviceAgent.list("-last_heartbeat", 200).catch(() => []),
    initialData: [],
  });

  const { data: findings = [], isLoading: loadF } = useQuery({
    queryKey: ["endpoint-findings", selectedDevice],
    queryFn: () => selectedDevice
      ? base44.entities.Finding.filter({ device_id: selectedDevice }).catch(() => [])
      : base44.entities.Finding.list("-created_date", 100).catch(() => []),
    initialData: [],
  });

  const filteredDevices = devices.filter(d => {
    if (osF !== "all" && d.os !== osF) return false;
    if (statusF !== "all" && d.status !== statusF) return false;
    return true;
  });

  const online  = devices.filter(d => d.status === "active").length;
  const offline = devices.filter(d => d.status === "inactive").length;
  const risky   = devices.filter(d => (d.risk_score||0) >= 70).length;

  const findingRows = findings.slice(0, 100).map(f => ({
    _key: f.id,
    _cells: [
      <span className="text-[10px] text-white">{f.device_name || f.asset_name || "—"}</span>,
      <span className="text-[9px] capitalize text-slate-300">{(f.finding_type||f.type||"—").replace(/_/g," ")}</span>,
      <SevBadge sev={f.severity} />,
      <span className="text-[9px] font-mono text-slate-400 truncate max-w-24 block">{f.process_name || "—"}</span>,
      <code className="text-[8px] text-green-400 truncate max-w-20 block">{f.process_hash ? f.process_hash.slice(0,12)+"…" : "—"}</code>,
      <span className="text-[9px] font-mono text-slate-500 truncate max-w-24 block">{f.file_path || "—"}</span>,
      <span className="text-[9px] text-slate-400">{f.mitre_technique || "—"}</span>,
      <StatusBadge status={f.status} />,
    ],
  }));

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Runtime", path: "/protect" }, { label: "EDR Agents" }]}
      title="EDR Agents" subtitle="ENDPOINT DETECTION & RESPONSE · DEVICE RISK MONITORING"
      actions={
        <div className="flex items-center gap-2">
          {[
            ["os", osF, setOsF, ["all","macos","linux","windows"]],
            ["status", statusF, setStatusF, ["all","active","inactive","blocked"]],
          ].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: GOLD, color: "#0a0e17" }}>
            <Plus className="w-3.5 h-3.5" /> Enroll Device
          </button>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Devices" value={devices.length} color={CYAN} icon={Cpu} />
        <StatCard label="Online" value={online} color={SUCCESS} icon={Activity} />
        <StatCard label="Offline" value={offline} color="#64748b" icon={Cpu} />
        <StatCard label="High Risk" value={risky} color={DANGER} icon={AlertTriangle} />
      </div>

      {/* Device Grid */}
      {loadD ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0,1,2,3,4,5].map(i => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: CARD }} />)}
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="py-14 text-center rounded-2xl" style={{ border: `1px dashed ${BORDER}` }}>
          <Cpu className="w-10 h-10 mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-500">No devices enrolled</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredDevices.map(d => (
            <DeviceCard key={d.id} device={d}
              selected={selectedDevice === d.id}
              onClick={() => setSelectedDevice(selectedDevice === d.id ? null : d.id)} />
          ))}
        </div>
      )}

      {/* Findings Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">
            {selectedDevice ? "Device Findings" : "All Endpoint Findings"}
          </h3>
          {selectedDevice && (
            <button onClick={() => setSelectedDevice(null)} className="text-xs text-slate-500 hover:text-white">Clear selection ✕</button>
          )}
        </div>
        <GDSTable
          columns={["Device","Finding Type","Severity","Process","Hash","File Path","MITRE","Status"]}
          rows={findingRows} isLoading={loadF}
          emptyText="No endpoint findings" />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: "#111827", border: `1px solid ${BORDER}` }}>
            <h3 className="text-base font-bold text-white mb-4">Enroll New Device</h3>
            <div className="p-3 rounded-lg mb-4 font-mono text-xs text-green-400" style={{ background: "#080c14" }}>
              curl -sSL https://gds.sh/edr/install | bash -s -- --token GDS-{Math.random().toString(36).slice(2,10).toUpperCase()}
            </div>
            <p className="text-xs text-slate-500 mb-4">Run this command on the target device to install and register the GDS EDR agent.</p>
            <button onClick={() => setShowModal(false)}
              className="w-full px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: GOLD, color: "#0a0e17" }}>Close</button>
          </div>
        </div>
      )}
    </GDSPageShell>
  );
}