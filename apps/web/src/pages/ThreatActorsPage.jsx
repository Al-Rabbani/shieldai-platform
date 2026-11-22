import React, { useState } from "react";
import { Shield, X, Globe, Target, Zap } from "lucide-react";

const GOLD = "#C9A84C";

const ACTORS = [
  { name: "APT28 (Fancy Bear)", origin: "Russia", flag: "🇷🇺", type: "APT", level: "critical", active_since: "2008", sectors: ["Government","Defense","Energy"], last_active: "2026-06-10", ttps: 47, desc: "GRU-linked group responsible for DNC hack, NotPetya, and numerous NATO-targeted campaigns. Uses spear-phishing and custom malware.", tools: ["X-Agent", "Sofacy", "Zebrocy"], iocs: ["185.220.101.47", "updatesvc.net"] },
  { name: "APT29 (Cozy Bear)", origin: "Russia", flag: "🇷🇺", type: "APT", level: "critical", active_since: "2010", sectors: ["Government","Healthcare","Think Tanks"], last_active: "2026-06-12", ttps: 52, desc: "SVR-linked group known for SolarWinds supply chain attack. Highly stealthy, long-term access operations.", tools: ["SUNBURST", "Cobalt Strike", "MiniDuke"], iocs: ["updates.solarwinds-systems.com"] },
  { name: "Lazarus Group", origin: "North Korea", flag: "🇰🇵", type: "APT", level: "critical", active_since: "2007", sectors: ["Finance","Crypto","Defense"], last_active: "2026-06-14", ttps: 61, desc: "DPRK's primary offensive cyber unit. Responsible for Bangladesh Bank heist ($81M), WannaCry, and ongoing crypto theft.", tools: ["BLINDINGCAN", "HOPLIGHT", "WhisperGate"], iocs: ["3.34.183.17", "fakeupdate.net"] },
  { name: "LockBit 3.0", origin: "Cybercrime", flag: "🌐", type: "Ransomware", level: "critical", active_since: "2019", sectors: ["Healthcare","Manufacturing","Legal"], last_active: "2026-06-15", ttps: 28, desc: "Most prolific ransomware-as-a-service group. RaaS model with affiliates. Avg ransom $1.7M.", tools: ["LockBit Ransomware", "Mimikatz", "Cobalt Strike"], iocs: [] },
  { name: "BlackCat / ALPHV", origin: "Cybercrime", flag: "🌐", type: "Ransomware", level: "high", active_since: "2021", sectors: ["Healthcare","Finance","Energy"], last_active: "2026-05-28", ttps: 34, desc: "Rust-based ransomware with triple extortion. Behind Change Healthcare attack.", tools: ["ALPHV ransomware", "ExMatter"], iocs: [] },
  { name: "Volt Typhoon", origin: "China", flag: "🇨🇳", type: "APT", level: "critical", active_since: "2021", sectors: ["Critical Infrastructure","Utilities","Telecoms"], last_active: "2026-06-08", ttps: 39, desc: "PLA-linked group pre-positioning in US critical infrastructure for potential disruption.", tools: ["Living off the Land", "LOLBAS", "Certutil"], iocs: [] },
  { name: "Sandworm", origin: "Russia", flag: "🇷🇺", type: "APT", level: "critical", active_since: "2009", sectors: ["Energy","Government","Media"], last_active: "2026-06-01", ttps: 55, desc: "GRU Unit 74455. Responsible for Ukraine power grid attacks and Olympic Destroyer.", tools: ["Industroyer", "NotPetya", "Cyclops Blink"], iocs: [] },
  { name: "Scattered Spider", origin: "USA/UK", flag: "🇺🇸", type: "Hacktivist", level: "high", active_since: "2022", sectors: ["Hospitality","Finance","Telecoms"], last_active: "2026-06-03", ttps: 22, desc: "UNC3944. Social engineering specialists behind MGM and Caesars breaches.", tools: ["Okta abuse", "SIM swapping", "Vishing"], iocs: [] },
  { name: "FIN7", origin: "Cybercrime", flag: "🌐", type: "Financial", level: "high", active_since: "2015", sectors: ["Retail","Hospitality","Finance"], last_active: "2026-05-20", ttps: 41, desc: "Prolific financial crime group responsible for $1B+ in card fraud.", tools: ["CARBANAK", "BATELEUR", "BOOSTWRITE"], iocs: [] },
  { name: "Kimsuky", origin: "North Korea", flag: "🇰🇵", type: "APT", level: "high", active_since: "2012", sectors: ["Think Tanks","Government","Nuclear"], last_active: "2026-06-05", ttps: 33, desc: "DPRK intelligence collection group targeting geopolitical research organizations.", tools: ["BabyShark", "GoldDragon", "Kimsuky RAT"], iocs: [] },
  { name: "MuddyWater", origin: "Iran", flag: "🇮🇷", type: "APT", level: "high", active_since: "2017", sectors: ["Government","Telecoms","Defense"], last_active: "2026-05-30", ttps: 29, desc: "MOIS-linked group targeting Middle East and South Asia. Focus on espionage.", tools: ["POWERSTATS", "SHARPSTATS", "Ligolo"], iocs: [] },
  { name: "Turla", origin: "Russia", flag: "🇷🇺", type: "APT", level: "high", active_since: "2004", sectors: ["Government","Military","Embassies"], last_active: "2026-06-11", ttps: 68, desc: "FSB-linked group with two decades of espionage ops. Hijacked other APT infrastructure.", tools: ["Snake", "Carbon", "Kazuar"], iocs: [] },
];

