import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, Search, Download } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs-full"],
    queryFn: () => base44.entities.AuditLog.list("-timestamp", 500).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });

  const types = [...new Set(logs.map(l => l.action_type).filter(Boolean))];

  const filtered = logs.filter(l => {
    if (type !== "all" && l.action_type !== type) return false;
    if (search && !l.actor_email?.toLowerCase().includes(search.toLowerCase()) && !l.action?.toLowerCase().includes(search.toLowerCase()) && !l.resource_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.slice(0, 500).map((l, i) => {
    const outcome = l.outcome || "success";
    return {
      _key: l.id || i,
      _cells: [
        <div><p className="text-[10px] font-semibold text-white">{l.actor_email || l.actor_id || "System"}</p><p className="text-[9px] text-slate-600 capitalize">{l.actor_type}</p></div>,
        <span className="text-[9px] text-slate-300">{(l.action||"").replace(/_/g," ")}</span>,
        <span className="text-[9px] capitalize px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{l.resource_type || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400 truncate max-w-32 block">{l.resource_name || "—"}</span>,
        <span className="text-[9px] text-slate-500 truncate max-w-40 block">{l.details || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500">{l.ip_address || "—"}</span>,
        <span className="text-[9px] text-slate-500">{l.timestamp ? formatDistanceToNow(new Date(l.timestamp), { addSuffix: true }) : "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: outcome === "failure" ? DANGER : SUCCESS, background: outcome === "failure" ? "rgba(255,59,59,0.1)" : "rgba(0,255,136,0.08)" }}>{outcome}</span>,
      ],
    };
  });

  return (
    <GDSPageShell breadcrumbs={[{ label: "Governance", path: "/governance" }, { label: "Audit Log" }]}
      title="Audit Log" subtitle="SOC2 TRAIL · ACTOR ACTIONS · COMPLIANCE EVIDENCE"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Actor, action…" className="w-32 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={type} onChange={e => setType(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Types</option>
            {types.map(t => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
          </select>
        </div>
      }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={logs.length} color={C} icon={BookOpen} />
        <StatCard label="Failures" value={logs.filter(l=>l.outcome==="failure").length} color={DANGER} icon={BookOpen} />
        <StatCard label="User Actions" value={logs.filter(l=>l.actor_type==="user").length} color="#a78bfa" icon={BookOpen} />
        <StatCard label="System Actions" value={logs.filter(l=>l.actor_type==="system").length} color="#ffb83b" icon={BookOpen} />
      </div>
      <GDSTable columns={["Actor","Action","Resource Type","Resource Name","Details","IP Address","Time","Outcome"]} rows={rows} isLoading={isLoading} emptyText="No audit events recorded" />
    </GDSPageShell>
  );
}