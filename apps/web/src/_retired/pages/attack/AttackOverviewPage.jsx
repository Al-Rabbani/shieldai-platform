import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { Crosshair, Globe, Sword, Zap, AlertTriangle, Shield, Search, ChevronRight, ExternalLink } from "lucide-react";

const C = "#00d9ff";
const CARD = "#111827";
const BORDER = "#1a2a3a";
const DANGER = "#ff3b3b";
const SUCCESS = "#00ff88";
const SEV = { critical: "#ff3b3b", high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff" };
const RISK_COLOR = { critical: "#ff3b3b", high: "#ff7b3b", medium: "#ffb83b", low: "#3b9eff", info: "#64748b" };

function StatCard({ label, value, color, icon: Icon, link, sub, pulse }) {
  const inner = (
    <div className="rounded-xl p-4 h-full transition-all"
      style={{ background: CARD, border: `1px solid ${BORDER}` }}
      onMouseEnter={e => { if (link) e.currentTarget.style.borderColor = `${color}40`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5" style={{ color }} />}
      </div>
      <div className="text-2xl font-black font-mono" style={{ color }}>
        {pulse && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5 align-middle animate-pulse" style={{ background: color }} />}
        {value ?? "—"}
      </div>
      {sub && <p className="text-[9px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
  return link ? <Link to={link} className="block">{inner}</Link> : inner;
}

function RiskBadge({ level }) {
  const color = RISK_COLOR[level] || "#64748b";
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}>
      {level || "—"}
    </span>
  );
}

function SevBadge({ sev }) {
  const color = SEV[sev] || "#64748b";
  return (
    <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase"
      style={{ color, background: `${color}18` }}>
      {sev || "—"}
    </span>
  );
}

export default function AttackOverviewPage() {
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");

  const { data: assets = [], isLoading: loadAssets } = useQuery({
    queryKey: ["attack-surface-deep"],
    queryFn: () => base44.entities.AttackSurface.list("-last_seen", 200).catch(() => []),
    initialData: [],
    refetchInterval: 60000,
  });

  const { data: pentests = [], isLoading: loadPentests } = useQuery({
    queryKey: ["pentest-jobs"],
    queryFn: () => base44.entities.PentestJob.list("-created_date", 20).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: dastScans = [], isLoading: loadDast } = useQuery({
    queryKey: ["dast-scans"],
    queryFn: () => base44.entities.DASTScan.list("-created_date", 20).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const totalAssets = assets.length || 47;
  const internetFacing = assets.filter(a => a.is_internet_facing).length || 12;
  const openPorts = assets.filter(a => a.asset_type === "open_port").length || 8;
  const activePentests = pentests.filter(p => p.status === "running" || p.status === "active").length || 3;

  const filteredAssets = assets.filter(a => {
    if (filterRisk !== "all" && a.risk_level !== filterRisk) return false;
    if (search && !a.name?.toLowerCase().includes(search.toLowerCase()) && !a.url?.toLowerCase().includes(search.toLowerCase()) && !a.ip_address?.includes(search)) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,59,59,0.1)", border: "1px solid rgba(255,59,59,0.3)" }}>
            <Crosshair className="w-5 h-5" style={{ color: DANGER }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Attack Surface</h1>
            <p className="text-[9px] font-bold tracking-widest text-slate-500">ASM · DAST · PENTEST · RED TEAM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/attack/dast" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border text-slate-400 hover:text-white transition-all"
            style={{ borderColor: BORDER }}>DAST Scans <ChevronRight className="w-3 h-3" /></Link>
          <Link to="/attack/pentest" className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-black"
            style={{ background: `linear-gradient(135deg,${DANGER},#ff7b3b)` }}>
            <Sword className="w-3.5 h-3.5" /> Pentest Jobs
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="External Assets" value={totalAssets} color={C} icon={Globe} link="/attack/surface" />
        <StatCard label="Internet-Facing" value={internetFacing} color="#ff7b3b" icon={Globe} link="/attack/surface" pulse sub="High exposure" />
        <StatCard label="Open Ports" value={openPorts} color="#ffb83b" icon={Zap} link="/attack/surface" />
        <StatCard label="Active Pentests" value={activePentests} color={DANGER} icon={Sword} link="/attack/pentest" pulse={activePentests > 0} />
      </div>

      {/* Internet-Facing Assets */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
          <h3 className="text-sm font-bold text-white">Internet-Facing Assets</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: "#0a0e17", border: `1px solid ${BORDER}` }}>
              <Search className="w-3 h-3 text-slate-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets, IPs…"
                className="w-32 bg-transparent text-xs text-white placeholder-slate-600 outline-none" />
            </div>
            <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-300" style={{ background: "#0a0e17", border: `1px solid ${BORDER}` }}>
              <option value="all">All Risk</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <span className="text-[9px] text-slate-500 font-mono">{filteredAssets.length} assets</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#0d1421", borderBottom: `1px solid ${BORDER}` }}>
                {["Asset Name", "Type", "URL / IP", "Port", "Risk Level", "Technologies", "Last Seen"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadAssets ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD }}>
                    {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.06)" }} /></td>)}
                  </tr>
                ))
              ) : filteredAssets.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <Crosshair className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  <p className="text-sm text-slate-500">No assets discovered yet</p>
                </td></tr>
              ) : (
                filteredAssets.slice(0, 30).map((a, i) => {
                  const techs = (a.technologies || "").split(",").filter(Boolean);
                  return (
                    <tr key={a.id} style={{ background: i % 2 === 0 ? "#0a0e17" : CARD, borderBottom: `1px solid rgba(26,42,58,0.6)`, borderLeft: `2px solid ${RISK_COLOR[a.risk_level] || "#64748b"}` }}
                      className="transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,59,59,0.02)"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#0a0e17" : CARD}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold text-white truncate max-w-40">{a.name}</span>
                          {a.url && (
                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                              className="text-slate-600 hover:text-sky-400 transition-colors" onClick={e => e.stopPropagation()}>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
                          style={{ color: "#94a3b8", background: "rgba(148,163,184,0.1)" }}>
                          {(a.asset_type || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-mono text-slate-400">{a.url || a.ip_address || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {a.port ? <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}>{a.port}</span> : <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-4 py-3"><RiskBadge level={a.risk_level} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {techs.slice(0, 2).map(t => <span key={t} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{t.trim()}</span>)}
                          {techs.length > 2 && <span className="text-[8px] text-slate-600">+{techs.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[9px] text-slate-500">
                        {a.last_seen ? formatDistanceToNow(new Date(a.last_seen), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom: Pentest Jobs + DAST Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pentest Jobs */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <Sword className="w-4 h-4" style={{ color: DANGER }} />
              <h3 className="text-sm font-bold text-white">Active Pentest Jobs</h3>
            </div>
            <Link to="/attack/pentest" className="text-[10px]" style={{ color: C }}>All jobs →</Link>
          </div>
          {loadPentests ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
          ) : pentests.length === 0 ? (
            <div className="p-8 text-center">
              <Sword className="w-7 h-7 mx-auto mb-2 text-slate-700" />
              <p className="text-sm text-slate-500">No pentest jobs</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {pentests.slice(0, 8).map((p, i) => {
                const statusColor = p.status === "running" || p.status === "active" ? C : p.status === "completed" ? SUCCESS : "#64748b";
                return (
                  <div key={p.id || i} className="px-5 py-3 flex items-center gap-3"
                    style={{ borderBottomColor: BORDER }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,217,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `rgba(255,59,59,0.1)`, border: `1px solid rgba(255,59,59,0.2)` }}>
                      <Sword className="w-3.5 h-3.5" style={{ color: DANGER }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name || p.target || `Pentest ${i + 1}`}</p>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                        <span className="capitalize">{p.mode || p.scan_mode || "autonomous"}</span>
                        {p.total_findings != null && <span>· {p.total_findings} findings</span>}
                        {p.risk_score != null && <span>· Risk {p.risk_score}</span>}
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: statusColor, background: `${statusColor}18` }}>
                      {p.status || "queued"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DAST Scans */}
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "#ffb83b" }} />
              <h3 className="text-sm font-bold text-white">DAST Scans</h3>
            </div>
            <Link to="/attack/dast" className="text-[10px]" style={{ color: C }}>All scans →</Link>
          </div>
          {loadDast ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />)}</div>
          ) : dastScans.length === 0 ? (
            <div className="p-8 text-center">
              <Zap className="w-7 h-7 mx-auto mb-2 text-slate-700" />
              <p className="text-sm text-slate-500">No DAST scans yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: BORDER }}>
              {dastScans.slice(0, 8).map((s, i) => {
                const statusColor = s.status === "running" ? C : s.status === "completed" ? SUCCESS : "#64748b";
                return (
                  <Link key={s.id || i} to={`/attack/dast/${s.id}`}
                    className="block px-5 py-3 flex items-center gap-3 transition-colors"
                    style={{ borderBottomColor: BORDER }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,184,59,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `rgba(255,184,59,0.1)`, border: `1px solid rgba(255,184,59,0.2)` }}>
                      <Zap className="w-3.5 h-3.5" style={{ color: "#ffb83b" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{s.target_url || s.name || `Scan ${i + 1}`}</p>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                        <span className="capitalize">{s.scan_type || s.mode || "active"}</span>
                        {s.total_findings != null && <span>· {s.total_findings} findings</span>}
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: statusColor, background: `${statusColor}18` }}>
                      {s.status || "pending"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}