import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Cpu, AlertTriangle, Search } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

export default function EDRAgentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [os, setOs] = useState("all");

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["device-agents-full"],
    queryFn: () => base44.entities.DeviceAgent.list().catch(() => []),
    initialData: [], refetchInterval: 30000,
  });

  const filtered = devices.filter(d => {
    if (status !== "all" && d.status !== status) return false;
    if (os !== "all" && d.os !== os) return false;
    if (search && !d.device_name?.toLowerCase().includes(search.toLowerCase()) && !d.username?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.slice(0, 200).map((d, i) => {
    const riskColor = (d.risk_score||0) > 70 ? DANGER : (d.risk_score||0) > 40 ? "#ffb83b" : SUCCESS;
    return {
      _key: d.id || i,
      _cells: [
        <div><p className="text-[10px] font-semibold text-white">{d.device_name}</p><p className="text-[9px] text-slate-600">{d.team || "—"}</p></div>,
        <span className="text-[9px] font-mono px-2 py-0.5 rounded uppercase" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{d.os}</span>,
        <span className="text-[9px] text-slate-400">{d.username || "—"}</span>,
        <StatusBadge status={d.status} />,
        <span className="text-[9px] font-mono text-slate-300">{(d.packages_monitored||0).toLocaleString()}</span>,
        <span className="text-[9px] font-black" style={{ color: (d.risky_packages||0) > 0 ? DANGER : SUCCESS }}>{d.risky_packages ?? "0"}</span>,
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${d.risk_score||0}%`, background: riskColor }} />
          </div>
          <span className="text-[9px] font-mono" style={{ color: riskColor }}>{d.risk_score ?? "—"}</span>
        </div>,
        <span className="text-[9px] text-slate-500">{d.last_heartbeat ? formatDistanceToNow(new Date(d.last_heartbeat), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell breadcrumbs={[{ label: "Runtime Protection", path: "/protect" }, { label: "EDR Agents" }]}
      title="EDR Agents" subtitle="ENDPOINT DETECTION & RESPONSE · DEVICE PROTECTION"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Device, user…" className="w-28 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          {[
            { val: status, set: setStatus, opts: ["all","active","inactive","blocked"], label: "Status" },
            { val: os, set: setOs, opts: ["all","macos","linux","windows"], label: "OS" },
          ].map(({ val, set, opts, label }) => (
            <select key={label} value={val} onChange={e => set(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
              <option value="all">All {label}</option>
              {opts.slice(1).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
      }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Agents" value={devices.length} color={C} icon={Cpu} />
        <StatCard label="Active" value={devices.filter(d=>d.status==="active").length} color={SUCCESS} icon={Cpu} />
        <StatCard label="Blocked" value={devices.filter(d=>d.status==="blocked").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="High Risk" value={devices.filter(d=>(d.risk_score||0)>70).length} color={DANGER} icon={AlertTriangle} />
      </div>
      <GDSTable columns={["Device","OS","Username","Status","Packages Monitored","Risky Packages","Risk Score","Last Scan"]} rows={rows} isLoading={isLoading} emptyText="No EDR agents enrolled" />
    </GDSPageShell>
  );
}