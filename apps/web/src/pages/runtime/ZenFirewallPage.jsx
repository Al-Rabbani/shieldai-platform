import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, ExternalLink, AlertTriangle, Activity, Clock } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const GOLD = "#c9a84c"; const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff";
const CARD = "#111827"; const BORDER = "#1a1f2e";

const CAT_COLOR = {
  sqli: "#ef4444", xss: "#f97316", csrf: "#eab308", rate_limit: "#3b82f6",
  bot: "#8b5cf6", path_traversal: "#f97316", lfi: "#ef4444",
  rce: "#ef4444", ssrf: "#f97316", custom: "#94a3b8",
};

function AppFirewallCard({ fw }) {
  const riskColor = (fw.risk_score || 0) >= 75 ? DANGER : (fw.risk_score || 0) >= 40 ? "#eab308" : SUCCESS;
  return (
    <div className="rounded-xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-white">{fw.app_name || "App"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ color: "#a78bfa", background: "rgba(167,139,250,0.1)" }}>{fw.language || "—"}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ color: CYAN, background: "rgba(0,212,255,0.1)" }}>{fw.environment || "production"}</span>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2 py-1 rounded capitalize"
          style={{ color: fw.mode === "block" ? SUCCESS : "#eab308", background: fw.mode === "block" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)" }}>
          {fw.mode || "block"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[9px]">
        <div><span className="text-slate-500">Blocked Today</span><p className="font-black font-mono" style={{ color: DANGER }}>{fw.attacks_blocked_today ?? 0}</p></div>
        <div><span className="text-slate-500">Blocked Total</span><p className="font-black font-mono text-white">{(fw.attacks_blocked_total ?? 0).toLocaleString()}</p></div>
        <div><span className="text-slate-500">Uptime</span><p className="font-bold" style={{ color: SUCCESS }}>{fw.uptime_pct ?? "—"}%</p></div>
        <div><span className="text-slate-500">Avg Overhead</span><p className="font-mono text-white">{fw.avg_overhead_ms ?? "—"}ms</p></div>
        <div><span className="text-slate-500">Endpoints</span><p className="font-mono text-white">{fw.protected_endpoints ?? "—"}</p></div>
        <div><span className="text-slate-500">Bot Blocked</span><p className="font-mono" style={{ color: "#f97316" }}>{fw.bot_requests_blocked ?? 0}</p></div>
      </div>
    </div>
  );
}

export default function ZenFirewallPage() {
  const [catF, setCatF] = useState("all");
  const [search, setSearch] = useState("");

  const { data: firewalls = [], isLoading: loadFW } = useQuery({
    queryKey: ["zen-firewalls"],
    queryFn: () => base44.entities.ZenFirewall.list("-created_date", 50).catch(() => []),
    initialData: [],
  });

  const { data: rules = [], isLoading: loadR } = useQuery({
    queryKey: ["firewall-rules"],
    queryFn: () => base44.entities.FirewallRule.list("-hits_total", 500).catch(() => []),
    initialData: [],
  });

  const cats = [...new Set(rules.map(r => r.category).filter(Boolean))];
  const filteredRules = rules.filter(r => {
    if (catF !== "all" && r.category !== catF) return false;
    if (search && !r.name?.toLowerCase().includes(search.toLowerCase()) && !r.rule_id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalBlocked = firewalls.reduce((s, f) => s + (f.attacks_blocked_total || 0), 0);
  const avgUptime = firewalls.length
    ? (firewalls.reduce((s, f) => s + (f.uptime_pct || 0), 0) / firewalls.length).toFixed(2)
    : "—";
  const avgOverhead = firewalls.length
    ? Math.round(firewalls.reduce((s, f) => s + (f.avg_overhead_ms || 0), 0) / firewalls.length)
    : "—";

  const ruleRows = filteredRules.map(r => {
    const cc = CAT_COLOR[r.category] || "#64748b";
    return {
      _key: r.id,
      _cells: [
        <span className="text-[9px] font-mono" style={{ color: GOLD }}>{r.rule_id || "—"}</span>,
        <span className="text-[11px] font-semibold text-white">{r.name || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
          style={{ color: cc, background: `${cc}18` }}>{r.category || "—"}</span>,
        <code className="text-[8px] text-green-400 truncate max-w-24 block">{r.pattern || "—"}</code>,
        <span className="text-[9px] font-bold capitalize"
          style={{ color: r.action === "block" ? DANGER : r.action === "rate_limit" ? "#f97316" : "#eab308" }}>
          {r.action || "—"}
        </span>,
        <SevBadge sev={r.severity} />,
        <span className="text-[9px]" style={{ color: r.enabled !== false ? SUCCESS : "#64748b" }}>
          {r.enabled !== false ? "● On" : "○ Off"}
        </span>,
        <span className="text-[10px] font-mono text-slate-300">{(r.hits_total ?? 0).toLocaleString()}</span>,
        <span className="text-[10px] font-mono" style={{ color: DANGER }}>{(r.hits_blocked ?? 0).toLocaleString()}</span>,
        <span className="text-[10px] font-mono text-slate-500">{r.false_positives ?? 0}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Runtime", path: "/protect" }, { label: "Zen Firewall" }]}
      title="Zen Firewall" subtitle="WAF · RATE LIMITING · BOT PROTECTION · REQUEST FILTERING"
      actions={
        <a href="#" className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: GOLD, color: "#0a0e17" }}>
          <Shield className="w-3.5 h-3.5" /> Deploy Zen Firewall
          <ExternalLink className="w-3 h-3" />
        </a>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Blocked" value={totalBlocked >= 1000 ? `${(totalBlocked/1000).toFixed(0)}K` : totalBlocked} color={DANGER} icon={Shield} />
        <StatCard label="Avg Uptime" value={`${avgUptime}%`} color={SUCCESS} icon={Activity} />
        <StatCard label="Avg Overhead" value={`${avgOverhead}ms`} color={CYAN} icon={Clock} />
        <StatCard label="Active Rules" value={rules.filter(r=>r.enabled!==false).length} color={GOLD} icon={AlertTriangle} />
      </div>

      {/* App Firewall Cards */}
      {loadFW ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-44 rounded-xl animate-pulse" style={{ background: CARD }} />)}
        </div>
      ) : firewalls.length > 0 ? (
        <div>
          <h3 className="text-sm font-bold text-white mb-3">Protected Applications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {firewalls.map(fw => <AppFirewallCard key={fw.id} fw={fw} />)}
          </div>
        </div>
      ) : null}

      {/* Rules Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Firewall Rules</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#080c14", border: `1px solid ${BORDER}` }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules…"
                className="bg-transparent text-xs text-white placeholder-slate-600 outline-none w-28" />
            </div>
            <select value={catF} onChange={e => setCatF(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <option value="all">All Categories</option>
              {cats.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <GDSTable
          columns={["Rule ID","Name","Category","Pattern","Action","Severity","Enabled","Hits Total","Hits Blocked","False Pos"]}
          rows={ruleRows} isLoading={loadR}
          emptyText="No firewall rules configured" />
      </div>
    </GDSPageShell>
  );
}