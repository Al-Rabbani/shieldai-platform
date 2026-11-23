import React, { useState } from "react";
import { Shield, Globe, ChevronRight, X } from "lucide-react";

const GOLD = "#C9A84C";

const COUNTRIES = [
  { name: "Russia", code: "RU", flag: "🇷🇺", level: "critical", actors: ["APT28","APT29","Sandworm","Turla"], campaigns: 14, sectors: ["Government","Energy","Defense"], note: "Most prolific state-sponsored attacker. GRU, FSB, SVR all active." },
  { name: "China", code: "CN", flag: "🇨🇳", level: "critical", actors: ["Volt Typhoon","APT41","Salt Typhoon"], campaigns: 11, sectors: ["Critical Infra","Tech","Telecoms"], note: "Pre-positioning in critical infrastructure. Long-term persistent access." },
  { name: "North Korea", code: "KP", flag: "🇰🇵", level: "critical", actors: ["Lazarus","Kimsuky","Andariel"], campaigns: 9, sectors: ["Finance","Crypto","Defense"], note: "Revenue generation through crypto theft alongside espionage ops." },
  { name: "Iran", code: "IR", flag: "🇮🇷", level: "high", actors: ["MuddyWater","APT33","Charming Kitten"], campaigns: 7, sectors: ["Government","Energy","Finance"], note: "Regional focus on Middle East + US targets. Increasingly disruptive." },
  { name: "USA", code: "US", flag: "🇺🇸", level: "medium", actors: ["NSA TAO","Equation Group"], campaigns: 4, sectors: ["Global"], note: "Defensive posture dominant. Offensive ops against adversaries." },
  { name: "Israel", code: "IL", flag: "🇮🇱", level: "medium", actors: ["Unit 8200"], campaigns: 3, sectors: ["Telecoms","Government"], note: "Highly capable signals intelligence and cyber operations." },
  { name: "India", code: "IN", flag: "🇮🇳", level: "low", actors: ["SideWinder"], campaigns: 2, sectors: ["Government"], note: "Regional espionage focus on Pakistan and China targets." },
  { name: "Pakistan", code: "PK", flag: "🇵🇰", level: "low", actors: ["Transparent Tribe"], campaigns: 2, sectors: ["Defense","Government"], note: "Primarily targeting Indian government and military." },
  { name: "Turkey", code: "TR", flag: "🇹🇷", level: "low", actors: ["Sea Turtle"], campaigns: 2, sectors: ["Telecoms","Media"], note: "DNS hijacking campaigns against regional targets." },
  { name: "Brazil", code: "BR", flag: "🇧🇷", level: "low", actors: ["Guildma"], campaigns: 1, sectors: ["Finance","Banking"], note: "Financial fraud focused, primarily Latin American banks." },
];

const CAMPAIGNS = [
  { name: "Operation Velvet Tempest", origin: "Russia", flag: "🇷🇺", targets: "European Energy Grid", start: "2026-04", ttps: ["T1190","T1566","T1078"], confidence: "High" },
  { name: "Typhoon Pre-Positioning", origin: "China", flag: "🇨🇳", targets: "US Critical Infrastructure", start: "2025-11", ttps: ["T1078","T1021","T1005"], confidence: "High" },
  { name: "Operation AppleJeus", origin: "North Korea", flag: "🇰🇵", targets: "Crypto Exchanges Worldwide", start: "2026-01", ttps: ["T1566","T1059","T1041"], confidence: "Medium" },
  { name: "Charming Kitten Wave 4", origin: "Iran", flag: "🇮🇷", targets: "Academic Researchers, Think Tanks", start: "2026-03", ttps: ["T1566","T1078","T1071"], confidence: "High" },
  { name: "SolarWinds Follow-On", origin: "Russia", flag: "🇷🇺", targets: "IT Supply Chain", start: "2025-09", ttps: ["T1195","T1059","T1027"], confidence: "Medium" },
];

const REGIONS = [
  { name: "North America", risk: 62, threats: ["Cl0p","LockBit","Volt Typhoon"] },
  { name: "Europe", risk: 71, threats: ["APT28","Sandworm","LockBit"] },
  { name: "Middle East", risk: 78, threats: ["MuddyWater","APT33","Kimsuky"] },
  { name: "Asia-Pacific", risk: 65, threats: ["Lazarus","APT41","SideWinder"] },
  { name: "Latin America", risk: 44, threats: ["Guildma","RaaS affiliates"] },
  { name: "Africa", risk: 35, threats: ["Business Email Compromise"] },
];

