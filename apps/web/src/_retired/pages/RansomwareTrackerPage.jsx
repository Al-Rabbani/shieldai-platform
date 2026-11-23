import React, { useState } from "react";
import { Shield, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

const GOLD = "#C9A84C";

const GROUPS = [
  { name: "LockBit", victims: 47, trend: "up", sectors: ["Healthcare","Manufacturing"], avg_ransom: "$1.7M", status: "active", color: "#ef4444" },
  { name: "BlackCat/ALPHV", victims: 31, trend: "down", sectors: ["Finance","Healthcare"], avg_ransom: "$2.1M", status: "disrupted", color: "#6B7280" },
  { name: "Cl0p", victims: 28, trend: "up", sectors: ["Finance","Legal","Energy"], avg_ransom: "$3.5M", status: "active", color: "#ef4444" },
  { name: "Play", victims: 22, trend: "stable", sectors: ["Manufacturing","Government"], avg_ransom: "$800K", status: "active", color: "#ef4444" },
  { name: "Akira", victims: 19, trend: "up", sectors: ["Education","SMB"], avg_ransom: "$600K", status: "active", color: "#ef4444" },
  { name: "BlackBasta", victims: 17, trend: "down", sectors: ["Healthcare","Utilities"], avg_ransom: "$1.2M", status: "rebranded", color: "#eab308" },
  { name: "RansomHub", victims: 14, trend: "up", sectors: ["Critical Infra","Finance"], avg_ransom: "$2.8M", status: "active", color: "#ef4444" },
  { name: "8Base", victims: 11, trend: "stable", sectors: ["SMB","Retail"], avg_ransom: "$350K", status: "active", color: "#ef4444" },
  { name: "Medusa", victims: 9, trend: "up", sectors: ["Education","Government"], avg_ransom: "$900K", status: "active", color: "#ef4444" },
  { name: "DragonForce", victims: 6, trend: "up", sectors: ["Telecoms","Media"], avg_ransom: "$1.1M", status: "active", color: "#ef4444" },
];

const VICTIMS = [
  { company: "M****n Healthcare", sector: "Healthcare", country: "🇺🇸", group: "Cl0p", date: "2026-06-14", stolen: true, paid: "unknown", your_sector: false },
  { company: "F****d Motors", sector: "Manufacturing", country: "🇩🇪", group: "LockBit", date: "2026-06-13", stolen: true, paid: false, your_sector: false },
  { company: "T****h Capital", sector: "Finance", country: "🇬🇧", group: "BlackCat", date: "2026-06-12", stolen: true, paid: true, your_sector: true },
  { company: "E****y Grid Co.", sector: "Energy", country: "🇫🇷", group: "Cl0p", date: "2026-06-11", stolen: false, paid: false, your_sector: false },
  { company: "M****d University", sector: "Education", country: "🇺🇸", group: "Akira", date: "2026-06-10", stolen: true, paid: "unknown", your_sector: false },
  { company: "P****c Telecom", sector: "Telecoms", country: "🇦🇺", group: "DragonForce", date: "2026-06-09", stolen: true, paid: false, your_sector: false },
  { company: "S****e Insurance", sector: "Finance", country: "🇺🇸", group: "RansomHub", date: "2026-06-08", stolen: true, paid: true, your_sector: true },
  { company: "C****l Hospital", sector: "Healthcare", country: "🇨🇦", group: "Play", date: "2026-06-07", stolen: false, paid: false, your_sector: false },
];

const SECTORS = ["Finance","Healthcare","Manufacturing","Energy","Education","Government","Telecoms","Retail","Legal","Utilities"];

export default function RansomwareTrackerPage() {
  const [now] = useState(new Date().toLocaleTimeString());
  const TrendIcon = ({ t }) => t === "up" ? <TrendingUp className="w-3 h-3 text-red-400" /> : t === "down" ? <TrendingDown className="w-3 h-3 text-emerald-400" /> : <Minus className="w-3 h-3 text-slate-500" />;

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}@keyframes bpulse{0%,100%{border-color:rgba(239,68,68,0.3)}50%{border-color:rgba(239,68,68,0.8)}}.bpulse{animation:bpulse 2s infinite}`}</style>

      <div className="fu">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Shield className="w-3.5 h-3.5" /><span>Threat Intelligence</span><span>/</span>
          <span style={{ color: GOLD }}>Ransomware Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h1 className="text-2xl font-black text-white">LIVE RANSOMWARE MONITOR</h1>
          <span className="text-xs text-slate-500 ml-2">Updated: {now}</span>
        </div>
        <p className="text-slate-400 text-sm mt-0.5">Real-time tracking of active ransomware groups and victim activity</p>
      </div>

      {/* Stats */}
      <div className="fu grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: "60ms" }}>
        {[
          { label: "Active Groups Tracked", value: GROUPS.filter(g=>g.status==="active").length, color: "#ef4444" },
          { label: "New Victims (7d)", value: VICTIMS.length, color: "#f97316" },
          { label: "Sectors Targeted", value: SECTORS.length, color: "#eab308" },
          { label: "Avg Ransom Demand", value: "$1.4M", color: GOLD },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 border" style={{ background: "#111827", borderColor: s.color + "33" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{s.label}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="fu grid grid-cols-1 xl:grid-cols-5 gap-6" style={{ animationDelay: "100ms" }}>
        {/* Leaderboard */}
        <div className="xl:col-span-2 rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white">Active Groups Leaderboard</h3>
          </div>
          <div className="divide-y" style={{ divideColor: "#1F2937" }}>
            {GROUPS.map((g, i) => (
              <div key={g.name}
                className={`px-4 py-3 flex items-center gap-3 ${g.status === "active" ? "bpulse" : ""}`}
                style={{ borderLeft: `3px solid ${g.color}` }}>
                <span className="text-xs font-black text-slate-600 w-4">{i+1}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                  style={{ background: g.color + "20", color: g.color }}>{g.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{g.name}</span>
                    <TrendIcon t={g.trend} />
                  </div>
                  <div className="text-[10px] text-slate-500">{g.sectors[0]} · {g.avg_ransom}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-400">{g.victims}</div>
                  <div className="text-[10px] text-slate-600">victims</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Victims Feed */}
        <div className="xl:col-span-3 rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
          <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
            <h3 className="text-sm font-bold text-white">Recent Confirmed Victims</h3>
          </div>
          <div className="divide-y" style={{ divideColor: "#1F2937" }}>
            {VICTIMS.map((v, i) => (
              <div key={i} className="px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{v.country}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-white">{v.company}</span>
                      {v.your_sector && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-black" style={{ background: GOLD }}>YOUR SECTOR</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md" style={{ background: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}>{v.sector}</span>
                      <span className="text-red-400 font-bold">{v.group}</span>
                      <span>{v.date}</span>
                      {v.stolen && <span className="text-orange-400">Data stolen</span>}
                      <span className={v.paid === true ? "text-red-400" : v.paid === false ? "text-emerald-400" : "text-slate-500"}>
                        Paid: {v.paid === true ? "Yes" : v.paid === false ? "No" : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Heatmap */}
      <div className="fu rounded-xl border p-5 overflow-x-auto" style={{ background: "#111827", borderColor: "#1F2937", animationDelay: "140ms" }}>
        <h3 className="text-sm font-bold text-white mb-4">Sector Attack Frequency Heatmap</h3>
        <div className="min-w-[600px]">
          <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${GROUPS.slice(0,6).length}, 1fr)` }}>
            <div />
            {GROUPS.slice(0,6).map(g => <div key={g.name} className="text-[9px] text-slate-500 text-center pb-1 truncate">{g.name}</div>)}
            {SECTORS.map(sector => (
              <React.Fragment key={sector}>
                <div className="text-[10px] text-slate-400 text-right pr-2 flex items-center justify-end">{sector}</div>
                {GROUPS.slice(0,6).map(g => {
                  // Intensity is decided by whether this group targets this sector, not by chance.
                  const intensity = g.sectors.includes(sector) ? 0.85 : 0.08;
                  const alpha = Math.round(intensity * 255).toString(16).padStart(2, "0");
                  return (
                    <div key={g.name} className="rounded aspect-square"
                      style={{ background: `#ef4444${alpha}`, minHeight: 28 }} />
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[10px] text-slate-500">Low</span>
            {["10","30","50","80","CC"].map(a => <div key={a} className="w-4 h-3 rounded-sm" style={{ background: `#ef4444${a}` }} />)}
            <span className="text-[10px] text-slate-500">High</span>
          </div>
        </div>
      </div>
    </div>
  );
}