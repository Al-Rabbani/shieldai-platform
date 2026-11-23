import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import VMScanModal from "@/components/cloud/VMScanModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, Play, RefreshCw, Monitor, AlertTriangle, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow, differenceInDays } from "date-fns";

const ACCENT = "#0ea5e9";
const PROVIDER_STYLE = {
  aws:   { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", label: "AWS" },
  azure: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", label: "AZURE" },
  gcp:   { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", label: "GCP" },
};
const OS_STYLE = {
  ubuntu:         { color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  "amazon linux": { color: "#eab308", bg: "rgba(234,179,8,0.1)" },
  debian:         { color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  rhel:           { color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  windows:        { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
};
const STATUS_STYLE = {
  running:  { color: "#10b981" },
  stopped:  { color: "#64748b" },
  terminated: { color: "#ef4444" },
  scanning: { color: "#3b82f6" },
};

function RiskGauge({ score, size = 44 }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score || 0));
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f97316" : pct >= 20 ? "#eab308" : "#10b981";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.1} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.1}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ*0.25} strokeLinecap="round" />
      <text x={size/2} y={size/2+4} textAnchor="middle" fill={color} fontSize={size*0.22} fontWeight="700" fontFamily="JetBrains Mono">{pct}</text>
    </svg>
  );
}

function PatchBadge({ lastPatched }) {
  if (!lastPatched) return <span className="text-[10px] text-slate-600 font-mono">Unknown</span>;
  const days = differenceInDays(new Date(), new Date(lastPatched));
  if (days > 90) return (
    <span className="text-[10px] font-semibold" style={{ color: "#ef4444" }}>
      ⚠️ {days}d ago
    </span>
  );
  if (days > 30) return <span className="text-[10px] font-semibold" style={{ color: "#eab308" }}>{days}d ago</span>;
  return <span className="text-[10px] font-semibold" style={{ color: "#10b981" }}>{days}d ago</span>;
}

function VMCard({ vm }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const provider = PROVIDER_STYLE[vm.provider] || PROVIDER_STYLE.aws;
  const osKey = Object.keys(OS_STYLE).find(k => vm.os_name?.toLowerCase().includes(k)) || "ubuntu";
  const osStyle = OS_STYLE[osKey] || OS_STYLE.ubuntu;
  const statusColor = STATUS_STYLE[vm.status]?.color || "#64748b";
  const tags = vm.tags ? vm.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

  const rescanMut = useMutation({
    mutationFn: () => base44.entities.VMScan.update(vm.id, { status: "scanning", scanned_at: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vm-scans"] }); toast.success(`Re-scan triggered for ${vm.nickname}`); },
  });

  return (
    <div className="rounded-xl p-4 cursor-pointer transition-all hover:border-sky-500/30 hover:-translate-y-0.5"
      style={{ background: "#0a0f1e", border: `1px solid ${(vm.critical_count || 0) > 0 ? "rgba(239,68,68,0.25)" : "#1e293b"}` }}
      onClick={() => nav(`/cloud/vms/${vm.id}`)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor, boxShadow: vm.status === "running" ? `0 0 6px ${statusColor}` : "none" }} />
            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase border" style={{ color: provider.color, background: provider.bg, borderColor: provider.border }}>{provider.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold" style={{ color: osStyle.color, background: osStyle.bg }}>{vm.os_name}</span>
          </div>
          <h3 className="text-sm font-bold text-white truncate">{vm.nickname}</h3>
          <p className="text-[11px] font-mono text-slate-500 truncate">{vm.instance_id}</p>
        </div>
        <RiskGauge score={vm.risk_score} size={44} />
      </div>

      {/* Pills row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {vm.instance_type && <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: "#1e293b", color: "#94a3b8" }}>{vm.instance_type}</span>}
        {vm.region && <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: "#1e293b", color: "#94a3b8" }}>{vm.region}</span>}
        <span className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded font-mono" style={{ background: "#1e293b", color: "#94a3b8" }}>
          Patched: <PatchBadge lastPatched={vm.last_patched} />
        </span>
      </div>

      {/* Finding counts */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-mono font-bold" style={{ color: "#ef4444" }}>🔴 {vm.critical_count || 0}</span>
        <span className="text-xs font-mono font-bold" style={{ color: "#f97316" }}>🟠 {vm.high_count || 0}</span>
        <span className="text-xs font-mono font-bold" style={{ color: "#eab308" }}>🟡 {vm.medium_count || 0}</span>
        <span className="text-xs font-mono font-bold" style={{ color: "#10b981" }}>🟢 {vm.low_count || 0}</span>
        {vm.packages_scanned > 0 && <span className="text-[10px] text-slate-600 ml-auto font-mono">{vm.packages_scanned} pkgs</span>}
      </div>

      {/* Kernel */}
      {vm.kernel_version && <p className="text-[10px] font-mono text-slate-600 mb-2 truncate">kernel: {vm.kernel_version}</p>}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 4).map(t => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "#1e293b", color: "#475569" }}>{t}</span>
          ))}
        </div>
      )}

      {/* Status + scanned */}
      <div className="flex items-center justify-between text-[10px] text-slate-600 mb-3">
        <span className="font-mono uppercase" style={{ color: statusColor }}>{vm.status}</span>
        {vm.scanned_at && <span className="font-mono">{formatDistanceToNow(new Date(vm.scanned_at), { addSuffix: true })}</span>}
      </div>

      {/* Actions */}
      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <Link to={`/cloud/vms/${vm.id}`} className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-center transition-all"
          style={{ background: `rgba(14,165,233,0.1)`, border: `1px solid rgba(14,165,233,0.25)`, color: ACCENT }}>
          View Findings
        </Link>
        <button onClick={() => rescanMut.mutate()} disabled={rescanMut.isPending || vm.status === "scanning"}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
          style={{ background: "#1e293b", border: "1px solid #30363d", color: "#64748b" }}>
          <RefreshCw className={`w-3.5 h-3.5 ${vm.status === "scanning" ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}

export default function VMsPage() {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [showScanModal, setShowScanModal] = useState(false);

  const { data: vms = [], isLoading } = useQuery({
    queryKey: ["vm-scans"],
    queryFn: () => base44.entities.VMScan.list("-risk_score", 50),
  });
  const { data: findings = [] } = useQuery({
    queryKey: ["vm-findings-all"],
    queryFn: () => base44.entities.VMFinding.list("-created_date", 500),
  });

  const filtered = vms.filter(v => {
    const ms = !search || v.nickname?.toLowerCase().includes(search.toLowerCase()) || v.instance_id?.toLowerCase().includes(search.toLowerCase()) || v.region?.toLowerCase().includes(search.toLowerCase());
    const mp = providerFilter === "all" || v.provider === providerFilter;
    return ms && mp;
  });

  const totalCritical = vms.reduce((s, v) => s + (v.critical_count || 0), 0);
  const totalHigh = vms.reduce((s, v) => s + (v.high_count || 0), 0);
  const exploitedInWild = findings.filter(f => f.exploited_in_wild).length;
  const avgRisk = vms.length ? Math.round(vms.reduce((s, v) => s + (v.risk_score || 0), 0) / vms.length) : 0;

  return (
    <div className="min-h-screen -m-6" style={{ background: "#030712" }}>
      {showScanModal && <VMScanModal onClose={() => setShowScanModal(false)} />}

      {/* Header */}
      <div className="px-6 py-8" style={{ background: "linear-gradient(135deg, #030a1a, #041424)", borderBottom: "1px solid rgba(14,165,233,0.15)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2.5 py-1 rounded font-bold font-mono tracking-widest" style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.3)", color: ACCENT }}>
                ◈ VM SCANNING
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">Virtual Machine Scanning</h1>
            <p className="text-slate-400 text-sm mt-1">OS-level CVE detection across all your cloud VMs</p>
          </div>
          <button onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: `rgba(14,165,233,0.15)`, border: `1px solid rgba(14,165,233,0.35)`, color: ACCENT }}>
            <Play className="w-4 h-4" /> Scan New VM
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 pb-10">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "VMs Monitored",    val: vms.length, color: ACCENT },
            { label: "Critical CVEs",    val: totalCritical, color: "#ef4444" },
            { label: "High CVEs",        val: totalHigh, color: "#f97316" },
            { label: "Exploited in Wild",val: exploitedInWild, color: "#f59e0b" },
            { label: "Avg Risk Score",   val: avgRisk, color: avgRisk >= 70 ? "#ef4444" : avgRisk >= 40 ? "#f97316" : "#10b981" },
          ].map(({ label, val, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: `1px solid ${color}20` }}>
              <p className="text-2xl font-black font-mono" style={{ color }}>{val}</p>
              <p className="text-[10px] font-mono text-slate-500 uppercase mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search VMs..." className="pl-9 h-9 text-sm" style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#e2e8f0" }} />
          </div>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-36 h-9 text-sm" style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#e2e8f0" }}>
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent style={{ background: "#111827", borderColor: "#1e293b" }}>
              {["all", "aws", "azure", "gcp"].map(p => (
                <SelectItem key={p} value={p} className="text-slate-200 capitalize">{p === "all" ? "All Providers" : p.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* VM Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-56 rounded-xl animate-pulse" style={{ background: "#0a0f1e" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl p-16 text-center" style={{ background: "#0a0f1e", border: "1px solid #1e293b" }}>
            <Monitor className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: ACCENT }} />
            <p className="text-slate-500 text-sm mb-1">No VMs found</p>
            <p className="text-slate-600 text-xs">Connect cloud accounts or adjust filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(vm => <VMCard key={vm.id} vm={vm} />)}
          </div>
        )}
      </div>
    </div>
  );
}