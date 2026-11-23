import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, RefreshCw, Plus, Eye, X, ChevronDown, ChevronRight, Bookmark, Bug } from "lucide-react";
import { toast } from "sonner";

const GOLD = "#C9A84C";

const SAMPLE_FEED = [
  { id: 1, type: "cve", title: "CVE-2026-0123 — Critical RCE in Apache Struts 2.x", source: "NVD", time: "2 min ago", severity: "critical", cvss: 9.8, desc: "Unauthenticated remote code execution via crafted OGNL expression. Affects Apache Struts 2.0–2.5.32.", systems: ["Apache Struts 2.x", "Java"], affects_you: true },
  { id: 2, type: "ransomware", title: "LockBit claims HealthCo UK as new victim", source: "Ransomwatch", time: "8 min ago", severity: "critical", desc: "LockBit posted HealthCo UK on their .onion leak site with 120GB claimed data.", systems: ["Healthcare"], affects_you: false },
  { id: 3, type: "breach", title: "MongoDB Atlas credential exposure via public S3 bucket", source: "HaveIBeenPwned", time: "22 min ago", severity: "high", desc: "3.4M MongoDB Atlas credentials exposed in misconfigured S3 bucket belonging to unidentified SaaS vendor.", systems: ["MongoDB", "AWS S3"], affects_you: false },
  { id: 4, type: "ioc", title: "185.234.219.44 actively scanning port 443 and 8443", source: "AlienVault OTX", time: "1h ago", severity: "high", desc: "Mass scanning activity from Russia-attributed IP. Targets include Kubernetes API servers and exposed admin panels.", systems: ["Kubernetes", "HTTP/S"], affects_you: true },
  { id: 5, type: "apt", title: "APT28 new phishing campaign targeting European FinTech", source: "SOCRadar", time: "2h ago", severity: "critical", desc: "Spear-phishing emails impersonating SWIFT banking authority sent to 200+ FinTech firms.", systems: ["Email", "Windows"], affects_you: true },
  { id: 6, type: "zero-day", title: "Zero-Day in GitLab CE/EE CVSS 9.6 — no patch available", source: "GitHub Advisories", time: "3h ago", severity: "critical", cvss: 9.6, desc: "Arbitrary file write vulnerability allowing unauthenticated attackers to execute code on GitLab instances.", systems: ["GitLab CE", "GitLab EE"], affects_you: false },
  { id: 7, type: "cve", title: "CVE-2025-9812 — Privilege Escalation in Linux kernel 6.x", source: "CISA KEV", time: "4h ago", severity: "high", cvss: 7.8, desc: "Local privilege escalation in Linux kernel netfilter subsystem. Widely exploited in the wild.", systems: ["Linux 6.x", "Ubuntu", "Debian"], affects_you: false },
  { id: 8, type: "breach", title: "250K developer API tokens leaked from npm registry audit", source: "GitHub Advisories", time: "5h ago", severity: "high", desc: "Audit logs of npm registry exposed. 250,000 developer tokens potentially compromised.", systems: ["npm", "Node.js"], affects_you: false },
  { id: 9, type: "ransomware", title: "RansomHub targets US healthcare with triple extortion", source: "Ransomwatch", time: "6h ago", severity: "high", desc: "New RansomHub campaign combines data encryption, DDoS, and customer notification threats.", systems: ["Healthcare", "Windows Server"], affects_you: false },
  { id: 10, type: "ioc", title: "Malicious npm package 'lodash-secure' detected — 12K installs", source: "GitHub Advisories", time: "8h ago", severity: "critical", desc: "Typosquatting attack targeting lodash users. Package exfiltrates .env files and AWS credentials.", systems: ["npm", "Node.js"], affects_you: false },
  { id: 11, type: "apt", title: "Lazarus Group deploys new macOS backdoor targeting crypto firms", source: "SOCRadar", time: "10h ago", severity: "high", desc: "Custom macOS backdoor 'SilverFox' deployed via trojanized Zoom installer targeting cryptocurrency exchanges.", systems: ["macOS", "Zoom"], affects_you: false },
  { id: 12, type: "cve", title: "CVE-2025-3841 — SSRF in Spring Boot Actuator endpoints", source: "NVD", time: "12h ago", severity: "medium", cvss: 6.5, desc: "SSRF vulnerability in Spring Boot Actuator when exposed without authentication.", systems: ["Spring Boot 3.x", "Java"], affects_you: false },
];

const TICKER_ITEMS = [
  "🔴 CVE-2026-0123 — Critical RCE in Apache Struts",
  "🟠 LockBit — New victim: HealthCo UK",
  "🔴 IOC: 185.234.219.44 actively scanning port 443",
  "🟠 APT28 — European FinTech phishing campaign active",
  "🔴 Zero-Day: GitLab CE/EE CVSS 9.6 — No patch",
  "🟡 250K npm developer tokens potentially compromised",
];

const TYPE_ICONS = { cve: "🦠", ransomware: "💀", breach: "🔐", ioc: "🎯", apt: "👤", "zero-day": "⚡" };
const TYPE_LABELS = { cve: "CVE", ransomware: "Ransomware", breach: "Breach", ioc: "IOC Alert", apt: "APT Activity", "zero-day": "Zero-Day" };
const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const SOURCES = ["CISA KEV", "NVD", "AlienVault OTX", "HaveIBeenPwned", "Ransomwatch", "SOCRadar", "GitHub Advisories"];

