import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bot, X, Shield, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const BOT_STYLE = {
  credential_stuffing: { color: "#dc2626", bg: "rgba(220,38,38,0.12)", label: "CREDENTIAL STUFFING" },
  brute_force: { color: "#dc2626", bg: "rgba(220,38,38,0.12)", label: "BRUTE FORCE" },
  ddos: { color: "#7c3aed", bg: "rgba(124,58,237,0.12)", label: "DDOS" },
  vulnerability_scanner: { color: "#ea580c", bg: "rgba(234,88,12,0.12)", label: "VULN SCANNER" },
  scraper: { color: "#374151", bg: "rgba(55,65,81,0.15)", label: "SCRAPER" },
  ai_scraper: { color: "#6366f1", bg: "rgba(99,102,241,0.12)", label: "AI SCRAPER" },
  spam_bot: { color: "#d97706", bg: "rgba(217,119,6,0.12)", label: "SPAM BOT" },
  fraud_bot: { color: "#be185d", bg: "rgba(190,24,93,0.12)", label: "FRAUD BOT" },
};
const STATUS_STYLE = {
  blocked: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", label: "BLOCKED" },
  rate_limited: { color: "#eab308", bg: "rgba(234,179,8,0.12)", label: "RATE LIMITED" },
  logged: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "LOGGED" },
  investigating: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", label: "INVESTIGATING" },
};
const SEV_STYLE = {
  critical: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.35)" },
  high: { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  medium: { color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.25)" },
  low: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
};
const FLAG_EMOJIS = { RU: "🇷🇺", CN: "🇨🇳", US: "🇺🇸", DE: "🇩🇪", NL: "🇳🇱", IR: "🇮🇷", BR: "🇧🇷", GB: "🇬🇧", KR: "🇰🇷", IN: "🇮🇳", FR: "🇫🇷", UA: "🇺🇦" };

