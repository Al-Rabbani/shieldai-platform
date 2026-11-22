import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Crosshair, AlertTriangle, Search, DollarSign } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard, YesNo } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

const PRIORITY_COLOR = { p0: DANGER, p1: "#ff7b3b", p2: "#ffb83b", p3: C };

function fmt(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

export default function BlastRadiusPage() {
  const [search, setSearch] = useState("");
  const [sev, setSev] = useState("all");

  const { data: blasts = [], isLoading } = useQuery({
    queryKey: ["blast-radius"],
    queryFn: () => base44.entities.BlastRadius.list("-blast_radius_score", 200).catch(() => []),
    initialData: [],
  });

  const filtered = blasts.filter(b => {
    if (sev !== "all" && b.severity !== sev) return false;
    if (search && !b.finding_title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.slice(0, 200).map((b, i) => {
    const scoreColor = (b.blast_radius_score || 0) > 70 ? DANGER : (b.blast_radius_score || 0) > 40 ? "#ffb83b" : SUCCESS;
    const priorityColor = PRIORITY_COLOR[b.remediation_priority] || "#64748b";
    return {
      _key: b.id || i,
      _cells: [
        <span className="text-[10px] font-semibold text-white line-clamp-1 max-w-44 block">{b.finding_title}</span>,
        <SevBadge sev={b.severity} />,
        <span className="text-[9px] font-mono font-bold text-slate-200">{b.affected_assets_count ?? "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-32 block">{b.affected_services || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-300">{b.affected_users?.toLocaleString() ?? "—"}</span>,
        <span className="text-[9px] font-mono" style={{ color: (b.affected_revenue_pct || 0) > 20 ? DANGER : "#ffb83b" }}>{b.affected_revenue_pct != null ? `${b.affected_revenue_pct}%` : "—"}</span>,
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${b.blast_radius_score || 0}%`, background: scoreColor }} />
          </div>
          <span className="text-[9px] font-mono font-black" style={{ color: scoreColor }}>{b.blast_radius_score ?? "—"}</span>
        </div>,
        <YesNo val={b.internet_facing} />,
        <YesNo val={b.lateral_movement_possible} />,
        <YesNo val={b.data_exfiltration_possible} />,
        <span className="text-[9px] font-black font-mono" style={{ color: DANGER }}>{fmt(b.financial_impact_usd)}</span>,
        <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color: priorityColor, background: `${priorityColor}18` }}>{b.remediation_priority || "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell breadcrumbs={[{ label: "Attack Surface", path: "/attack" }, { label: "Blast Radius" }]}
      title="Blast Radius Analysis" subtitle="AFFECTED ASSETS · LATERAL MOVEMENT · FINANCIAL IMPACT"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings…" className="w-28 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={sev} onChange={e => setSev(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Severity</option>
            {["critical","high","medium","low"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Findings" value={blasts.length} color={C} icon={Crosshair} />
        <StatCard label="Internet Facing" value={blasts.filter(b => b.internet_facing).length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Lateral Movement" value={blasts.filter(b => b.lateral_movement_possible).length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="P0 Priority" value={blasts.filter(b => b.remediation_priority === "p0").length} color={DANGER} icon={Crosshair} />
      </div>
      <GDSTable
        columns={["Finding Title","Severity","Affected Assets","Affected Services","Affected Users","Revenue Impact","Blast Score","Internet Facing","Lateral Movement","Data Exfil","Financial Impact","Priority"]}
        rows={rows} isLoading={isLoading} emptyText="No blast radius data yet" />
    </GDSPageShell>
  );
}