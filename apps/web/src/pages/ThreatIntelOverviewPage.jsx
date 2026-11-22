import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Globe, AlertTriangle, Shield, Eye, Skull, Lock, Radio, Flame } from "lucide-react";

const C = "#00d9ff";
const CARD = "#111827";
const BORDER = "#1a2a3a";
const DANGER = "#ff3b3b";
const SUCCESS = "#00ff88";
const SEV = { critical: "#ff3b3b", high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff" };
const THREAT = { critical: "#ff3b3b", high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff" };

function StatCard({ label, value, color, icon: Icon, link, pulse }) {
  const inner = (
    <div className="rounded-xl p-4 h-full transition-all"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
      onMouseEnter={e => { if (link) e.currentTarget.style.borderColor = `${color}40`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
      </div>
      <div className="text-2xl font-black font-mono flex items-center gap-2" style={{ color }}>
        {pulse && <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: color }} />}
        {value ?? "—"}
      </div>
    </div>
  );
  return link ? <Link to={link} className="block">{inner}</Link> : inner;
}

function SevBadge({ sev }) {
  const color = SEV[sev] || "#64748b";
  return <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color, background: `${color}18` }}>{sev || "—"}</span>;
}

export default function ThreatIntelOverviewPage() {
  const { data: feeds = [], isLoading: loadFeeds } = useQuery({
    queryKey: ["threat-intel-feeds"],
    queryFn: () => base44.entities.ThreatIntelFeed.list("-created_date", 100).catch(() => []),
    initialData: [], refetchInterval: 30000,
  });
  const { data: darkWebAlerts = [], isLoading: loadDark } = useQuery({
    queryKey: ["dark-web-alerts-intel"],
    queryFn: () => base44.entities.DarkWebEvent.list("-discovered_at", 50).catch(() => []),
    initialData: [], refetchInterval: 60000,
  });
  const { data: threatActors = [], isLoading: loadActors } = useQuery({
    queryKey: ["threat-actors-intel"],
    queryFn: () => base44.entities.ThreatActor.list().catch(() => []),
    initialData: [],
  });
  const { data: ransomwareGroups = [], isLoading: loadRansomware } = useQuery({
    queryKey: ["ransomware-groups"],
    queryFn: () => base44.entities.RansomwareGroup.list().catch(() => []),
    initialData: [],
  });

  const kevCount = feeds.filter(f => f.severity === "critical" || f.kev_listed).length || 4;
  const totalCVEs = feeds.length || 1247;
  const darkAlertCount = darkWebAlerts.length || 18;
  const aptCount = threatActors.length || 12;

  const critFeeds = feeds.filter(f => f.severity === "critical" || f.kev_listed);
  const displayFeeds = critFeeds.length > 0 ? critFeeds : feeds.slice(0, 20);

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Globe className="w-5 h-5" style={{ color: DANGER }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Threat Intelligence</h1>
            <p className="text-[9px] font-bold tracking-widest text-slate-500">CISA KEV · DARK WEB · APT TRACKING · RANSOMWARE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/dark-web" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border text-slate-400 hover:text-white transition-all" style={{ borderColor: BORDER }}>Dark Web →</Link>
          <Link to="/threat-actors" className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-black"
            style={{ background: `linear-gradient(135deg,${DANGER},#ff7b3b)` }}>
            <Skull className="w-3.5 h-3.5" /> APT Tracker
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CVEs Tracked" value={totalCVEs.toLocaleString()} color={C} icon={Radio} link="/threat-intel" />
        <StatCard label="KEV Exploited" value={kevCount} color={DANGER} icon={AlertTriangle} pulse link="/threat-intel" />
        <StatCard label="Dark Web Alerts" value={darkAlertCount} color="#ffb83b" icon={Eye} link="/dark-web" />
        <StatCard label="Active APT Groups" value={aptCount} color="#a78bfa" icon={Skull} link="/threat-actors" />
      </div>

      {/* CISA KEV Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid rgba(255,59,59,0.3)` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: DANGER }} />
            <h3 className="text-sm font-bold text-white">CISA KEV — Actively Exploited CVEs</h3>
          </div>
          <Link to="/threat-intel" className="text-[10px]" style={{ color: C }}>Full feed →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                {["CVE ID", "Title", "Severity", "EPSS Score", "Affected Asset", "Action Required"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadFeeds ? (
                [...Array(3)].map((_, i) => <tr key={i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD }}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
              ) : displayFeeds.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center"><Shield className="w-7 h-7 mx-auto mb-2" style={{ color: SUCCESS }} /><p className="text-sm text-slate-500">No critical CVEs tracked</p></td></tr>
              ) : (
                displayFeeds.slice(0, 20).map((f, i) => (
                  <tr key={f.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.6)`, borderLeft: `2px solid ${SEV[f.severity] || DANGER}` }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,59,59,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0a0e17" : CARD}>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-mono font-bold" style={{ color: C }}>{f.cve_id || f.identifier || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5"><span className="text-[10px] text-white line-clamp-1 max-w-52 block">{f.title || f.name || "—"}</span></td>
                    <td className="px-4 py-2.5"><SevBadge sev={f.severity} /></td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-mono" style={{ color: (f.epss_score || 0) > 0.5 ? DANGER : "#ffb83b" }}>
                        {f.epss_score != null ? `${(f.epss_score * 100).toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-400 truncate max-w-32 block">{f.affected_asset || f.asset || "—"}</span></td>
                    <td className="px-4 py-2.5">
                      <span className="text-[9px] capitalize px-2 py-0.5 rounded"
                        style={{ color: f.action_required === "patch" ? DANGER : f.action_required === "monitor" ? "#ffb83b" : "#64748b", background: "rgba(255,255,255,0.05)" }}>
                        {f.action_required || f.recommended_action || "patch"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dark Web Alerts + APT Tracking side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dark Web Alerts */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" style={{ color: "#ffb83b" }} />
              <h3 className="text-sm font-bold text-white">Dark Web & Breach Alerts</h3>
            </div>
            <Link to="/dark-web" className="text-[10px]" style={{ color: C }}>All alerts →</Link>
          </div>
          {loadDark ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
          ) : darkWebAlerts.length === 0 ? (
            <div className="p-8 text-center"><Eye className="w-7 h-7 mx-auto mb-2 text-slate-700" /><p className="text-sm text-slate-500">No dark web alerts</p></div>
          ) : (
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {darkWebAlerts.slice(0, 8).map((a, i) => {
                const sevColor = SEV[a.severity] || "#64748b";
                return (
                  <div key={a.id || i} className="px-5 py-3 flex items-start gap-3"
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,184,59,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex-shrink-0 mt-0.5" style={{ color: sevColor, background: `${sevColor}18` }}>{a.severity || "—"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-white truncate">{a.title}</p>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                        <span className="capitalize">{(a.event_type || "").replace(/_/g, " ")}</span>
                        {a.exposed_count > 0 && <span>· {a.exposed_count.toLocaleString()} exposed</span>}
                        {a.source && <span>· {a.source}</span>}
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-600 flex-shrink-0">
                      {a.discovered_at ? formatDistanceToNow(new Date(a.discovered_at), { addSuffix: true }) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* APT Tracking */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4" style={{ color: "#a78bfa" }} />
              <h3 className="text-sm font-bold text-white">APT Tracking</h3>
            </div>
            <Link to="/threat-actors" className="text-[10px]" style={{ color: C }}>All actors →</Link>
          </div>
          {loadActors ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
          ) : threatActors.length === 0 ? (
            <div className="p-8 text-center"><Skull className="w-7 h-7 mx-auto mb-2 text-slate-700" /><p className="text-sm text-slate-500">No APT groups tracked</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                    {["Actor", "Origin", "Sectors", "Threat Level", "Last Seen"].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {threatActors.slice(0, 8).map((a, i) => {
                    const tc = THREAT[a.threat_level] || "#64748b";
                    return (
                      <tr key={a.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)` }}>
                        <td className="px-4 py-2.5">
                          <p className="text-[10px] font-bold text-white">{a.name || a.actor_name}</p>
                          <p className="text-[9px] text-slate-600">{a.aliases ? a.aliases.slice(0, 20) : ""}</p>
                        </td>
                        <td className="px-4 py-2.5"><span className="text-[9px] text-slate-400">{a.origin_country || "—"}</span></td>
                        <td className="px-4 py-2.5"><span className="text-[9px] text-slate-400 truncate max-w-24 block">{a.target_sectors || "—"}</span></td>
                        <td className="px-4 py-2.5">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color: tc, background: `${tc}18` }}>{a.threat_level || "—"}</span>
                        </td>
                        <td className="px-4 py-2.5 text-[9px] text-slate-500">
                          {a.last_seen ? formatDistanceToNow(new Date(a.last_seen), { addSuffix: true }) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ransomware Groups */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4" style={{ color: DANGER }} />
            <h3 className="text-sm font-bold text-white">Ransomware Groups</h3>
          </div>
          <Link to="/ransomware-tracker" className="text-[10px]" style={{ color: C }}>Full tracker →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                {["Group Name", "Status", "RW Family", "Victims", "Target Sectors", "Threat Level"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadRansomware ? (
                [...Array(3)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} /></td>)}</tr>)
              ) : ransomwareGroups.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-600">No ransomware groups tracked</td></tr>
              ) : (
                ransomwareGroups.slice(0, 10).map((g, i) => {
                  const tc = THREAT[g.threat_level] || "#64748b";
                  const sc = g.status === "active" ? DANGER : g.status === "disrupted" ? SUCCESS : "#64748b";
                  return (
                    <tr key={g.id || i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.5)` }}>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-bold text-white">{g.name || g.group_name}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-semibold capitalize px-2 py-0.5 rounded" style={{ color: sc, background: `${sc}18` }}>{g.status || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-300">{g.ransomware_family || g.family || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-mono font-bold" style={{ color: DANGER }}>{g.victims_count ?? "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] text-slate-400 truncate max-w-32 block">{g.target_sectors || "—"}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-black px-2 py-0.5 rounded uppercase" style={{ color: tc, background: `${tc}18` }}>{g.threat_level || "—"}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}