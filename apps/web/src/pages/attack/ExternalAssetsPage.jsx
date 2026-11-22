import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { Globe, Search, Play, AlertTriangle, Clock } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444";
const SUCCESS = "#22c55e";
const CYAN = "#00d4ff";
const WARN = "#eab308";
const CARD = "#111827";
const BORDER = "#1a1f2e";

const TYPE_OPTS = ["all", "subdomain", "ip", "service", "certificate", "url"];
const RISK_OPTS = ["all", "critical", "high", "medium", "low"];
const SSL_OPTS = ["all", "valid", "expiring", "expired"];

function SSLBadge({ expiresAt }) {
  if (!expiresAt) return <span className="text-[9px] text-slate-600">—</span>;
  const days = differenceInDays(new Date(expiresAt), new Date());
  const color = days < 0 ? DANGER : days < 30 ? WARN : SUCCESS;
  const label = days < 0 ? "Expired" : `${days}d`;
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ color, background: `${color}18` }}>
      {label}
    </span>
  );
}

export default function ExternalAssetsPage() {
  const [typeF, setTypeF] = useState("all");
  const [riskF, setRiskF] = useState("all");
  const [sslF, setSslF] = useState("all");
  const [search, setSearch] = useState("");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["external-assets"],
    queryFn: () => base44.entities.AttackSurface.list("-last_seen", 500).catch(() => []),
    initialData: [],
  });

  const now = new Date();

  const filtered = assets.filter(a => {
    if (typeF !== "all" && a.asset_type !== typeF) return false;
    if (riskF !== "all" && a.risk_level !== riskF) return false;
    if (sslF === "valid" && (!a.ssl_expires_at || differenceInDays(new Date(a.ssl_expires_at), now) <= 30)) return false;
    if (sslF === "expiring") {
      const d = a.ssl_expires_at ? differenceInDays(new Date(a.ssl_expires_at), now) : -1;
      if (!(d >= 0 && d <= 30)) return false;
    }
    if (sslF === "expired" && (!a.ssl_expires_at || differenceInDays(new Date(a.ssl_expires_at), now) > 0)) return false;
    if (search && !a.asset_name?.toLowerCase().includes(search.toLowerCase()) && !a.ip_address?.includes(search)) return false;
    return true;
  });

  const newThisWeek = assets.filter(a => a.first_seen && differenceInDays(now, new Date(a.first_seen)) <= 7).length;
  const sslExpiring = assets.filter(a => {
    const d = a.ssl_expires_at ? differenceInDays(new Date(a.ssl_expires_at), now) : -1;
    return d >= 0 && d <= 30;
  }).length;

  const rows = filtered.map(a => {
    const techs = (a.technologies || "").split(",").map(t => t.trim()).filter(Boolean);
    return {
      _key: a.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{a.asset_name || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: CYAN, background: "rgba(0,212,255,0.1)" }}>{a.asset_type || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400 truncate max-w-28 block">{a.url || a.ip_address || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-400">{a.ip_address || "—"}</span>,
        <span className="text-[9px] font-mono">{a.port || "—"}</span>,
        <span className="text-[9px] text-slate-400">{a.protocol || "—"}</span>,
        <div className="flex flex-wrap gap-1">
          {techs.slice(0, 2).map(t => (
            <span key={t} className="text-[8px] px-1.5 py-0.5 rounded" style={{ color: "#a78bfa", background: "rgba(167,139,250,0.1)" }}>{t}</span>
          ))}
          {techs.length > 2 && <span className="text-[8px] text-slate-600">+{techs.length - 2}</span>}
        </div>,
        <span className="text-[9px]" style={{ color: a.ssl_valid ? SUCCESS : DANGER }}>
          {a.ssl_valid ? "✓ Valid" : a.ssl_valid === false ? "✗ Invalid" : "—"}
        </span>,
        <SSLBadge expiresAt={a.ssl_expires_at} />,
        <SevBadge sev={a.risk_level} />,
        <span className="text-[9px] text-slate-500">{a.first_seen ? formatDistanceToNow(new Date(a.first_seen), { addSuffix: true }) : "—"}</span>,
        <span className="text-[9px] text-slate-500">{a.last_seen ? formatDistanceToNow(new Date(a.last_seen), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Attack Surface", path: "/attack" }, { label: "External Assets" }]}
      title="External Assets"
      subtitle="DISCOVERED ASSETS · SSL MONITORING · EXPOSURE MAPPING"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…"
              className="bg-transparent text-xs text-white placeholder-slate-600 outline-none w-32" />
          </div>
          {[["type", typeF, setTypeF, TYPE_OPTS], ["risk", riskF, setRiskF, RISK_OPTS], ["ssl", sslF, setSslF, SSL_OPTS]].map(([key, val, set, opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
          <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold" style={{ background: "#c9a84c", color: "#0a0e17" }}>
            <Play className="w-3.5 h-3.5" /> Run Discovery Scan
          </button>
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Discovered Assets" value={assets.length} color={CYAN} icon={Globe} />
        <StatCard label="New This Week" value={newThisWeek} color="#a78bfa" icon={AlertTriangle} />
        <StatCard label="SSL Expiring ≤30d" value={sslExpiring} color={WARN} icon={Clock} />
        <StatCard label="High Risk" value={assets.filter(a => a.risk_level === "high" || a.risk_level === "critical").length} color={DANGER} icon={AlertTriangle} />
      </div>

      <GDSTable
        columns={["Asset Name", "Type", "URL/IP", "IP", "Port", "Protocol", "Technologies", "SSL Valid", "SSL Expires", "Risk", "First Seen", "Last Seen"]}
        rows={rows}
        isLoading={isLoading}
        emptyText="No external assets discovered yet" />
    </GDSPageShell>
  );
}