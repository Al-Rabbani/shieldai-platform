import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { UserCheck, RefreshCw, AlertTriangle, Loader2, ChevronRight, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const GOLD = "#C9A84C";
const SEV_COLOR = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6" };
const BLAST_CONFIG = {
  full_account:      { color: "#ef4444", label: "Full Account" },
  service_wide:      { color: "#f97316", label: "Service-Wide" },
  resource_specific: { color: "#eab308", label: "Resource" },
  minimal:           { color: "#22c55e", label: "Minimal" },
};
const TYPE_CONFIG = {
  overprivileged:           { color: "#f97316", label: "Overprivileged" },
  stale_credential:         { color: "#eab308", label: "Stale Credential" },
  wildcard_policy:          { color: "#ef4444", label: "Wildcard Policy" },
  admin_access:             { color: "#ef4444", label: "Admin Access" },
  mfa_not_enforced:         { color: "#f97316", label: "No MFA" },
  privilege_escalation_path:{ color: "#8b5cf6", label: "Priv. Escalation" },
  public_trust:             { color: "#ef4444", label: "Public Trust" },
  cross_account_trust:      { color: "#f59e0b", label: "Cross-Account" },
  shadow_admin:             { color: "#ec4899", label: "Shadow Admin" },
};
const PROVIDER_COLOR = { aws: "#f97316", gcp: "#3b82f6", azure: "#0ea5e9" };

function StatusDropdown({ finding, onUpdate }) {
  const statuses = ["open", "in_remediation", "resolved", "accepted_risk"];
  const colors = { open: "#ef4444", in_remediation: "#3b82f6", resolved: "#10b981", accepted_risk: "#64748b" };
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="text-[10px] px-2 py-0.5 rounded capitalize font-medium"
        style={{ color: colors[finding.status] || "#64748b", background: `${colors[finding.status] || "#64748b"}15`, border: `1px solid ${colors[finding.status] || "#64748b"}40` }}>
        {(finding.status || "open").replace(/_/g, " ")} ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 rounded-lg overflow-hidden shadow-xl min-w-32" style={{ background: "#111827", border: "1px solid #374151" }}>
          {statuses.map(s => (
            <button key={s} onClick={e => { e.stopPropagation(); onUpdate(s); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-slate-700 capitalize" style={{ color: colors[s] }}>
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RemediationModal({ finding, onClose }) {
  const handleJira = async () => {
    try {
      await base44.functions.invoke("shieldJiraIntegration", {
        action: "create", title: finding.title, severity: finding.severity,
        description: finding.remediation || "No remediation provided",
      });
      toast.success("Jira ticket created");
      onClose();
    } catch { toast.error("Jira not configured"); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg" style={{ background: "#0d1117", border: "1px solid #30363d" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#30363d" }}>
          <div>
            <h3 className="text-sm font-bold text-white">{finding.title}</h3>
            <p className="text-xs text-slate-500">{finding.identity_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {finding.remediation ? (
            <div className="p-3 rounded-lg font-mono text-xs text-emerald-400" style={{ background: "#0a0e1a", border: "1px solid #1e293b" }}>
              {finding.remediation}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No remediation guidance available.</p>
          )}
          {(finding.permissions_granted || "").split(",").filter(Boolean).length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Permissions Granted:</p>
              <div className="flex flex-wrap gap-1">
                {finding.permissions_granted.split(",").map(p => (
                  <span key={p} className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">{p.trim()}</span>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleJira}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-black"
            style={{ background: GOLD }}>
            📋 Create Jira Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CIEMPage() {
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterBlast, setFilterBlast] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [remediating, setRemediating] = useState(null);
  const [scanning, setScanning] = useState(false);
  const qc = useQueryClient();

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["ciem-findings"],
    queryFn: () => base44.entities.CIEMFinding.filter({}).catch(() => []),
    initialData: [],
    refetchInterval: 60000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CIEMFinding.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ciem-findings"] }),
  });

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("shieldCIEM", { action: "scan" });
      toast.success(`IAM scan complete — ${res?.data?.findings_created || 0} findings`);
      qc.invalidateQueries({ queryKey: ["ciem-findings"] });
    } catch {
      toast.error("IAM scan failed — check CIEM backend function");
    } finally { setScanning(false); }
  };

  // Stats
  const criticalCount = findings.filter(f => f.severity === "critical" || f.finding_type === "wildcard_policy" || f.finding_type === "admin_access").length;
  const shadowAdmins = findings.filter(f => f.finding_type === "shadow_admin").length;
  const staleCredentials = findings.filter(f => f.days_inactive > 90 || f.finding_type === "stale_credential").length;

  // Bar chart data
  const typeChartData = useMemo(() => {
    const counts = {};
    findings.forEach(f => { counts[f.finding_type] = (counts[f.finding_type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      type: TYPE_CONFIG[type]?.label || type,
      count,
      color: TYPE_CONFIG[type]?.color || "#64748b",
    })).sort((a, b) => b.count - a.count);
  }, [findings]);

  // Blast radius heatmap: blast_radius × severity → count
  const blastSevGrid = useMemo(() => {
    const rows = ["full_account", "service_wide", "resource_specific", "minimal"];
    const cols = ["critical", "high", "medium", "low"];
    const grid = {};
    rows.forEach(r => cols.forEach(c => grid[`${r}|${c}`] = 0));
    findings.forEach(f => {
      const key = `${f.blast_radius}|${f.severity}`;
      if (key in grid) grid[key]++;
    });
    return { rows, cols, grid };
  }, [findings]);

  // Filtered table
  const filtered = useMemo(() => {
    return findings.filter(f => {
      if (filterProvider !== "all" && f.provider !== filterProvider) return false;
      if (filterType !== "all" && f.finding_type !== filterType) return false;
      if (filterBlast !== "all" && f.blast_radius !== filterBlast) return false;
      if (filterStatus !== "all" && (f.status || "open") !== filterStatus) return false;
      return true;
    }).sort((a, b) => {
      const o = { critical: 0, high: 1, medium: 2, low: 3 };
      return (o[a.severity] || 9) - (o[b.severity] || 9);
    });
  }, [findings, filterProvider, filterType, filterBlast, filterStatus]);

  // Privilege escalation paths
  const escalationPaths = useMemo(() =>
    findings.filter(f => f.finding_type === "privilege_escalation_path" || f.finding_type === "shadow_admin"),
    [findings]
  );

  return (
    <div className="space-y-6 min-h-screen pb-10" style={{ background: "#0d1117" }}>
      {remediating && <RemediationModal finding={remediating} onClose={() => setRemediating(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.3)" }}>
            <UserCheck className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Cloud Identity & Entitlement Management</h1>
            <p className="text-xs text-slate-500">IAM risk across AWS · GCP · Azure</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Provider filters */}
          {["all", "aws", "gcp", "azure"].map(p => (
            <button key={p} onClick={() => setFilterProvider(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterProvider === p ? "text-white" : "text-slate-500"}`}
              style={filterProvider === p ? { background: (PROVIDER_COLOR[p] || "#374151") + "30", border: `1px solid ${PROVIDER_COLOR[p] || "#374151"}` } : { background: "#161b22", border: "1px solid #30363d" }}>
              {p.toUpperCase()}
            </button>
          ))}
          <button onClick={() => qc.invalidateQueries({ queryKey: ["ciem-findings"] })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-400 hover:text-white transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-black disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: GOLD }}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
            {scanning ? "Scanning…" : "Run IAM Scan"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total IAM Findings", value: findings.length, color: "#6366f1" },
          { label: "Critical (Admin/Wildcard)", value: criticalCount, color: "#ef4444", pulse: criticalCount > 0 },
          { label: "Shadow Admins", value: shadowAdmins, color: "#f97316", pulse: shadowAdmins > 0 },
          { label: "Stale Credentials (>90d)", value: staleCredentials, color: "#eab308" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
            {s.pulse && <div className="w-1.5 h-1.5 rounded-full animate-pulse mb-1.5" style={{ background: s.color }} />}
            <p className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Finding Type Bar Chart */}
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Risk by Finding Type</h3>
          {isLoading ? (
            <div className="h-40 animate-pulse bg-slate-800 rounded" />
          ) : typeChartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={typeChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} />
                <YAxis type="category" dataKey="type" tick={{ fontSize: 9, fill: "#94a3b8" }} width={110} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 11 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {typeChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Blast Radius Heatmap */}
        <div className="rounded-xl p-4" style={{ background: "#161b22", border: "1px solid #30363d" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Blast Radius × Severity Heatmap</h3>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr>
                  <th className="p-2 text-slate-500 text-[10px] text-left">Blast Radius</th>
                  {blastSevGrid.cols.map(c => (
                    <th key={c} className="p-2 text-[10px] font-bold text-center" style={{ color: SEV_COLOR[c] }}>{c.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blastSevGrid.rows.map(row => (
                  <tr key={row}>
                    <td className="p-2 text-[10px] font-bold" style={{ color: BLAST_CONFIG[row]?.color }}>{BLAST_CONFIG[row]?.label}</td>
                    {blastSevGrid.cols.map(col => {
                      const count = blastSevGrid.grid[`${row}|${col}`] || 0;
                      const color = count > 0 ? (SEV_COLOR[col] || "#64748b") : "#1e293b";
                      const alpha = count > 0 ? Math.min(0.15 + count * 0.1, 0.7) : 0;
                      return (
                        <td key={col} className="p-2 text-center cursor-pointer hover:opacity-80 transition-opacity rounded"
                          style={{ background: count > 0 ? `${SEV_COLOR[col]}${Math.round(alpha * 255).toString(16).padStart(2, "0")}` : "#161b22", minWidth: 60 }}
                          onClick={() => { setFilterBlast(row); }}>
                          {count > 0 ? <span className="font-black text-sm" style={{ color }}>{count}</span> : <span className="text-slate-700">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Main Findings Table */}
      <div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <h3 className="text-sm font-semibold text-white">IAM Findings</h3>
          <div className="flex-1" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
            <option value="all">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterBlast} onChange={e => setFilterBlast(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
            <option value="all">All Blast Radius</option>
            {Object.entries(BLAST_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-300">
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_remediation">In Remediation</option>
            <option value="resolved">Resolved</option>
          </select>
          <span className="text-[10px] text-slate-500 font-mono">{filtered.length} findings</span>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #30363d" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}>
                {["Severity", "Type", "Identity", "Identity Type", "Blast Radius", "Inactive Days", "Policy", "Status", "Detected", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(10)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Shield className="w-8 h-8 mx-auto mb-3 text-emerald-500/40" />
                    <p className="text-sm text-slate-500">
                      {findings.length === 0 ? "No IAM findings yet — run a scan to discover issues" : "No findings match filters"}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((f, i) => {
                  const sevColor = SEV_COLOR[f.severity] || "#64748b";
                  const typeCfg = TYPE_CONFIG[f.finding_type] || { color: "#64748b", label: f.finding_type };
                  const blastCfg = BLAST_CONFIG[f.blast_radius] || { color: "#64748b", label: f.blast_radius };
                  const isStale = f.days_inactive > 180;
                  return (
                    <tr key={f.id} style={{ background: i % 2 === 0 ? "#0d1117" : "#161b22", borderBottom: "1px solid rgba(48,54,61,0.5)" }}
                      className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: sevColor, background: `${sevColor}20` }}>{f.severity}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: typeCfg.color, background: `${typeCfg.color}15` }}>{typeCfg.label}</span>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-white font-mono truncate max-w-36 block">{f.identity_name}</span></td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">{f.identity_type?.replace(/_/g, " ") || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold" style={{ color: blastCfg.color }}>{blastCfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-mono font-bold ${isStale ? "text-red-400" : f.days_inactive > 90 ? "text-orange-400" : "text-slate-400"}`}>
                          {f.days_inactive > 0 ? `${f.days_inactive}d` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="text-[10px] text-slate-400 truncate max-w-28 block">{f.policy_name || "—"}</span></td>
                      <td className="px-4 py-3">
                        <StatusDropdown finding={f} onUpdate={status => updateMut.mutate({ id: f.id, data: { status } })} />
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-500">
                        {f.detected_at ? formatDistanceToNow(new Date(f.detected_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setRemediating(f)}
                          className="text-[10px] px-2.5 py-1 rounded font-bold text-black hover:opacity-90" style={{ background: GOLD }}>
                          Fix
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privilege Escalation Paths */}
      {escalationPaths.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Privilege Escalation Paths
          </h3>
          <div className="space-y-3">
            {escalationPaths.map((f, i) => {
              const perms = (f.permissions_granted || "").split(",").filter(Boolean);
              return (
                <div key={f.id || i} className="p-4 rounded-xl" style={{ background: "#161b22", border: "1px solid rgba(239,68,68,0.25)", borderLeft: "3px solid #ef4444" }}>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded text-red-400 bg-red-400/10">{f.finding_type?.replace(/_/g, " ").toUpperCase()}</span>
                    <span className="text-xs text-white font-medium">{f.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1.5 rounded-full text-xs text-slate-300 bg-slate-800">{f.identity_name}</span>
                    {perms.slice(0, 3).map(p => (
                      <React.Fragment key={p}>
                        <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono text-orange-300 bg-orange-400/10">{p.trim()}</span>
                      </React.Fragment>
                    ))}
                    <ChevronRight className="w-3.5 h-3.5 text-red-400" />
                    <span className="px-2.5 py-1 rounded-full text-xs text-red-400 font-bold bg-red-400/10">
                      {f.blast_radius === "full_account" ? "Full Account Access" : f.blast_radius?.replace(/_/g, " ")}
                    </span>
                  </div>
                  <button onClick={() => setRemediating(f)}
                    className="mt-3 text-[10px] px-3 py-1.5 rounded-lg font-bold text-black" style={{ background: GOLD }}>
                    Remediate
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}