import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Crosshair, Globe, Shield, RefreshCw, ExternalLink, X, Loader2, AlertTriangle, Search } from "lucide-react";

const RISK_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#10b981", info: "#6b7280" };
const TYPE_CONFIG = {
  subdomain:       { color: "#3b82f6",  bg: "rgba(59,130,246,0.12)",  label: "Subdomain" },
  open_port:       { color: "#8b5cf6",  bg: "rgba(139,92,246,0.12)",  label: "Open Port" },
  storage:         { color: "#14b8a6",  bg: "rgba(20,184,166,0.12)",  label: "Storage" },
  admin_panel:     { color: "#ef4444",  bg: "rgba(239,68,68,0.12)",   label: "Admin Panel" },
  login_page:      { color: "#f97316",  bg: "rgba(249,115,22,0.12)",  label: "Login Page" },
  api_endpoint:    { color: "#3b82f6",  bg: "rgba(59,130,246,0.12)",  label: "API Endpoint" },
  legacy_endpoint: { color: "#eab308",  bg: "rgba(234,179,8,0.12)",   label: "Legacy" },
  exposed_service: { color: "#64748b",  bg: "rgba(100,116,139,0.12)", label: "Exposed Svc" },
  certificate:     { color: "#22c55e",  bg: "rgba(34,197,94,0.12)",   label: "Certificate" },
  ip_address:      { color: "#94a3b8",  bg: "rgba(148,163,184,0.12)", label: "IP Address" },
};
const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const ASSET_TYPES = ["admin_panel", "login_page", "api_endpoint", "legacy_endpoint", "exposed_service", "subdomain", "open_port", "storage"];
const RISK_LEVELS = ["critical", "high", "medium", "low"];

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { color: "#64748b", bg: "rgba(100,116,139,0.12)", label: type };
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>;
}

