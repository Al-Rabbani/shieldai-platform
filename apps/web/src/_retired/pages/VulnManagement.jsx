import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, RefreshCw, Filter, Wrench, ExternalLink, CheckCircle2, Zap, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import SeverityBadge from "@/components/shared/SeverityBadge";

const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function StatusDropdown({ finding, onUpdate }) {
  const statuses = ["open", "triaged", "in_remediation", "resolved", "accepted_risk"];
  const colors = { open: "#ef4444", triaged: "#eab308", in_remediation: "#3b82f6", resolved: "#10b981", accepted_risk: "#64748b" };
  const current = finding.status || finding.normalized_status || "open";
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="text-[10px] px-2 py-0.5 rounded capitalize font-medium transition-all hover:opacity-80"
        style={{ color: colors[current] || "#64748b", background: `${colors[current] || "#64748b"}15`, border: `1px solid ${colors[current] || "#64748b"}40` }}>
        {current.replace(/_/g, " ")} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 rounded-lg overflow-hidden shadow-xl min-w-32" style={{ background: "#111827", border: "1px solid #374151" }}>
          {statuses.map(s => (
            <button key={s} onClick={(e) => { e.stopPropagation(); onUpdate(s); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-slate-700 transition-colors capitalize"
              style={{ color: colors[s] }}>
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VulnManagement() {
  const [searchQ, setSearchQ] = useState("");
  const [filterSev, setFilterSev] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKEV, setFilterKEV] = useState(false);
  const [filterAutofix, setFilterAutofix] = useState(false);
  const [filterSLABreached, setFilterSLABreached] = useState(false);
  const [filterScanner, setFilterScanner] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState("severity");
  const qc = useQueryClient();

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["vuln-mgmt-triaged"],
    queryFn: () => base44.entities.TriagedFinding.filter({}).catch(() => []),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: vmFindings = [] } = useQuery({
    queryKey: ["vm-findings-all"],
    queryFn: () => base44.entities.VMFinding.list("-created_date", 100).catch(() => []),
    initialData: [],
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TriagedFinding.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vuln-mgmt-triaged"] }); },
  });

  // Stats
  const totalVulns = findings.length;
  const kevCount = findings.filter(f => f.exploited_in_wild).length;
  const slaBreachedCount = findings.filter(f => f.sla_breached || (f.sla_deadline && new Date(f.sla_deadline) < new Date())).length;
  const autofixCount = findings.filter(f => f.autofix_available).length;
  const avgEPSS = findings.length > 0
    ? (findings.reduce((s, f) => s + (f.epss_score || 0), 0) / findings.length * 100).toFixed(1)
    : "0.0";

  const scanners = [...new Set(findings.flatMap(f => (f.source_scanners || "").split(",").map(s => s.trim())).filter(Boolean))];

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = findings.filter(f => {
      if (searchQ && !f.title?.toLowerCase().includes(searchQ.toLowerCase()) && !f.asset_name?.toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (filterSev !== "all" && (f.normalized_severity || f.severity) !== filterSev) return false;
      if (filterStatus !== "all" && (f.status || f.normalized_status) !== filterStatus) return false;
      if (filterKEV && !f.exploited_in_wild) return false;
      if (filterAutofix && !f.autofix_available) return false;
      if (filterSLABreached && !(f.sla_breached || (f.sla_deadline && new Date(f.sla_deadline) < new Date()))) return false;
      if (filterScanner !== "all" && !(f.source_scanners || "").includes(filterScanner)) return false;
      return true;
    });
    list.sort((a, b) => {
      if (sortBy === "severity") return (SEV_ORDER[a.normalized_severity || a.severity] || 9) - (SEV_ORDER[b.normalized_severity || b.severity] || 9);
      if (sortBy === "epss") return (b.epss_score || 0) - (a.epss_score || 0);
      if (sortBy === "cvss") return (b.cvss_score || 0) - (a.cvss_score || 0);
      if (sortBy === "sla") return new Date(a.sla_deadline || "9999") - new Date(b.sla_deadline || "9999");
      return 0;
    });
    return list;
  }, [findings, searchQ, filterSev, filterStatus, filterKEV, filterAutofix, filterSLABreached, filterScanner, sortBy]);

  const handleBulkJira = async () => {
    if (selectedIds.size === 0) return;
    toast.info("Creating Jira tickets for selected findings…");
    try {
      const res = await base44.functions.invoke("shieldJiraIntegration", {
        action: "create_bulk",
        finding_ids: [...selectedIds],
      });
      toast.success(`Created ${res?.data?.created || selectedIds.size} Jira tickets`);
    } catch {
      toast.error("Jira integration not configured — connect in Integration Hub");
    }
    setSelectedIds(new Set());
  };

  const handleBulkAutofix = async () => {
    if (selectedIds.size === 0) return;
    toast.info("Submitting AutoFix for selected findings…");
    try {
      await base44.functions.invoke("shieldAutoFix", { finding_ids: [...selectedIds] });
      toast.success("AutoFix PRs queued successfully");
    } catch {
      toast.error("AutoFix failed — check integration settings");
    }
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-6 min-h-screen" style={{ background: "#0d1117" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Vulnerability Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">AI-triaged findings with SLA enforcement & AutoFix</p>
        </div>
        <button onClick={() => qc.invalidateQueries()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-white transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Vulns", value: totalVulns, color: "#f97316" },
          { label: "CISA KEV", value: kevCount, color: "#ef4444", pulse: kevCount > 0 },
          { label: "SLA Breached", value: slaBreachedCount, color: "#ef4444", pulse: slaBreachedCount > 0 },
          { label: "AutoFix Available", value: autofixCount, color: "#10b981" },
          { label: "Avg EPSS%", value: `${avgEPSS}%`, color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            {s.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse mb-1.5" style={{ background: s.color }} />}
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 flex-wrap">
          <span className="text-sm font-semibold text-white">{selectedIds.size} selected</span>
          <button onClick={handleBulkJira}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all">
            📋 Create Jira Tickets
          </button>
          <button onClick={handleBulkAutofix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all">
            <Wrench className="w-3 h-3" /> Run AutoFix
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-slate-500 hover:text-white text-xs">Clear</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-48 max-w-64 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search findings…"
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none" />
        </div>
        <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="triaged">Triaged</option>
          <option value="in_remediation">In Remediation</option>
          <option value="resolved">Resolved</option>
          <option value="accepted_risk">Accepted Risk</option>
        </select>
        {scanners.length > 0 && (
          <select value={filterScanner} onChange={e => setFilterScanner(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
            <option value="all">All Scanners</option>
            {scanners.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
          <option value="severity">Sort: Severity</option>
          <option value="epss">Sort: EPSS%</option>
          <option value="cvss">Sort: CVSS</option>
          <option value="sla">Sort: SLA</option>
        </select>
        <button onClick={() => setFilterKEV(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterKEV ? "text-red-400 bg-red-500/15 border border-red-500/40" : "text-slate-500 border border-slate-700"}`}>
          🔥 KEV Only
        </button>
        <button onClick={() => setFilterAutofix(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterAutofix ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/40" : "text-slate-500 border border-slate-700"}`}>
          <Wrench className="w-3 h-3 inline mr-1" /> AutoFix
        </button>
        <button onClick={() => setFilterSLABreached(v => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterSLABreached ? "text-orange-400 bg-orange-500/15 border border-orange-500/40" : "text-slate-500 border border-slate-700"}`}>
          <Clock className="w-3 h-3 inline mr-1" /> SLA Breached
        </button>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">{filtered.length} / {totalVulns}</span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={() => {
                    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(filtered.map(f => f.id)));
                  }}
                  className="rounded border-slate-600" />
              </th>
              {["Title", "Severity", "Asset", "Scanners", "CVSS", "EPSS%", "KEV", "SLA Deadline", "Status", "AutoFix"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(11)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-16 text-center">
                  {findings.length === 0 ? (
                    <>
                      <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-slate-700" />
                      <p className="text-sm text-slate-500 mb-2">No vulnerabilities found</p>
                      <p className="text-xs text-slate-600">Run a scan from the Code Security page to populate findings</p>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-500/50" />
                      <p className="text-sm text-slate-500">No findings match your filters</p>
                    </>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((f, i) => {
                const sev = f.normalized_severity || f.severity;
                const sevColor = SEV_COLOR[sev] || "#64748b";
                const isKEV = f.exploited_in_wild;
                const slaDeadline = f.sla_deadline;
                const slaBreached = f.sla_breached || (slaDeadline && new Date(slaDeadline) < new Date());
                const scanners = (f.source_scanners || "").split(",").map(s => s.trim()).filter(Boolean);
                return (
                  <tr key={f.id}
                    style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                    className="hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(f.id)} onChange={() => toggleSelect(f.id)}
                        className="rounded border-slate-600" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-white line-clamp-2 max-w-52 block">{f.title}</span>
                      {f.cve_id && <span className="text-[9px] font-mono text-blue-400">{f.cve_id}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: sevColor, background: `${sevColor}20` }}>
                        {sev}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-slate-400 truncate max-w-32 block">{f.asset_name || f.repo_name || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {scanners.slice(0, 2).map(s => (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-slate-300">{f.cvss_score ? f.cvss_score.toFixed(1) : "—"}</td>
                    <td className="px-4 py-3 text-[10px] font-mono">
                      {f.epss_score != null ? (
                        <span style={{ color: f.epss_score > 0.5 ? "#ef4444" : f.epss_score > 0.2 ? "#f97316" : "#64748b" }}>
                          {(f.epss_score * 100).toFixed(1)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isKEV ? (
                        <span className="text-[10px] font-bold text-red-400 animate-pulse">🔥 KEV</span>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {slaDeadline ? (
                        <span className={`text-[10px] font-mono ${slaBreached ? "text-red-400 font-bold" : "text-slate-400"}`}
                          title={slaDeadline}>
                          {slaBreached ? "⚠️ " : ""}
                          {formatDistanceToNow(new Date(slaDeadline), { addSuffix: true })}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown finding={f} onUpdate={(status) => updateMut.mutate({ id: f.id, data: { status } })} />
                    </td>
                    <td className="px-4 py-3">
                      {f.autofix_available ? (
                        <span className="text-emerald-400" title="AutoFix available">
                          <Wrench className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
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