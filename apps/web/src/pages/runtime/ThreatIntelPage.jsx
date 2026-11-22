import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Brain, Search, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const SEV_STYLE = { critical: "text-red-400 border-red-500/40 bg-red-500/10", high: "text-orange-400 border-orange-500/40 bg-orange-500/10", medium: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10", low: "text-blue-400 border-blue-500/40 bg-blue-500/10", info: "text-[#94a3b8] border-[#334155] bg-[#1e293b]" };
const SRC_STYLE = { cisa_kev: "text-red-300 bg-red-500/15 border-red-500/30", nvd: "text-orange-300 bg-orange-500/15 border-orange-500/30", mitre_attack: "text-purple-300 bg-purple-500/15 border-purple-500/30", alienvault: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30", virustotal: "text-blue-300 bg-blue-500/15 border-blue-500/30", shodan: "text-orange-300 bg-orange-500/15 border-orange-500/30", internal: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30" };
const STATUS_STYLE = { new: "text-blue-400 bg-blue-500/10 border-blue-500/20", reviewed: "text-[#94a3b8] bg-[#1e293b] border-[#334155]", actioned: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dismissed: "text-[#475569] bg-[#0a0f1e] border-[#1e293b]" };
const TABS = ["all", "cve", "ioc", "ttp", "threat_actor"];

export default function ThreatIntelPage() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const { data: feeds = [] } = useQuery({ queryKey: ["threat-intel"], queryFn: () => base44.entities.ThreatIntelFeed.list("-ingested_at", 50) });

  const filtered = feeds.filter(f => {
    if (tab !== "all" && f.feed_type !== tab) return false;
    if (search && !f.title?.toLowerCase().includes(search.toLowerCase()) && !f.cve_id?.includes(search)) return false;
    return true;
  });

  const total = feeds.length;
  const actionable = feeds.filter(f => f.is_actionable).length;
  const matched = feeds.filter(f => f.matched_assets).length;
  const newCount = feeds.filter(f => f.status === "new").length;

  return (
    <div className="bg-[#0a0f1e] min-h-screen -m-6 p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0] flex items-center gap-2"><Brain className="w-6 h-6 text-purple-400" /> Threat Intelligence Feed</h1>
          <p className="text-sm text-[#64748b] mt-0.5">CISA KEV · NVD · MITRE ATT&CK · AlienVault · VirusTotal</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[["Total Feeds", total, "text-[#e2e8f0]"], ["Actionable", actionable, "text-red-400"], ["Asset Matches", matched, "text-amber-400"], ["New Today", newCount, "text-blue-400"]].map(([l, v, c]) => (
          <div key={l} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 text-center">
            <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{l}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 h-full">
        {/* Main table */}
        <div className="flex-1 bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#1e293b] flex items-center gap-3">
            <div className="flex gap-1">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded text-[11px] font-semibold uppercase transition-colors ${tab === t ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-[#64748b] hover:text-[#94a3b8]"}`}>
                  {t === "threat_actor" ? "ACTOR" : t}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748b]" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 h-8 bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0] text-xs" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map(feed => (
              <div key={feed.id} onClick={() => setSelected(feed)} className={`px-4 py-3 border-b border-[#1e293b] hover:bg-[#1e293b]/40 cursor-pointer transition-colors flex items-center gap-3 ${selected?.id === feed.id ? "bg-[#1e293b]/60" : ""}`}>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase whitespace-nowrap ${SRC_STYLE[feed.source]}`}>{feed.source?.replace(/_/g, " ")}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase ${SEV_STYLE[feed.severity]}`}>{feed.severity}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#e2e8f0] truncate">{feed.title}</p>
                  {feed.cve_id && <span className="text-[10px] font-mono text-orange-400">{feed.cve_id}</span>}
                  {feed.threat_actor && <span className="text-[10px] text-[#64748b]">{feed.threat_actor}</span>}
                </div>
                {feed.is_actionable && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 flex-shrink-0">ACTIONABLE</span>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize flex-shrink-0 ${STATUS_STYLE[feed.status]}`}>{feed.status}</span>
                <ChevronRight className="w-3 h-3 text-[#475569] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 bg-[#111827] border border-[#1e293b] rounded-xl flex flex-col overflow-hidden flex-shrink-0">
            <div className="p-4 border-b border-[#1e293b] flex items-start justify-between gap-2">
              <h3 className="text-xs font-semibold text-[#e2e8f0] leading-snug">{selected.title}</h3>
              <button onClick={() => setSelected(null)}><X className="w-4 h-4 text-[#64748b] hover:text-[#e2e8f0]" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${SRC_STYLE[selected.source]}`}>{selected.source?.replace(/_/g, " ")}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${SEV_STYLE[selected.severity]}`}>{selected.severity}</span>
              </div>
              {selected.cve_id && <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">CVE</p><p className="text-xs font-mono text-orange-400">{selected.cve_id} <span className="text-[#94a3b8]">CVSS {selected.cvss_score}</span></p></div>}
              {selected.ioc_value && <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">IOC ({selected.ioc_type})</p><p className="text-xs font-mono text-red-400 break-all">{selected.ioc_value}</p></div>}
              {selected.threat_actor && <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">Threat Actor</p><p className="text-xs text-[#94a3b8]">{selected.threat_actor}</p></div>}
              <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">Description</p><p className="text-xs text-[#94a3b8] leading-relaxed">{selected.description}</p></div>
              {selected.affected_products && <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">Affected Products</p><p className="text-xs text-[#94a3b8]">{selected.affected_products}</p></div>}
              {selected.matched_assets && <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">Matched Assets</p><p className="text-xs text-amber-400">{selected.matched_assets}</p></div>}
              {selected.published_at && <div><p className="text-[10px] text-[#64748b] uppercase tracking-wider mb-1">Published</p><p className="text-xs text-[#64748b]">{new Date(selected.published_at).toLocaleDateString()}</p></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}