const LEVEL_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

export default function GeoThreatMapPage() {
  const [selected, setSelected] = useState(null);
  const [panel, setPanel] = useState(null);

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}`}</style>

      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>Threat Intelligence</span><span>/</span>
          <span style={{ color: GOLD }}>Geo Threat Map</span>
        </div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3"><Globe className="w-6 h-6" style={{ color: GOLD }} /> Geopolitical Threat Map</h1>
        <p className="text-slate-400 text-sm mt-0.5">Nation-state cyber activity, active campaigns, and regional risk levels</p>
      </div>

      <div className="fu grid grid-cols-1 xl:grid-cols-3 gap-6" style={{ animationDelay: "60ms" }}>
        {/* Country Grid (map substitute) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-xl border p-5" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white mb-4">Threat Origin Countries</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COUNTRIES.map(c => (
                <button key={c.code}
                  onClick={() => setPanel(c)}
                  className="rounded-xl p-4 text-left transition-all hover:scale-[1.02] border"
                  style={{
                    background: LEVEL_COLOR[c.level] + "0D",
                    borderColor: LEVEL_COLOR[c.level] + "44",
                    boxShadow: selected?.code === c.code ? `0 0 20px ${LEVEL_COLOR[c.level]}40` : "none"
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{c.flag}</span>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: LEVEL_COLOR[c.level] }} />
                  </div>
                  <div className="text-sm font-bold text-white mb-1">{c.name}</div>
                  <div className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize inline-block mb-2"
                    style={{ background: LEVEL_COLOR[c.level] + "20", color: LEVEL_COLOR[c.level] }}>{c.level}</div>
                  <div className="text-[10px] text-slate-500">{c.campaigns} active campaigns · {c.actors.length} groups</div>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              {Object.entries(LEVEL_COLOR).map(([l, c]) => (
                <div key={l} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                  <span className="capitalize">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Risk */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {REGIONS.map(r => (
              <div key={r.name} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: "#1F2937" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{r.name}</span>
                  <span className="text-sm font-black" style={{ color: r.risk >= 70 ? "#ef4444" : r.risk >= 50 ? "#eab308" : "#22c55e" }}>{r.risk}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${r.risk}%`, background: r.risk >= 70 ? "#ef4444" : r.risk >= 50 ? "#eab308" : "#22c55e" }} />
                </div>
                <div className="text-[10px] text-slate-500">{r.threats.slice(0,2).join(", ")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="space-y-4">
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
              <h3 className="text-sm font-bold text-white">Active Nation-State Campaigns</h3>
            </div>
            <div className="divide-y" style={{ divideColor: "#1F2937" }}>
              {CAMPAIGNS.map((c, i) => (
                <div key={i} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{c.flag}</span>
                    <span className="text-sm font-bold text-white">{c.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mb-2">{c.targets}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.ttps.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#1F2937", color: GOLD, border: `1px solid ${GOLD}33` }}>{t}</span>)}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ml-auto font-bold ${c.confidence === "High" ? "text-emerald-400" : "text-amber-400"}`}
                      style={{ background: c.confidence === "High" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)" }}>{c.confidence}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 mt-1.5">Since {c.start}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Country Detail Panel */}
      {panel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-2xl border p-6" style={{ background: "#111827", borderColor: "#374151" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{panel.flag}</span>
                <div>
                  <h3 className="font-black text-white">{panel.name}</h3>
                  <span className="text-xs capitalize px-2 py-0.5 rounded-full font-bold" style={{ background: LEVEL_COLOR[panel.level] + "20", color: LEVEL_COLOR[panel.level] }}>{panel.level} threat</span>
                </div>
              </div>
              <button onClick={() => setPanel(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-300 mb-4">{panel.note}</p>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Known Threat Actors</div>
                <div className="flex flex-wrap gap-2">{panel.actors.map(a => <span key={a} className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: "#1F2937", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>{a}</span>)}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Target Sectors</div>
                <div className="flex flex-wrap gap-2">{panel.sectors.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}>{s}</span>)}</div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#1F2937" }}>
                <span className="text-xs text-slate-400">Active Campaigns</span>
                <span className="text-sm font-black text-white">{panel.campaigns}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}