function FeedItem({ item }) {
  const [expanded, setExpanded] = useState(false);
  const sc = SEV_COLORS[item.severity] || "#6B7280";
  return (
    <div className="rounded-xl border transition-all hover:scale-[1.002]"
      style={{ background: "#111827", borderLeft: `3px solid ${sc}`, borderTop: "1px solid #1F2937", borderRight: "1px solid #1F2937", borderBottom: "1px solid #1F2937" }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICONS[item.type] || "⚠️"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap mb-1.5">
              <span className="text-sm font-bold text-white flex-1 min-w-0">{item.title}</span>
              {item.affects_you && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-black flex-shrink-0 animate-pulse" style={{ background: "#ef4444" }}>⚡ AFFECTS YOU</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-[10px] mb-2">
              <span className="px-2 py-0.5 rounded-full border font-bold capitalize" style={{ color: sc, background: sc + "15", borderColor: sc + "40" }}>{item.severity}</span>
              <span className="px-2 py-0.5 rounded-md" style={{ background: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}>{item.source}</span>
              <span className="text-slate-500">{item.time}</span>
              {item.cvss && <span className="px-2 py-0.5 rounded-md font-bold" style={{ background: "#1F2937", color: GOLD }}>CVSS {item.cvss}</span>}
            </div>
            {!expanded && <p className="text-xs text-slate-400 line-clamp-2">{item.desc}</p>}
            {expanded && (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">{item.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.systems.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "#1F2937", color: "#9CA3AF", border: "1px solid #374151" }}>{s}</span>)}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => toast.success("Added to watchlist")} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <Bookmark className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button onClick={() => toast.success("Finding created")} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <Plus className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThreatFeedPage() {
  const [severities, setSeverities] = useState({ critical: true, high: true, medium: true, low: false });
  const [types, setTypes] = useState({ cve: true, breach: true, ransomware: true, ioc: true, apt: true, "zero-day": true });
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c <= 1 ? 60 : c - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: dbFeeds = [] } = useQuery({
    queryKey: ["threat-feeds"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-detected_at", 20).catch(() => []),
    refetchInterval: 60000,
  });

  const filteredFeed = SAMPLE_FEED.filter(i =>
    severities[i.severity] && types[i.type]
  );

  const TRENDING = SAMPLE_FEED.filter(i => i.affects_you || i.severity === "critical").slice(0, 5);

  return (
    <div className="min-h-screen" style={{ background: "#0A0E1A" }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}.fu{animation:fadeUp 0.4s ease both}@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}.marquee{animation:marquee 40s linear infinite}`}</style>

      {/* Ticker */}
      <div className="overflow-hidden border-b py-2" style={{ background: "#0d1220", borderColor: "#1F2937" }}>
        <div className="flex marquee whitespace-nowrap gap-12">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
            <span key={i} className="text-xs font-semibold text-slate-300 flex-shrink-0">{t}</span>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="fu flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <Shield className="w-3.5 h-3.5" /><span>Threat Intelligence</span><span>/</span>
              <span style={{ color: GOLD }}>Live Feed</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">Global Threat Feed</h1>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)" }}>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-400">LIVE</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">Refreshing in {countdown}s · {filteredFeed.length} events shown</p>
          </div>
          <button onClick={() => { setCountdown(60); toast.success("Feed refreshed"); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:scale-105"
            style={{ color: GOLD, borderColor: `${GOLD}44`, background: `${GOLD}10` }}>
            <RefreshCw className="w-4 h-4" /> Refresh Now
          </button>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-48 flex-shrink-0 space-y-4">
            <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Severity</div>
              {Object.entries(severities).map(([s, checked]) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={checked} onChange={() => setSeverities(p => ({ ...p, [s]: !p[s] }))}
                    className="rounded" />
                  <span className="text-xs capitalize font-semibold" style={{ color: SEV_COLORS[s] }}>{s}</span>
                </label>
              ))}
            </div>
            <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Type</div>
              {Object.entries(types).map(([t, checked]) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={checked} onChange={() => setTypes(p => ({ ...p, [t]: !p[t] }))} className="rounded" />
                  <span className="text-xs text-slate-400">{TYPE_LABELS[t]}</span>
                </label>
              ))}
            </div>
            <div className="rounded-xl border p-4" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Sources</div>
              {SOURCES.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-[10px] text-slate-400">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Main Feed */}
          <div className="flex-1 min-w-0 space-y-3">
            {filteredFeed.map((item, i) => (
              <div key={item.id} className="fu" style={{ animationDelay: `${i * 40}ms` }}>
                <FeedItem item={item} />
              </div>
            ))}
          </div>

          {/* Trending sidebar */}
          <div className="w-56 flex-shrink-0 space-y-3">
            <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
              <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
                <h3 className="text-xs font-bold text-white">🔥 Trending (24h)</h3>
              </div>
              {TRENDING.map((t, i) => (
                <div key={t.id} className="px-4 py-3 border-b hover:bg-white/5 transition-colors" style={{ borderColor: "#1F2937" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-slate-600 w-3">{i+1}</span>
                    <span className="text-xs text-white font-semibold line-clamp-2">{t.title.split("—")[0].trim()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1F2937] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${100 - i * 15}%`, background: SEV_COLORS[t.severity] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}