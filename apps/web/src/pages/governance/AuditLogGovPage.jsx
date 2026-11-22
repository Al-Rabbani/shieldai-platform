import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ClipboardList, Search, Download } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CARD = "#111827"; const BORDER = "#1a1f2e";
const PAGE_SIZE = 50;

export default function AuditLogGovPage() {
  const [actorF,   setActorF]   = useState("all");
  const [actionF,  setActionF]  = useState("all");
  const [outcomeF, setOutcomeF] = useState("all");
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(0);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs-gov"],
    queryFn: () => base44.entities.AuditLog.list("-timestamp", 2000).catch(() => []),
    initialData: [],
  });

  const actorTypes = [...new Set(logs.map(l => l.actor_type).filter(Boolean))];
  const actionTypes= [...new Set(logs.map(l => l.action_type).filter(Boolean))].slice(0,12);

  const filtered = logs.filter(l => {
    if (actorF   !== "all" && l.actor_type  !== actorF)  return false;
    if (actionF  !== "all" && l.action_type !== actionF)  return false;
    if (outcomeF !== "all" && l.outcome     !== outcomeF) return false;
    if (search && !l.actor_email?.toLowerCase().includes(search.toLowerCase()) &&
        !l.resource_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleExportCSV = () => {
    const header = "Timestamp,Actor,Type,Action,Resource Type,Resource,IP,Outcome\n";
    const csv = filtered.slice(0, 5000).map(l =>
      `"${l.timestamp || ""}","${l.actor_email || ""}","${l.actor_type || ""}","${l.action || ""}","${l.resource_type || ""}","${l.resource_name || ""}","${l.ip_address || ""}","${l.outcome || ""}"`
    ).join("\n");
    const blob = new Blob([header + csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-log.csv"; a.click();
  };

  const rows = paged.map(l => {
    const oc = l.outcome === "success" ? SUCCESS : l.outcome === "failure" ? DANGER : "#64748b";
    return {
      _key: l.id,
      _cells: [
        <span className="text-[9px] text-slate-300">{l.actor_email || l.actor_id || "—"}</span>,
        <span className="text-[9px] font-bold capitalize px-2 py-0.5 rounded" style={{ color: "#a78bfa", background: "rgba(167,139,250,0.1)" }}>{l.actor_type || "—"}</span>,
        <span className="text-[9px] capitalize text-slate-400">{(l.action || "—").replace(/_/g," ")}</span>,
        <span className="text-[9px] text-slate-500 capitalize">{(l.resource_type || "—").replace(/_/g," ")}</span>,
        <span className="text-[9px] text-slate-300">{l.resource_name || "—"}</span>,
        <span className="text-[9px] text-slate-500 truncate max-w-28 block">{l.details || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500">{l.ip_address || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-600 truncate max-w-16 block">{l.session_id ? l.session_id.slice(0,8)+"…" : "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: oc, background: `${oc}18` }}>{l.outcome || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500">{l.timestamp ? format(new Date(l.timestamp), "MM/dd HH:mm:ss") : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Governance", path: "/governance" }, { label: "Audit Log" }]}
      title="Audit Log" subtitle="IMMUTABLE ACTIVITY TRAIL · COMPLIANCE EVIDENCE · SOC2 READY"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Actor email or resource…"
              className="bg-transparent text-xs text-white placeholder-slate-600 outline-none w-36" />
          </div>
          {[
            ["actor", actorF, setActorF, ["all",...actorTypes]],
            ["action", actionF, setActionF, ["all",...actionTypes]],
            ["outcome", outcomeF, setOutcomeF, ["all","success","failure"]],
          ].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => { set(e.target.value); setPage(0); }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o.replace(/_/g," ")}</option>)}
            </select>
          ))}
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-all"
            style={{ border: `1px solid ${BORDER}` }}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={logs.length} color="#94a3b8" icon={ClipboardList} />
        <StatCard label="Failures" value={logs.filter(l=>l.outcome==="failure").length} color={DANGER} icon={ClipboardList} />
        <StatCard label="User Actions" value={logs.filter(l=>l.actor_type==="user").length} color="#a78bfa" icon={ClipboardList} />
        <StatCard label="System Actions" value={logs.filter(l=>l.actor_type==="system").length} color="#00d4ff" icon={ClipboardList} />
      </div>

      <GDSTable
        columns={["Actor","Actor Type","Action","Resource Type","Resource","Details","IP","Session","Outcome","Timestamp"]}
        rows={rows} isLoading={isLoading}
        emptyText="No audit log entries found" />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            style={{ border: `1px solid ${BORDER}` }}>← Prev</button>
          <span className="text-xs text-slate-500">{page + 1} / {totalPages} ({filtered.length} events)</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white disabled:opacity-30 transition-all"
            style={{ border: `1px solid ${BORDER}` }}>Next →</button>
        </div>
      )}
    </GDSPageShell>
  );
}