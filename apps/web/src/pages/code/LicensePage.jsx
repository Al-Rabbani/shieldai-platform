import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Scale, AlertTriangle, Shield, Clock, Package, ChevronUp, ChevronDown, X, FileText } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import LicenseDrawer from "@/components/code/LicenseDrawer";
import { isPast, parseISO, differenceInDays, format } from "date-fns";

const RISK_STYLE = {
  critical: { bg: "rgba(220,38,38,0.12)", color: "#dc2626", border: "#dc262640" },
  high:     { bg: "rgba(234,88,12,0.12)",  color: "#ea580c", border: "#ea580c40" },
  medium:   { bg: "rgba(217,119,6,0.12)",  color: "#d97706", border: "#d9770640" },
  low:      { bg: "rgba(22,163,74,0.12)",  color: "#16a34a", border: "#16a34a40" },
  safe:     { bg: "rgba(107,114,128,0.12)",color: "#6b7280", border: "#6b728040" },
};

const LICENSE_COLOR = {
  "GPL-3.0": "#dc2626", "GPL-2.0": "#dc2626", "AGPL-3.0": "#dc2626",
  "LGPL-2.1": "#d97706", "LGPL-3.0": "#d97706", "CDDL-1.1": "#d97706", "BUSL-1.1": "#d97706",
  "MIT": "#10b981", "Apache-2.0": "#10b981", "BSD-2-Clause": "#10b981", "BSD-3-Clause": "#10b981",
  "Elastic-2.0": "#f59e0b", "Public Domain": "#6b7280",
};

const PIE_COLORS = ["#dc2626", "#ea580c", "#f59e0b", "#10b981", "#6366f1", "#06b6d4", "#8b5cf6", "#94a3b8"];

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-800/60 p-4" style={{ background: "rgba(245,158,11,0.05)" }}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
    </div>
  );
}

function LicenseBadge({ license }) {
  const color = LICENSE_COLOR[license] || "#94a3b8";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {license || "Unknown"}
    </span>
  );
}

function EolBadge({ isEol, eolDate }) {
  if (!isEol) return <span className="text-xs text-slate-600">—</span>;
  let label = "EOL";
  try {
    const d = parseISO(eolDate);
    const days = differenceInDays(new Date(), d);
    label = isPast(d) ? `EOL ${days}d ago` : `EOL in ${-days}d`;
  } catch {}
  return <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">{label}</span>;
}