function DiscoverModal({ onClose, onSuccess }) {
  const [domain, setDomain] = useState("");
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [liveProbing, setLiveProbing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDiscover = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("shieldAttackSurface", {
        action: "discover",
        domain: domain.trim(),
        include_subdomains: includeSubdomains,
        live_probing: liveProbing,
        save_to_db: true,
      });
      const data = res?.data || res;
      setResult(data);
      toast.success(`Discovery complete — ${data?.assets_found || 0} assets found`);
      onSuccess?.();
    } catch {
      toast.error("Discovery failed — check attack surface backend function");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-md" style={{ background: "#0d1117", border: "1px solid #374151" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#1F2937" }}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Crosshair className="w-4 h-4 text-red-400" /> Discover New Domain</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Target Domain</label>
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com"
              className="w-full px-3 py-2 rounded-lg text-sm text-white bg-slate-900 border border-slate-700 outline-none focus:border-red-500" />
          </div>
          <div className="flex gap-6">
            {[
              { label: "Include Subdomains (max 30)", val: includeSubdomains, set: setIncludeSubdomains },
              { label: "Live HTTP Probing", val: liveProbing, set: setLiveProbing },
            ].map(({ label, val, set }) => (
              <label key={label} className="flex items-center gap-2 cursor-pointer">
                <button onClick={() => set(v => !v)}
                  className="relative w-10 h-5 rounded-full flex-shrink-0 transition-all"
                  style={{ background: val ? "#ef4444" : "#374151" }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all" style={{ left: val ? "calc(100% - 18px)" : "2px" }} />
                </button>
                <span className="text-xs text-slate-400">{label}</span>
              </label>
            ))}
          </div>
          {result && (
            <div className="p-3 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
              <p className="text-xs text-white font-semibold mb-2">✅ Discovery Complete</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-slate-500">Assets Found: </span><span className="text-white font-bold">{result.assets_found || 0}</span></div>
                <div><span className="text-slate-500">Subdomains: </span><span className="text-white font-bold">{result.subdomains || 0}</span></div>
                <div><span className="text-slate-500">Open Ports: </span><span className="text-white font-bold">{result.open_ports || 0}</span></div>
                <div><span className="text-slate-500">Critical: </span><span className="text-red-400 font-bold">{result.critical || 0}</span></div>
              </div>
            </div>
          )}
          <button onClick={handleDiscover} disabled={loading || !domain.trim()}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {loading ? "Discovering…" : "Start Discovery"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShodanPanel({ asset, onClose }) {
  const [loading, setLoading] = useState(false);
  const [shodanData, setShodanData] = useState(null);

  const handleLookup = async () => {
    if (!asset.ip_address) { toast.error("No IP address for this asset"); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("shieldAttackSurface", { action: "shodan_lookup", ip: asset.ip_address });
      setShodanData(res?.data || res);
    } catch {
      toast.error("Shodan lookup failed");
    } finally { setLoading(false); }
  };

  const techs = (asset.technologies || "").split(",").filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto" style={{ background: "#0d1117", borderLeft: "1px solid #30363d" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b sticky top-0" style={{ borderColor: "#30363d", background: "#0d1117" }}>
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Crosshair className="w-4 h-4 text-red-400" /> Asset Details</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Asset info */}
          <div className="p-4 rounded-xl" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-bold text-white font-mono">{asset.name}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: RISK_COLOR[asset.risk_level], background: `${RISK_COLOR[asset.risk_level]}20` }}>
                {asset.risk_level}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { label: "Type", val: <TypeBadge type={asset.asset_type} /> },
                { label: "URL", val: asset.url ? <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">{asset.url} <ExternalLink className="w-3 h-3" /></a> : "—" },
                { label: "IP Address", val: <span className="font-mono text-slate-300">{asset.ip_address || "—"}</span> },
                { label: "Port", val: asset.port || "—" },
                { label: "Protocol", val: asset.protocol || "—" },
                { label: "Internet Facing", val: asset.is_internet_facing ? <span className="text-red-400">🌐 Yes</span> : <span className="text-emerald-400">No</span> },
                { label: "Findings", val: <span style={{ color: asset.finding_count > 0 ? "#ef4444" : "#22c55e" }}>{asset.finding_count || 0}</span> },
                { label: "Last Seen", val: asset.last_seen ? formatDistanceToNow(new Date(asset.last_seen), { addSuffix: true }) : "—" },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {techs.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Technologies</p>
              <div className="flex flex-wrap gap-1.5">
                {techs.map(t => <span key={t} className="text-[10px] font-mono px-2 py-1 rounded-full bg-slate-800 text-slate-300">{t.trim()}</span>)}
              </div>
            </div>
          )}

          {asset.notes && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-xs text-slate-400 p-3 rounded-lg bg-slate-900">{asset.notes}</p>
            </div>
          )}

          {/* Shodan */}
          <div>
            <button onClick={handleLookup} disabled={loading || !asset.ip_address}
              className="w-full py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
              style={{ background: "linear-gradient(135deg,#1e40af,#2563eb)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              {loading ? "Looking up…" : "Shodan Lookup"}
            </button>
            {!asset.ip_address && <p className="text-[10px] text-slate-600 text-center">No IP address available</p>}
            {shodanData && (
              <div className="p-4 rounded-xl space-y-3" style={{ background: "#161b22", border: "1px solid #30363d" }}>
                {shodanData.open_ports?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Open Ports</p>
                    <div className="flex flex-wrap gap-1">
                      {shodanData.open_ports.map(p => <span key={p} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300">{p}</span>)}
                    </div>
                  </div>
                )}
                {shodanData.cves?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-red-400 mb-1.5">CVEs</p>
                    <div className="flex flex-wrap gap-1">
                      {shodanData.cves.map(c => <span key={c} className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-300">{c}</span>)}
                    </div>
                  </div>
                )}
                {shodanData.hostnames?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 mb-1.5">Hostnames</p>
                    {shodanData.hostnames.map(h => <p key={h} className="text-[10px] font-mono text-slate-400">{h}</p>)}
                  </div>
                )}
                {shodanData.org && <p className="text-[10px] text-slate-500">Org: <span className="text-slate-300">{shodanData.org}</span></p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AttackSurfacePage() {
  const [showDiscover, setShowDiscover] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["attack-surface-deep"],
    queryFn: () => base44.entities.AttackSurface.list("-last_seen", 300).catch(() => []),
    initialData: [],
    refetchInterval: 60000,
  });

  const stats = useMemo(() => ({
    total: assets.length,
    critical: assets.filter(a => a.risk_level === "critical").length,
    internetFacing: assets.filter(a => a.is_internet_facing).length,
    adminPanels: assets.filter(a => a.asset_type === "admin_panel").length,
    withCVEs: assets.filter(a => (a.finding_count || a.cve_count || 0) > 0).length,
  }), [assets]);

  // Heatmap: asset_type × risk_level
  const heatmap = useMemo(() => {
    const grid = {};
    ASSET_TYPES.forEach(t => RISK_LEVELS.forEach(r => grid[`${t}|${r}`] = 0));
    assets.forEach(a => {
      const key = `${a.asset_type}|${a.risk_level}`;
      if (key in grid) grid[key]++;
    });
    return grid;
  }, [assets]);

  const filtered = useMemo(() => {
    return assets.filter(a => {
      if (filterRisk !== "all" && a.risk_level !== filterRisk) return false;
      if (filterType !== "all" && a.asset_type !== filterType) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (search && !(a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.url?.toLowerCase().includes(search.toLowerCase()) ||
        a.ip_address?.includes(search))) return false;
      return true;
    }).sort((a, b) => (RISK_ORDER[a.risk_level] ?? 5) - (RISK_ORDER[b.risk_level] ?? 5));
  }, [assets, filterRisk, filterType, filterStatus, search]);

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ background: "#0d1117" }}>
      {showDiscover && <DiscoverModal onClose={() => setShowDiscover(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ["attack-surface-deep"] })} />}
      {selectedAsset && <ShodanPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <Crosshair className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Attack Surface Management</h1>
            <p className="text-xs text-slate-500">External asset discovery · Shodan intelligence · Live probing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ["attack-surface-deep"] })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowDiscover(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
            <Crosshair className="w-3.5 h-3.5" /> Discover New Domain
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Assets", value: stats.total, color: "#6366f1" },
          { label: "Critical Risk", value: stats.critical, color: "#ef4444", pulse: stats.critical > 0 },
          { label: "Internet-Facing", value: stats.internetFacing, color: "#f97316" },
          { label: "Admin Panels Exposed", value: stats.adminPanels, color: "#ef4444", pulse: stats.adminPanels > 0 },
          { label: "Assets with CVEs", value: stats.withCVEs, color: "#ef4444", pulse: stats.withCVEs > 0 },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            {s.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse mb-1.5" style={{ background: s.color }} />}
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Risk Heatmap */}
      {assets.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Risk Heatmap — Asset Type × Risk Level</h3>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-slate-500 text-[9px] text-left w-28">Asset Type</th>
                  {RISK_LEVELS.map(r => (
                    <th key={r} className="p-2 text-[9px] font-bold text-center" style={{ color: RISK_COLOR[r] }}>{r.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ASSET_TYPES.map(type => {
                  const typeCfg = TYPE_CONFIG[type] || { label: type, color: "#64748b" };
                  return (
                    <tr key={type}>
                      <td className="p-2 text-[9px] font-bold" style={{ color: typeCfg.color }}>{typeCfg.label}</td>
                      {RISK_LEVELS.map(risk => {
                        const count = heatmap[`${type}|${risk}`] || 0;
                        const riskColor = RISK_COLOR[risk];
                        return (
                          <td key={risk} className="p-2 text-center cursor-pointer hover:opacity-80 transition-opacity rounded"
                            style={{ background: count > 0 ? `${riskColor}${Math.round(Math.min(0.1 + count * 0.12, 0.6) * 255).toString(16).padStart(2, "0")}` : "#0d1117", minWidth: 56 }}
                            onClick={() => { setFilterType(type); setFilterRisk(risk); }}>
                            {count > 0 ? <span className="font-black" style={{ color: riskColor }}>{count}</span> : <span className="text-slate-800">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(filterType !== "all" || filterRisk !== "all") && (
            <button onClick={() => { setFilterType("all"); setFilterRisk("all"); }}
              className="mt-2 text-[10px] text-blue-400 hover:underline">Clear heatmap filter ×</button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-44 max-w-56 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets, IPs…"
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none" />
        </div>
        <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
          <option value="all">All Risk Levels</option>
          {RISK_LEVELS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
          <option value="all">All Types</option>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="allowlisted">Allowlisted</option>
        </select>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">{filtered.length} assets</span>
      </div>

      {/* Assets Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              {["Asset", "Type", "Risk", "IP", "Port", "Technologies", "Findings", "Status", "Last Seen", "Notes"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => <tr key={i}>{[...Array(10)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}</tr>)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <Crosshair className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                  <p className="text-sm font-semibold text-white mb-1">
                    {assets.length === 0 ? "No attack surface discovered yet" : "No assets match filters"}
                  </p>
                  {assets.length === 0 && (
                    <button onClick={() => setShowDiscover(true)}
                      className="mt-2 text-xs text-red-400 hover:underline">Discover a domain →</button>
                  )}
                </td>
              </tr>
            ) : (
              filtered.slice(0, 150).map((a, i) => {
                const riskColor = RISK_COLOR[a.risk_level] || "#6b7280";
                const techs = (a.technologies || "").split(",").filter(Boolean);
                const notes = a.notes || "";
                return (
                  <tr key={a.id}
                    style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)", borderLeft: `2px solid ${riskColor}` }}
                    className="hover:bg-white/2 transition-colors cursor-pointer"
                    onClick={() => setSelectedAsset(a)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-white truncate max-w-40">{a.name}</span>
                        {a.url && (
                          <a href={a.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="text-slate-600 hover:text-blue-400 transition-colors flex-shrink-0">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><TypeBadge type={a.asset_type} /></td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: riskColor, background: `${riskColor}20` }}>
                        {a.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-slate-400">{a.ip_address || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.port ? <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-300">{a.port}</span> : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {techs.slice(0, 3).map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t.trim()}</span>)}
                        {techs.length > 3 && <span className="text-[9px] text-slate-600">+{techs.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(a.finding_count || 0) > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded text-red-400 bg-red-400/10">{a.finding_count}</span>
                      ) : <span className="text-slate-700 text-[10px]">0</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] capitalize px-2 py-0.5 rounded"
                        style={{ color: a.status === "open" ? "#f97316" : a.status === "allowlisted" ? "#22c55e" : "#64748b", background: a.status === "open" ? "rgba(249,115,22,0.1)" : a.status === "allowlisted" ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.1)" }}>
                        {a.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-slate-500 whitespace-nowrap">
                      {a.last_seen ? formatDistanceToNow(new Date(a.last_seen), { addSuffix: true }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {notes && <span className="text-[10px] text-slate-500 truncate max-w-20 block" title={notes}>{notes.slice(0, 40)}{notes.length > 40 ? "…" : ""}</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}