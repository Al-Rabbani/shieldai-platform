import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Skull, AlertTriangle } from "lucide-react";
import GDSPageShell from "@/components/gds/GDSPageShell";
import GDSTable from "@/components/gds/GDSTable";
import { SevBadge, StatCard } from "@/components/gds/GDSBadge";

const DANGER = "#ef4444"; const SUCCESS = "#22c55e"; const WARN = "#eab308"; const CYAN = "#00d4ff"; const CARD = "#111827"; const BORDER = "#1a1f2e";
const THREAT_COLOR = { critical: DANGER, high: "#f97316", medium: WARN, low: "#3b82f6" };
const COUNTRY_FLAG = { US:"🇺🇸", RU:"🇷🇺", CN:"🇨🇳", KP:"🇰🇵", IR:"🇮🇷", RUSSIA:"🇷🇺", CHINA:"🇨🇳", USA:"🇺🇸" };

export default function APTTrackingPage() {
  const [threatF, setThreatF] = useState("all");
  const [typeF,   setTypeF]   = useState("all");

  const { data: actors = [], isLoading } = useQuery({
    queryKey: ["threat-actors"],
    queryFn: () => base44.entities.ThreatIntelFeed.filter({ feed_type: "APT" }).catch(() => base44.entities.ThreatIntelFeed.list("-created_date", 100).catch(() => [])),
    initialData: [],
  });

  const { data: aptActors = [] } = useQuery({
    queryKey: ["apt-actors"],
    queryFn: () => base44.entities.RansomwareGroup.list("-victims_count", 100).catch(() => []),
    initialData: [],
  });

  const allActors = [...aptActors];
  const threatLevels = [...new Set(allActors.map(a => a.threat_level).filter(Boolean))];
  const origins = [...new Set(allActors.map(a => a.origin_country).filter(Boolean))];

  const filtered = allActors.filter(a => {
    if (threatF !== "all" && a.threat_level    !== threatF) return false;
    if (typeF   !== "all" && a.origin_country  !== typeF)   return false;
    return true;
  });

  const activeActors = allActors.filter(a => a.status === "active");

  const actorRows = filtered.map(a => {
    const tc = THREAT_COLOR[a.threat_level] || "#64748b";
    const flag = COUNTRY_FLAG[a.origin_country?.toUpperCase()] || "🌍";
    return {
      _key: a.id,
      _cells: [
        <span className="text-[11px] font-semibold text-white">{a.group_name || a.actor_name || "—"}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-20 block">{a.aliases || "—"}</span>,
        <span className="text-[9px]">{flag} {a.origin_country || "Unknown"}</span>,
        <span className="text-[9px] capitalize px-2 py-0.5 rounded" style={{ color: a.status==="active"?DANGER:"#64748b", background: a.status==="active"?"rgba(239,68,68,0.1)":"transparent" }}>{a.status || "—"}</span>,
        <span className="text-[9px] font-mono" style={{ color: tc }}>{a.victims_count ?? 0}</span>,
        <span className="text-[9px] font-mono text-slate-500">{a.victims_this_month ?? 0}</span>,
        <span className="text-[9px] text-slate-400 truncate max-w-24 block">{a.target_sectors || "—"}</span>,
        <span className="text-[9px] text-slate-400">{a.target_geography || "—"}</span>,
        <span className="text-[9px]" style={{ color: tc, fontWeight: 700 }}>{a.threat_level || "—"}</span>,
        <span className="text-[9px] text-slate-500">{a.ransomware_family || "—"}</span>,
        <span className="text-[9px]" style={{ color: a.double_extortion ? WARN : "#64748b" }}>{a.double_extortion ? "⚠ Yes" : "No"}</span>,
      ],
    };
  });

  return (
    <GDSPageShell
      breadcrumbs={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "APT Tracking" }]}
      title="APT & Threat Actor Tracking" subtitle="NATION-STATE ACTORS · CYBERCRIME GROUPS · TTP MAPPING"
      actions={
        <div className="flex items-center gap-2">
          {[["threat level", threatF, setThreatF, ["all",...threatLevels]], ["origin", typeF, setTypeF, ["all",...origins]]].map(([key,val,set,opts]) => (
            <select key={key} value={val} onChange={e => set(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300 capitalize"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${key}` : o}</option>)}
            </select>
          ))}
        </div>
      }>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tracked Actors" value={allActors.length} color={CYAN} icon={Skull} />
        <StatCard label="Active Groups" value={activeActors.length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Critical Threat" value={allActors.filter(a=>a.threat_level==="critical").length} color={DANGER} icon={AlertTriangle} />
        <StatCard label="Total Victims" value={allActors.reduce((s,a)=>s+(a.victims_count||0),0)} color={WARN} icon={AlertTriangle} />
      </div>

      {/* Active Campaigns Alert */}
      {activeActors.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", color: DANGER }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span className="text-sm font-bold">{activeActors.length} threat actor group{activeActors.length > 1 ? "s" : ""} currently ACTIVE — {activeActors.map(a => a.group_name).join(", ")}</span>
        </div>
      )}

      {/* Actor Cards Grid */}
      {allActors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allActors.slice(0, 9).map(a => {
            const tc = THREAT_COLOR[a.threat_level] || "#64748b";
            const flag = COUNTRY_FLAG[a.origin_country?.toUpperCase()] || "🌍";
            return (
              <div key={a.id} className="rounded-xl p-4 transition-all hover:brightness-110"
                style={{ background: CARD, border: `1px solid ${tc}25` }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[12px] font-bold text-white">{a.group_name || a.actor_name}</h3>
                    {a.aliases && <p className="text-[8px] text-slate-600">aka {a.aliases}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{flag}</span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase" style={{ color: tc, background: `${tc}18` }}>{a.threat_level || "—"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px]">
                  <div><span className="text-slate-600">Status: </span><span style={{ color: a.status==="active"?DANGER:SUCCESS }}>{a.status || "—"}</span></div>
                  <div><span className="text-slate-600">Origin: </span><span className="text-slate-300">{a.origin_country || "—"}</span></div>
                  <div><span className="text-slate-600">Victims: </span><span className="font-mono" style={{ color: tc }}>{a.victims_count ?? 0}</span></div>
                  <div><span className="text-slate-600">This month: </span><span className="font-mono text-slate-300">{a.victims_this_month ?? 0}</span></div>
                </div>
                {a.target_sectors && <p className="text-[8px] text-slate-600 mt-2">{a.target_sectors}</p>}
              </div>
            );
          })}
        </div>
      )}

      <GDSTable
        columns={["Group Name","Aliases","Origin","Status","Total Victims","This Month","Target Sectors","Geography","Threat Level","Malware Family","Double Extortion"]}
        rows={actorRows} isLoading={isLoading}
        emptyText="No APT actors tracked" />
    </GDSPageShell>
  );
}