const LEVEL_STYLE = {
  critical: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", ring: "#ef4444" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", ring: "#f97316" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", ring: "#eab308" },
};

const TYPE_COLORS = { APT: "#6366f1", Ransomware: "#ef4444", Hacktivist: "#eab308", Financial: "#f97316" };

export default function ThreatActorsPage() {
  const [regionFilter, setRegionFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  const regions = ["All", "Russia", "China", "North Korea", "Iran", "Cybercrime"];
  const types = ["All", "APT", "Ransomware", "Hacktivist", "Financial"];
  const levels = ["All", "critical", "high", "medium"];

  const filtered = ACTORS.filter(a =>
    (regionFilter === "All" || a.origin.includes(regionFilter) || (regionFilter === "Cybercrime" && a.origin === "Cybercrime")) &&
    (typeFilter === "All" || a.type === typeFilter) &&
    (levelFilter === "All" || a.level === levelFilter)
  );

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>Threat Intelligence</span><span>/</span>
          <span style={{ color: GOLD }}>Threat Actors</span>
        </div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3"><Target className="w-6 h-6" style={{ color: GOLD }} /> Threat Actor Intelligence</h1>
        <p className="text-slate-400 text-sm mt-0.5">Track APTs, ransomware gangs, and nation-state actors targeting your sector</p>
      </div>

      {/* Filters */}
      <div className="fu flex flex-wrap gap-3" style={{ animationDelay: "60ms" }}>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          {regions.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)}
              className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
              style={{ background: regionFilter === r ? GOLD : "transparent", color: regionFilter === r ? "#0A0E1A" : "#9CA3AF" }}>{r}</button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#111827", border: "1px solid #1F2937" }}>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
              style={{ background: typeFilter === t ? GOLD : "transparent", color: typeFilter === t ? "#0A0E1A" : "#9CA3AF" }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="fu grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" style={{ animationDelay: "100ms" }}>
        {filtered.map((actor, i) => {
          const ls = LEVEL_STYLE[actor.level] || LEVEL_STYLE.high;
          const tc = TYPE_COLORS[actor.type] || "#6B7280";
          return (
            <div key={actor.name}
              className="rounded-xl border p-5 transition-all hover:scale-[1.01] cursor-pointer"
              style={{ background: "#111827", borderColor: "#1F2937", animationDelay: `${i * 40}ms` }}
              onClick={() => setSelected(actor)}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ background: ls.bg, border: `2px solid ${ls.ring}`, color: ls.color }}>
                  {actor.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white truncate">{actor.name}</span>
                    <span className="text-lg">{actor.flag}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: tc + "20", color: tc }}>{actor.type}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize" style={{ color: ls.color, background: ls.bg, borderColor: ls.border }}>{actor.level}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-3 line-clamp-2">{actor.desc}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {actor.sectors.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}>{s}</span>)}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Since {actor.active_since}</span>
                <span>{actor.ttps} TTPs known</span>
                <button className="px-3 py-1 rounded-lg font-bold text-black" style={{ background: GOLD }}>View Profile</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-2xl rounded-2xl border overflow-hidden max-h-[90vh] overflow-y-auto" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selected.flag}</span>
                <div>
                  <h3 className="font-black text-white">{selected.name}</h3>
                  <div className="text-xs text-slate-400">{selected.origin} · Active since {selected.active_since}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-sm text-slate-300">{selected.desc}</p>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Known Tools</div>
                <div className="flex flex-wrap gap-2">
                  {selected.tools.map(t => <span key={t} className="text-xs px-2.5 py-1 rounded-lg font-mono" style={{ background: "#1F2937", color: "#C9A84C", border: "1px solid #374151" }}>{t}</span>)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Sectors</div>
                <div className="flex flex-wrap gap-2">
                  {selected.sectors.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}>{s}</span>)}
                </div>
              </div>
              {selected.iocs.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Associated IOCs</div>
                  <div className="space-y-1">
                    {selected.iocs.map(ioc => <div key={ioc} className="font-mono text-xs text-red-400 px-3 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>{ioc}</div>)}
                  </div>
                </div>
              )}
              <div className="p-4 rounded-xl" style={{ background: "rgba(201,168,76,0.08)", border: `1px solid ${GOLD}33` }}>
                <div className="text-xs font-bold mb-1" style={{ color: GOLD }}>Relevance to Your Organization</div>
                <div className="text-xs text-slate-300">Sector overlap detected — monitor TTPs and apply relevant mitigations</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}