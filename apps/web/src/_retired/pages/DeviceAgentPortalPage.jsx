import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Monitor, Server, Apple, Loader2, Shield, AlertTriangle, Package, RefreshCw, Copy, Plus, ChevronDown, ChevronUp, Wifi, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Shimmer({ className }) {
  return <div className={cn("rounded animate-pulse", className)} style={{ background: "linear-gradient(90deg,#1F2937,#374151,#1F2937)", backgroundSize: "400%", animation: "shimmer 1.5s infinite" }} />;
}

const OS_CONFIG = {
  macos: { icon: Apple, color: "#9CA3AF", label: "macOS", bg: "rgba(156,163,175,0.1)" },
  windows: { icon: Monitor, color: "#3B82F6", label: "Windows", bg: "rgba(59,130,246,0.1)" },
  linux: { icon: Server, color: "#10B981", label: "Linux", bg: "rgba(16,185,129,0.1)" },
};

const INSTALL_CMDS = {
  macos: `curl -sSL https://agents.shieldai.io/install.sh | bash -s -- --token=<REGISTRATION_TOKEN>`,
  windows: `Invoke-WebRequest -Uri https://agents.shieldai.io/install.ps1 | iex; Install-ShieldAgent -Token <REGISTRATION_TOKEN>`,
  linux: `wget -qO- https://agents.shieldai.io/install.sh | bash -s -- --token=<REGISTRATION_TOKEN>`,
};

function RiskDonut({ score }) {
  const color = score >= 70 ? "#EF4444" : score >= 40 ? "#F97316" : "#10B981";
  const r = 18, circ = 2 * Math.PI * r;
  const dash = (Math.min(100, score) / 100) * circ;
  return (
    <div className="relative w-12 h-12">
      <svg width={48} height={48} viewBox="0 0 48 48">
        <circle cx={24} cy={24} r={r} fill="none" stroke="#1F2937" strokeWidth={5} />
        <circle cx={24} cy={24} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
        <text x={24} y={28} textAnchor="middle" fill={color} fontSize={11} fontWeight="800">{score}</text>
      </svg>
    </div>
  );
}