function SBOMModal({ packages, onClose }) {
  const spdx = `SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: ShieldAI-License-Report
DocumentNamespace: https://shieldai.example.com/sbom/${Date.now()}
Creator: Tool: ShieldAI v1.0
Created: ${new Date().toISOString()}

${packages.map((p, i) => `PackageName: ${p.package_name}
SPDXID: SPDXRef-Package-${i}
PackageVersion: ${p.version || "UNKNOWN"}
PackageDownloadLocation: https://registry.${p.registry}.com/${p.package_name}
FilesAnalyzed: false
PackageLicenseConcluded: ${p.license || "NOASSERTION"}
PackageLicenseDeclared: ${p.license || "NOASSERTION"}
PackageCopyrightText: NOASSERTION

`).join("")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-white font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-amber-400" /> SPDX License Report</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-slate-300 bg-slate-950 whitespace-pre-wrap">{spdx}</pre>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => { navigator.clipboard.writeText(spdx); }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-amber-300 border border-amber-600/40 hover:bg-amber-500/10 transition-all">
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LicensePage() {
  const [selected, setSelected] = useState(null);
  const [sortKey, setSortKey] = useState("risk_level");
  const [sortDir, setSortDir] = useState("asc");
  const [filters, setFilters] = useState({ risk_level: "all", registry: "all", is_eol: "all", repo_name: "all", status: "all" });
  const [page, setPage] = useState(1);
  const [showSBOM, setShowSBOM] = useState(false);
  const PAGE_SIZE = 25;

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["license-risks"],
    queryFn: () => base44.entities.LicenseRisk.list("-detected_at"),
  });

  const criticalCount = packages.filter(p => p.risk_level === "critical").length;
  const eolCount      = packages.filter(p => p.is_eol).length;
  const affectedRepos = new Set(packages.map(p => p.repo_name)).size;
  const reviewNeeded  = packages.filter(p => p.status === "open").length;
  const safeCount     = packages.filter(p => p.risk_level === "safe" || p.status === "approved").length;

  const licenseGroups = packages.reduce((acc, p) => {
    const lic = p.license || "Unknown";
    acc[lic] = (acc[lic] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(licenseGroups).map(([name, value]) => ({ name, value }));

  const eolTimeline = packages.filter(p => p.eol_date).sort((a, b) => a.eol_date > b.eol_date ? 1 : -1).slice(0, 8);

  const repos = [...new Set(packages.map(p => p.repo_name))];
  const registries = [...new Set(packages.map(p => p.registry))];

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3, safe: 4 };

  const displayed = packages
    .filter(p => {
      if (filters.risk_level !== "all" && p.risk_level !== filters.risk_level) return false;
      if (filters.registry !== "all" && p.registry !== filters.registry) return false;
      if (filters.is_eol !== "all" && String(p.is_eol) !== filters.is_eol) return false;
      if (filters.repo_name !== "all" && p.repo_name !== filters.repo_name) return false;
      if (filters.status !== "all" && p.status !== filters.status) return false;
      return true;
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "risk_level") { va = RISK_ORDER[a.risk_level] ?? 5; vb = RISK_ORDER[b.risk_level] ?? 5; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const paged = displayed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(displayed.length / PAGE_SIZE);

  const SortIcon = ({ col }) => sortKey === col
    ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ChevronUp className="w-3 h-3 opacity-20" />;

  const TH = ({ col, children }) => (
    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-300 whitespace-nowrap"
      onClick={() => handleSort(col)}>
      <div className="flex items-center gap-1">{children}<SortIcon col={col} /></div>
    </th>
  );

  const setFilter = (k, v) => { setFilters(p => ({ ...p, [k]: v })); setPage(1); };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{ background: "#030712" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Scale className="w-6 h-6 text-amber-400" /> License Risk & EOL</h1>
          <p className="text-slate-400 text-sm mt-1">AGPL, GPL, and end-of-life packages across all repos</p>
        </div>
        <button onClick={() => setShowSBOM(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-amber-300 border border-amber-600/40 hover:bg-amber-500/10 transition-all">
          <FileText className="w-4 h-4" /> Export Full License Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Critical License Risks" value={criticalCount} color="#dc2626" />
        <StatCard label="EOL Packages" value={eolCount} color="#ef4444" />
        <StatCard label="Affected Repos" value={affectedRepos} color="#f59e0b" />
        <StatCard label="Needing Review" value={reviewNeeded} color="#d97706" />
        <StatCard label="Safe Packages" value={safeCount} color="#10b981" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="rounded-xl border border-slate-800/60 p-4 bg-slate-900/40">
          <h3 className="text-sm font-semibold text-white mb-4">License Risk by Type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={LICENSE_COLOR[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* EOL Timeline */}
        <div className="rounded-xl border border-slate-800/60 p-4 bg-slate-900/40">
          <h3 className="text-sm font-semibold text-white mb-4">EOL Timeline</h3>
          <div className="space-y-2">
            {eolTimeline.length === 0 ? (
              <p className="text-slate-500 text-sm">No EOL data</p>
            ) : eolTimeline.map((p, i) => {
              let past = false, label = "";
              try {
                const d = parseISO(p.eol_date);
                past = isPast(d);
                const days = Math.abs(differenceInDays(new Date(), d));
                label = past ? `${days}d ago` : `in ${days}d`;
              } catch {}
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${past ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-300 font-mono truncate block">{p.package_name} v{p.version}</span>
                    <span className="text-[10px] text-slate-600">{p.repo_name}</span>
                  </div>
                  <span className={`text-[10px] font-bold flex-shrink-0 ${past ? "text-red-400" : "text-amber-400"}`}>
                    {p.eol_date} ({label})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {[
          { k: "risk_level", opts: ["all", "critical", "high", "medium", "low", "safe"], label: "Risk" },
          { k: "registry",   opts: ["all", ...registries],                                 label: "Registry" },
          { k: "is_eol",     opts: ["all", "true", "false"],                               label: "EOL" },
          { k: "repo_name",  opts: ["all", ...repos],                                      label: "Repo" },
          { k: "status",     opts: ["all", "open", "approved", "rejected", "upgrading"],   label: "Status" },
        ].map(({ k, opts, label }) => (
          <select key={k} value={filters[k]} onChange={e => setFilter(k, e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs focus:outline-none focus:border-amber-500">
            {opts.map(o => <option key={o} value={o}>{o === "all" ? `All ${label}` : o}</option>)}
          </select>
        ))}
        <span className="text-xs text-slate-500 ml-auto">{displayed.length} packages</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: "#0a0f1e", borderBottom: "1px solid rgba(30,58,95,0.4)" }}>
              <tr>
                <TH col="risk_level">Risk</TH>
                <TH col="package_name">Package</TH>
                <TH col="version">Version</TH>
                <TH col="registry">Registry</TH>
                <TH col="license">License</TH>
                <TH col="repo_name">Repo</TH>
                <TH col="is_eol">EOL</TH>
                <TH col="is_direct">Dep Type</TH>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500">Risk Reason</th>
                <TH col="status">Status</TH>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={10}><div className="h-10 mx-4 my-1 bg-slate-800/30 rounded animate-pulse" /></td></tr>
                ))
              ) : paged.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-500">No packages match your filters</td></tr>
              ) : paged.map((pkg) => {
                const risk = RISK_STYLE[pkg.risk_level] || RISK_STYLE.safe;
                return (
                  <tr key={pkg.id} onClick={() => setSelected(pkg)}
                    className="border-t border-slate-800/40 hover:bg-slate-800/30 cursor-pointer transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}>
                        {pkg.risk_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-white font-semibold">{pkg.package_name}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400">{pkg.version}</td>
                    <td className="py-3 px-4 text-xs text-slate-400 uppercase">{pkg.registry}</td>
                    <td className="py-3 px-4"><LicenseBadge license={pkg.license} /></td>
                    <td className="py-3 px-4 text-xs text-slate-400 font-mono">{pkg.repo_name}</td>
                    <td className="py-3 px-4"><EolBadge isEol={pkg.is_eol} eolDate={pkg.eol_date} /></td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${pkg.is_direct ? "bg-blue-500/10 text-blue-400" : "bg-slate-700 text-slate-400"}`}>
                        {pkg.is_direct ? "Direct" : "Transitive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 max-w-[200px]">
                      <span className="truncate block" title={pkg.risk_reason}>{pkg.risk_reason?.slice(0, 60)}{(pkg.risk_reason?.length > 60) ? "…" : ""}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pkg.status === "approved" ? "bg-emerald-500/10 text-emerald-400" : pkg.status === "rejected" ? "bg-red-500/10 text-red-400" : pkg.status === "upgrading" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>
                        {pkg.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800" style={{ background: "#0a0f1e" }}>
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded text-xs text-slate-400 border border-slate-700 disabled:opacity-40 hover:bg-slate-800">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded text-xs text-slate-400 border border-slate-700 disabled:opacity-40 hover:bg-slate-800">Next</button>
            </div>
          </div>
        )}
      </div>

      {selected && <LicenseDrawer pkg={selected} onClose={() => setSelected(null)} queryKey={["license-risks"]} />}
      {showSBOM && <SBOMModal packages={packages} onClose={() => setShowSBOM(false)} />}
    </div>
  );
}