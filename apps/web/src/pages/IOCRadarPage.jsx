import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Target, Eye, RefreshCw, Plus, Copy, Check, AlertTriangle, Shield, Wifi, Globe, Hash, Link2, Loader2, Radio, Rss } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FEEDS = [
  { name: "CISA KEV", color: "#EF4444", desc: "Known Exploited Vulnerabilities" },
  { name: "AlienVault OTX", color: "#C9A84C", desc: "Open Threat Exchange" },
  { name: "AbuseIPDB", color: "#8B5CF6", desc: "IP Abuse Database" },
  { name: "VirusTotal", color: "#3B82F6", desc: "Multi-engine AV scanner" },
];

function Shimmer({ className }) {
  return <div className={cn("animate-pulse bg-gradient-to-r from-[#1F2937] via-[#374151] to-[#1F2937] bg-[length:400%_100%] rounded", className)} style={{ animation: "shimmer 1.5s infinite" }} />;
}

function ThreatScoreBadge({ score }) {
  const color = score >= 70 ? "#EF4444" : score >= 31 ? "#EAB308" : "#10B981";
  const bg = score >= 70 ? "rgba(239,68,68,0.12)" : score >= 31 ? "rgba(234,179,8,0.12)" : "rgba(16,185,129,0.12)";
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono border"
      style={{ color, background: bg, borderColor: color + "44" }}>
      {score}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, loading }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (loading || !value) return;
    let start = 0;
    const end = parseInt(value) || 0;
    const step = Math.max(1, Math.floor(end / 30));
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      setDisplay(start);
      if (start >= end) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value, loading]);

  return (
    <div className="rounded-xl p-5 border transition-all duration-300 hover:scale-[1.02]"
      style={{ background: "#111827", borderColor: color + "33" }}
    >
      {loading ? (
        <><Shimmer className="h-4 w-24 mb-3" /><Shimmer className="h-8 w-16" /></>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>{label}</span>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="text-3xl font-black text-white">{display.toLocaleString()}</div>
        </>
      )}
    </div>
  );
}

function IOCTypeIcon({ type }) {
  const map = { ip: Globe, domain: Radio, hash: Hash, url: Link2 };
  const Icon = map[type] || Globe;
  const colors = { ip: "#6366F1", domain: "#C9A84C", hash: "#8B5CF6", url: "#3B82F6" };
  return <Icon className="w-3.5 h-3.5" style={{ color: colors[type] || "#9CA3AF" }} />;
}

