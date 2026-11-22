import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Package, AlertTriangle, Search, ShieldAlert } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

const EVENT_COLOR = {
  malware_detected: DANGER,
  typosquat_detected: "#ff7b3b",
  dependency_confusion: "#ff7b3b",
  secret_leaked: "#ffb83b",
  suspicious_install: "#ffb83b",
  cve_published: "#3b9eff",
  license_violation: "#64748b",
};

const STATUS_COLOR = {
  blocked: DANGER, quarantined: "#ff7b3b", alerted: "#ffb83b",
  allowed: SUCCESS, investigating: C,
};

export default function SupplyChainEventsPage() {
  const [search, setSearch] = useState("");
  const [sev, setSev] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["supply-chain-events"],
    queryFn: () => base44.entities.SupplyChainEvent.list("-detected_at", 500).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });

  const filtered = events.filter(e => {
    if (sev !== "all" && e.severity !== sev) return false;
    if (status !== "all" && e.status !== status) return false;
    if (search && !e.package_name?.toLowerCase().includes(search.toLowerCase()) && !e.malware_family?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.slice(0, 300).map((e, i) => {
    const ec = EVENT_COLOR[e.event_type] || "#64748b";
    const sc = STATUS_COLOR[e.status] || "#64748b";
    return {
      _key: e.id || i,
      _cells: [
        <span className="text-[10px] font-bold text-white">{e.package_name || "—"}</span>,
        <span className="text-[9px] font-mono" style={{ color: C }}>{e.version || "—"}</span>,
        <span className="text-[9px] uppercase font-bold text-slate-400">{e.registry || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: ec, background: `${ec}18` }}>{(e.event_type || "—").replace(/_/g, " ")}</span>,
        <SevBadge sev={e.severity} />,
        <span className="text-[9px] text-slate-300">{e.developer || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{e.machine || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500 truncate max-w-36 block">{e.install_command || "—"}</span>,
        <span className="text-[9px]" style={{ color: e.malware_family ? DANGER : "#64748b" }}>{e.malware_family || "—"}</span>,
        <span className="text-[9px] font-mono" style={{ color: e.cve_id ? "#3b9eff" : "#64748b" }}>{e.cve_id || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: sc, background: `${sc}18` }}>{(e.status || "—").replace(/_/g, " ")}</span>,
        <span className="text-[9px] text-slate-500">{e.detected_at ? formatDistanceToNow(new Date(e.detected_at), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Supply Chain", path: "/protect/supply-chain" }, { label: "Events Feed" }]}
      title="Supply Chain Events" subtitle="MALICIOUS PACKAGES · TYPOSQUATS · DEPENDENCY CONFUSION"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Package, malware…" className="w-32 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={sev} onChange={e => setSev(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Severity</option>
            {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Status</option>
            {["blocked","quarantined","alerted","allowed","investigating"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={events.length} color={C} icon={Package} />
        <StatCard label="Blocked" value={events.filter(e => e.status === "blocked").length} color={DANGER} icon={ShieldAlert} />
        <StatCard label="Malware" value={events.filter(e => e.event_type === "malware_detected").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Typosquats" value={events.filter(e => e.event_type === "typosquat_detected").length} color="#ff7b3b" icon={AlertTriangle} />
      </div>

      <GDSTable
        columns={["Package","Version","Registry","Event Type","Severity","Developer","Machine","Install Command","Malware Family","CVE ID","Status","Detected At"]}
        rows={rows}
        isLoading={isLoading}
        emptyText="No supply chain events detected"
      />
    </GDSPageShell>
  );
}