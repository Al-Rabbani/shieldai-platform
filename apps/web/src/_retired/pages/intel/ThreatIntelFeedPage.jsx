import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Globe, AlertTriangle, Search } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const CYAN = "#00d4ff"; const CARD = "#111827"; const BORDER = "#1a1f2e";
const FEED_COLOR = { CVE: "#f97316", KEV: DANGER, Advisory: "#eab308", Malware: "#ef4444", Ransomware: DANGER, APT: "#a855f7" };

export default function ThreatIntelFeedPage() {
  const [typeF,   setTypeF]   = useState("all");
  const [sevF,    setSevF]    = useState("all");
  const [srcF,    setSrcF]    = useState("all");
  const [affectsF,setAffectsF]= useState("all");
  const [search,  setSearch]  = useState("");

  const { data: feeds = [], isLoading } = useQuery({
    queryKey: ["threat-intel-feeds"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-detected_at", 500).catch(() => []),
    initialData: [],
  });

  const types   = [...new Set(feeds.map(f => f.feed_type || f.type).filter(Boolean))];
  const sources = [...new Set(feeds.map(f => f.source).filter(Boolean))];

  const filtered = feeds.filter(f => {
    if (typeF    !== "all" && (f.feed_type||f.type) !== typeF) return false;
    if (sevF     !== "all" && f.severity             !== sevF)  return false;
    if (srcF     !== "all" && f.source               !== srcF)  return false;
    if (affectsF === "yes" && !f.affects_you) return false;
    if (affectsF === "no"  && f.affects_you)  return false;
    if (search && !f.title?.toLowerCase().includes(search.toLowerCase()) && !f.cve_id?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const kevItems = feeds.filter(f => (f.feed_type||f.type) === "KEV" && f.affects_you);
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const newToday = feeds.filter(f => f.detected_at && new Date(f.detected_at) >= todayStart).length;

  const rows = filtered.slice(0, 300).map(f => {
    const tc = FEED_COLOR[f.feed_type||f.type] || "#64748b";
    return {
      _key: f.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white truncate max-w-36 block">{f.title || "—"}</span>,
        <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: tc, background: `${tc}18` }}>{f.feed_type||f.type||"—"}</span>,
        <SevBadge sev={f.severity} />,
        <span className="text-[9px] font-mono text-slate-400">{f.package_name || "—"}</span>,
        <span className="text-[9px] font-mono" style={{ color: f.cve_id ? DANGER : "#64748b" }}>{f.cve_id || "—"}</span>,
        <span className="text-[9px] font-mono text-slate-500">{f.affected_versions || "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-32 block">{f.description || "—"}</span>,
        <span className="text-[9px] font-bold text-slate-400">{f.source || "—"}</span>,
        f.affects_you
          ? <span className="text-[9px] font-black px-2 py-0.5 rounded" style={{ color: DANGER, background: "rgba(239,68,68,0.15)" }}>⚠ YES</span>
          : <span className="text-[9px] text-slate-600">No</span>,
        <span className="text-[9px] text-slate-400">{f.affected_asset || "—"}</span>,
        <span className="text-[9px] font-bold" style={{ color: f.action_required ? DANGER : "#64748b" }}>{f.action_required || "—"}</span>,
        <span className="text-[9px] text-slate-500">{f.detected_at ? formatDistanceToNow(new Date(f.detected_at), { addSuffix: true }) : "—"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "Feed" }]}
      title="Threat Intel Feed" subtitle="CVE · KEV · ADVISORY · MALWARE · RANSOMWARE · APT"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <Search className="w-3 h-3 text-slate-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="CVE ID or title…"
              className="bg-transparent text-xs text-white placeholder-slate-600 outline-none w-32" />
          </div>
          {[["type", typeF, setTypeF, ["all",...types]], ["severity", sevF, setSevF, ["all","critical","high","medium","low"]], ["source", srcF, setSrcF, ["all",...sources]], ["affects_you", affectsF, setAffectsF, ["all","yes","no"]]].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
        </div>
      }>

      {/* KEV Alert Banner */}
      {kevItems.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: DANGER }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span className="text-sm font-bold">🚨 {kevItems.length} CISA KEV items are actively exploited and affect your environment — patch immediately!</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Intel Items" value={feeds.length} color={CYAN} icon={Globe} />
        <StatCard label="Critical Alerts" value={feeds.filter(f=>f.severity==="critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Affects You" value={feeds.filter(f=>f.affects_you).length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="New Today" value={newToday} color="#a78bfa" icon={Globe} />
      </div>

      <GDSTable
        columns={["Title","Type","Severity","Package","CVE ID","Versions","Description","Source","Affects You","Asset","Action","Detected"]}
        rows={rows} isLoading={isLoading}
        emptyText="No threat intelligence items" />
    </GDSPageShell>
  );
}