function DeviceCard({ device }) {
  const [expanded, setExpanded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const qc = useQueryClient();
  const osConf = OS_CONFIG[device.os] || OS_CONFIG.linux;
  const OsIcon = osConf.icon;
  const isOnline = device.status === "active";
  const isRisk = device.risk_score >= 50 || device.status === "blocked";

  const handleScan = async () => {
    setScanning(true);
    try {
      await base44.functions.invoke("shieldDeviceProtection", { device_id: device.id, action: "scan" });
      qc.invalidateQueries(["device-agents"]);
      toast.success(`Scan triggered for ${device.device_name}`);
    } catch { toast.error("Scan failed"); }
    finally { setScanning(false); }
  };

  return (
    <div className={cn("rounded-xl border p-5 transition-all duration-300 hover:scale-[1.01]", isRisk && "device-risk")}
      style={{
        background: isRisk ? "rgba(239,68,68,0.04)" : "#111827",
        borderColor: isRisk ? "rgba(239,68,68,0.35)" : "#1F2937",
      }}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: osConf.bg, border: `1px solid ${osConf.color}33` }}>
          <OsIcon className="w-6 h-6" style={{ color: osConf.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-bold text-white truncate">{device.device_name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold"
              style={{ color: osConf.color, background: osConf.bg, borderColor: osConf.color + "44" }}>{osConf.label}</span>
            {device.blocked_packages > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                {device.blocked_packages} blocked
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">{device.username} · {device.team}</div>
        </div>
        <RiskDonut score={device.risk_score || 0} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-slate-500" />}
          <span className="text-xs font-semibold" style={{ color: isOnline ? "#10B981" : device.status === "blocked" ? "#EF4444" : "#6B7280" }}>
            {isOnline ? "● Online" : device.status === "blocked" ? "● Blocked" : "○ Offline"}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          <Package className="w-3 h-3 inline mr-1" />{device.packages_monitored || 0} packages
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={handleScan} disabled={scanning}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: "rgba(99,102,241,0.15)", color: "#6366F1", border: "1px solid rgba(99,102,241,0.3)" }}>
          {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Scan Now
        </button>
        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-[#1F2937] transition-all"
          style={{ border: "1px solid #374151" }}>
          Details {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 p-3 rounded-lg space-y-1.5" style={{ background: "#1F2937" }}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Device Details</div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Agent Version</span><span className="text-white">{device.agent_version || "v1.0.0"}</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Last Heartbeat</span><span className="text-white">{device.last_heartbeat ? new Date(device.last_heartbeat).toLocaleString() : "—"}</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Blocked</span><span className="text-red-400 font-bold">{device.blocked_packages || 0} packages</span></div>
          <div className="flex justify-between text-xs"><span className="text-slate-500">Risky</span><span className="text-amber-400 font-bold">{device.risky_packages || 0} packages</span></div>
        </div>
      )}
    </div>
  );
}

export default function DeviceAgentPortalPage() {
  const [showRegister, setShowRegister] = useState(false);
  const [regOs, setRegOs] = useState("macos");
  const qc = useQueryClient();

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["device-agents"],
    queryFn: () => base44.entities.DeviceAgent.list("-last_heartbeat", 100),
  });

  const online = devices.filter(d => d.status === "active");
  const atRisk = devices.filter(d => d.risk_score >= 50 || d.status === "blocked");
  const totalBlocked = devices.reduce((s, d) => s + (d.blocked_packages || 0), 0);

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success("Command copied!"); };

  const { mutate: registerDevice } = useMutation({
    mutationFn: () => base44.entities.DeviceAgent.create({
      device_name: "New Device",
      os: regOs,
      status: "inactive",
      risk_score: 0,
      packages_monitored: 0,
      agent_version: "v1.2.0",
    }),
    onSuccess: () => { qc.invalidateQueries(["device-agents"]); setShowRegister(false); toast.success("Device registered"); },
  });

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes pulse-risk { 0%,100%{border-color:rgba(239,68,68,0.35)} 50%{border-color:rgba(239,68,68,0.7)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .device-risk { animation: pulse-risk 2s infinite; }
      `}</style>

      {/* Header */}
      <div className="fade-up">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <Shield className="w-3.5 h-3.5" /><span>Protect</span><span>/</span>
          <span className="text-[#C9A84C]">Device Agents</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-3">
              <Monitor className="w-6 h-6 text-[#C9A84C]" /> Device Agent Portal
            </h1>
            <p className="text-slate-400 text-sm mt-1">Monitor endpoint security agents and supply chain risks</p>
          </div>
          <button onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg,#C9A84C,#b8973b)", color: "#0A0E1A" }}>
            <Plus className="w-4 h-4" /> Register Device
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-up" style={{ animationDelay: "100ms" }}>
        {[
          { label: "Total Devices", value: devices.length, color: "#6366F1", icon: Monitor },
          { label: "Online Now", value: online.length, color: "#10B981", icon: Wifi },
          { label: "At Risk", value: atRisk.length, color: "#EF4444", icon: AlertTriangle },
          { label: "Blocked Packages", value: totalBlocked, color: "#F97316", icon: Package },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-5 border transition-all hover:scale-[1.02]"
            style={{ background: "#111827", borderColor: s.color + "33" }}>
            {isLoading ? <><Shimmer className="h-4 w-24 mb-3" /><Shimmer className="h-8 w-16" /></> : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</span>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div className="text-3xl font-black" style={{ color: s.value > 0 && s.color === "#EF4444" ? s.color : "white" }}>{s.value}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Device Grid */}
      <div className="fade-up" style={{ animationDelay: "150ms" }}>
        <h2 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Device Fleet</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Shimmer key={i} className="h-48" />)}
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-xl border p-12 text-center" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <Monitor className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">No devices registered</p>
            <p className="text-xs text-slate-600 mt-1">Register your first device to start monitoring endpoint security</p>
            <button onClick={() => setShowRegister(true)}
              className="mt-4 px-5 py-2 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#C9A84C,#b8973b)", color: "#0A0E1A" }}>
              Register Device
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices.map((d, i) => (
              <div key={d.id} style={{ animationDelay: `${i * 60}ms` }} className="fade-up">
                <DeviceCard device={d} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-lg rounded-2xl border p-6" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Register New Device</h3>
              <button onClick={() => setShowRegister(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-5">
              {["macos", "windows", "linux"].map(os => {
                const c = OS_CONFIG[os];
                return (
                  <button key={os} onClick={() => setRegOs(os)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: regOs === os ? c.bg : "#1F2937",
                      color: regOs === os ? c.color : "#6B7280",
                      border: `1px solid ${regOs === os ? c.color + "44" : "#374151"}`,
                    }}>{c.label}</button>
                );
              })}
            </div>
            <div className="rounded-xl p-4 font-mono text-xs text-emerald-300 mb-5 relative" style={{ background: "#0d1220", border: "1px solid #1F2937" }}>
              <pre className="whitespace-pre-wrap break-all">{INSTALL_CMDS[regOs]}</pre>
              <button onClick={() => copyToClipboard(INSTALL_CMDS[regOs])}
                className="absolute top-3 right-3 p-1.5 rounded-lg transition-all hover:bg-[#374151]"
                style={{ color: "#9CA3AF" }}>
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => registerDevice()}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg,#C9A84C,#b8973b)", color: "#0A0E1A" }}>
              Register Device
            </button>
          </div>
        </div>
      )}
    </div>
  );
}