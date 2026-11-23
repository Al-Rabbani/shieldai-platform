import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, RefreshCw, ExternalLink, Loader2, ShieldAlert } from "lucide-react";

/* Only two feed types have a source on this platform: CVE rows from this tenant's own findings register, and KEV rows
 * among them (flagged from the CISA Known Exploited Vulnerabilities catalogue by enrich_findings.py). The earlier
 * version of this page offered seven: malware_package, zero_day, typosquat, exploit_released, supply_chain_compromise
 * and ip_threat had no source at all, and selecting one showed an empty list that read as "nothing is happening". */
const FEED_TYPE_CONFIG = {
  CVE: { icon: "📦", label: "CVE", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  KEV: { icon: "🔥", label: "KEV", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};
const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e" };

export default function ThreatIntelPage() {
  const [filterType, setFilterType] = useState("all");
  const [filterSev, setFilterSev] = useState("all");

  /* The feed is derived from the register, so it is read from the route that derives it. No fetch-and-store step: the
   * old page posted to /api/functions/shieldThreatIntel, which does not exist, and then wrote the result into an entity
   * that has no store, so the write vanished while the header claimed a live feed. */
  const { data: feeds = [], isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["threat-intel-feed"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-detected_at", 200).catch(() => []),
    initialData: [],
  });

  /* Counts come from the route, not from the 200 rows on screen: the register holds more than one page of them. */
  const { data: summary } = useQuery({
    queryKey: ["threat-intel-summary"],
    queryFn: () => base44.entities.ThreatIntelFeed.summary().catch(() => null),
    initialData: null,
  });

  const counts = summary?.counts || {};
  const unavailable = summary?.unavailable || {};
  const notRecorded = summary?.not_recorded || {};
  const basis = summary?.basis || {};

  const filtered = feeds.filter((f) => {
    if (filterType !== "all" && f.feed_type !== filterType) return false;
    if (filterSev !== "all" && f.severity !== filterSev) return false;
    return true;
  });

  const kev = Number(counts.kev_listed || 0);
  const kevUnknown = Number(counts.kev_unknown || 0);

  const tiles = [
    { label: "CVEs in register", value: counts.total ?? "—", color: "#f97316", icon: "📦" },
    { label: "Open", value: counts.open ?? "—", color: "#ef4444", icon: "🔴" },
    { label: "KEV listed", value: counts.total === undefined ? "—" : kev, color: "#ef4444", icon: "🔥" },
    { label: "KEV never checked", value: counts.total === undefined ? "—" : kevUnknown, color: "#eab308", icon: "❓" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* HERO HEADER */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{
        background: "linear-gradient(135deg, #1a0505 0%, #1f0808 50%, #1a0505 100%)",
        border: "1px solid rgba(239,68,68,0.3)",
        boxShadow: "0 0 60px rgba(239,68,68,0.08)",
      }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #ef4444 0%, transparent 50%)" }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" style={{ boxShadow: "0 0 8px #ef4444" }} />
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">DERIVED FROM THIS REGISTER</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-1" style={{ textShadow: "0 0 20px rgba(239,68,68,0.3)" }}>
              Threat Intelligence Feed
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Every finding in your own register that carries a CVE, with its CVSS, EPSS and CISA KEV position. There is no
              external intel subscription behind this page, so nothing here arrives "as it happens".
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button onClick={() => refetch()} disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:opacity-80 disabled:opacity-50"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {isFetching ? "Re-reading…" : "Re-read register"}
            </button>
            {dataUpdatedAt > 0 && (
              <span className="text-[10px] font-mono text-slate-600">
                Read {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KEV EVIDENCE STRIP — the old banner asserted "3 threats affect your connected assets" and named three CVEs
          that were never in this register. What is knowable is the KEV position and where it came from. */}
      <div className="rounded-xl p-4" style={{
        background: kev > 0 ? "rgba(239,68,68,0.08)" : "#0a0f1e",
        border: kev > 0 ? "2px solid rgba(239,68,68,0.4)" : "1px solid rgba(30,58,95,0.5)",
        borderLeft: kev > 0 ? "4px solid #ef4444" : "4px solid rgba(30,58,95,0.6)",
      }}>
        <div className="flex items-start gap-2">
          {kev > 0 ? <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" /> : <ShieldAlert className="w-5 h-5 text-slate-500 flex-shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: kev > 0 ? "#f87171" : "#cbd5e1" }}>
              {counts.total === undefined
                ? "KEV position not read"
                : kev > 0
                  ? `${kev} CVE${kev === 1 ? "" : "s"} in this register appear in the CISA KEV catalogue.`
                  : "No CVE in this register appears in the CISA KEV catalogue."}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{basis.kev || "Reading the KEV position…"}</p>
            {basis.last_enriched && (
              <p className="text-[10px] font-mono text-slate-600 mt-1">
                Last enrichment: {formatDistanceToNow(new Date(basis.last_enriched), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #0f172a, #0a0f1e)", border: "1px solid rgba(30,58,95,0.4)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span>{s.icon}</span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.5)" }}>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterType("all")} className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${filterType === "all" ? "text-white bg-slate-700 border border-slate-600" : "text-slate-500 border border-slate-800"}`}>All</button>
          {Object.entries(FEED_TYPE_CONFIG).map(([type, cfg]) => (
            <button key={type} onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${filterType === type ? "font-bold" : "opacity-60"}`}
              style={filterType === type ? { color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}60` } : { color: "#64748b", border: "1px solid rgba(30,58,95,0.5)" }}>
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {["all", "critical", "high", "medium", "low"].map((sev) => (
            <button key={sev} onClick={() => setFilterSev(sev)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase transition-all ${filterSev === sev ? "font-bold" : "opacity-50"}`}
              style={{ color: sev === "all" ? "#cbd5e1" : SEV_COLORS[sev], border: "1px solid rgba(30,58,95,0.6)" }}>
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Feed types with no source are named, not silently empty. */}
      <div className="rounded-xl p-4" style={{ background: "rgba(15,23,42,0.6)", border: "1px dashed rgba(30,58,95,0.7)" }}>
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1.5">Feed types with no source here</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(unavailable).map(([name, why]) => (
            <span key={name} className="text-[10px] font-mono text-slate-600" title={why}>
              <span className="text-slate-500 font-bold">{name}</span> · no collector
            </span>
          ))}
          {Object.keys(unavailable).length === 0 && <span className="text-[10px] font-mono text-slate-600">reading…</span>}
        </div>
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading the register…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "#0a0f1e", border: "1px solid rgba(30,58,95,0.4)" }}>
          <p className="text-sm text-slate-400">No CVE findings match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 120).map((f) => (
            <ThreatCard key={f.id} f={f} notRecorded={notRecorded} />
          ))}
          {filtered.length > 120 && (
            <p className="text-[10px] font-mono text-slate-600 text-center pt-1">
              showing 120 of {filtered.length} loaded · {counts.total ?? "—"} CVEs in the register
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ThreatCard({ f, notRecorded }) {
  const cfg = FEED_TYPE_CONFIG[f.feed_type] || FEED_TYPE_CONFIG.CVE;
  const sevColor = SEV_COLORS[f.severity] || "#64748b";

  return (
    <div className="rounded-xl p-5 transition-all hover:border-opacity-60"
      style={{
        background: f.exploited_in_wild ? "rgba(239,68,68,0.04)" : "#0a0f1e",
        border: f.exploited_in_wild ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(30,58,95,0.4)",
        borderLeft: f.exploited_in_wild ? "4px solid #ef4444" : "4px solid transparent",
      }}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}50` }}>
                {cfg.label}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase"
                style={{ color: sevColor, background: `${sevColor}15`, border: `1px solid ${sevColor}40` }}>
                {f.severity}
              </span>
              {f.exploited_in_wild === true && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: "#ef4444", background: "rgba(239,68,68,0.2)", border: "1px solid #ef4444" }}>
                  🔥 CISA KEV
                </span>
              )}
              {f.cvss_score != null && <span className="text-[10px] font-mono text-slate-400">CVSS: <span className="font-bold text-white">{f.cvss_score}</span></span>}
              {f.epss_score != null && <span className="text-[10px] font-mono text-slate-400">EPSS: <span className="font-bold" style={{ color: f.epss_score > 0.7 ? "#ef4444" : "#f97316" }}>{Math.round(f.epss_score * 100)}%</span></span>}
            </div>
            <h3 className="text-sm font-bold text-white">{f.title}</h3>
          </div>
        </div>
        <div className="text-right flex-shrink-0 text-[10px] font-mono text-slate-600">
          {f.detected_at && <p>Detected {formatDistanceToNow(new Date(f.detected_at), { addSuffix: true })}</p>}
          {f.published_at && <p>In KEV since {formatDistanceToNow(new Date(f.published_at), { addSuffix: true })}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        {f.package_name && (
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded" style={{ color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
            📦 {f.package_name}
          </span>
        )}
        {f.cve_id && (
          <button onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${f.cve_id}`, "_blank")}
            className="flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-1 rounded transition-all hover:opacity-80"
            style={{ color: "#60a5fa", background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
            🔗 {f.cve_id} <ExternalLink className="w-3 h-3" />
          </button>
        )}
        {/* The register records the version installed at scan time, not the upstream affected range. */}
        {f.installed_evidence && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded text-slate-400" style={{ background: "rgba(100,116,139,0.08)", border: "1px solid rgba(100,116,139,0.25)" }}>
            Installed: {f.installed_evidence}
          </span>
        )}
      </div>

      {f.description && <p className="text-sm text-slate-400 leading-relaxed mb-3">{f.description}</p>}

      {f.affected_asset && (
        <div className="flex items-center gap-2 mb-3 text-xs font-mono">
          <span className="text-slate-500">Affected asset:</span>
          <span className="text-red-300 font-bold">📦 {f.affected_asset}</span>
        </div>
      )}

      {f.action_required && (
        <div className="rounded-lg p-3 mb-3" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <p className="text-[10px] font-mono font-bold text-emerald-400 mb-1">⚡ ACTION REQUIRED</p>
          <p className="text-xs text-slate-300">{f.action_required}</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pt-3" style={{ borderTop: "1px solid rgba(30,58,95,0.3)" }}>
        <span className="text-[10px] font-mono text-slate-600">
          {f.source ? `Source: ${f.source}` : "Source not recorded"} · status {f.status || "—"}
        </span>
        <span className="text-[10px] font-mono text-slate-600" title={notRecorded.affected_versions || ""}>
          affected version range not recorded
        </span>
      </div>
    </div>
  );
}
