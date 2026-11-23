import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Skull, AlertTriangle, Search } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { StatCard, YesNo } from "@/components/gds/GDSBadge";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";
const THREAT_COLOR = { critical: DANGER, high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff" };
const STATUS_COLOR = { active: DANGER, dormant: "#ffb83b", disbanded: "#64748b", law_enforcement_action: SUCCESS };

export default function RansomwareTrackerPage() {
  const [search, setSearch] = useState("");
  const [threat, setThreat] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["ransomware-groups"],
    queryFn: () => base44.entities.RansomwareGroup.list("-victims_count", 100).catch(() => []),
    initialData: [],
  });

  const filtered = groups.filter(g => {
    if (threat !== "all" && g.threat_level !== threat) return false;
    if (status !== "all" && g.status !== status) return false;
    if (search && !g.group_name?.toLowerCase().includes(search.toLowerCase()) && !g.origin_country?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.slice(0, 100).map((g, i) => {
    const tc = THREAT_COLOR[g.threat_level] || "#64748b";
    const sc = STATUS_COLOR[g.status] || "#64748b";
    return {
      _key: g.id || i,
      _cells: [
        <span className="text-[10px] font-bold text-white">{g.group_name}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-28 block">{g.aliases || "—"}</span>,
        <span className="text-[9px] text-slate-300">{g.origin_country || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: sc, background: `${sc}18` }}>{(g.status || "—").replace(/_/g, " ")}</span>,
        <span className="text-[9px] font-mono text-slate-400">{g.ransomware_family || "—"}</span>,
        <YesNo val={g.double_extortion} />,
        <span className="text-[10px] font-black font-mono" style={{ color: (g.victims_count || 0) > 50 ? DANGER : "#ffb83b" }}>{g.victims_count?.toLocaleString() ?? "0"}</span>,
        <span className="text-[9px] font-bold" style={{ color: (g.victims_this_month || 0) > 0 ? DANGER : "#64748b" }}>{g.victims_this_month ?? "0"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-32 block">{g.target_sectors || "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-28 block">{g.target_geography || "—"}</span>,
        <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color: tc, background: `${tc}18` }}>{g.threat_level || "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell breadcrumbs={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Ransomware Tracker" }]}
      title="Ransomware Tracker" subtitle="ACTIVE GROUPS · VICTIM COUNTS · DOUBLE EXTORTION CAMPAIGNS"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Group, country…" className="w-28 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          {[
            { val: threat, set: setThreat, opts: ["all","critical","high","medium","low"], label: "Threat" },
            { val: status, set: setStatus, opts: ["all","active","dormant","disbanded","law_enforcement_action"], label: "Status" },
          ].map(({ val, set, opts, label }) => (
            <select key={label} value={val} onChange={e => set(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
              <option value="all">All {label}</option>
              {opts.slice(1).map(o => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
            </select>
          ))}
        </div>
      }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tracked Groups" value={groups.length} color={C} icon={Skull} />
        <StatCard label="Active" value={groups.filter(g => g.status === "active").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Total Victims" value={groups.reduce((s, g) => s + (g.victims_count || 0), 0).toLocaleString()} color={DANGER} icon={AlertTriangle} />
        <StatCard label="This Month" value={groups.reduce((s, g) => s + (g.victims_this_month || 0), 0)} color="#ffb83b" icon={Skull} />
      </div>
      <GDSTable
        columns={["Group Name","Aliases","Origin Country","Status","Ransomware Family","Double Extortion","Total Victims","This Month","Target Sectors","Geography","Threat Level"]}
        rows={rows} isLoading={isLoading} emptyText="No ransomware groups tracked" />
    </GDSPageShell>
  );
}