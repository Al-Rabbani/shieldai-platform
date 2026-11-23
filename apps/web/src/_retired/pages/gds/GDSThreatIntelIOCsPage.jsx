import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, Search, Filter, AlertTriangle, Shield, Clock, CheckCircle, XCircle } from "lucide-react";
import { CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT, Card, Breadcrumb, Skeleton, EmptyState, timeAgo, SearchFilter } from "@/components/gds/GDSOSShared";

const BG = "#020817";

const TYPE_COLORS = {
  ip: DANGER, domain: HIGH, hash: "#a855f7", url: CYAN, email: MEDIUM,
  file_hash: "#a855f7", md5: "#a855f7", sha1: "#a855f7", sha256: "#a855f7",
  cve: DANGER, vulnerability: DANGER, malware: HIGH, mutex: MEDIUM,
  registry_key: MEDIUM, file_path: MEDIUM, ip_cidr: DANGER, asn: MEDIUM
};

export default function GDSThreatIntelIOCsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  useEffect(() => { const t = setTimeout(() => setShowCharts(true), 400); return () => clearTimeout(t); }, []);

  const { data: iocs = [], isLoading } = useQuery({
    queryKey: ["threat-iocs-all"], queryFn: () => base44.entities.IOCRecord.list("-risk_score", 500).catch(() => []),
  });

  const filteredIOCs = iocs.filter(ioc => {
    const matchSearch = !search || ioc.value?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || ioc.indicator_type === typeFilter;
    const matchSeverity = severityFilter === "all" || ioc.severity === severityFilter;
    const matchActive = !activeOnly || ioc.is_active;
    return matchSearch && matchType && matchSeverity && matchActive;
  });

  const totalIOCs = iocs.length;
  const activeIOCs = iocs.filter(i => i.is_active).length;
  const criticalIOCs = iocs.filter(i => i.severity === "critical").length;
  const expiringSoon = iocs.filter(i => {
    if (!i.expires_at) return false;
    const daysLeft = (new Date(i.expires_at) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 7;
  }).length;

  return (
    <div className="space-y-6" style={{ background: BG, minHeight: "100vh", padding: "24px" }}>
      <Breadcrumb items={[{ label: "Threat Intel", path: "/threat-intel" }, { label: "IOC Explorer" }]} />

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Database className="w-6 h-6" style={{ color: CYAN }} />
          <div>
            <h1 className="text-2xl font-black text-white">IOC Explorer</h1>
            <p className="text-[10px] mt-0.5" style={{ color: MUTED }}>Comprehensive indicator of compromise database</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Total IOCs</p>
          <p className="text-2xl font-black font-mono" style={{ color: CYAN }}>{totalIOCs}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Active</p>
          <p className="text-2xl font-black font-mono" style={{ color: LOW }}>{activeIOCs}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${DANGER}08`, border: `1px solid ${DANGER}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Critical</p>
          <p className="text-2xl font-black font-mono" style={{ color: DANGER }}>{criticalIOCs}</p>
        </Card>
        <Card className="p-4 text-center" style={{ background: `${HIGH}08`, border: `1px solid ${HIGH}20` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>Expiring Soon</p>
          <p className="text-2xl font-black font-mono" style={{ color: HIGH }}>{expiringSoon}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search IOCs..." className="w-64" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Types</option>
            {Object.keys(TYPE_COLORS).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold outline-none"
            style={{ background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="flex items-center gap-2 text-xs cursor-pointer px-3 py-2 rounded-xl" style={{ background: activeOnly ? `${CYAN}15` : "rgba(255,255,255,0.04)", border: `1px solid ${activeOnly ? CYAN + "40" : BORDER}` }}>
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="w-4 h-4" style={{ accentColor: CYAN }} />
            <span style={{ color: activeOnly ? CYAN : MUTED }}>Active Only</span>
          </label>
        </div>
      </Card>

      {/* IOC Table */}
      <Card className="p-5">
        {isLoading ? <Skeleton lines={8} /> : filteredIOCs.length === 0 ? (
          <EmptyState icon={Database} title="No IOCs found" description="Adjust filters or add new threat indicators" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Value", "Type", "Severity", "Confidence", "Source", "TLP", "Sightings", "First Seen", "Last Seen", "Expires", "Active", "FP"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredIOCs.slice(0, 100).map((ioc) => {
                  const isExpired = ioc.expires_at && new Date(ioc.expires_at) < new Date();
                  const isExpiring = !isExpired && ioc.expires_at && (new Date(ioc.expires_at) - new Date()) / (1000 * 60 * 60 * 24) <= 7;
                  const typeColor = TYPE_COLORS[ioc.indicator_type?.toLowerCase()] || MUTED;
                  
                  return (
                    <tr key={ioc.id} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid ${BORDER}20`, opacity: ioc.is_false_positive ? 0.5 : 1 }}>
                      <td className="py-3 px-3">
                        <p className="text-xs font-mono text-white truncate max-w-xs">{ioc.value || "—"}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${typeColor}15`, color: typeColor }}>
                          {ioc.indicator_type || "unknown"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          ioc.severity === "critical" ? "bg-red-400/15 text-red-400" :
                          ioc.severity === "high" ? "bg-orange-400/15 text-orange-400" :
                          ioc.severity === "medium" ? "bg-yellow-400/15 text-yellow-400" :
                          "bg-blue-400/15 text-blue-400"
                        }`}>
                          {ioc.severity || "unknown"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(ioc.confidence || 0) * 100}%`, background: CYAN }} />
                        </div>
                        <p className="text-[9px] mt-0.5" style={{ color: MUTED }}>{((ioc.confidence || 0) * 100).toFixed(0)}%</p>
                      </td>
                      <td className="py-3 px-3 text-xs" style={{ color: TEXT }}>{ioc.source || "—"}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          ioc.tlp_classification === "red" ? "bg-red-400/15 text-red-400" :
                          ioc.tlp_classification === "amber" ? "bg-orange-400/15 text-orange-400" :
                          ioc.tlp_classification === "green" ? "bg-green-400/15 text-green-400" :
                          "bg-gray-400/15 text-gray-400"
                        }`}>
                          TLP:{ioc.tlp_classification?.toUpperCase() || "WHITE"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono" style={{ color: TEXT }}>{ioc.sighting_count || 0}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(ioc.first_seen)}</td>
                      <td className="py-3 px-3 text-xs" style={{ color: MUTED }}>{timeAgo(ioc.last_seen)}</td>
                      <td className="py-3 px-3">
                        {ioc.expires_at ? (
                          <span className={`text-[10px] font-bold ${isExpired ? "text-red-400" : isExpiring ? "text-orange-400" : ""}`} style={{ color: isExpired || isExpiring ? undefined : MUTED }}>
                            {isExpired ? "EXPIRED" : timeAgo(ioc.expires_at)}
                          </span>
                        ) : <span style={{ color: MUTED }}>—</span>}
                      </td>
                      <td className="py-3 px-3">
                        {ioc.is_active ? <CheckCircle className="w-4 h-4" style={{ color: LOW }} /> : <XCircle className="w-4 h-4" style={{ color: MUTED }} />}
                      </td>
                      <td className="py-3 px-3">
                        {ioc.is_false_positive ? <CheckCircle className="w-4 h-4" style={{ color: MUTED }} /> : <span style={{ color: MUTED }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}