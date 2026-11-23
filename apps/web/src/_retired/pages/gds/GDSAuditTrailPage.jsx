import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link2, Download, Search, CheckCircle, AlertTriangle, Shield } from "lucide-react";
import {
  CARD, BORDER, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED, TEXT,
  Skeleton, EmptyState, Breadcrumb, Card, PAGE_BG, timeAgo
} from "@/components/gds/GDSOSShared";

const SEV_COLORS = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW, info: CYAN };

function ActorBadge({ type }) {
  const color = type === "user" ? CYAN : MEDIUM;
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize"
      style={{ color, background: `${color}15` }}>{type || "system"}</span>
  );
}

function SevBadge({ sev }) {
  const color = SEV_COLORS[sev?.toLowerCase()] || MUTED;
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
      style={{ color, background: `${color}15` }}>{sev || "—"}</span>
  );
}

export default function GDSAuditTrailPage() {
  const [filters, setFilters] = useState({ actor_email: "", action_type: "", resource_type: "", severity: "", since: "" });
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const { data: integrityData, isLoading: intLoading } = useQuery({
    queryKey: ["gds-audit-integrity"],
    queryFn: () => base44.functions.invoke("gdsAlertRuleEngine", { action: "integrity_check" })
      .then(r => r.data).catch(() => null),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["gds-audit-stats"],
    queryFn: () => base44.functions.invoke("gdsAlertRuleEngine", { action: "stats" })
      .then(r => r.data).catch(() => null),
  });

  const { data: auditEntries = [], isLoading: auditLoading } = useQuery({
    queryKey: ["gds-audit-log-entries"],
    queryFn: () => base44.entities.AuditLog.list("-created_date", 100).catch(() => []),
  });

  const handleSearch = async () => {
    setSearching(true);
    try {
      const payload = { action: "search" };
      if (filters.actor_email) payload.actor_email = filters.actor_email;
      if (filters.action_type) payload.action_type = filters.action_type;
      if (filters.resource_type) payload.resource_type = filters.resource_type;
      if (filters.severity) payload.severity = filters.severity;
      if (filters.since) payload.since = filters.since;
      const r = await base44.functions.invoke("gdsAlertRuleEngine", payload);
      setSearchResults(r.data?.entries || r.data?.results || []);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleExport = async (format) => {
    try {
      const r = await base44.functions.invoke("gdsAlertRuleEngine", { action: "export", format });
      const content = format === "json" ? JSON.stringify(r.data, null, 2) : r.data;
      const type = format === "json" ? "application/json" : "text/csv";
      const ext = format;
      const blob = new Blob([typeof content === "string" ? content : JSON.stringify(content)], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `audit-trail.${ext}`; a.click();
    } catch (e) { console.error(e); }
  };

  const integrity = integrityData || {};
  const chainOk = integrity.chain_valid ?? integrity.integrity === "verified" ?? true;
  const stats = statsData || {};
  const displayEntries = searchResults ?? auditEntries;

  const inputStyle = {
    background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`,
    color: TEXT, borderRadius: 8, padding: "6px 10px", fontSize: 12, outline: "none"
  };

  return (
    <div className="space-y-6" style={{ ...PAGE_BG }}>
      <Breadcrumb items={[{ label: "Audit Trail" }]} />

      <div>
        <h1 className="text-2xl font-black text-white">Immutable Audit Trail</h1>
        <p className="text-sm mt-1" style={{ color: MUTED }}>SHA-256 cryptographically chained audit log</p>
      </div>

      {/* Chain Integrity banner */}
      {!intLoading && (
        <div className={`flex items-start gap-4 px-5 py-4 rounded-2xl`}
          style={{ background: chainOk ? `${LOW}10` : `${DANGER}10`, border: `1px solid ${chainOk ? LOW : DANGER}40` }}>
          {chainOk
            ? <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: LOW }} />
            : <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: DANGER }} />}
          <div className="flex-1">
            <p className="text-sm font-black" style={{ color: chainOk ? LOW : DANGER }}>
              {chainOk ? "CHAIN INTEGRITY VERIFIED ✅" : "CHAIN INTEGRITY COMPROMISED ⚠️"}
            </p>
            <div className="flex flex-wrap gap-6 mt-2 text-[11px]">
              {[
                ["Total Entries", integrity.total_entries ?? stats.total ?? "—"],
                ["Chained", integrity.chained_entries ?? stats.chained ?? "—"],
                ["Valid Links", integrity.valid_chain_links ?? "—"],
                ["Invalid Links", integrity.invalid_chain_links ?? 0],
              ].map(([label, value]) => (
                <span key={label} style={{ color: MUTED }}>
                  <span className="font-bold text-white">{value}</span> {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Events", value: stats.total ?? auditEntries.length, color: CYAN },
          { label: "Chained", value: stats.chained ?? "—", color: LOW },
          { label: "Chain Coverage", value: stats.chain_coverage_pct ? `${stats.chain_coverage_pct}%` : "—", color: MEDIUM },
          { label: "Top Actor", value: stats.top_actor_type ?? "system", color: HIGH },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: MUTED }}>{label}</p>
            <p className="text-lg font-black font-mono truncate" style={{ color }}>{value ?? "—"}</p>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Search & Filter</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: "actor_email", placeholder: "Actor email" },
            { key: "action_type", placeholder: "Action type" },
            { key: "resource_type", placeholder: "Resource type" },
          ].map(({ key, placeholder }) => (
            <input key={key} placeholder={placeholder} value={filters[key]}
              onChange={e => setFilters(p => ({ ...p, [key]: e.target.value }))}
              style={inputStyle} />
          ))}
          <select value={filters.severity} onChange={e => setFilters(p => ({ ...p, severity: e.target.value }))}
            style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">All severities</option>
            {["critical", "high", "medium", "low", "info"].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <input type="date" value={filters.since} onChange={e => setFilters(p => ({ ...p, since: e.target.value }))}
            style={inputStyle} />
          <button onClick={handleSearch} disabled={searching}
            className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <Search className="w-3.5 h-3.5" />
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="text-sm font-bold text-white">
            {searchResults ? `Search Results (${searchResults.length})` : `Audit Log (${auditEntries.length})`}
          </h3>
          {searchResults && (
            <button onClick={() => setSearchResults(null)} className="text-xs hover:opacity-80" style={{ color: MUTED }}>
              Clear filter
            </button>
          )}
        </div>
        {auditLoading ? <Skeleton lines={5} /> : displayEntries.length === 0 ? (
          <EmptyState icon={Shield} title="No audit entries" description="Audit events will appear here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["ID", "Actor", "Type", "Action", "Resource", "Sev", "Outcome", "Time", "Chain"].map(h => (
                    <th key={h} className="text-left py-2 px-3 font-bold uppercase tracking-wide text-[10px]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayEntries.slice(0, 50).map((e, i) => (
                  <tr key={e.id || i} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: `1px solid ${BORDER}20` }}>
                    <td className="py-2 px-3 font-mono" style={{ color: MUTED }}>{(e.id || "").slice(-8) || "—"}</td>
                    <td className="py-2 px-3 max-w-[120px]"><p className="truncate text-white">{e.actor_email || e.actor_id || "system"}</p></td>
                    <td className="py-2 px-3"><ActorBadge type={e.actor_type} /></td>
                    <td className="py-2 px-3 max-w-[140px]"><p className="truncate" style={{ color: TEXT }}>{e.action || e.action_type?.replace(/_/g, " ")}</p></td>
                    <td className="py-2 px-3 max-w-[100px]"><p className="truncate" style={{ color: MUTED }}>{e.resource_name || e.resource_type || "—"}</p></td>
                    <td className="py-2 px-3"><SevBadge sev={e.severity || e.action_type === "threat_blocked" ? "critical" : "info"} /></td>
                    <td className="py-2 px-3">
                      <span className="text-[9px] font-bold" style={{ color: e.outcome === "success" || !e.outcome ? LOW : DANGER }}>
                        {e.outcome || "success"}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap" style={{ color: MUTED }}>{timeAgo(e.created_date || e.timestamp)}</td>
                    <td className="py-2 px-3">
                      {e.chain_hash || e.chained
                        ? <span title="Chained" style={{ color: CYAN }}>🔗</span>
                        : <span style={{ color: MUTED }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Export Controls */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Export Controls</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => handleExport("json")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, color: CYAN }}>
            <Download className="w-4 h-4" /> Export JSON
          </button>
          <button onClick={() => handleExport("csv")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: `${LOW}12`, border: `1px solid ${LOW}30`, color: LOW }}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <input type="date" style={{
              background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`,
              color: TEXT, borderRadius: 8, padding: "6px 10px", fontSize: 12, outline: "none"
            }} placeholder="From date" />
            <input type="date" style={{
              background: "rgba(0,212,255,0.04)", border: `1px solid ${BORDER}`,
              color: TEXT, borderRadius: 8, padding: "6px 10px", fontSize: 12, outline: "none"
            }} placeholder="To date" />
          </div>
        </div>
      </Card>
    </div>
  );
}