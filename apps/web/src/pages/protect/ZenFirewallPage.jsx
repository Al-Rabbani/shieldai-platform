import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, Search, Zap } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard, YesNo } from "@/components/gds/GDSBadge";
import { Link } from "react-router-dom";

const C = "#00d9ff"; const DANGER = "#ff3b3b"; const SUCCESS = "#00ff88";

export default function ZenFirewallPage() {
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState("all");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["firewall-rules"],
    queryFn: () => base44.entities.FirewallRule.list().catch(() => []),
    initialData: [],
  });
  const { data: firewalls = [] } = useQuery({
    queryKey: ["zen-firewalls"],
    queryFn: () => base44.entities.ZenFirewall.list().catch(() => []),
    initialData: [],
  });

  const filtered = rules.filter(r => {
    if (enabled === "enabled" && !r.enabled) return false;
    if (enabled === "disabled" && r.enabled !== false) return false;
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase()) && !r.category?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const rows = filtered.slice(0, 200).map((r, i) => ({
    _key: r.id || i,
    _cells: [
      <span className="text-[9px] font-mono" style={{ color: C }}>{r.rule_id || r.id?.slice(0,8) || `R-${i+1}`}</span>,
      <span className="text-[10px] font-semibold text-white">{r.name || r.rule_name || "—"}</span>,
      <span className="text-[9px] capitalize px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{r.category || "—"}</span>,
      <span className="text-[9px] font-mono text-slate-500 truncate max-w-36 block">{r.pattern || r.match_pattern || "—"}</span>,
      <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: r.action === "block" ? DANGER : r.action === "challenge" ? "#ffb83b" : SUCCESS, background: r.action === "block" ? "rgba(255,59,59,0.1)" : "rgba(255,255,255,0.05)" }}>{r.action || "monitor"}</span>,
      <SevBadge sev={r.severity} />,
      <YesNo val={r.enabled !== false} />,
      <span className="text-[9px] font-mono text-white">{(r.hits_total || 0).toLocaleString()}</span>,
      <span className="text-[9px] font-mono" style={{ color: DANGER }}>{(r.hits_blocked || 0).toLocaleString()}</span>,
    ],
  }));

  return (
    <GDSPageShell breadcrumbs={[{ label: "Runtime Protection", path: "/protect" }, { label: "Zen Firewall" }]}
      title="Zen Firewall" subtitle="WAF RULES · RATE LIMITS · BOT PROTECTION"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules…" className="w-28 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
          </div>
          <select value={enabled} onChange={e => setEnabled(e.target.value)} className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#111827", border: "1px solid #1a2a3a" }}>
            <option value="all">All Rules</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      }>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Rules" value={rules.length} color={C} icon={Shield} />
        <StatCard label="Active Rules" value={rules.filter(r=>r.enabled!==false).length} color={SUCCESS} icon={Shield} />
        <StatCard label="Block Rules" value={rules.filter(r=>r.action==="block").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Total Hits" value={rules.reduce((s,r)=>s+(r.hits_total||0),0).toLocaleString()} color="#ffb83b" icon={Zap} />
      </div>
      {firewalls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {firewalls.map(z => (
            <Link key={z.id} to={`/protect/zen/${z.id}`}
              className="rounded-xl p-4 flex items-center gap-3 transition-all"
              style={{ background: "#111827", border: "1px solid #1a2a3a" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${C}40`}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#1a2a3a"}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: z.status === "active" ? SUCCESS : "#64748b" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">{z.app_name || z.name || "App"}</p>
                <p className="text-[9px] text-slate-500">{z.mode || "Active Protection"} · {(z.total_blocked||0).toLocaleString()} blocked</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <GDSTable columns={["Rule ID","Name","Category","Pattern","Action","Severity","Enabled","Total Hits","Hits Blocked"]} rows={rows} isLoading={isLoading} emptyText="No firewall rules configured" />
    </GDSPageShell>
  );
}