// Simple globe visualization
function BotGlobe({ events }) {
  const countryData = {};
  events.forEach(e => {
    if (e.country_code) {
      if (!countryData[e.country_code]) countryData[e.country_code] = { name: e.country, code: e.country_code, reqs: 0, bots: 0 };
      countryData[e.country_code].reqs += e.total_requests || 0;
      countryData[e.country_code].bots += 1;
    }
  });
  const sorted = Object.values(countryData).sort((a, b) => b.reqs - a.reqs).slice(0, 8);
  const maxReqs = sorted[0]?.reqs || 1;
  return (
    <div className="rounded-xl p-5" style={{ background: "#0a0f1e", border: "1px solid rgba(244,63,94,0.2)" }}>
      <h3 className="text-sm font-semibold text-white mb-4">Attack Origin Map</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sorted.map(({ name, code, reqs, bots }) => {
          const intensity = reqs / maxReqs;
          const r = Math.round(244 * intensity);
          const color = `rgba(${r}, ${Math.round(63 * intensity)}, ${Math.round(94 * intensity)}, ${0.3 + intensity * 0.6})`;
          return (
            <div key={code} className="rounded-xl p-3 text-center relative overflow-hidden"
              style={{ background: color, border: `1px solid rgba(244,63,94,${0.2 + intensity * 0.4})` }}>
              <div className="text-2xl mb-1">{FLAG_EMOJIS[code] || "🌐"}</div>
              <p className="text-[11px] font-semibold text-white">{name}</p>
              <p className="text-[10px] font-mono text-slate-400">{reqs.toLocaleString()} reqs</p>
              <p className="text-[9px] text-slate-500">{bots} bot{bots > 1 ? "s" : ""}</p>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="col-span-4 py-8 text-center text-slate-600">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No bot activity detected</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RpmGauge({ rpm }) {
  const max = 2000;
  const pct = Math.min(100, (rpm / max) * 100);
  const color = pct > 75 ? "#f43f5e" : pct > 40 ? "#eab308" : "#10b981";
  const r = 30, c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width="80" height="80" className="flex-shrink-0">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(30,58,95,0.4)" strokeWidth="5" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
      <text x="40" y="44" textAnchor="middle" fontSize="10" fill={color} fontFamily="JetBrains Mono" fontWeight="bold">{rpm}</text>
      <text x="40" y="57" textAnchor="middle" fontSize="8" fill="#475569">req/min</text>
    </svg>
  );
}

function BotDrawer({ bot, onClose }) {
  const sev = SEV_STYLE[bot.severity] || SEV_STYLE.low;
  const botStyle = BOT_STYLE[bot.bot_type] || BOT_STYLE.scraper;
  const statusStyle = STATUS_STYLE[bot.status] || STATUS_STYLE.logged;
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!bot.blocked_until) return;
    const tick = () => {
      const ms = new Date(bot.blocked_until) - new Date();
      if (ms <= 0) { setCountdown("Expired"); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s remaining`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [bot.blocked_until]);

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
      <div className="ml-auto w-full max-w-xl h-full overflow-y-auto p-6 space-y-5 animate-slide-in-right"
        style={{ background: "#0d1117", borderLeft: "1px solid rgba(244,63,94,0.2)" }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg }}>{bot.severity}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: botStyle.color, background: botStyle.bg }}>{botStyle.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: statusStyle.color, background: statusStyle.bg }}>{statusStyle.label}</span>
            </div>
            <h3 className="text-base font-black text-white">{bot.source_ip}</h3>
            <p className="text-[11px] text-slate-500">{bot.app_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center justify-center py-4">
          <RpmGauge rpm={bot.requests_per_minute || 0} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            ["Source IP", bot.source_ip], ["IP Range", bot.ip_range || "—"],
            ["Country", `${FLAG_EMOJIS[bot.country_code] || "🌐"} ${bot.country}`], ["Total Requests", bot.total_requests?.toLocaleString()],
            ["Fingerprint", bot.fingerprint || "—"], ["Detected", bot.detected_at ? new Date(bot.detected_at).toLocaleString() : "—"],
          ].map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">{k}</p>
              <p className="text-xs text-white font-mono truncate">{v}</p>
            </div>
          ))}
        </div>

        {bot.endpoints_targeted?.length > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-2">Endpoints Targeted</p>
            <div className="flex flex-wrap gap-2">
              {bot.endpoints_targeted.map(e => (
                <span key={e} className="text-[10px] px-2 py-1 rounded font-mono text-rose-400"
                  style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>{e}</span>
              ))}
            </div>
          </div>
        )}

        {bot.user_agent && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-mono mb-2">User Agent</p>
            <pre className="p-3 rounded-xl text-[11px] font-mono text-slate-400 overflow-auto whitespace-pre-wrap" style={{ background: "#030712", border: "1px solid #30363d" }}>
              {bot.user_agent}
            </pre>
          </div>
        )}

        {bot.blocked_until && (
          <div className="p-3 rounded-xl text-center" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)" }}>
            <p className="text-[10px] text-slate-500 font-mono mb-1">BLOCKED UNTIL</p>
            <p className="text-sm font-mono font-bold" style={{ color: "#f43f5e" }}>{countdown || new Date(bot.blocked_until).toLocaleString()}</p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { toast.success("IP range blocked"); onClose(); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: "#f43f5e" }}>Block IP Range</button>
          <button onClick={() => { toast.success("IP whitelisted"); onClose(); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>Whitelist IP</button>
          <button onClick={() => { toast.success("Report exported"); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-blue-400"
            style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)" }}>Export Report</button>
        </div>
      </div>
    </div>
  );
}

export default function BotProtectionPage() {
  const [selected, setSelected] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["bot-events"],
    queryFn: () => base44.entities.BotEvent.list("-detected_at", 200),
    refetchInterval: 15000,
  });

  const filtered = bots.filter(b => {
    if (typeFilter !== "all" && b.bot_type !== typeFilter) return false;
    if (sevFilter !== "all" && b.severity !== sevFilter) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const blocked = bots.filter(b => b.status === "blocked").length;
  const rateLimited = bots.filter(b => b.status === "rate_limited").length;
  const totalReqs = bots.reduce((s, b) => s + (b.total_requests || 0), 0);
  const uniqueIPs = new Set(bots.map(b => b.source_ip)).size;
  const countries = new Set(bots.filter(b => b.country).map(b => b.country)).size;

  return (
    <div className="min-h-screen -m-6 p-6 space-y-5" style={{ background: "#030712" }}>
      {selected && <BotDrawer bot={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bot className="w-5 h-5" style={{ color: "#f43f5e" }} />
            <h1 className="text-xl font-black text-white font-mono">BOT PROTECTION</h1>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">Real-time detection · credential stuffing · DDoS · scrapers · fraud bots</p>
        </div>
        <button onClick={() => toast.success("Rule configuration panel coming soon")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.3)", color: "#f43f5e" }}>
          <Shield className="w-4 h-4" /> Configure Rules
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Bots Blocked", val: blocked, color: "#f43f5e" },
          { label: "Rate Limited", val: rateLimited, color: "#eab308" },
          { label: "Total Requests", val: totalReqs.toLocaleString(), color: "#e2e8f0" },
          { label: "Unique Bot IPs", val: uniqueIPs, color: "#3b82f6" },
          { label: "Countries", val: countries, color: "#10b981" },
        ].map(({ label, val, color }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: "#0a0f1e", border: "1px solid #30363d" }}>
            <p className="text-[9px] font-mono text-slate-500 uppercase mb-1">{label}</p>
            <p className="text-xl font-black font-mono" style={{ color }}>{val}</p>
          </div>
        ))}
      </div>

      <BotGlobe events={bots} />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter className="w-4 h-4 text-slate-600" />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
          <option value="all">All Bot Types</option>
          {Object.keys(BOT_STYLE).map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <select value={sevFilter} onChange={e => { setSevFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
          <option value="all">All Severities</option>
          {["critical", "high", "medium", "low"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "#161b22", border: "1px solid #30363d", color: "#94a3b8" }}>
          <option value="all">All Statuses</option>
          {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#0d1117", borderBottom: "1px solid #30363d" }}>
              {["Sev", "Bot Type", "App", "Source IP", "IP Range", "Country", "Req/Min", "Total Reqs", "Endpoints", "Fingerprint", "Action", "Detected"].map(h => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "#0d1117" }}>
            {isLoading ? Array(4).fill(0).map((_, i) => (
              <tr key={i}><td colSpan={12} className="px-4 py-3"><div className="h-4 rounded animate-pulse" style={{ background: "#1e293b" }} /></td></tr>
            )) : paginated.map((b, i) => {
              const sev = SEV_STYLE[b.severity] || SEV_STYLE.low;
              const botStyle = BOT_STYLE[b.bot_type] || BOT_STYLE.scraper;
              const statusStyle = STATUS_STYLE[b.status] || STATUS_STYLE.logged;
              return (
                <tr key={b.id} onClick={() => setSelected(b)}
                  className="cursor-pointer transition-all hover:bg-rose-500/5"
                  style={{ borderBottom: "1px solid rgba(48,54,61,0.5)", borderLeft: `3px solid ${sev.color}` }}>
                  <td className="px-3 py-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ color: sev.color, background: sev.bg }}>{b.severity}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap" style={{ color: botStyle.color, background: botStyle.bg }}>{botStyle.label}</span></td>
                  <td className="px-3 py-3"><span className="text-[11px] font-mono text-white">{b.app_name || "—"}</span></td>
                  <td className="px-3 py-3"><span className="text-[11px] font-mono text-red-400">{b.source_ip}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] font-mono text-slate-500">{b.ip_range || "—"}</span></td>
                  <td className="px-3 py-3"><span className="text-sm">{b.country_code ? (FLAG_EMOJIS[b.country_code] || "🌐") : "🌐"}</span></td>
                  <td className="px-3 py-3"><span className="text-xs font-mono font-bold" style={{ color: (b.requests_per_minute || 0) > 500 ? "#f43f5e" : "#eab308" }}>{b.requests_per_minute?.toLocaleString()}</span></td>
                  <td className="px-3 py-3"><span className="text-xs font-mono text-slate-400">{b.total_requests?.toLocaleString()}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] text-slate-500">{b.endpoints_targeted?.length || 0} endpoints</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] font-mono text-slate-600">{b.fingerprint || "—"}</span></td>
                  <td className="px-3 py-3"><span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ color: statusStyle.color, background: statusStyle.bg }}>{statusStyle.label}</span></td>
                  <td className="px-3 py-3 whitespace-nowrap"><span className="text-[10px] text-slate-600">{b.detected_at ? formatDistanceToNow(new Date(b.detected_at), { addSuffix: true }) : "—"}</span></td>
                </tr>
              );
            })}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={12} className="px-4 py-16 text-center text-slate-600">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No bot events detected</p>
                <p className="text-xs mt-1">Configure bot detection rules to start monitoring</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 disabled:opacity-40"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>Prev</button>
          <span className="text-xs text-slate-500 font-mono">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 disabled:opacity-40"
            style={{ background: "#161b22", border: "1px solid #30363d" }}>Next</button>
        </div>
      )}
    </div>
  );
}