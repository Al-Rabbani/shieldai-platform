import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Zap, AlertTriangle, Search, Shield } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatusBadge, StatCard } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

export default function DASTScansPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data: scans = [], isLoading } = useQuery({
    queryKey: ["dast-scans-full"],
    queryFn: () => base44.entities.DASTScan.list("-created_date", 100).catch(() => []),
    initialData: [], refetchInterval: 15000,
  });
  const { data: dastFindings = [], isLoading: loadFindings } = useQuery({
    queryKey: ["dast-findings-full"],
    queryFn: () => base44.entities.DASTFinding.list("-created_date", 200).catch(() => []),
    initialData: [],
  });

  const filtered = scans.filter(s => {
    if (status !== "all" && s.status !== status) return false;
    if (search && !s.target_url?.toLowerCase().includes(search.toLowerCase()) && !s.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const scanRows = filtered.slice(0, 100).map((s, i) => {
    const statusColor = s.status === "running" ? C : s.status === "completed" ? SUCCESS : s.status === "failed" ? DANGER : "#64748b";
    return {
      _key: s.id || i,
      _cells: [
        <span className="text-[10px] font-mono text-white truncate max-w-48 block">{s.target_url || s.name || `Scan ${i+1}`}</span>,
        <span className="text-[9px] capitalize px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{s.scan_type || s.mode || "active"}</span>,
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded capitalize" style={{ color: statusColor, background: `${statusColor}18` }}>{s.status || "pending"}</span>,
        <span className="text-[10px] font-mono text-white">{s.total_findings ?? "—"}</span>,
        <span className="text-[9px] font-black" style={{ color: (s.critical_count||0) > 0 ? DANGER : "#64748b" }}>{s.critical_count ?? "0"}</span>,
        <span className="text-[9px] font-bold" style={{ color: (s.high_count||0) > 0 ? "#ff7b3b" : "#64748b" }}>{s.high_count ?? "0"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{s.duration_seconds ? `${Math.round(s.duration_seconds/60)}m` : "—"}</span>,
        <span className="text-[9px] text-slate-500">{s.started_at ? formatDistanceToNow(new Date(s.started_at), { addSuffix: true }) : s.created_date ? formatDistanceToNow(new Date(s.created_date), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  const findingRows = dastFindings.slice(0, 100).map((f, i) => ({
    _key: `f-${f.id || i}`,
    _cells: [
      <span className="text-[10px] font-semibold text-white line-clamp-1 max-w-48 block">{f.title || f.vulnerability_type}</span>,
      <span className="text-[9px] font-mono text-slate-400 truncate max-w-36 block">{f.url || f.endpoint || "—"}</span>,
      <SevBadge sev={f.severity} />,
      <span className="text-[9px] capitalize text-slate-400">{f.category || f.type || "—"}</span>,
      <StatusBadge status={f.status || "open"} />,
    ],
  }));

  return (
    <GDSPageShell breadcrumbs={[{ label: "Attack Surface", path: "/attack" }, { label: "DAST Scans" }]}
      title="DAST Scans" subtitle="DYNAMIC APPLICATION SECURITY TESTING"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search URL…" className="w-32 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Status</option>
            {["running","completed","failed","pending"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Scans" value={scans.length} color={C} icon={Zap} />
        <StatCard label="Running" value={scans.filter(s=>s.status==="running").length} color={C} icon={Zap} />
        <StatCard label="Total Findings" value={dastFindings.length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Critical" value={dastFindings.filter(f=>f.severity==="critical").length} color={DANGER} icon={AlertTriangle} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white px-1">Scan Jobs</h3>
        <GDSTable columns={["Target URL","Scan Type","Status","Total Findings","Critical","High","Duration","Started At"]} rows={scanRows} isLoading={isLoading} emptyText="No DAST scans yet" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white px-1">DAST Findings</h3>
        <GDSTable columns={["Title","URL / Endpoint","Severity","Category","Status"]} rows={findingRows} isLoading={loadFindings} emptyText="No DAST findings" />
      </div>
    </GDSPageShell>
  );
}