export default function IOCRadarPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (e) => { if (e.key === "/" && e.target.tagName !== "INPUT") { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: iocs = [], isLoading } = useQuery({
    queryKey: ["ioc-records"],
    queryFn: () => base44.entities.IOCRecord.list("-last_checked", 50),
  });

  const watchlist = iocs.filter(i => i.in_watchlist);

  const stats = {
    total: iocs.length,
    malicious: iocs.filter(i => i.status === "malicious").length,
    watching: watchlist.length,
    feeds: FEEDS.length,
  };

  const { mutate: scanIOC } = useMutation({
    mutationFn: async (indicator) => {
      const res = await base44.functions.invoke("shieldIOCRadar", { indicator });
      return res.data;
    },
    onSuccess: () => { qc.invalidateQueries(["ioc-records"]); toast.success("IOC scan complete"); },
    onError: () => toast.error("Scan failed"),
  });

  const { mutate: addToWatchlist } = useMutation({
    mutationFn: async (id) => base44.entities.IOCRecord.update(id, { in_watchlist: true }),
    onSuccess: () => { qc.invalidateQueries(["ioc-records"]); toast.success("Added to watchlist"); },
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try { await base44.functions.invoke("shieldIOCRadar", { indicator: query.trim() }); qc.invalidateQueries(["ioc-records"]); toast.success("Lookup complete"); }
    catch { toast.error("Lookup failed"); }
    finally { setSearching(false); }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  const statusStyle = {
    malicious: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
    suspicious: { color: "#EAB308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)" },
    clean: { color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
  };

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: "#0A0E1A" }}>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes pulse-red { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
        @keyframes gold-glow { 0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4)} 50%{box-shadow:0 0 20px rgba(201,168,76,0.6)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .pulse-red { animation: pulse-red 2s infinite; }
        .gold-focus:focus { animation: gold-glow 1.5s infinite; outline: none; }
      `}</style>

      {/* Header */}
      <div className="fade-up">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <Shield className="w-3.5 h-3.5" />
          <span>Threat Intelligence</span>
          <span>/</span>
          <span className="text-[#C9A84C]">IOC Radar</span>
        </div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <Target className="w-6 h-6 text-[#C9A84C]" /> IOC Radar
        </h1>
        <p className="text-slate-400 text-sm mt-1">Search and enrich Indicators of Compromise in real-time</p>
      </div>

      {/* Hero Search */}
      <form onSubmit={handleSearch} className="fade-up" style={{ animationDelay: "100ms" }}>
        <div className="relative">
          <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search IP, domain, hash, or URL...  (press / to focus)"
            className="w-full pl-14 pr-36 py-5 rounded-2xl text-base text-white placeholder-slate-500 border transition-all"
            style={{ background: "#111827", borderColor: "#374151" }}
            onFocus={e => { e.target.style.borderColor = "#C9A84C"; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.15), 0 0 20px rgba(201,168,76,0.1)"; }}
            onBlur={e => { e.target.style.borderColor = "#374151"; e.target.style.boxShadow = "none"; }}
          />
          <button type="submit" disabled={searching || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#C9A84C,#b8973b)", color: "#0A0E1A" }}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan IOC"}
          </button>
        </div>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-up" style={{ animationDelay: "150ms" }}>
        <StatCard label="Total IOCs Scanned" value={stats.total} icon={Target} color="#6366F1" loading={isLoading} />
        <StatCard label="Malicious Found" value={stats.malicious} icon={AlertTriangle} color="#EF4444" loading={isLoading} />
        <StatCard label="Watching" value={stats.watching} icon={Eye} color="#C9A84C" loading={isLoading} />
        <StatCard label="Feeds Active" value={stats.feeds} icon={Rss} color="#10B981" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Table */}
        <div className="xl:col-span-2 fade-up" style={{ animationDelay: "200ms" }}>
          <div className="rounded-xl border overflow-hidden" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "#1F2937" }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#C9A84C]" /> Recent Lookups
              </h3>
              <span className="text-xs text-slate-500">{iocs.length} records</span>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">{[1,2,3,4].map(i => <Shimmer key={i} className="h-12 w-full" />)}</div>
            ) : iocs.length === 0 ? (
              <div className="p-12 text-center">
                <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No IOCs scanned yet</p>
                <p className="text-xs text-slate-600 mt-1">Enter an indicator above to begin threat intelligence lookup</p>
              </div>
            ) : (
              <div className="divide-y" style={{ divideColor: "#1F2937" }}>
                {iocs.map((ioc, i) => {
                  const s = statusStyle[ioc.status] || statusStyle.clean;
                  const isMalicious = ioc.status === "malicious";
                  return (
                    <div key={ioc.id}
                      className="p-4 transition-all hover:bg-[#1F2937]/50 relative"
                      style={isMalicious ? { borderLeft: "3px solid #EF4444", animation: "pulse-red 2s infinite" } : { borderLeft: "3px solid transparent" }}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <IOCTypeIcon type={ioc.ioc_type} />
                        <code className="text-sm text-white font-mono flex-1 min-w-0 truncate">{ioc.indicator}</code>
                        <span className="text-[10px] px-2 py-0.5 rounded border font-mono uppercase"
                          style={{ color: "#9CA3AF", borderColor: "#374151", background: "#1F2937" }}>{ioc.ioc_type}</span>
                        <ThreatScoreBadge score={ioc.threat_score || 0} />
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize"
                          style={{ color: s.color, background: s.bg, borderColor: s.border }}>{ioc.status}</span>
                        <div className="flex items-center gap-2 ml-auto">
                          <button onClick={() => copyToClipboard(ioc.indicator)}
                            className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-[#374151] transition-all">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => scanIOC(ioc.indicator)}
                            className="p-1.5 rounded text-slate-500 hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-all">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => addToWatchlist(ioc.id)}
                            className="p-1.5 rounded transition-all"
                            style={{ color: ioc.in_watchlist ? "#C9A84C" : "#6B7280" }}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-4 pl-6 text-xs text-slate-500">
                        <span>{ioc.sources_hit || 0} sources</span>
                        <span>{ioc.last_checked ? new Date(ioc.last_checked).toLocaleString() : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4 fade-up" style={{ animationDelay: "250ms" }}>
          {/* Watchlist */}
          <div className="rounded-xl border" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#C9A84C]" /> Watchlist
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>{watchlist.length}</span>
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
              {watchlist.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">No indicators in watchlist</p>
              ) : watchlist.map(w => (
                <div key={w.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "#1F2937" }}>
                  <IOCTypeIcon type={w.ioc_type} />
                  <code className="text-xs text-white flex-1 truncate">{w.indicator}</code>
                  <ThreatScoreBadge score={w.threat_score || 0} />
                </div>
              ))}
            </div>
          </div>

          {/* Feed Status */}
          <div className="rounded-xl border" style={{ background: "#111827", borderColor: "#1F2937" }}>
            <div className="p-4 border-b" style={{ borderColor: "#1F2937" }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Rss className="w-4 h-4 text-[#6366F1]" /> Feed Status
              </h3>
            </div>
            <div className="p-3 space-y-3">
              {FEEDS.map(feed => (
                <div key={feed.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: feed.color }} />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-white">{feed.name}</div>
                    <div className="text-[10px] text-slate-500">{feed.desc}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>ACTIVE</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}